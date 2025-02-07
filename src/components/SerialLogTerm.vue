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
    theme: getTerimalTheme(isDark.value)
  })
  
  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  terminal.onData(handleTerminalData)
  
  const terminalElement = document.getElementById('terminal')
  if (terminalElement) {
    terminal.open(terminalElement)
    // fitAddon.fit()
  }

  setTimeout(() => {
      fitAddon?.fit()
  }, 120)
}

const handleTimeOutChange = (value: number) => {
  timeOut.value = value
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
    }
    logBuffer = new Uint8Array()
  }, timeOut.value)
}

watch(isDark, (newValue) => {
  if (terminal) {
    terminal.options.theme = getTerimalTheme(newValue)
  }
})

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
  // @ts-ignore
  const lines = terminal.buffer.active.getLines()
  // @ts-ignore
  const content = lines.map(line => line?.translateToString()).filter(Boolean).join('\n')
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
        content="分包超时时间 ms"
        placement="bottom"
      >
        <el-input-number
          v-model="timeOut"
          :min="1"
          :max="3000"
          :step="5"
          size="small"
          @change="handleTimeOutChange"
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