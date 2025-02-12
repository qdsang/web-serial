import { ElMessage } from 'element-plus'
import { authorizedDevices, type Device } from './device'

export const getDeviceTitle = (port: USBDevice) => {
  return '未知设备' + port
}

export const getDeviceId = (_: USBDevice) => {
  return 'usb'
}

export const makeDevice = (port: USBDevice) => {
  return {
    id: getDeviceId(port),
    title: getDeviceTitle(port),
    type:'usb',
    port: port
  } as Device
}

export const init = async () => {
  navigator.usb?.getDevices().then(ports => {
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
    const port = await navigator.usb.requestDevice({
      filters: [] // 允许所有设备
    })
    const device = makeDevice(port)
    return device
  } catch (error: any) {
    if (error.message != "Failed to execute 'requestDevice' on 'USB': No device selected.") {
      ElMessage.error('串口连接失败：' + error)
    }
    console.error(error);
  }
  return null
}

export const connectDevice = async (device: Device) => {
  console.log(device)
  return null
}

export const disconnect = async () => {
  
}
