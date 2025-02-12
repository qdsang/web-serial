<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SerialHelper } from '../utils/SerialHelper'
import { ConfigManager } from '../utils/ConfigManager'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from '@xterm/addon-search';
import { useDark } from '@vueuse/core'
import 'xterm/css/xterm.css'

import { EventCenter, EventNames } from '../utils/EventCenter'

const eventCenter = EventCenter.getInstance()

const configManager = ConfigManager.getInstance()
const displayConfig = configManager.useConfig('display')
const isDark = useDark()

const logOptions = ref(displayConfig.value)
const serialHelper = SerialHelper.getInstance()
let logBufferAll: string[] = []
let logBuffer = new Uint8Array()
let timeoutId: number | null = null
let timeoutDelt: number = 0
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
// let terminalWriteBuffer = new Uint8Array()
const receivedBytes = ref(0)

const clearLog = () => {
  if (terminal) {
    terminal.clear()
  }
  logBufferAll = []
  receivedBytes.value = 0
}

const handleTerminalData = (data: string) => {
  eventCenter.emit(EventNames.SERIAL_SEND, new TextEncoder().encode(data))
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
    // 显示欢迎信息 https://patorjk.com/software/taag/#p=display&f=Big&t=Serial%20Tool
    const logo = `
\x1b[36m   _____           _       _   _______          _ 
  / ____|         (_)     | | |__   __|        | |
 | (___   ___ _ __ _  __ _| |    | | ___   ___ | |
  \\___ \\ / _ \\ '__| |/ _\` | |    | |/ _ \\ / _ \\| |
  ____) |  __/ |  | | (_| | |    | | (_) | (_) | |
 |_____/ \\___|_|  |_|\\__,_|_|    |_|\\___/ \\___/|_|

\x1b[0m
\x1b[35m=== Serial Tool ===\x1b[0m
\x1b[32m版本: v2.1.0\x1b[0m
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
  receivedBytes.value += data.length
  
  if (logOptions.value.timeOut == 0) {
    processSerialDataHanlde()
    return
  }

  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  if (timeoutDelt == 0) {
    timeoutDelt = Date.now()
  } else {
    const delt = Date.now() - timeoutDelt
    if (delt >= logOptions.value.timeOut) {
      timeoutDelt = 0
      processSerialDataHanlde()
      return
    }
  }

  timeoutId = window.setTimeout(() => {
    timeoutDelt = 0
    processSerialDataHanlde()
  }, logOptions.value.timeOut)
}

const processSerialDataHanlde = () => {
  const message = serialHelper.formatLogMessage(logBuffer, logOptions.value)
  if (terminal) {
    // terminalWriteBuffer = new Uint8Array([...terminalWriteBuffer, ...message])
    requestAnimationFrame(() => {
      if (terminal) {
        // let buff = terminalWriteBuffer
        // terminalWriteBuffer = new Uint8Array()
        terminal.write(message)
        if (logOptions.value.autoScroll) {
          terminal.scrollToBottom()
        }
      }
    })
    // terminal.write(message)
    // if (logOptions.value.autoScroll) {
    //   terminal.scrollToBottom()
    // }
    logBufferAll.push(message)
  }
  logBuffer = new Uint8Array()
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

const termWriteHandle = (data: Uint8Array) => {
  if (terminal) {
    let str = serialHelper.uint8ArrayToString(data)
    // console.log('termWriteHandle', str, str.length)
    terminal.write(str)
  }
}

onMounted(() => {
  initTerminal()

  eventCenter.on(EventNames.SERIAL_DATA, processSerialData)
  eventCenter.on(EventNames.TERM_WRITE, termWriteHandle)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  eventCenter.off(EventNames.SERIAL_DATA, processSerialData)
  eventCenter.off(EventNames.TERM_WRITE, termWriteHandle)
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

      <div class="received-bytes">
        <span>接收: {{ receivedBytes }} 字节</span>
      </div>
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
  padding: 12px;
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

.received-bytes {
  margin-left: 16px;
  color: var(--el-text-color-regular);
  font-size: 14px;
}
</style>