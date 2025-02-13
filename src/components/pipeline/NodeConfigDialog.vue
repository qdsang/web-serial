<template>
  <el-dialog v-model="dialogVisible" :title="title" width="600px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="组件名称">
        <el-input v-model="form.label" placeholder="请输入组件名称" />
      </el-form-item>
      <el-form-item label="组件类型">
        <el-select v-model="form.template" placeholder="选择组件模板">
          <el-option label="容器类" value="tank">
            <div class="template-option">
              <div>容器类</div>
              <div class="template-desc">适用于储罐、气瓶等存储容器</div>
            </div>
          </el-option>
          <el-option label="阀门类" value="valve">
            <div class="template-option">
              <div>阀门类</div>
              <div class="template-desc">适用于各类阀门控制元件</div>
            </div>
          </el-option>
          <el-option label="传感器类" value="sensor">
            <div class="template-option">
              <div>传感器类</div>
              <div class="template-desc">适用于压力、温度等传感器</div>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="数据字段">
        <el-card class="data-fields">
          <template #header>
            <div class="card-header">
              <span>字段列表</span>
              <el-button type="primary" link @click="addField">添加字段</el-button>
            </div>
          </template>
          <div v-for="(field, index) in form.fields" :key="index" class="field-item">
            <el-input v-model="field.name" placeholder="字段名称" style="width: 120px" />
            <el-select v-model="field.type" placeholder="类型" style="width: 100px">
              <el-option label="数值" value="number" />
              <el-option label="文本" value="text" />
              <el-option label="布尔" value="boolean" />
            </el-select>
            <el-input v-model="field.unit" placeholder="单位" style="width: 80px" />
            <el-button type="danger" link @click="removeField(index)">删除</el-button>
          </div>
        </el-card>
      </el-form-item>
      <el-form-item label="连接桩">
        <el-card class="handles">
          <template #header>
            <div class="card-header">
              <span>连接桩列表</span>
              <el-button type="primary" link @click="addHandle">添加连接桩</el-button>
            </div>
          </template>
          <div v-for="(handle, index) in form.handles" :key="index" class="handle-item">
            <el-input v-model="handle.id" placeholder="标识符" style="width: 120px" />
            <el-select v-model="handle.type" placeholder="类型" style="width: 100px">
              <el-option label="输入" value="target" />
              <el-option label="输出" value="source" />
            </el-select>
            <el-select v-model="handle.position" placeholder="位置" style="width: 100px">
              <el-option label="顶部" value="top" />
              <el-option label="底部" value="bottom" />
              <el-option label="左侧" value="left" />
              <el-option label="右侧" value="right" />
            </el-select>
            <el-button type="danger" link @click="removeHandle(index)">删除</el-button>
          </div>
        </el-card>
      </el-form-item>
      <el-form-item label="操作按钮">
        <el-card class="actions">
          <template #header>
            <div class="card-header">
              <span>按钮列表</span>
              <el-button type="primary" link @click="addAction">添加按钮</el-button>
            </div>
          </template>
          <div v-for="(action, index) in form.actions" :key="index" class="action-item">
            <el-input v-model="action.label" placeholder="按钮文本" style="width: 120px" />
            <el-input v-model="action.value" placeholder="动作值" style="width: 120px" />
            <el-button type="danger" link @click="removeAction(index)">删除</el-button>
          </div>
        </el-card>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElButton,
  ElCard
} from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  editData?: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: any): void
}>()

const dialogVisible = ref(props.modelValue)
const title = ref(props.editData ? '编辑组件' : '添加组件')

const form = reactive({
  label: '',
  template: '',
  fields: [] as Array<{ name: string; type: string; unit: string }>,
  handles: [] as Array<{ id: string; type: string; position: string }>,
  actions: [] as Array<{ label: string; value: string }>
})

// 监听对话框显示状态
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

watch(() => dialogVisible.value, (val) => {
  emit('update:modelValue', val)
})

// 添加数据字段
function addField() {
  form.fields.push({
    name: '',
    type: 'number',
    unit: ''
  })
}

// 删除数据字段
function removeField(index: number) {
  form.fields.splice(index, 1)
}

// 添加连接桩
function addHandle() {
  form.handles.push({
    id: '',
    type: 'target',
    position: 'top'
  })
}

// 删除连接桩
function removeHandle(index: number) {
  form.handles.splice(index, 1)
}

// 添加操作按钮
function addAction() {
  form.actions.push({
    label: '',
    value: ''
  })
}

// 删除操作按钮
function removeAction(index: number) {
  form.actions.splice(index, 1)
}

// 确认提交
function handleConfirm() {
  emit('confirm', { ...form })
  dialogVisible.value = false
}
</script>

<style scoped>
.template-option {
  padding: 4px 0;
}

.template-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-item,
.handle-item,
.action-item {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.data-fields,
.handles,
.actions {
  margin-top: 8px;
}
</style>