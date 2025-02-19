import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface DataPoint {
  timestamp: number
  values: Record<string, number>
}

export const useDataStore = defineStore('data', () => {
  const dataPoints = ref<DataPoint[]>([])
  const fields = ref<string[]>([])
  const timeRange = ref<[number, number] | null>(null)
  const isRealtime = ref(true)
  const maxDataPoints = ref(10000) // 限制数据点数量，避免内存占用过大

  const addDataPoint = (timestamp: number, values: Record<string, number>) => {
    // 更新字段列表
    Object.keys(values).forEach(field => {
      if (!fields.value.includes(field)) {
        fields.value.push(field)
      }
    })

    // 添加数据点
    dataPoints.value.push({ timestamp, values })

    // 限制数据点数量
    if (dataPoints.value.length > maxDataPoints.value) {
      dataPoints.value = dataPoints.value.slice(-maxDataPoints.value)
    }

    // 如果是实时模式，自动更新时间范围到最新
    if (isRealtime.value) {
      const latest = dataPoints.value[dataPoints.value.length - 1].timestamp
      timeRange.value = [latest - 30000, latest] // 默认显示最近30秒的数据
    }
  }

  const setTimeRange = (range: [number, number]) => {
    timeRange.value = range
    isRealtime.value = false
  }

  const toggleRealtime = (value: boolean) => {
    isRealtime.value = value
    if (value && dataPoints.value.length > 0) {
      const latest = dataPoints.value[dataPoints.value.length - 1].timestamp
      timeRange.value = [latest - 30000, latest]
    }
  }

  const visibleData = computed(() => {
    if (!timeRange.value || dataPoints.value.length === 0) return []
    const [start, end] = timeRange.value
    return dataPoints.value.filter(point => 
      point.timestamp >= start && point.timestamp <= end
    )
  })

  const clearData = () => {
    dataPoints.value = []
    timeRange.value = null
    isRealtime.value = true
  }

  return {
    dataPoints,
    fields,
    timeRange,
    isRealtime,
    visibleData,
    addDataPoint,
    setTimeRange,
    toggleRealtime,
    clearData
  }
})