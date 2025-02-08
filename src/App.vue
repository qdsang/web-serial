<script setup lang="ts">
import { ref } from 'vue'
import SerialConfig from './components/SerialConfig.vue'
import SerialLog from './components/SerialLog.vue'
import Chart3D from './components/Chart3D.vue'
import ChartPanel from './components/ChartPanel.vue'
import DataTable from './components/DataTable.vue'
import SerialQuickSend from './components/SerialQuickSend.vue'
import SerialScripts from './components/SerialScript.vue'
import { useDark, useToggle } from '@vueuse/core'
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { ConfigManager } from './utils/ConfigManager'

const configManager = ConfigManager.getInstance()
const layoutConfig = configManager.useConfig('layout')

const isDark = useDark({
  initialValue: 'dark',
  storage: localStorage
})
const toggleDark = useToggle(isDark)

const isFullscreen = ref(false)

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const handleSplitResize = (options: { size: number}[]) => {
  layoutConfig.value.splitPaneSize = options[0].size
  handleResize()
}

const handleTabChange = () => {
  handleResize()
}

let resizeTimer: number
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('resize', { }))
  }, 100)
}
handleResize()

</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1><a href="https://github.com/qdsang/web-serial-debug" target="_blank">Web Serial</a></h1>
          <SerialConfig class="header-serial-config" />
        </div>
        <div class="header-links">
          <el-button
            class="theme-toggle"
            :icon="isDark ? 'Sunny' : 'Moon'"
            circle
            @click="toggleDark()"
          />
          <el-button
            class="fullscreen-toggle"
            :icon="'FullScreen'"
            circle
            @click="toggleFullscreen()"
          />
        </div>
      </div>
    </el-header>
    <el-container class="main-container">
      <Splitpanes class="default-theme" @resize="handleSplitResize">
        <Pane :size="layoutConfig.splitPaneSize" class="w75">
          <el-tabs type="card" class="lv-card lv-tabs" v-model="layoutConfig.leftActiveTab" @tab-click="handleTabChange">
            <el-tab-pane label="日志" lazy>
              <SerialLog />
            </el-tab-pane>
            <el-tab-pane label="可视化" lazy>
              <ChartPanel />
            </el-tab-pane>
            <el-tab-pane label="姿态" lazy>
              <Chart3D />
            </el-tab-pane>
            <el-tab-pane label="数据表">
              <DataTable />
            </el-tab-pane>
          </el-tabs>
        </Pane>
        <Pane class="w25">
          <el-tabs type="card" class="lv-card lv-tabs" v-model="layoutConfig.rightActiveTab">
            <el-tab-pane label="快捷发送">
              <SerialQuickSend />
            </el-tab-pane>
            <el-tab-pane label="脚本">
              <SerialScripts />
            </el-tab-pane>
            <el-tab-pane label="设置">
            </el-tab-pane>
          </el-tabs>
        </Pane>
      </Splitpanes>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background-color: var(--el-bg-color-overlay);
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-content h1 {
  color: var(--el-text-color-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(120deg, #6366f1 0%, #2dd4bf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
}

.header-serial-config {
  margin: 0;
}

.header-serial-config :deep(.el-card) {
  background: transparent;
  border: none;
  color: var(--el-text-color-primary);
}

.header-serial-config :deep(.el-card .el-form) {
  display: flex;
  gap: 10px;
}

.header-serial-config :deep(.el-form-item__label) {
  color: var(--el-text-color-primary);
}

.header-serial-config :deep(.el-input__wrapper),
.header-serial-config :deep(.el-select .el-input__wrapper) {
  background-color: var(--el-bg-color);
  box-shadow: none;
}

.header-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-links a {
  color: var(--el-text-color-primary);
  text-decoration: none;
}

.header-links a:hover {
  color: var(--el-color-primary);
}

.main-container {
  width: 100%;
  height: calc(100vh - 60px);
  background-color: var(--el-bg-color-overlay);
}

.fullscreen-toggle {
  margin-left: 0px;
}

.lv-card {
  height: 100%;
}
.lv-card :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}

:deep(.splitpanes__splitter) {
  background-color: var(--el-border-color) !important;
  border: none;
}

:deep(.splitpanes__pane) {
  background-color: transparent;
}
.w75 {
  width: 75%;
}
.w25 {
  width: 25%;
}
</style>
<style lang="less">
html {
  background-color: var(--el-bg-color-overlay);
}

html.dark .el-button {
  --el-button-divide-border-color: rgba(0, 0, 0, 0.5);
}

.lv-tabs {

  .el-tabs__content {
    flex: 1;
    overflow-y: auto;
  }

  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__nav {
    border: 0 none;
  }
  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item {
    font-size: 12px;
    border: 0 none;
    border-radius: 4px;
    margin: 8px 0 0 8px;
    padding: 0px 6px;
    height: 24px;
    transition: all .1s;
    user-select:none;
  }
  &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item.is-active {
    background-color: #f5f5f5;
    color: #191919;
  }
  .el-tabs__item.is-top {
    border: 0 none;
  }
  .el-tabs__item:hover {
    color: #999;
  }
  .el-tabs__header {
    margin: 0;
    align-items: flex-start;
  }
  .el-tab-pane {
    height: 100%;
  }
}

.dark {
  .dash-tabs {
    &.el-tabs.el-tabs--top.el-tabs--card>.el-tabs__header .el-tabs__item.is-active {
      background-color: #383838;
      color: #fff;
    }
  }
}

.el-card {
  --el-card-padding: 12px;
}
</style>
<style>
.splitpanes.default-theme .splitpanes__pane {
  background-color: var(--el-bg-color-overlay);
}
.dark .default-theme.splitpanes--vertical>.splitpanes__splitter, 
.dark .default-theme .splitpanes--vertical>.splitpanes__splitter {
  border-color: #333;
}
</style>
