<script setup lang="ts">
import { ref } from 'vue'

interface SerialConfig {
  baudRate: number
  dataBits: number
  stopBits: number
  parity: string
  flowControl: string
}

interface DisplayConfig {
  displayMode: 'hex&text' | 'hex' | 'text' | 'ansi'
  autoScroll: boolean
  timestampDisplay: boolean
  maxLogLines: number
}

const serialConfig = ref<SerialConfig>({
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none'
})

const displayConfig = ref<DisplayConfig>({
  displayMode: 'hex&text',
  autoScroll: false,
  timestampDisplay: true,
  maxLogLines: 1000
})

const baudRateOptions = [
  300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600
]

const dataBitsOptions = [7, 8]
const stopBitsOptions = [1, 2]
const parityOptions = [
  { label: '无校验', value: 'none' },
  { label: '奇校验', value: 'odd' },
  { label: '偶校验', value: 'even' }
]
const flowControlOptions = [
  { label: '无流控', value: 'none' },
  { label: '硬件流控', value: 'hardware' }
]

const displayModeOptions = [
  { label: 'HEX+文本', value: 'hex&text' },
  { label: '仅HEX', value: 'hex' },
  { label: '仅文本', value: 'text' },
  { label: 'ANSI', value: 'ansi' }
]

const handleSerialConfigChange = () => {
  window.dispatchEvent(new CustomEvent('serial-config-change', { detail: serialConfig.value }))
}

const handleDisplayConfigChange = () => {
  window.dispatchEvent(new CustomEvent('display-config-change', { detail: displayConfig.value }))
}

const clearLog = () => {
  window.dispatchEvent(new CustomEvent('clear-log'))
}

const saveLog = () => {
  window.dispatchEvent(new CustomEvent('save-log'))
}
</script>

<template>
  <el-card class="serial-settings">
    <template #header>
      <div class="card-header">
        <span>系统设置</span>
      </div>
    </template>

    <el-collapse>
      <el-collapse-item title="串口参数" name="1">
        <el-form label-width="100px" size="small">
          <el-form-item label="波特率">
            <el-select v-model="serialConfig.baudRate" @change="handleSerialConfigChange">
              <el-option
                v-for="rate in baudRateOptions"
                :key="rate"
                :label="rate"
                :value="rate"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="数据位">
            <el-select v-model="serialConfig.dataBits" @change="handleSerialConfigChange">
              <el-option
                v-for="bits in dataBitsOptions"
                :key="bits"
                :label="bits"
                :value="bits"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="停止位">
            <el-select v-model="serialConfig.stopBits" @change="handleSerialConfigChange">
              <el-option
                v-for="bits in stopBitsOptions"
                :key="bits"
                :label="bits"
                :value="bits"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="校验位">
            <el-select v-model="serialConfig.parity" @change="handleSerialConfigChange">
              <el-option
                v-for="option in parityOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="流控制">
            <el-select v-model="serialConfig.flowControl" @change="handleSerialConfigChange">
              <el-option
                v-for="option in flowControlOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <el-collapse-item title="显示设置" name="2">
        <el-form label-width="100px" size="small">
          <el-form-item label="显示模式">
            <el-select v-model="displayConfig.displayMode" @change="handleDisplayConfigChange">
              <el-option
                v-for="option in displayModeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="自动滚动">
            <el-switch
              v-model="displayConfig.autoScroll"
              @change="handleDisplayConfigChange"
            />
          </el-form-item>

          <el-form-item label="显示时间戳">
            <el-switch
              v-model="displayConfig.timestampDisplay"
              @change="handleDisplayConfigChange"
            />
          </el-form-item>

          <el-form-item label="最大日志行数">
            <el-input-number
              v-model="displayConfig.maxLogLines"
              :min="100"
              :max="10000"
              @change="handleDisplayConfigChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <el-collapse-item title="日志管理" name="3">
        <el-button-group>
          <el-button type="warning" @click="clearLog">
            <el-icon><Delete /></el-icon> 清空日志
          </el-button>
          <el-button type="primary" @click="saveLog">
            <el-icon><Download /></el-icon> 保存日志
          </el-button>
        </el-button-group>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<style scoped>
.serial-settings {
  margin: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>