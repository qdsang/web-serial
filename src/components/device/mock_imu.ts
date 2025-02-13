import { ref } from 'vue'
import { authorizedDevices, type Device } from './device'
import { TimerManager } from '../../utils/TimerManager'

export const getDeviceTitle = () => {
    return 'mock'
}

export const getDeviceId = () => {
  return 'mock'
}

export const makeDevice = (port: any) => {
  return {
    id: getDeviceId(),
    title: getDeviceTitle(),
    type:'mock',
    port: port
  } as Device
}
authorizedDevices.value.push(makeDevice(null))

const isSimulating = ref(false)
const timerManager = TimerManager.getInstance()
const SIMULATION_TIMER_ID = 'mock_imu_simulation'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const startSimulation = async () => {
  stopSimulation()
  isSimulating.value = true
  let dataBuffer: Uint8Array[] = []

  const { writable, readable } = new TransformStream({
    transform(chunk, controller) {
      dataBuffer.push(chunk)
      controller.enqueue(chunk)
    }
  })
  let writer = writable.getWriter()
  let reader = readable.getReader()

  let pitch = 0.0, roll = 0.0, yaw = 0.0
  await sleep(1000 - (Date.now() % 1000))
  // console.log('ts', Date.now())
  timerManager.startTimer(SIMULATION_TIMER_ID, () => {
    // console.log('ts2', Date.now())
    // 模拟数据
    pitch += Math.random()*0.4 - 0.2;
    roll += Math.random()*0.4 - 0.1;
    yaw += Math.random()*0.4 - 0;

    let text = `pitch:${pitch.toFixed(2)},roll:${roll.toFixed(2)},yaw:${yaw.toFixed(2)}\n`
    const data = new TextEncoder().encode(text)

    writer.write(data)
  }, 50)

  return { writer, reader }
}

const stopSimulation = () => {
  timerManager.stopTimer(SIMULATION_TIMER_ID)
  isSimulating.value = false
}

export const request = async () => {
    
}

export const connectDevice = async (_: Device) => {
  return startSimulation()
}

export const disconnect = async () => {
    stopSimulation()
}
