<script setup lang="ts">
import { ref } from 'vue'
import { SerialHelper } from '../utils/SerialHelper'

const sendContent = ref('')
const isHexSend = ref(false)
const addCRLF = ref(false)
const autoSend = ref(false)
const autoSendInterval = ref(1000)
const addChecksum = ref(false)
let autoSendTimer: number | null = null

const serialHelper = SerialHelper.getInstance()

const sendData = () => {
  try {
    let content = sendContent.value
    if (addCRLF.value) {
      content += '\r\n'
    }

    let data = serialHelper.stringToUint8Array(content, isHexSend.value)
    if (addChecksum.value) {
      data = serialHelper.appendChecksum(data)
    }

    window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
  } catch (error) {
    console.error('发送数据时出错:', error)
    window.dispatchEvent(new CustomEvent('serial-error', { 
      detail: { message: error instanceof Error ? error.message : '发送数据时出错' }
    }))
  }
}

const toggleAutoSend = () => {
  // autoSend.value = !autoSend.value
  if (autoSend.value) {
    autoSendTimer = window.setInterval(sendData, autoSendInterval.value)
  } else if (autoSendTimer) {
    clearInterval(autoSendTimer)
    autoSendTimer = null
  }
}

const handleIntervalChange = (value: number) => {
  autoSendInterval.value = value
  if (autoSend.value && autoSendTimer) {
    clearInterval(autoSendTimer)
    autoSendTimer = window.setInterval(sendData, value)
  }
}
</script>

<template>
  <el-card class="serial-send">
    <template #header>
      <div class="card-header">
        <div class="controls">
          <el-switch v-model="isHexSend" active-text="HEX" inactive-text="TEXT" class="me-2" />
          <el-checkbox v-model="addCRLF" label="CRLF" class="me-2" />
          <el-checkbox v-model="addChecksum" label="校验和" class="me-2" />
          <el-checkbox v-model="autoSend" @change="toggleAutoSend" label="自动发送" class="me-2" />
          <el-input-number v-model="autoSendInterval" :min="100" :max="10000" :step="100" @change="handleIntervalChange" size="small" class="me-2" />
          <span>ms</span>
          <el-button type="primary" @click="sendData" class="me-2">发送</el-button>
        </div>
      </div>
    </template>
    <div class="send-content">
      <el-input
        v-model="sendContent"
        type="textarea"
        :rows="3"
        :placeholder="isHexSend ? '请输入HEX格式数据，如：49 54 4C 44 47' : '请输入要发送的文本'"
      />
    </div>
  </el-card>
</template>

<style scoped>
.serial-send {
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-content {
  /* margin-top: 12px; */
}

.me-2 {
  margin-right: 0;
}
</style>