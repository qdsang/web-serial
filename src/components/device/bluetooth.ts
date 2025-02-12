import { ElMessage } from 'element-plus'
import type { Device } from './device'


export const getDeviceTitle = (port: BluetoothDevice) => {
  return '未知设备' + port
}

export const getDeviceId = (_: BluetoothDevice) => {
  return 'bluetooth'
}

export const makeDevice = (port: BluetoothDevice) => {
  return {
    id: getDeviceId(port),
    title: getDeviceTitle(port),
    type:'bluetooth',
    port: port
  } as Device
}

export const init = async () => {

}

export const request = async () => {
  try {
    const port = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    })
    const device = makeDevice(port)
    return device
  } catch (error: any) {
    if (error.message != "User cancelled the requestDevice() chooser.") {
      ElMessage.error('串口连接失败：' + error)
    }
    console.error(error);
  }
  return null
}

export const connectDevice = async (_: Device) => {
  try {
  } catch (error) {
    ElMessage.error('串口连接失败：' + error)
    console.log(error)
  }
  return null
}

export const disconnect = async () => {
  
}
