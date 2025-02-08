import { ref, watch } from 'vue'

interface SerialConfig {
  baudRate: number
  dataBits: number
  stopBits: number
  parity: string
  flowControl: string
}

interface DisplayConfig {
  showTime: boolean
  showMs: boolean
  showHex: boolean
  showText: boolean
  showNewline: boolean
  autoScroll: boolean
  timeOut: number
}

interface SendConfig {
  isHexSend: boolean
  addCRLF: boolean
  addCRLFType: string
  autoSend: boolean
  autoSendInterval: number
  addChecksum: boolean
  content: string
  history: string[]
  historyMaxLength: number
}

interface LayoutConfig {
  splitPaneSize: number
  leftActiveTab: string
  rightActiveTab: string
}

interface ChartConfig {
  id: number
  name: string
  fields: string[]
}

type ConfigKey = keyof typeof defaultConfigs

const defaultConfigs = {
  serial: {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none'
  } as SerialConfig,
  
  display: {
    showTime: true,
    showMs: false,
    showHex: true,
    showText: true,
    showNewline: true,
    autoScroll: false,
    timeOut: 20
  } as DisplayConfig,

  send: {
    isHexSend: false,
    addCRLF: false,
    addCRLFType: "\n",
    autoSend: false,
    autoSendInterval: 1000,
    addChecksum: false,
    content: "",
    history: [],
    historyMaxLength: 100
  } as SendConfig,

  layout: {
    splitPaneSize: 75,
    leftActiveTab: '0',
    rightActiveTab: '0'
  } as LayoutConfig,

  charts: {
    list: [{
      id: 1,
      name: 'Chart 1',
      fields: ['pitch', 'roll', 'yaw']
    }] as ChartConfig[]
  },
}

export class ConfigManager {
  private static instance: ConfigManager
  private configs: Record<string, any> = {}

  private constructor() {
    this.loadAllConfigs()
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  private loadAllConfigs() {
    for (const [key, defaultValue] of Object.entries(defaultConfigs)) {
      const savedValue = localStorage.getItem(`config.${key}`)
      this.configs[key] = savedValue ? { ...defaultValue, ...JSON.parse(savedValue) } : defaultValue
    }
  }

  public getConfig<T extends ConfigKey>(key: T): typeof defaultConfigs[T] {
    return this.configs[key] || defaultConfigs[key]
  }

  public setConfig<T extends ConfigKey>(key: T, value: Partial<typeof defaultConfigs[T]>) {
    this.configs[key] = { ...this.configs[key], ...value }
    localStorage.setItem(`config.${key}`, JSON.stringify(this.configs[key]))
  }

  public useConfig<T extends ConfigKey>(key: T) {
    const config = ref(this.getConfig(key))

    watch(config, (newValue) => {
      this.setConfig(key, newValue)
    }, { deep: true })

    return config
  }

  public resetConfig(key: ConfigKey) {
    this.configs[key] = { ...defaultConfigs[key] }
    localStorage.setItem(`config.${key}`, JSON.stringify(this.configs[key]))
  }

  public resetAllConfigs() {
    Object.keys(defaultConfigs).forEach(key => {
      this.resetConfig(key as ConfigKey)
    })
  }
}