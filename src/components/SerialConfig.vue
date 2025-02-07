<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ConfigManager } from '../utils/ConfigManager'
import { ScriptManager } from '../utils/ScriptManager'

const configManager = ConfigManager.getInstance()
const serialConfig = configManager.useConfig('serial')

const scriptManager = ScriptManager.getInstance()


const serialPort = ref<SerialPort | null>(null)
const serialWriter = ref<WritableStreamDefaultWriter | null>(null)
const serialReader = ref<ReadableStreamDefaultReader | null>(null)
const isConnected = ref(false)
const authorizedPorts = ref<SerialPort[]>([])
const authorizedWebUSBDevices = ref<USBDevice[]>([])
const authorizedBluetoothDevices = ref<BluetoothDevice[]>([])
const selectedDevice = ref('')
const baudRates = [
  1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600
]

const handleConfigChange = async () => {
  if (isConnected.value && serialPort.value) {
    try {
      await disconnectSerial()
      await connectToPort(serialPort.value)
      ElMessage.success('串口参数已更新')
    } catch (error) {
      ElMessage.error('更新串口参数失败：' + error)
    }
  }
}

watch(serialConfig, handleConfigChange, { deep: true })

const DataEmit = async (data: Uint8Array) => {
  const runtimer = await scriptManager.getRuntimer()
  if (runtimer.DataReceiverInterface) {
    data = await runtimer.DataReceiverInterface(data);
  }
  window.dispatchEvent(new CustomEvent('serial-data', { detail: data }))
}

const connectSerial = async () => {
  try {
    const port = await navigator.serial.requestPort()
    await connectToPort(port)
  } catch (error) {
    ElMessage.error('串口连接失败：' + error)
    selectedDevice.value = ''
  }
}

const connectWebUSB = async () => {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [] // 允许所有设备
    })
    if (!authorizedWebUSBDevices.value.some(d => d.serialNumber === device.serialNumber)) {
      authorizedWebUSBDevices.value.push(device)
    }
    ElMessage.success('WebUSB设备已授权')
  } catch (error) {
    ElMessage.error('WebUSB设备授权失败：' + error)
    selectedDevice.value = ''
  }
}

const connectBluetooth = async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    })
    if (!authorizedBluetoothDevices.value.some(d => d.id === device.id)) {
      authorizedBluetoothDevices.value.push(device)
    }
    ElMessage.success('蓝牙设备已授权')
  } catch (error) {
    ElMessage.error('蓝牙设备授权失败：' + error)
    selectedDevice.value = ''
  }
}

const handleDeviceAuthorize = () => {
  stopSimulation()
  switch (selectedDevice.value) {
    case 'authorizedSerial':
      connectSerial()
      break
    case 'authorizedUSB':
      connectWebUSB()
      break
    case 'authorizedBluetooth':
      connectBluetooth()
      break
    case 'websocket':
      break
    case 'webstlink':
    case 'script':
      ElMessage.warning('该设备类型开发中')
      selectedDevice.value = ''
      break
    case 'mock':
      startSimulation()
      break
    default:
      const selectedPort = authorizedPorts.value.find(p => p.getInfo().usbProductId?.toString() === selectedDevice.value)
      if (selectedPort) {
        connectToPort(selectedPort)
        return
      }
      const selectedUSBDevice = authorizedWebUSBDevices.value.find(d => d.serialNumber === selectedDevice.value)
      if (selectedUSBDevice) {
        // 处理USB设备连接
        return
      }
      const selectedBluetoothDevice = authorizedBluetoothDevices.value.find(d => d.id === selectedDevice.value)
      if (selectedBluetoothDevice) {
        // 处理蓝牙设备连接
        return
      }
  }
}

const connectToPort = async (port: SerialPort) => {
  try {
    await port.open(serialConfig.value)
    serialPort.value = port
    console.log(port)
    serialWriter.value = port.writable.getWriter()
    serialReader.value = port.readable.getReader()
    isConnected.value = true
    if (!authorizedPorts.value.includes(port)) {
      authorizedPorts.value.push(port)
    }
    ElMessage.success('串口连接成功')
    startReading()
  } catch (error) {
    ElMessage.error('串口连接失败：' + error)
  }
}

const disconnectSerial = async () => {
  stopSimulation()
  try {
    if (serialReader.value) {
      await serialReader.value.cancel()
      serialReader.value.releaseLock()
    }
    if (serialWriter.value) {
      await serialWriter.value.close()
      serialWriter.value.releaseLock()
    }
    if (serialPort.value) {
      await serialPort.value.close()
    }
    isConnected.value = false
    ElMessage.success('串口已断开')
  } catch (error) {
    ElMessage.error('断开串口失败：' + error)
  }
}

const startReading = async () => {
  while (isConnected.value && serialReader.value) {
    try {
      const { value, done } = await serialReader.value.read()
      if (done) {
        break
      }
      DataEmit(value)
    } catch (error) {
      ElMessage.error('读取串口数据失败：' + error)
      break
    }
  }
}

const handleSerialSend = async (event: CustomEvent) => {
  if (!isConnected.value || !serialWriter.value) {
    ElMessage.error('串口未连接')
    return
  }
  let data = event.detail;

  const runtimer = await scriptManager.getRuntimer()
  if (runtimer.DataSenderInterface) {
    data = await runtimer.DataSenderInterface(data);
  }

  try {
    await serialWriter.value.write(data)
  } catch (error) {
    ElMessage.error('发送数据失败：' + error)
  }
}

onMounted(() => {
  // @ts-ignore
  window.addEventListener('serial-send', ((event: CustomEvent) => handleSerialSend(event)) as EventListener)
  navigator.serial?.getPorts().then(ports => {
    authorizedPorts.value = ports
  })
  navigator.usb?.getDevices().then(devices => {
    authorizedWebUSBDevices.value = devices
  })
})

onUnmounted(() => {
  // @ts-ignore
  window.removeEventListener('serial-send', ((event: CustomEvent) => handleSerialSend(event)) as EventListener)
})

const isSimulating = ref(false)
let simulationTimer: number | null = null

const startSimulation = () => {
  isSimulating.value = true
  isConnected.value = true
  let dataBuffer: Uint8Array[] = []

  const { writable, readable } = new TransformStream({
    transform(chunk, controller) {
      dataBuffer.push(chunk)
      controller.enqueue(chunk)
    }
  })

  simulationTimer = window.setInterval(() => {
    const randomLength = Math.floor(Math.random() * 100) + 1
    const randomData = new Uint8Array(randomLength)
    for (let i = 0; i < randomLength; i++) {
      randomData[i] = Math.floor(Math.random() * 256)
    }
    DataEmit(randomData)
  }, 2000)

  serialWriter.value = writable.getWriter()
  serialReader.value = readable.getReader()
  startReading()
}

const stopSimulation = () => {
  if (simulationTimer) {
    clearInterval(simulationTimer)
    simulationTimer = null
    isConnected.value = false
    
  }
}

const KNOWN_DEVICES = [
  // Arduino 系列
  { name: 'Arduino UNO', vendorId: '2341', productId: '0043' },
  { name: 'Arduino Mega', vendorId: '2341', productId: '0010' },
  { name: 'Arduino Nano', vendorId: '0403', productId: '6001' },
  { name: 'ATmega32U4', vendorId: '2341', productId: '8036' },
  
  // Silicon Labs CP210x 系列
  { name: 'CP2102/CP2102N', vendorId: '10c4', productId: 'ea60' },
  
  // FTDI 系列
  { name: 'FT2232H', vendorId: '0403', productId: '6010' },
  { name: 'FTDI Basic', vendorId: '0403', productId: '6001' },
  
  // WCH CH340 系列
  { name: 'CH340', vendorId: '1a86', productId: '7523' },
  { name: 'CH9102', vendorId: '1a86', productId: '55d4' },
  
  // Prolific 系列
  { name: 'PL2303', vendorId: '067b', productId: '2303' },
  { name: 'PL2303HX', vendorId: '067b', productId: '2303' },
  
  // Espressif 系列
  { name: 'ESP USB_SERIAL_JTAG', vendorId: '303a', productId: '1001' },
  { name: 'ESP USB Bridge', vendorId: '303a', productId: '1002' },
  { name: 'ESP32-S2 USB CDC', vendorId: '303a', productId: '0002' },
  { name: 'ESP32-S3 USB CDC', vendorId: '303a', productId: '0009' },
  
  // QinHeng Electronics
  { name: 'CH9102F', vendorId: '1a86', productId: '55d4' },
  { name: 'CH340G', vendorId: '1a86', productId: '7523' },
  
  // STMicroelectronics
  { name: 'STM32 Virtual COM Port', vendorId: '0483', productId: '5740' },
  { name: 'STM32 USB CDC', vendorId: '0483', productId: '5740' }
]

const getDeviceTitle = (port: SerialPort) => {
  if (!port.getInfo().usbProductId) return '串口设备'
  
  const vendorId = (port.getInfo().usbVendorId || 0).toString(16).padStart(4, '0')
  const productId = (port.getInfo().usbProductId || 0).toString(16).padStart(4, '0')
  
  const device = KNOWN_DEVICES.find(
    d => d.vendorId.toLowerCase() === vendorId.toLowerCase() && 
         d.productId.toLowerCase() === productId.toLowerCase()
  )
  
  return device ? 
    `${device.name} (VID:${vendorId} PID:${productId})` : 
    `未知设备 (VID:${vendorId} PID:${productId})`
}

const getWebUSBDeviceTitle = (device: any) => {
  return '未知设备' + device
  // return `${device.productName || '未知设备'} (${device.vendorId}:${device.productId})`
}

const getBluetoothDeviceTitle = (device: any) => {
  return '未知设备' + device
  // return `${device.name || '未知设备'} (${device.id})`
}

const handleConenctClick = () => {
  // @ts-ignore
  isConnected ? disconnectSerial() : connectToPort(serialPort.value)
}

</script>

<template>
  <div class="serial-config">
    <div class="config-container">
      <div class="port-section">
        <div class="port-list">
          <el-select v-model="selectedDevice" @change="handleDeviceAuthorize" placeholder="选择设备" size="small">
            <el-option label="选择设备" value=""></el-option>
            <el-option-group label="串口设备">
              <el-option label="授权串口设备" value="authorizedSerial"></el-option>
              <el-option
                v-for="port in authorizedPorts"
                :key="port.getInfo().usbVendorId"
                :label="getDeviceTitle(port)"
                :value="port.getInfo().usbProductId?.toString() || ''"
              />
            </el-option-group>
            <el-option-group label="WebUSB设备">
              <el-option label="授权WebUSB设备" value="authorizedUSB"></el-option>
              <el-option
                v-for="device in authorizedWebUSBDevices"
                :key="device.serialNumber"
                :label="getWebUSBDeviceTitle(device)"
                :value="device.serialNumber"
              />
            </el-option-group>
            <el-option-group label="蓝牙设备">
              <el-option label="授权蓝牙设备" value="authorizedBluetooth"></el-option>
              <el-option
                v-for="device in authorizedBluetoothDevices"
                :key="device.id"
                :label="getBluetoothDeviceTitle(device)"
                :value="device.id"
              />
            </el-option-group>
            <el-option-group label="其他">
              <el-option label="WebSocket" value="websocket"></el-option>
              <el-option label="脚本" value="script"></el-option>
              <el-option label="Stlink" value="webstlink"></el-option>
              <el-option label="Mock" value="mock"></el-option>
            </el-option-group>
          </el-select>
        </div>
        <el-button-group>
          <el-button :type="isConnected ? 'danger' : 'primary'" @click="handleConenctClick" size="small">
            {{ isConnected ? '断开' : '连接' }}
          </el-button>
        </el-button-group>
      </div>
      <el-form v-if="selectedDevice != 'websocket'" :model="serialConfig" :inline="true" size="small" class="config-section">
        <el-form-item label="波特率">
          <el-select v-model="serialConfig.baudRate" style="width: 80px;">
            <el-option v-for="rate in baudRates" :key="rate" :value="rate" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据位">
          <el-select v-model="serialConfig.dataBits" style="width: 50px;">
            <el-option v-for="bits in [8, 7, 6, 5]" :key="bits" :value="bits" />
          </el-select>
        </el-form-item>
        <el-form-item label="停止位">
          <el-select v-model="serialConfig.stopBits" style="width: 50px;">
            <el-option v-for="bits in [1, 2]" :key="bits" :value="bits" />
          </el-select>
        </el-form-item>
        <el-form-item label="校验位">
          <el-select v-model="serialConfig.parity" style="width: 60px;">
            <el-option label="无" value="none" />
            <el-option label="奇校验" value="odd" />
            <el-option label="偶校验" value="even" />
          </el-select>
        </el-form-item>
        <el-form-item label="流控制">
          <el-select v-model="serialConfig.flowControl" style="width: 60px;">
            <el-option label="无" value="none" />
            <el-option label="硬件流控" value="hardware" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-else :model="serialConfig" :inline="true" size="small" class="config-section">
        <el-form-item label="ws">
          <el-select v-model="serialConfig" style="width: 300px;">
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.serial-config {
  margin: 0;
}

.config-container {
  display: flex;
  flex-direction: row;
  gap: 15px;
  align-items: center;
}

.port-section {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.port-list {
  width: 120px;
}

.config-section {
  display: flex;
  flex-wrap: nowrap;
  margin: 0;
}

.el-form--inline .el-form-item {
  margin-right: 8px;
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  padding-right: 4px;
}

:deep(.el-input__wrapper) {
  padding: 0 8px;
}
</style>