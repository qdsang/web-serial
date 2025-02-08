import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
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


export const useQuickSendStore = defineStore('quickSend', () => {
  const serialHelper = SerialHelper.getInstance()
  const groups = ref<QuickSendGroup[]>([])
  const currentGroupId = ref<number>(0)
  const currentGroup = computed(() => groups.value.find(g => g.id === currentGroupId.value) || groups.value[0])
  const autoSendIntervals = ref<Record<number, number>>({})
  const autoSendInterval = ref(1000)

  // 验证HEX格式数据
  const validateHexData = (data: string): boolean => {
    const hexPattern = /^[0-9A-Fa-f\s]*$/
    return hexPattern.test(data)
  }

  // 发送数据
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

  // 切换自动发送
  const toggleAutoSend = (item: QuickSendItem) => {
    const intervalId = autoSendIntervals.value[item.id]
    if (intervalId) {
      clearInterval(intervalId)
      delete autoSendIntervals.value[item.id]
    } else {
      autoSendIntervals.value[item.id] = window.setInterval(() => sendData(item), autoSendInterval.value)
    }
  }

  // 添加项目
  const addItem = () => {
    currentGroup.value.items.push({
      id: Date.now(),
      name: '新建项目',
      content: '',
      type: 'text'
    })
  }

  // 删除项目
  const removeItem = (id: number) => {
    const index = currentGroup.value.items.findIndex(item => item.id === id)
    if (index > -1) {
      currentGroup.value.items.splice(index, 1)
    }
  }

  // 添加分组
  const addGroup = (name: string) => {
    if (name) {
      groups.value.push({
        id: Date.now(),
        name,
        items: []
      })
    }
  }

  // 删除分组
  const removeGroup = () => {
    if (groups.value.length <= 1) {
      ElMessage.warning('至少保留一个分组')
      return
    }
    const index = groups.value.findIndex(group => group.id === currentGroup.value.id)
    if (index > -1) {
      groups.value.splice(index, 1)
      if (groups.value.length == 0) {
        addGroup('默认分组')
      }
      setCurrentGroup(groups.value[0])
    }
  }

  // 重命名分组
  const renameGroup = (name: string) => {
    if (name) {
      currentGroup.value.name = name
    }
  }

  const setCurrentGroup = (group: QuickSendGroup) => {
    currentGroupId.value = group.id
  }

  // 切换分组
  const handleGroupChange = (groupId: number) => {
    console.log('切换分组', groupId, groups)
    currentGroupId.value = groupId
  }

  // 导入配置
  const importConfig = (data: any) => {
    try {
      if (!Array.isArray(data) || !data.every(group =>
        typeof group === 'object' &&
        typeof group.id === 'number' &&
        typeof group.name === 'string' &&
        Array.isArray(group.items)
      )) {
        throw new Error('配置文件格式错误')
      }
      groups.value = data
      setCurrentGroup(groups.value[0])
      ElMessage.success('导入成功')
    } catch (error) {
      ElMessage.error(`导入失败：${error instanceof Error ? error.message : '无效的配置文件'}`)
    }
  }

  // 导出配置
  const exportConfig = () => {
    return JSON.stringify(groups.value, null, 2)
  }

  // 保存到本地存储
  const saveToLocalStorage = () => {
    localStorage.setItem('config.quickSendGroups', JSON.stringify(groups.value))
  }

  // 从本地存储加载
  const loadFromLocalStorage = () => {
    const savedGroups = localStorage.getItem('config.quickSendGroups')
    if (savedGroups) {
      try {
        groups.value = JSON.parse(savedGroups)
      } catch (error) {
        ElMessage.error('加载配置失败')
      }
    }
    if (groups.value.length == 0) {
      groups.value = [
      {
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
      }]
    }
    setCurrentGroup(groups.value[0])
  }

  // 监听数据变化，自动保存
  watch([groups, currentGroup], () => {
    saveToLocalStorage()
  }, { deep: true })

  // 初始化时加载数据
  loadFromLocalStorage()

  return {
    groups,
    currentGroupId,
    currentGroup,
    autoSendIntervals,
    autoSendInterval,
    sendData,
    toggleAutoSend,
    addItem,
    removeItem,
    addGroup,
    removeGroup,
    renameGroup,
    handleGroupChange,
    importConfig,
    exportConfig
  }
})