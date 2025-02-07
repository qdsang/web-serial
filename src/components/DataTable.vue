<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

interface DataField {
  id: number
  key: string
  name: string
  description: string
  value: any
  min: number | null
  max: number | null
  lastUpdate: string
  updateCount: number
  isEditing: boolean
}

const fields = ref<DataField[]>([])
let nextId = 1

const createField = (key: string, value: any): DataField => ({
  id: nextId++,
  key,
  name: key,
  description: '',
  value,
  min: typeof value === 'number' ? value : null,
  max: typeof value === 'number' ? value : null,
  lastUpdate: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
  updateCount: 1,
  isEditing: false
})

const updateField = (field: DataField, value: any) => {
  field.value = value
  field.lastUpdate = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')
  field.updateCount++

  if (typeof value === 'number') {
    if (field.min === null || value < field.min) field.min = value
    if (field.max === null || value > field.max) field.max = value
  }
}

const handleDataKey = (event: CustomEvent) => {
  const data = event.detail
  if (typeof data !== 'object' || data === null) return

  Object.entries(data).forEach(([key, value]) => {
    const existingField = fields.value.find(f => f.key === key)
    if (existingField) {
      updateField(existingField, value)
    } else {
      fields.value.push(createField(key, value))
    }
  })
}

const startEditing = (field: DataField) => {
  field.isEditing = true
}

const saveField = (field: DataField) => {
  if (!field.key.trim()) {
    ElMessage.error('字段名不能为空')
    return
  }
  
  const duplicate = fields.value.find(f => f.id !== field.id && f.key === field.key)
  if (duplicate) {
    ElMessage.error('字段名已存在')
    return
  }

  field.isEditing = false
}

const deleteField = (fieldId: number) => {
  const index = fields.value.findIndex(f => f.id === fieldId)
  if (index !== -1) {
    fields.value.splice(index, 1)
  }
}

onMounted(() => {
  window.addEventListener('data-key', handleDataKey as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('data-key', handleDataKey as EventListener)
})
</script>

<template>
  <div class="data-table-container">
    <el-table :data="fields" border stripe>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <div class="operation-buttons">
            <el-button v-if="!row.isEditing" @click="startEditing(row)" type="primary" size="small" circle>
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button v-else @click="saveField(row)" type="success" size="small" circle>
              <el-icon><Check /></el-icon>
            </el-button>
            <el-button @click="deleteField(row.id)" type="danger" size="small" circle>
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Key" min-width="120">
        <template #default="{ row }">
          <el-input v-if="row.isEditing" v-model="row.key" size="small" />
          <span v-else>{{ row.key }}</span>
        </template>
      </el-table-column>

      <el-table-column label="字段名" min-width="120">
        <template #default="{ row }">
          <el-input v-if="row.isEditing" v-model="row.name" size="small" />
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column label="描述" min-width="150">
        <template #default="{ row }">
          <el-input v-if="row.isEditing" v-model="row.description" size="small" />
          <span v-else>{{ row.description || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="当前值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.value }}</span>
        </template>
      </el-table-column>

      <el-table-column label="最小值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.min ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="最大值" min-width="100">
        <template #default="{ row }">
          <span>{{ row.max ?? '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="最后更新" min-width="180">
        <template #default="{ row }">
          <span>{{ row.lastUpdate }}</span>
        </template>
      </el-table-column>

      <el-table-column label="更新次数" width="100">
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
  overflow: auto;
}

.operation-buttons {
  display: flex;
  gap: 8px;
}
</style>