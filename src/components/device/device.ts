
import { ref } from 'vue'

export interface Device {
  id: string
  title: string
  type: string
  port: SerialPort | USBDevice | BluetoothDevice
}

export const authorizedDevices = ref<Device[]>([])
