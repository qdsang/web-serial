<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SerialHelper } from '../utils/SerialHelper'

interface QuickSendItem {
  id: number
  name: string
  content: string
  type: 'text' | 'hex'
}

interface QuickSendGroup {
  id: number
  name: string
  items: QuickSendItem[]
}

const currentGroup = ref<QuickSendGroup>({
  id: 1,
  name: '默认分组',
  items: [
    {
      id: 1,
      name: '查询版本',
      content: 'AT+VERSION?\r\n',
      type: 'text'
    },
    {
      id: 2,
      name: '重启设备',
      content: 'AT+RESET\r\n',
      type: 'text'
    },
    {
      id: 3,
      name: '查询状态',
      content: 'AT+STATUS?\r\n',
      type: 'text'
    },
    {
      id: 4,
      name: '16进制测试',
      content: '48 45 4C 4C 4F',
      type: 'hex'
    }
  ]
})

const groups = ref<QuickSendGroup[]>([currentGroup.value])
const autoSendIntervals = ref<Record<number, number>>({})
const autoSendInterval = ref(1000)

const addItem = () => {
  currentGroup.value.items.push({
    id: Date.now(),
    name: '新建项目',
    content: '',
    type: 'text'
  })
}

const removeItem = (id: number) => {
  const index = currentGroup.value.items.findIndex(item => item.id === id)
  if (index > -1) {
    currentGroup.value.items.splice(index, 1)
  }
}

const addGroup = () => {
  const name = prompt('请输入分组名称')
  if (name) {
    groups.value.push({
      id: Date.now(),
      name,
      items: []
    })
  }
}

const removeGroup = () => {
  if (groups.value.length <= 1) {
    ElMessage.warning('至少保留一个分组')
    return
  }
  const index = groups.value.findIndex(group => group.id === currentGroup.value.id)
  if (index > -1) {
    groups.value.splice(index, 1)
    currentGroup.value = groups.value[0]
  }
}

const renameGroup = () => {
  const name = prompt('请输入新的分组名称', currentGroup.value.name)
  if (name) {
    currentGroup.value.name = name
  }
}

const handleGroupChange = (groupId: number) => {
  const group = groups.value.find(g => g.id === groupId)
  if (group) {
    currentGroup.value = group
  }
}

const importConfig = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!Array.isArray(data) || !data.every(group => 
          typeof group === 'object' && 
          typeof group.id === 'number' && 
          typeof group.name === 'string' && 
          Array.isArray(group.items)
        )) {
          throw new Error('配置文件格式错误')
        }
        groups.value = data
        currentGroup.value = groups.value[0]
        ElMessage.success('导入成功')
      } catch (error) {
        ElMessage.error(`导入失败：${error instanceof Error ? error.message : '无效的配置文件'}`)
      }
    }
    reader.readAsText(input.files[0])
  }
}

const exportConfig = () => {
  const data = JSON.stringify(groups.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quick-send-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

const serialHelper = SerialHelper.getInstance()

const validateHexData = (data: string): boolean => {
  const hexPattern = /^[0-9A-Fa-f\s]*$/
  return hexPattern.test(data)
}

const sendData = (item: QuickSendItem) => {
  if (!item.content) {
    ElMessage.warning('发送内容不能为空')
    return
  }

  if (item.type === 'hex' && !validateHexData(item.content)) {
    ElMessage.error('HEX格式数据不合法')
    return
  }

  const data = serialHelper.stringToUint8Array(item.content, item.type === 'hex')
  window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
}

const toggleAutoSend = (item: QuickSendItem) => {
  if (autoSendIntervals[item.id]) {
    clearInterval(autoSendIntervals[item.id])
    delete autoSendIntervals[item.id]
  } else {
    autoSendIntervals[item.id] = window.setInterval(() => sendData(item), autoSendInterval.value)
  }
}

const saveToLocalStorage = () => {
  localStorage.setItem('quickSendGroups', JSON.stringify(groups.value))
}

const loadFromLocalStorage = () => {
  const savedGroups = localStorage.getItem('quickSendGroups')
  if (savedGroups) {
    try {
      groups.value = JSON.parse(savedGroups)
      currentGroup.value = groups.value[0]
    } catch (error) {
      ElMessage.error('加载配置失败')
    }
  }
}

watch([groups, currentGroup], () => {
  saveToLocalStorage()
}, { deep: true })

onMounted(() => {
  loadFromLocalStorage()
})

onUnmounted(() => {
  Object.values(autoSendIntervals).forEach(clearInterval)
})
</script>

<template>
  <div class="quick-send">
    <div class="group-select">
      <el-select size="small" v-model="currentGroup.id" @change="handleGroupChange">
        <el-option
          v-for="group in groups"
          :key="group.id"
          :label="group.name"
          :value="group.id"
        />
      </el-select>
      <el-button-group style="width: 240px;">
        <el-button size="small" @click="addGroup" class="compact-btn">新增</el-button>
        <el-button size="small" @click="renameGroup" class="compact-btn">改名</el-button>
        <el-button size="small" @click="removeGroup" class="compact-btn">删除</el-button>
      </el-button-group>
    </div>
    <div class="quick-send-actions">
      <div class="action-group">
        <el-button size="small" @click="addItem" class="add-item-btn">
          <el-icon><Plus /></el-icon> 增加一条
        </el-button>
        <input
          type="file"
          ref="importInput"
          style="display: none"
          accept="application/json"
          @change="importConfig"
        >
        <el-button-group>
          <el-button size="small" @click="$refs.importInput.click()" class="compact-btn">
            <el-icon><FolderAdd /></el-icon>
          </el-button>
          <el-button size="small" @click="exportConfig" class="compact-btn">
            <el-icon><FolderOpened /></el-icon>
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="quick-send-list">
      <div v-for="item in currentGroup.items" :key="item.id" class="mb-2 quick-send-item">
        <div class="item-row">
          <el-input v-model="item.name" placeholder="名称" size="small" style="width: 80px" />
          <el-input
            v-model="item.content"
            size="small"
            placeholder="请输入发送内容"
            class="flex-grow"
          />
          <el-button-group>
            <el-button size="small" type="primary" @click="sendData(item)">发送</el-button>
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
                  <span>数据类型：</span>
                  <el-radio-group v-model="item.type" size="small">
                    <el-radio-button value="text">文本</el-radio-button>
                    <el-radio-button value="hex">HEX</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="setting-row">
                  <span>定时发送：</span>
                  <el-input-number
                    v-model="autoSendInterval"
                    :min="100"
                    :max="10000"
                    size="small"
                    style="width: 120px"
                    class="me-2"
                  >
                    <template #prefix>间隔(ms)</template>
                  </el-input-number>
                  <el-button
                    size="small"
                    :type="autoSendIntervals[item.id] ? 'success' : 'default'"
                    @click="toggleAutoSend(item)"
                  >{{ autoSendIntervals[item.id] ? '停止' : '开始' }}</el-button>
                </div>
              </div>
            </el-popover>
            <el-button size="small" type="danger" @click="removeItem(item.id)">
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
<style>

.el-card {
  --el-card-padding: 12px;
}
</style>