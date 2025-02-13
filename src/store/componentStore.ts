import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
// import { useFieldStore } from './fieldStore'

export interface ComponentField {
  id: string
  fieldId: number
  label: string
  format?: string
  unit?: string
}

export interface ComponentHandle {
  id: string
  type: 'source' | 'target'
  position: 'top' | 'right' | 'bottom' | 'left'
  label?: string
}

export interface ComponentTemplate {
  id: string
  name: string
  type: string
  icon?: string
  style: {
    width: number
    height: number
    borderStyle: 'solid' | 'dashed' | 'dotted'
    borderRadius: number
    borderColor: string
    backgroundColor: string
  }
  fields: ComponentField[]
  handles: ComponentHandle[]
}

export interface CustomComponent extends ComponentTemplate {
  templateId?: string
}

// 预定义组件模板
const defaultTemplates: ComponentTemplate[] = [
  {
    id: 'tank',
    name: '储罐',
    type: 'tank',
    style: {
      width: 80,
      height: 100,
      borderStyle: 'solid',
      borderRadius: 8,
      borderColor: '#409EFF',
      backgroundColor: 'var(--el-bg-color)'
    },
    fields: [
      { id: 'pressure', fieldId: 0, label: '压力', unit: 'MPa' },
      { id: 'temperature', fieldId: 0, label: '温度', unit: '℃' },
      { id: 'level', fieldId: 0, label: '液位', unit: '%' }
    ],
    handles: [
      { id: 'pressurant', type: 'target', position: 'top' },
      { id: 'output', type: 'source', position: 'bottom' }
    ]
  },
  {
    id: 'valve',
    name: '阀门',
    type: 'valve',
    style: {
      width: 60,
      height: 40,
      borderStyle: 'solid',
      borderRadius: 20,
      borderColor: '#409EFF',
      backgroundColor: 'var(--el-bg-color)'
    },
    fields: [
      { id: 'status', fieldId: 0, label: '状态' }
    ],
    handles: [
      { id: 'input', type: 'target', position: 'left' },
      { id: 'output', type: 'source', position: 'right' }
    ]
  },
  {
    id: 'regulator',
    name: '调压阀',
    type: 'regulator',
    style: {
      width: 70,
      height: 50,
      borderStyle: 'dashed',
      borderRadius: 8,
      borderColor: '#409EFF',
      backgroundColor: 'var(--el-bg-color)'
    },
    fields: [
      { id: 'setpoint', fieldId: 0, label: '设定', unit: 'MPa' }
    ],
    handles: [
      { id: 'input', type: 'target', position: 'left' },
      { id: 'output', type: 'source', position: 'right' }
    ]
  }
]

export const useComponentStore = defineStore('component', {
  state: () => ({
    templates: useLocalStorage('component.templates', defaultTemplates),
    components: useLocalStorage('component.customs', [] as CustomComponent[])
  }),
  actions: {
    createComponent(template?: ComponentTemplate): CustomComponent {
      const component: CustomComponent = template ? { ...template } : {
        id: `custom-${Date.now()}`,
        name: '自定义组件',
        type: 'custom',
        style: {
          width: 80,
          height: 80,
          borderStyle: 'solid',
          borderRadius: 4,
          borderColor: '#409EFF',
          backgroundColor: 'var(--el-bg-color)'
        },
        fields: [],
        handles: []
      }
      
      if (template) {
        component.id = `${template.type}-${Date.now()}`
        component.templateId = template.id
      }

      this.components.push(component)
      return component
    },
    updateComponent(component: CustomComponent) {
      const index = this.components.findIndex(c => c.id === component.id)
      if (index !== -1) {
        this.components[index] = component
      }
    },
    deleteComponent(componentId: string) {
      const index = this.components.findIndex(c => c.id === componentId)
      if (index !== -1) {
        this.components.splice(index, 1)
      }
    },
    exportConfig() {
      const data = JSON.stringify({
        templates: this.templates,
        components: this.components
      }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pipeline-components-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    async importConfig(file: File) {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.templates) this.templates = data.templates
        if (data.components) this.components = data.components
        return true
      } catch (error) {
        console.error('导入配置失败:', error)
        return false
      }
    }
  }
})