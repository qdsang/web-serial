import { defineStore } from 'pinia'

interface DataField {
  id: number
  key: string
  name: string
  description: string
  value: any
  dataType: 'number' | 'string' | 'boolean' | 'object'
  min: number | null
  max: number | null
  lastUpdate: number
  updateCount: number
  isEditing: boolean
}

interface ColumnVisibility {
  key: boolean
  name: boolean
  description: boolean
  value: boolean
  dataType: boolean
  min: boolean
  max: boolean
  lastUpdate: boolean
  updateCount: boolean
}

export const useFieldStore = defineStore('field', {
  state: () => ({
    fields: [] as DataField[],
    nextId: 1,
    columnVisibility: {
      key: true,
      name: false,
      dataType: true,
      description: false,
      value: true,
      min: false,
      max: false,
      lastUpdate: true,
      updateCount: true
    } as ColumnVisibility
  }),
  actions: {
    createField(key: string, value: any, dataType?: 'number' | 'string' | 'boolean' | 'object'): DataField {
      const field = {
        id: this.nextId++,
        key,
        name: key,
        description: '',
        value,
        dataType: dataType || 'number',
        min: typeof value === 'number' ? value : null,
        max: typeof value === 'number' ? value : null,
        lastUpdate: Date.now(),
        updateCount: 1,
        isEditing: false
      }
      this.fields.push(field)
      this.saveToLocalStorage()
      return field
    },
    initDefaultFields() {
      if (this.fields.length === 0) {
        this.createField('pitch', 0, 'number')
        this.createField('roll', 0, 'number')
        this.createField('yaw', 0, 'number')
      }
    },
    updateField(field: DataField, value: any) {
      field.value = value
      field.lastUpdate = Date.now()
      field.updateCount++

      if (typeof value === 'number') {
        if (field.min === null || value < field.min) field.min = value
        if (field.max === null || value > field.max) field.max = value
      }
      this.saveToLocalStorage()
    },
    deleteField(fieldId: number) {
      const index = this.fields.findIndex(f => f.id === fieldId)
      if (index !== -1) {
        this.fields.splice(index, 1)
        this.saveToLocalStorage()
      }
    },
    toggleColumnVisibility() {
      localStorage.setItem('columnVisibility', JSON.stringify(this.columnVisibility))
    },
    saveToLocalStorage() {
      localStorage.setItem('fields', JSON.stringify(this.fields))
      localStorage.setItem('nextId', String(this.nextId))
    },
    loadFromLocalStorage() {
      const fieldsStr = localStorage.getItem('fields')
      const nextIdStr = localStorage.getItem('nextId')
      const columnVisibilityStr = localStorage.getItem('columnVisibility')

      if (fieldsStr) {
        this.fields = JSON.parse(fieldsStr)
      }
      if (nextIdStr) {
        this.nextId = parseInt(nextIdStr, 10)
      }
      if (columnVisibilityStr) {
        this.columnVisibility = JSON.parse(columnVisibilityStr)
      }
      this.initDefaultFields()
    },
    exportData() {
      const data = JSON.stringify(this.fields, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `data-export-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    async importData(file: File) {
      try {
        const text = await file.text()
        const data = JSON.parse(text) as DataField[]
        this.fields = data
        this.saveToLocalStorage()
        return true
      } catch (error) {
        console.error('导入数据失败:', error)
        return false
      }
    }
  }
})