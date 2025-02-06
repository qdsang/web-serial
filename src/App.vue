<script setup lang="ts">
import SerialConfig from './components/SerialConfig.vue'
import SerialLog from './components/SerialLog.vue'
import SerialSend from './components/SerialSend.vue'
import SerialQuickSend from './components/SerialQuickSend.vue'
import SerialScripts from './components/SerialScript.vue'
import { useDark, useToggle } from '@vueuse/core'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const isDark = useDark({
  // initialValue: 'dark',
  // storage: localStorage
})
const toggleDark = useToggle(isDark)
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1>Web Serial</h1>
          <SerialConfig class="header-serial-config" />
        </div>
        <div class="header-links">
          <el-button
            class="theme-toggle"
            :icon="isDark ? 'Sunny' : 'Moon'"
            circle
            @click="toggleDark()"
          />
          <a href="https://github.com/qdsang/web-serial" target="_blank">Github</a>
        </div>
      </div>
    </el-header>
    <el-container class="main-container">
      <Splitpanes>
        <Pane>
          <el-tabs type="card" class="lv-card lv-tabs">
            <el-tab-pane label="日志">
              <el-main>
                <SerialLog />
                <SerialSend />
              </el-main>
            </el-tab-pane>
          </el-tabs>
        </Pane>
        <Pane :size="25" :min-size="20" :max-size="50">
          <el-tabs type="card" class="lv-card lv-tabs">
            <el-tab-pane label="快捷发送">
              <SerialQuickSend />
            </el-tab-pane>
            <el-tab-pane label="脚本">
              <SerialScripts />
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
  height: calc(100vh - 60px);
  background-color: var(--el-bg-color-overlay);
}

.el-main {
  padding: 0px;
  height: 100%;
  display: flex;
  flex-direction: column;
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
</style>
<style lang="less">
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

</style>
<style>
.dark .splitpanes.default-theme .splitpanes__pane {
  background-color: var(--el-border-color) !important;
}
.dark .default-theme.splitpanes--vertical>.splitpanes__splitter, 
.dark .default-theme .splitpanes--vertical>.splitpanes__splitter {
  border-color: #333;
}
.el-button:active, .el-button:foucs {
  outline: 0;
}
</style>
