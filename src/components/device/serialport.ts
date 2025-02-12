import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device } from './device'
import { ConfigManager } from '../../utils/ConfigManager'

const configManager = ConfigManager.getInstance()
const serialConfig = configManager.useConfig('serial')

const serialPort = ref<SerialPort | null>(null)

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

export const getDeviceTitle = (port: SerialPort) => {
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

export const getDeviceId = (port: SerialPort) => {
  return 'serialport_' + (port.getInfo().usbProductId?.toString() || '')
}

export const makeDevice = (port: SerialPort) => {
  return {
    id: getDeviceId(port),
    title: getDeviceTitle(port),
    type:'serialport',
    port: port
  } as Device
}

export const init = async () => {
  navigator.serial?.getPorts().then(ports => {
    ports.map((port) => {
      let id = getDeviceId(port);

      const device = authorizedDevices.value.find(d => d.id === id)
      if (!device) {
        authorizedDevices.value.push(makeDevice(port))
      }
    })
  })
}

export const request = async () => {
  try {
    const port = await navigator.serial.requestPort()
    const device = makeDevice(port)
    return device
  } catch (error: any) {
    if (error.message != "Failed to execute 'requestPort' on 'Serial': No port selected by the user.") {
      ElMessage.error('串口连接失败：' + error)
    }
    console.error(error);
  }
  return null
}

export const connectDevice = async (device: Device) => {
  try {
    const port = device.port as SerialPort
    await port.open(serialConfig.value)
    serialPort.value = port
    let writer = port.writable.getWriter()
    let reader = port.readable.getReader()
    return { writer, reader }
  } catch (error) {
    ElMessage.error('串口连接失败：' + error)
    console.log(error)
  }
}

export const disconnect = async () => {
  try {
    if (serialPort.value) {
      await serialPort.value.close()
    }
  } catch (error) {
    ElMessage.error('断开设备失败：' + error)
    console.log(error)
  }
}
