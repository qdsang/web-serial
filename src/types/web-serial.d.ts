interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  readable: ReadableStream
  writable: WritableStream
  getInfo(): SerialPortInfo
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: string
  bufferSize?: number
  flowControl?: string
}

interface Navigator {
  serial: {
    requestPort(options?: any): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }
  usb: {
    requestDevice(options: any): Promise<USBDevice>
    getDevices(): Promise<USBDevice[]>
  }
  bluetooth: {
    requestDevice(options: any): Promise<BluetoothDevice>
  }
}

interface USBDevice {
  serialNumber?: string
  productName?: string
  manufacturerName?: string
}

interface BluetoothDevice {
  id: string
  name?: string
}

interface LogOptions {
  showTime: boolean
  showMs: boolean
  showHex: boolean
  showText: boolean
  showNewline: boolean
  autoScroll: boolean
  timeOut: number
}