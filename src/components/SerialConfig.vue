<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ConfigManager } from '../utils/ConfigManager'
import { ScriptManager } from '../utils/ScriptManager'

const configManager = ConfigManager.getInstance()
const serialConfig = configManager.useConfig('serial')

const scriptManager = ScriptManager.getInstance()

interface Device {
  id: string
  title: string
  type: string
  port: SerialPort | USBDevice | BluetoothDevice
}

const serialPort = ref<SerialPort | null>(null)
const serialWriter = ref<WritableStreamDefaultWriter | null>(null)
const serialReader = ref<ReadableStreamDefaultReader | null>(null)
const isConnected = ref(false)
const authorizedDevices = ref<Device[]>([])
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

const authorizedDeviceSerialPort = (port: SerialPort) => {
  const id = 'serialport_' + (port.getInfo().usbProductId?.toString() || '')

  const device = authorizedDevices.value.find(d => d.id === id)
  if (device) {
    return device
  }
  const device2 = {
    id: id,
    title: getDeviceTitle(port),
    type: 'serialport',
    port: port
  }
  authorizedDevices.value.push(device2)
  return device2
}

const authorizedDeviceUSB = (port: USBDevice) => {
  const id ='usb_' + port.serialNumber
  const device = authorizedDevices.value.find(d => d.id === id)
  if (device) {
    return device
  }
  const device2 = {
    id: id,
    title: getWebUSBDeviceTitle(port),
    type:'usb',
    port: port
  }
  authorizedDevices.value.push(device2)
  return device2
}

const authorizedDeviceBluetooth = (port: BluetoothDevice) => {
  const id ='bluetooth_' + port.id
  const device = authorizedDevices.value.find(d => d.id === id)
  if (device) {
    return device
  }
  const device2 = {
    id: id,
    title: getBluetoothDeviceTitle(port),
    type:'bluetooth',
    port: port
  }
  authorizedDevices.value.push(device2)
  return device2
}

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
  } catch (error: any) {
    if (error.message != "Failed to execute 'requestPort' on 'Serial': No port selected by the user.") {
      ElMessage.error('串口连接失败：' + error)
    }
    console.error(error);
    selectedDevice.value = ''
  }
}

const connectWebUSB = async () => {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [] // 允许所有设备
    })
    authorizedDeviceUSB(device)
    ElMessage.success('WebUSB设备已授权')
  } catch (error) {
    ElMessage.error('WebUSB设备授权失败：' + error)
    console.error(error);
    selectedDevice.value = ''
  }
}

const connectBluetooth = async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    })
    authorizedDeviceBluetooth(device)
    ElMessage.success('蓝牙设备已授权')
  } catch (error) {
    ElMessage.error('蓝牙设备授权失败：' + error)
    console.error(error);
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

      const device = authorizedDevices.value.find(p => p.id === selectedDevice.value)
      if (device) {
        if (device.type === 'serialport') {
          connectToPort(device.port as SerialPort)
          return
        } else if (device.type ==='usb') {
          // 处理USB设备连接
          return
        } else if (device.type ==='bluetooth') {
          // 处理蓝牙设备连接
          return
        }
      }
  }
}

const connectToPort = async (port: SerialPort) => {
  try {
    authorizedDeviceSerialPort(port)
    await port.open(serialConfig.value)
    serialPort.value = port
    serialWriter.value = port.writable.getWriter()
    serialReader.value = port.readable.getReader()
    isConnected.value = true
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
  } catch (error) {
    console.log(error)
  }
  try {
    if (serialPort.value) {
      await serialPort.value.close()
    }
    ElMessage.success('设备已断开')
  } catch (error) {
    ElMessage.error('断开设备失败：' + error)
    console.log(error)
  }
  isConnected.value = false
  selectedDevice.value = ''
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

const wsConfig = ref({
  url: '',
  history: [] as string[]
})

const handleWsConfigChange = (value: string) => {
  if (!value) return
  wsConfig.value.url = value
  if (!wsConfig.value.history.includes(value)) {
    wsConfig.value.history.push(value)
    localStorage.setItem('config.wsConfig', JSON.stringify(wsConfig.value))
  }
  connectToWebsocket()
}

const connectToWebsocket = async () => {
  
}

onMounted(() => {
  // @ts-ignore
  window.addEventListener('serial-send', ((event: CustomEvent) => handleSerialSend(event)) as EventListener)
  navigator.serial?.getPorts().then(ports => {
    ports.map(authorizedDeviceSerialPort)
  })
  navigator.usb?.getDevices().then(devices => {
    devices.map(authorizedDeviceUSB)
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

  let pitch = 0.0, roll = 0.0, yaw = 0.0
  simulationTimer = window.setInterval(() => {
    // 模拟数据
    pitch += Math.random()*0.4 - 0.2;
    roll += Math.random()*0.4 - 0.1;
    yaw += Math.random()*0.4 - 0;

    let text = `pitch:${pitch.toFixed(2)},roll:${roll.toFixed(2)},yaw:${yaw.toFixed(2)}\n`
    const data = new TextEncoder().encode(text)
    DataEmit(data)
  }, 50)

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
  if (isConnected.value) {
    disconnectSerial()
  } else {
    // @ts-ignore
    connectToPort(serialPort.value)
  }
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
                v-for="device in authorizedDevices.filter(device => device.type == 'serialport')"
                :key="device.id"
                :label="device.title"
                :value="device.id"
              />
            </el-option-group>
            <el-option-group label="WebUSB设备">
              <el-option label="授权WebUSB设备" value="authorizedUSB"></el-option>
              <el-option
                v-for="device in authorizedDevices.filter(device => device.type == 'usb')"
                :key="device.id"
                :label="device.title"
                :value="device.id"
              />
            </el-option-group>
            <el-option-group label="蓝牙设备">
              <el-option label="授权蓝牙设备" value="authorizedBluetooth"></el-option>
              <el-option
                v-for="device in authorizedDevices.filter(device => device.type == 'bluetooth')"
                :key="device.id"
                :label="device.title"
                :value="device.id"
              />
            </el-option-group>
            <el-option-group label="其他">
              <el-option label="WebSocket" value="websocket"></el-option>
              <el-option label="脚本" value="script"></el-option>
              <el-option label="Stlink" value="webstlink"></el-option>
              <el-option label="模拟数据(IMU)" value="mock"></el-option>
            </el-option-group>
          </el-select>
        </div>
        <el-button-group>
          <el-button :type="isConnected ? 'danger' : 'primary'" @click="handleConenctClick" size="small">
            {{ isConnected ? '断开' : '连接' }}
          </el-button>
        </el-button-group>
      </div>
      <el-form v-if="selectedDevice == 'websocket'" :model="wsConfig" :inline="true" size="small" class="config-section">
        <el-form-item label="ws">
          <el-select v-model="wsConfig.url" filterable allow-create @change="handleWsConfigChange" style="width: 300px;">
            <el-option v-for="url in wsConfig.history" :key="url" :label="url" :value="url" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-else :model="serialConfig" :inline="true" size="small" class="config-section">
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
  flex-wrap: wrap;
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
  width: 160px;
}

.config-section {
  display: flex;
  flex-wrap: wrap;
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