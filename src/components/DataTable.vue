<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useFieldStore } from '../store/fieldStore'

import { EventCenter, EventNames } from '../utils/EventCenter'

const eventCenter = EventCenter.getInstance()

const fieldStore = useFieldStore()


const handleDataKey = (data: any) => {
  if (typeof data !== 'object' || data === null) return

  Object.entries(data).forEach(([key, value]) => {
    const existingField = fieldStore.fields.find(f => f.key === key)
    if (existingField) {
      fieldStore.updateField(existingField, value)
    } else {
      fieldStore.fields.push(fieldStore.createField(key, value))
    }
  })
}

const addNewField = () => {
  fieldStore.createField('new_field', '')
}

const updateField = () => {
  fieldStore.saveToLocalStorage()
}

const resetData = () => {
  fieldStore.fields.forEach(field => {
    field.value = ''
    field.avg = null
    field.avgSum = null
    field.min = null
    field.max = null
    field.updateCount = 0
    field.lastUpdate = 0
  })
  fieldStore.saveToLocalStorage()
}

onMounted(() => {
  fieldStore.loadFromLocalStorage()
  eventCenter.on(EventNames.DATA_UPDATE, handleDataKey)
})

onUnmounted(() => {
  eventCenter.off(EventNames.DATA_UPDATE, handleDataKey)
})
</script>

<template>
  <div class="data-table-container">
    <div class="table-toolbar">
      <el-dropdown trigger="click">
        <el-button type="primary" size="small">
          显示/隐藏列
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="(_, key) in fieldStore.columnVisibility" :key="key">
              <el-checkbox v-model="fieldStore.columnVisibility[key]" @change="fieldStore.toggleColumnVisibility()">
                {{ key === 'key' ? 'Key' :
                   key === 'name' ? '字段名' :
                   key === 'dataType' ? '数据类型' :
                   key === 'keyAddr' ? '内存地址' :
                   key === 'keySize' ? '内存大小' :
                   key === 'description' ? '描述' :
                   key === 'value' ? '当前值' :
                   key === 'avg' ? '平均值' :
                   key === 'min' ? '最小值' :
                   key === 'max' ? '最大值' :
                   key === 'lastUpdate' ? '最后更新' :
                   key === 'updateCount' ? '更新次数' : key }}
              </el-checkbox>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div class="import-export-buttons">
        <el-button type="primary" size="small" @click="addNewField">添加</el-button>
        <el-button type="primary" size="small" @click="fieldStore.exportData">导出数据</el-button>
        <el-button type="primary" size="small" @click="$refs.fileInput.click()">导入数据</el-button>
        <el-button type="warning" size="small" @click="resetData">重置数据</el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="(e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) fieldStore.importData(file)
          }"
         />
      </div>
    </div>

    <el-table :data="fieldStore.fields" border stripe>
      <el-table-column label="操作" width="50" fixed="left">
        <template #default="{ row }">
          <div class="operation-buttons">
            <el-button @click="fieldStore.deleteField(row.id)" type="danger" size="small" circle>
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.key" label="Key" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.key" size="small" @change="updateField" />
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.name" label="字段名" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.name" size="small" @change="updateField" />
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.keyAddr" label="内存地址" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.keyAddr" size="small" @change="updateField" />
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.keySize" label="内存大小" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.keySize" size="small" @change="updateField" />
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.dataType" label="数据类型" min-width="80">
        <template #default="{ row }">
          <el-select v-model="row.dataType" size="small" @change="updateField">
            <el-option label="数字" value="number" />
            <el-option label="字符串" value="string" />
            <el-option label="布尔值" value="boolean" />
            <el-option label="对象" value="object" />
          </el-select>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.description" label="描述" min-width="150">
        <template #default="{ row }">
          <el-input v-model="row.description" size="small" @change="updateField" />
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.value" label="当前值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.value }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.avg" label="平均值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.avg ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.min" label="最小值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.min ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.max" label="最大值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.max ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.lastUpdate" label="最后更新" min-width="120">
        <template #default="{ row }">
          <el-tooltip :content="new Date(row.lastUpdate).toLocaleString()" placement="top" effect="dark">
            <span>{{ new Date(row.lastUpdate).toLocaleTimeString() + '.' + String(new Date(row.lastUpdate).getMilliseconds()).padStart(3, '0') }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column v-if="fieldStore.columnVisibility.updateCount" label="更新次数" width="100">
        <template #default="{ row }">
          <span>{{ row.updateCount }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.data-table-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-toolbar {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-export-buttons {
  display: flex;
  gap: 8px;
}

.operation-buttons {
  display: flex;
  gap: 8px;
}
</style>