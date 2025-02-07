import { SerialHelper } from './SerialHelper'

export interface ScriptItem {
  id: number
  name: string
  code: string
  isRunning: boolean
}

export interface Runtimer {
  DataReceiverInterface: Function | null,
  DataSenderInterface: Function | null
}

export class ScriptManager {
  private static instance: ScriptManager
  private scripts: ScriptItem[] = []
  private currentScript: ScriptItem = {
    id: Date.now(),
    name: '新建脚本',
    code: '',
    isRunning: false
  }
  private serialHelper = SerialHelper.getInstance()

  private runtimer: Runtimer = {
    DataReceiverInterface: null,
    DataSenderInterface: null
  }
  private RuntimerTimerIntervals: number[] = []
  private RuntimerTimerouts: number[] = []

  private constructor() {
    this.loadScripts()
  }

  public static getInstance(): ScriptManager {
    if (!ScriptManager.instance) {
      ScriptManager.instance = new ScriptManager()
    }
    return ScriptManager.instance
  }

  public getScripts(): ScriptItem[] {
    return this.scripts
  }

  public getCurrentScript(): ScriptItem {
    return this.currentScript
  }

  public setCurrentScript(script: ScriptItem): void {
    this.currentScript = script
  }

  public addScript(): ScriptItem {
    const newScript: ScriptItem = {
      id: Date.now(),
      name: '新建脚本',
      code: `
// 处理接收的数据
async function DataReceiver(data) {
  return data;
}

// 处理发送的数据
async function DataSender(data) {
  await sleep(100);
  return data;
}

// 定时发送数据
setInterval(async () => {
    // sendHex([0x11, 0x11, 0x11]);
}, 1000);

// 更新IMU数据
let pitch = 0.0, roll = 0.0, yaw = 0.0;
setInterval(() => {
  pitch += Math.random()*0.4 - 0.2;
  roll += Math.random()*0.4 - 0.1;
  yaw += Math.random()*0.4 - 0;
  updateIMU({pitch, roll, yaw});
}, 10);

`,
      isRunning: false
    }
    this.scripts.push(newScript)
    this.currentScript = newScript
    this.saveScripts()
    return newScript
  }

  public removeScript(id: number): void {
    const index = this.scripts.findIndex(script => script.id === id)
    if (index > -1) {
      this.scripts.splice(index, 1)
      if (this.currentScript.id === id) {
        if (this.scripts.length === 0) {
          this.addScript()
        }
        this.currentScript = this.scripts[0]
      }
      this.saveScripts()
    }
  }

  public async runScript(): Promise<void> {
    let script = this.currentScript
    if (script.isRunning) {
      return
    }

    script.isRunning = true

    try {
      const scriptContext = {
        sendText: (text: string) => {
          const data = this.serialHelper.stringToUint8Array(text)
          window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
        },
        sendHex: (hex: string | Uint8Array) => {
          let data = hex;
          if (typeof hex === 'string') {
            data = this.serialHelper.stringToUint8Array(hex, true)
          }
          window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
        },
        updateIMU: (data: any) => {
          window.dispatchEvent(new CustomEvent('data-imu', { detail: data }))
        },
        sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
        setTimeout: (fn: Function, ms: number) => {
          const timeout = setTimeout(fn, ms)
          this.RuntimerTimerouts.push(timeout)
          return timeout
        },
        setInterval: (fn: Function, ms: number) => {
          const interval = setInterval(fn, ms)
          this.RuntimerTimerIntervals.push(interval)
          return interval
        }
      }

      const wrappedCode = `
return (async function() {
  ${script.code}


  let DataReceiverInterface = typeof DataReceiver == 'undefined' ? null : DataReceiver;
  let DataSenderInterface = typeof DataSender == 'undefined'? null : DataSender;
  return { DataReceiverInterface, DataSenderInterface };
})()
      `

      const fn = new Function('context', `with(context) { ${wrappedCode} }`)
      this.runtimer = await fn(scriptContext)
      
    } catch (error) {
      console.error('脚本执行错误:', error)
      window.dispatchEvent(new CustomEvent('script-error', { 
        detail: { error: error instanceof Error ? error.message : '未知错误' }
      }))
      this.stopScript()
    }

  }

  public stopScript(): void {
    this.currentScript.isRunning = false

    this.RuntimerTimerouts.forEach(clearTimeout)
    this.RuntimerTimerouts = []
    this.RuntimerTimerIntervals.forEach(clearInterval)
    this.RuntimerTimerIntervals = []
  }

  public async getRuntimer(): Promise<Runtimer> {
    if (!this.currentScript.isRunning) {
      await this.runScript()
    }
    return this.runtimer
  }

  public saveScripts(): void {
    localStorage.setItem('serialScripts', JSON.stringify(this.scripts))
  }

  private loadScripts(): void {
    const savedScripts = localStorage.getItem('serialScripts')
    if (savedScripts) {
      try {
        this.scripts = JSON.parse(savedScripts)
      } catch (error) {
        console.error('加载脚本失败:', error)
      }
    }
    if (this.scripts.length === 0) {
      this.addScript()
    }
    this.currentScript = this.scripts[0] || this.currentScript
  }
}