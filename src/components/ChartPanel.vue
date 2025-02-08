<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useDark } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { useFieldStore } from '../store/fieldStore'
import { ConfigManager } from '../utils/ConfigManager'

const fieldStore = useFieldStore()

interface ChartConfig {
  id: number
  name: string
  fields: string[]
  data: number[][]
  timestamps: number[]
  uplot: uPlot | null
  container: HTMLElement | null
}

const configManager = ConfigManager.getInstance()
const chartConfig = configManager.useConfig('charts')

const charts = ref<ChartConfig[]>([])
let nextChartId = computed(() => {
  const maxId = charts.value.reduce((max, chart) => Math.max(max, chart.id), 0)
  return maxId + 1
})
const isDark = useDark()

const darkTheme = {
  background: '#1e1e1e',
  gridColor: '#2c2c2c',
  textColor: '#d4d4d4',
  lineColors: ['#4a9eff', '#ff4a4a', '#4aff4a', '#ffd700', '#ff4aff', '#4affff']
}

const lightTheme = {
  background: '#ffffff',
  gridColor: '#f0f0f0',
  textColor: '#333333',
  lineColors: ['#3366ff', '#ff3333', '#33ff33', '#ffcc00', '#ff33ff', '#33ffff']
}

const currentTheme = computed(() => isDark.value ? darkTheme : lightTheme)

const createChart = (name: string) => {
  const chart: ChartConfig = {
    id: nextChartId.value,
    name,
    fields: [],
    data: [[]],
    timestamps: [],
    uplot: null,
    container: null
  }
  charts.value.push(chart)
  saveChartsConfig()
  return chart
}

const resetChartData = (chartId: number) => {
  const chart = charts.value.find(c => c.id === chartId)
  if (!chart) return

  chart.data = [[]]
  chart.timestamps = []
  chart.fields.forEach(() => chart.data.push([]))

  if (chart.uplot) {
    // @ts-ignore
    chart.uplot.setData(chart.data)
  }
}

const saveChartsConfig = () => {
  const config = charts.value.map(chart => ({
    id: chart.id,
    name: chart.name,
    fields: chart.fields
  }))
  chartConfig.value.list = config
}

const loadChartsConfig = () => {
  const config = chartConfig.value.list || []
  if (!Array.isArray(config)) return

  config.forEach(chartData => {
    const chart = createChart(chartData.name)
    chart.id = chartData.id
    chartData.fields.forEach(field => addField(chart.id, field))
  })
}

const initUplot = (chart: ChartConfig, container: HTMLElement) => {
  const opts = {
    width: container.clientWidth || 200,
    height: 300,
    // title: chart.name,
    cursor: {
      sync: {
        key: 0,
      }
    },
    series: [
      {
        label: 'Time',
        value: (_: number, v: number) => {
          if(!v) return '--';
          let d = new Date(v * 1000);
          return d.toLocaleString() + '.' + d.getMilliseconds()
        }
      },
      ...chart.fields.map((field, i) => ({
        label: field,
        stroke: currentTheme.value.lineColors[i % currentTheme.value.lineColors.length]
      }))
    ],
    axes: [
      {
        stroke: currentTheme.value.textColor,
        grid: { stroke: currentTheme.value.gridColor }
      },
      {
        stroke: currentTheme.value.textColor,
        grid: { stroke: currentTheme.value.gridColor }
      }
    ],
    scales: {
      x: { time: true }
    }
  }

  // @ts-ignore
  chart.uplot = new uPlot(opts, chart.data, container)
  chart.container = container
}

const updateChartData = (event: CustomEvent) => {
  const data = event.detail
  if (typeof data !== 'object' || data === null) return

  const timestamp = Date.now()

  charts.value.forEach(chart => {
    if (chart.fields.length === 0) return

    chart.timestamps.push(timestamp/1000)
    let dataNum = 0
    const newData = [chart.timestamps, ...chart.fields.map((field, index) => {
      const value = data[field]
      let d1 = null
      if (typeof value === 'number') {
        dataNum++
        d1 = value
      }
      // @ts-ignore
      chart.data[index + 1].push(d1)
      return chart.data[index + 1]
    })]
    if (dataNum == 0) return

    if (chart.uplot) {
      // @ts-ignore
      chart.uplot.setData(newData)
    }
    chart.data = newData
  })
}

const handleTitleChange = () => {
  saveChartsConfig()
}

const handleFieldsChange = (chart: ChartConfig) => {
  // 重新初始化数据数组
  chart.data = [chart.timestamps]
  chart.fields.forEach(() => chart.data.push([]))

  saveChartsConfig()

  if (chart.uplot) {
    chart.uplot.destroy()
    if (chart.container) {
      initUplot(chart, chart.container)
    }
  }
}

const addField = (chartId: number, field: string) => {
  const chart = charts.value.find(c => c.id === chartId)
  if (!chart) return

  if (chart.fields.includes(field)) {
    ElMessage.warning('该字段已添加到图表中')
    return
  }

  chart.fields.push(field)
  chart.data.push([])
  saveChartsConfig()

  if (chart.uplot) {
    chart.uplot.destroy()
    if (chart.container) {
      initUplot(chart, chart.container)
    }
  }
}

const removeChart = (chartId: number) => {
  const index = charts.value.findIndex(c => c.id === chartId)
  if (index === -1) return

  const chart = charts.value[index]
  if (chart.uplot) {
    chart.uplot.destroy()
  }

  charts.value.splice(index, 1)
  saveChartsConfig()
}

const handleResize = () => {
  charts.value.forEach(chart => {
    if (chart.uplot && chart.container) {
      let w = chart.container.clientWidth
      w && chart.uplot.setSize({
        width: w,
        height: chart.uplot.height
      })
    }
  })
}

onMounted(() => {
  loadChartsConfig()
  window.addEventListener('data-update', updateChartData as EventListener)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('data-update', updateChartData as EventListener)
  window.removeEventListener('resize', handleResize)
  charts.value.forEach(chart => {
    if (chart.uplot) {
      chart.uplot.destroy()
    }
  })
})
</script>

<template>
  <div class="chart-panel">
    <div class="chart-controls">
      <el-button @click="createChart('新图表')" type="primary" size="small">
        添加图表
      </el-button>
    </div>
    <div class="charts-container">
      <div v-for="chart in charts" :key="chart.id" class="chart-item">
        <div class="chart-header">
          <el-input
            v-model="chart.name"
            size="small"
            placeholder="图表名称"
            class="chart-name-input"
            @change="handleTitleChange"
          />
          <el-select
            v-model="chart.fields"
            multiple
            filterable
            placeholder="选择字段"
            size="small"
            style="min-width: 200px"
            @change="handleFieldsChange(chart)"
          >
            <el-option
              v-for="field in fieldStore.fields.map(f => f.key)"
              :key="field"
              :label="field"
              :value="field"
            />
          </el-select>
          <el-button
            @click="removeChart(chart.id)"
            type="danger"
            size="small"
            circle
          >
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-button
            @click="resetChartData(chart.id)"
            style="margin-left: 0"
            type="warning"
            size="small"
            circle
          >
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </div>
        <div class="chart-content">
          <div
            :ref="(el: any) => { if (el && !chart.uplot) initUplot(chart, el) }"
            class="chart-container"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.chart-controls {
  margin-bottom: 16px;
}

.charts-container {
  flex: 1;
}

.chart-item {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.chart-name-input {
  max-width: 200px;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 20px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.field-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>