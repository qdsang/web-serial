<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SerialHelper } from '../utils/SerialHelper'
import { ConfigManager } from '../utils/ConfigManager'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from '@xterm/addon-search';
import { useDark } from '@vueuse/core'
import 'xterm/css/xterm.css'

const configManager = ConfigManager.getInstance()
const displayConfig = configManager.useConfig('display')
const isDark = useDark()

const logOptions = ref(displayConfig.value)
const serialHelper = SerialHelper.getInstance()
let logBufferAll: string[] = []
let logBuffer = new Uint8Array()
let timeoutId: number | null = null
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

const clearLog = () => {
  if (terminal) {
    terminal.clear()
  }
  logBufferAll = []
}

const handleTerminalData = (data: string) => {
  window.dispatchEvent(new CustomEvent('serial-send', { detail: new TextEncoder().encode(data) }))
}

const getTerimalTheme = (val: boolean) => {
  return val ? {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      selectionBackground: '#3a3a3a',
    } : {
      background: '#ffffff',
      foreground: '#000000',
      selectionBackground: '#d4d4d4',
    }
}

const initTerminal = () => {
  terminal = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace',
    fontSize: 14,
    theme: getTerimalTheme(isDark.value),
    scrollback: 10000  // 增加缓冲区大小到10000行
  })
  
  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  terminal.onData(handleTerminalData)
  
  const terminalElement = document.getElementById('terminal')
  if (terminalElement) {
    terminal.open(terminalElement)
    // 显示欢迎信息
    const logo = `
\x1b[36m   _    _      _      ____            _       _ 
  | |  | |    | |    / ___|          (_)     | |
  | |  | | ___| |__ \\___ \\ ___ _ __ _  __ _| |
  | |/\\| |/ _ \\ '_ \\___) / _ \\ '__| |/ _\` | |
  \\  /\\  /  __/ |_) |__/ /  __/ |  | | (_| | |
   \\/  \\/ \\___|_.__/|____/\\___|_|  |_|\\__,_|_|
\x1b[0m
\x1b[35m=== Web Serial Debug Tool ===\x1b[0m
\x1b[32m版本: v1.5.0\x1b[0m
\x1b[0m
功能特点:
- 🔌 支持串口和WebUSB设备连接
- 📝 实时数据收发显示
- 🎨 支持文本和HEX格式数据发送
- 📜 支持自定义脚本编写和执行
- 🎯 快捷发送功能
- ⚙️ 可配置的显示选项
- 🌙 暗色主题支持

\x1b[33m开始使用:
1. 点击顶部的连接按钮选择串口设备
2. 配置串口参数（波特率等）
3. 开始接收/发送数据\x1b[0m

`
    terminal.write(logo)
  }

  setTimeout(() => {
      fitAddon?.fit()
  }, 120)
}

const toggleOption = (option: string) => {
  if (option in logOptions.value) {
    // @ts-ignore
    logOptions.value[option] = !logOptions.value[option as keyof typeof logOptions.value]
  }
}

const processSerialData = (data: Uint8Array) => {
  logBuffer = new Uint8Array([...logBuffer, ...data])
  
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  timeoutId = window.setTimeout(() => {
    const message = serialHelper.formatLogMessage(logBuffer, logOptions.value)
    if (terminal) {
      terminal.write(message)
      if (logOptions.value.autoScroll) {
        terminal.scrollToBottom()
      }
      logBufferAll.push(message)
    }
    logBuffer = new Uint8Array()
  }, logOptions.value.timeOut)
}

watch(isDark, (newValue) => {
  if (terminal) {
    terminal.options.theme = getTerimalTheme(newValue)
  }
})

const handleResize = () => {
  setTimeout(() => {
      fitAddon?.fit()
  }, 120)
}

onMounted(() => {
  initTerminal()

  window.addEventListener('serial-data', ((event: CustomEvent) => {
    processSerialData(event.detail)
  }) as EventListener)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('serial-data', ((event: CustomEvent) => {
    processSerialData(event.detail)
  }) as EventListener)
  window.removeEventListener('resize', handleResize)
  
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  if (terminal) {
    terminal.dispose()
  }
})

const exportLog = () => {
  if (!terminal) return
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `serial-log-${timestamp}.txt`
  const content = logBufferAll.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="serial-log">
    <div class="controls">
      <el-button-group class="me-2">
        <el-button
          :type="logOptions.showTime ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('showTime')"
        >
          时间
        </el-button>
        <el-button
          :type="logOptions.showMs ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('showMs')"
        >
          毫秒
        </el-button>
        <el-button
          :type="logOptions.showHex ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('showHex')"
        >
          HEX
        </el-button>
        <el-button
          :type="logOptions.showText ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('showText')"
        >
          TEXT
        </el-button>
        <el-button
          :type="logOptions.showNewline ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('showNewline')"
        >
          换行
        </el-button>
      </el-button-group>

      <el-button-group class="me-2" style="white-space: nowrap;">
        <el-button
          :type="logOptions.autoScroll ? 'primary' : 'default'"
          size="small"
          @click="toggleOption('autoScroll')"
        >
          自动滚动
        </el-button>
        <el-button
          type="danger"
          size="small"
          @click="clearLog"
        >
          清空
        </el-button>
        <el-button
          type="primary"
          size="small"
          @click="exportLog"
        >
          导出
        </el-button>
      </el-button-group>

      <el-tooltip
        class="box-item"
        effect="dark"
        content="分包超时时间(ms)"
        placement="bottom"
      >
        <el-input-number
          v-model="logOptions.timeOut"
          :min="0"
          :max="3000"
          :step="5"
          size="small"
        >
          <template #prefix></template>
          <template #suffix>
            <span>ms</span>
          </template>
        </el-input-number>
      </el-tooltip>

    </div>

    <div class="terminal-container">
      <div id="terminal"></div>
    </div>
  </div>
</template>

<style scoped>
.serial-log {
  /* margin-bottom: 10px; */
  /* height: 100%; */
  display: flex;
  flex-direction: column;
}
.serial-log :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
}

.controls {
  display: flex;
  align-items: center;
  padding: 10px;
}

.terminal-container {
  height: 100%;
  /* background-color: #1e1e1e; */
}

#terminal {
  height: 100%;
}

.me-2 {
  margin-right: 8px;
}
</style>