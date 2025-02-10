<script setup lang="ts">
import { useQuickSendStore } from '../store/quickSendStore'
import { ref } from 'vue'

const quickSendStore = useQuickSendStore()
const importInput = ref<HTMLInputElement | null>(null)

const handleImportFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        quickSendStore.importConfig(data)
      } catch (error) {
        // 错误处理已在 store 中实现
      }
    }
    reader.readAsText(input.files[0])
  }
}

const handleExportConfig = () => {
  const data = quickSendStore.exportConfig()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quick-send-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

const handleAddGroup = () => {
  const name = prompt('请输入分组名称')
  if (name) {
    quickSendStore.addGroup(name)
  }
}

const handleRenameGroup = () => {
  const name = prompt('请输入新的分组名称', quickSendStore.currentGroup.name)
  if (name) {
    quickSendStore.renameGroup(name)
  }
}
</script>

<template>
  <div class="quick-send">
    <div class="group-select">
      <el-select size="small" v-model="quickSendStore.currentGroupId" @change="quickSendStore.handleGroupChange">
        <el-option
          v-for="group in quickSendStore.groups"
          :key="group.id"
          :label="group.name"
          :value="group.id"
        />
      </el-select>
      <el-button-group style="width: 240px;">
        <el-button size="small" @click="handleAddGroup" class="compact-btn">新增</el-button>
        <el-button size="small" @click="handleRenameGroup" class="compact-btn">改名</el-button>
        <el-button size="small" @click="quickSendStore.removeGroup" class="compact-btn">删除</el-button>
      </el-button-group>
    </div>
    <div class="quick-send-actions">
      <div class="action-group">
        <el-button size="small" @click="quickSendStore.addItem" class="add-item-btn">
          <el-icon><Plus /></el-icon> 增加一条
        </el-button>
        <input
          type="file"
          ref="importInput"
          style="display: none"
          accept="application/json"
          @change="handleImportFile"
        >
        <el-button-group>
          <el-button size="small" @click="$refs.importInput.click()" class="compact-btn">
            <el-icon><FolderAdd /></el-icon>
          </el-button>
          <el-button size="small" @click="handleExportConfig" class="compact-btn">
            <el-icon><FolderOpened /></el-icon>
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="quick-send-list">
      <div v-for="item in quickSendStore.currentGroup.items" :key="item.id" class="mb-2 quick-send-item">
        <div class="item-row">
          <el-button size="small" type="primary" @click="quickSendStore.sendData(item)">{{ item.name }}</el-button>
          <el-input
            v-model="item.content"
            size="small"
            placeholder="请输入发送内容"
            class="flex-grow"
          />
          <el-button-group>
            <el-popover
              placement="bottom"
              :width="300"
              trigger="click"
            >
              <template #reference>
                <el-button size="small">
                  <el-icon><Setting /></el-icon>
                </el-button>
              </template>
              <div class="item-settings">
                <div class="setting-row">
                  <span>指令名称：</span>
                  <el-input v-model="item.name" placeholder="名称" size="small" style="width: 120px" />
                </div>
                <div class="setting-row">
                  <span>数据类型：</span>
                  <el-radio-group v-model="item.type" size="small">
                    <el-radio-button value="text">文本</el-radio-button>
                    <el-radio-button value="hex">HEX</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="setting-row">
                  <span>添加换行：</span>
                  <el-select v-model="item.addCRLFType" size="small" style="width: 80px;">
                    <el-option :value="''" label="无" />
                    <el-option :value="'\r\n'" label="CRLF(\r\n)" />
                    <el-option :value="'\r'" label="CR(\r)" />
                    <el-option :value="'\n'" label="LF(\n)" />
                    <el-option :value="'\n\n'" label="LF2(\n\n)" />
                  </el-select>
                </div>
                <div class="setting-row">
                  <span>定时发送：</span>
                  <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="间隔(ms)"
                    placement="bottom"
                  >
                    <el-input-number
                      v-model="quickSendStore.autoSendInterval"
                      :min="100"
                      :max="10000"
                      size="small"
                      style="width: 120px"
                      class="me-2"
                    >
                    </el-input-number>
                  </el-tooltip>
                  <el-button
                    size="small"
                    :type="quickSendStore.autoSendIntervals[item.id] ? 'success' : 'default'"
                    @click="quickSendStore.toggleAutoSend(item)"
                  >{{ quickSendStore.autoSendIntervals[item.id] ? '停止' : '开始' }}</el-button>
                </div>
              </div>
            </el-popover>
            <el-button size="small" type="danger" @click="quickSendStore.removeItem(item.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>
    </div>
</div>
</template>

<style scoped>
.quick-send {
  margin: 10px 10px;
}

.quick-send-actions {
  margin: 8px 0;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compact-btn {
  padding: 6px 8px !important;
}

:deep(.el-button-group .el-button--small) {
  padding: 6px 8px;
}

:deep(.el-input-number.el-input-number--small) {
  width: 120px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
}

.group-select {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.item-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.quick-send-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flex-grow {
  flex: 1;
}

.item-settings {
  padding: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.ms-2 {
  margin-left: 4px;
}

.mb-2 {
  margin-bottom: 4px;
}

.mt-2 {
  margin-top: 4px;
}

.me-2 {
  margin-right: 4px;
}
</style>