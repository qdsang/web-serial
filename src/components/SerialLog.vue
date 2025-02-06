<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { SerialHelper } from '../utils/SerialHelper'
import { ConfigManager } from '../utils/ConfigManager'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

const configManager = ConfigManager.getInstance()
const displayConfig = configManager.useConfig('display')

const logOptions = ref(displayConfig.value)
const timeOut = ref(displayConfig.value.timeOut)
const serialHelper = SerialHelper.getInstance()
let logBuffer = new Uint8Array()
let timeoutId: number | null = null
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

const clearLog = () => {
  if (terminal) {
    terminal.clear()
  }
}

const handleTerminalData = (data: string) => {
  window.dispatchEvent(new CustomEvent('serial-send', { detail: new TextEncoder().encode(data) }))
}

const initTerminal = () => {
  terminal = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace',
    fontSize: 14,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4'
    }
  })
  
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  terminal.onData(handleTerminalData)
  
  const terminalElement = document.getElementById('terminal')
  if (terminalElement) {
    terminal.open(terminalElement)
    // fitAddon.fit()
  }

  setTimeout(() => {
      fitAddon.fit()
  }, 60)
}

const handleTimeOutChange = (value: number) => {
  timeOut.value = value
}

const toggleOption = (option: keyof LogOptions) => {
  logOptions.value[option] = !logOptions.value[option]
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
    }
    logBuffer = new Uint8Array()
  }, timeOut.value)
}

onMounted(() => {
  initTerminal()

  window.addEventListener('serial-data', ((event: CustomEvent) => {
    processSerialData(event.detail)
  }) as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('serial-data', ((event: CustomEvent) => {
    processSerialData(event.detail)
  }) as EventListener)
  
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
  const blob = new Blob([terminal.buffer.getLine(0)?.translateToString() || ''], { type: 'text/plain;charset=utf-8' })
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

      <el-button-group style="white-space: nowrap;">
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
        content="分包超时时间 ms"
        placement="bottom"
      >
        <el-input-number
          v-model="timeOut"
          :min="0"
          :max="1000"
          size="small"
          @change="handleTimeOutChange"
          class="me-2"
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
  height: 100%;
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
  background-color: #1e1e1e;
}

#terminal {
  height: 100%;
}

.me-2 {
  margin-right: 8px;
}
</style>