<script setup lang="ts">
import { ref } from 'vue'
import { ConfigManager } from '../utils/ConfigManager'
import ChartPanel from './ChartPanel.vue'
import DataTable from './DataTable.vue'
import Chart3D from './Chart3D.vue'
import { useDark } from '@vueuse/core'
// @ts-ignore
import VueDraggableResizable from 'vue-draggable-resizable'
import 'vue-draggable-resizable/style.css'

const configManager = ConfigManager.getInstance()
const canvasConfig = configManager.useConfig('canvas')

interface CanvasItem {
  id: number
  type: string
  x: number
  y: number
  width: number
  height: number
}

const items = ref<CanvasItem[]>(canvasConfig.value?.items || [])
const isDark = useDark()

const componentMap = {
  'chart': ChartPanel,
  'table': DataTable,
  '3d': Chart3D
} as Record<string, any>

const addComponent = (type: string) => {
  const newItem: CanvasItem = {
    id: Date.now(),
    type,
    x: 0,
    y: 0,
    width: 400,
    height: 300
  }
  items.value.push(newItem)
  saveLayout()
}

const gridSize = 10

const snapToGrid = (value: number): number => {
  return Math.round(value / gridSize) * gridSize
}

const onResize = (x: number, y: number, width: number, height: number, id: number) => {
  const item = items.value.find(item => item.id === id)
  if (item) {
    item.x = snapToGrid(x)
    item.y = snapToGrid(y)
    item.width = snapToGrid(width)
    item.height = snapToGrid(height)
    saveLayout()
  }
}

const onDrag = (x: number, y: number, id: number) => {
  const item = items.value.find(item => item.id === id)
  if (item) {
    item.x = snapToGrid(x)
    item.y = snapToGrid(y)
    saveLayout()
  }
}

const removeItem = (id: number) => {
  const index = items.value.findIndex(item => item.id === id)
  if (index !== -1) {
    items.value.splice(index, 1)
    saveLayout()
  }
}

const saveLayout = () => {
  configManager.setConfig('canvas', { items: items.value })
}

</script>

<template>
  <div class="canvas-panel">
    <div class="toolbar">
      <el-button-group class="tool-group">
        <el-button type="primary" size="small" @click="addComponent('chart')">添加图表</el-button>
        <el-button type="primary" size="small" @click="addComponent('table')">添加数据表</el-button>
        <el-button type="primary" size="small" @click="addComponent('3d')">添加3D视图</el-button>
      </el-button-group>
    </div>
    <div class="canvas-container" :class="{ 'dark': isDark }">
      <div class="grid-background"></div>
      <vue-draggable-resizable
        v-for="item in items"
        :key="item.id"
        :x="item.x"
        :y="item.y"
        :w="item.width"
        :h="item.height"
        :width="item.width"
        :height="item.height"
        :draggable="true"
        :resizable="true"
        :grid=[gridSize,gridSize]
        :snap="true"
        :snap-tolerance="gridSize"
        class="canvas-item"
        @resizing="(x: number, y: number, width: number, height: number) => onResize(x, y, width, height, item.id)"
        @dragging="(x: number, y: number) => onDrag(x, y, item.id)"
      >
        <component :is="componentMap[item.type]" />
        <el-button
          class="remove-btn"
          type="danger"
          circle
          size="small"
          @click="removeItem(item.id)"
          icon="Delete"
        />
      </vue-draggable-resizable>
    </div>
  </div>
</template>

<style scoped>
.canvas-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.toolbar {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
}

.tool-group {
  display: flex;
  gap: 8px;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: 20px;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background-size: 4px 4px;
  background-image: linear-gradient(to right, var(--el-border-color-lighter) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--el-border-color-lighter) 1px, transparent 1px);
  pointer-events: none; */
}

.canvas-item {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 100;
}
</style>