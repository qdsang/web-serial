import { onUnmounted } from 'vue'

type EventCallback<T = any> = (data: T) => void

interface EventHandler {
  callback: EventCallback
  once: boolean
}

export class EventCenter {
  private static instance: EventCenter
  private handlers: Map<string, EventHandler[]> = new Map()

  private constructor() {}

  public static getInstance(): EventCenter {
    if (!EventCenter.instance) {
      EventCenter.instance = new EventCenter()
    }
    return EventCenter.instance
  }

  /**
   * 发布事件
   * @param eventName 事件名称
   * @param data 事件数据
   */
  public emit<T>(eventName: string, data: T): void {
    const handlers = this.handlers.get(eventName)
    if (!handlers) return

    handlers.forEach((handler, index) => {
      handler.callback(data)
      if (handler.once) {
        handlers.splice(index, 1)
      }
    })

    if (handlers.length === 0) {
      this.handlers.delete(eventName)
    }
  }

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param callback 回调函数
   * @param once 是否只监听一次
   */
  public on<T>(eventName: string, callback: EventCallback<T>, once = false): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, [])
    }
    this.handlers.get(eventName)?.push({
      callback,
      once
    })
  }

  /**
   * 订阅一次性事件
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  public once<T>(eventName: string, callback: EventCallback<T>): void {
    this.on(eventName, callback, true)
  }

  /**
   * 取消订阅事件
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  public off(eventName: string, callback?: EventCallback): void {
    if (!callback) {
      this.handlers.delete(eventName)
      return
    }

    const handlers = this.handlers.get(eventName)
    if (!handlers) return

    const index = handlers.findIndex(handler => handler.callback === callback)
    if (index !== -1) {
      handlers.splice(index, 1)
      if (handlers.length === 0) {
        this.handlers.delete(eventName)
      }
    }
  }

  /**
   * 在Vue组件中使用事件监听，会在组件卸载时自动取消订阅
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  public useEvent<T>(eventName: string, callback: EventCallback<T>): void {
    this.on(eventName, callback)
    onUnmounted(() => {
      this.off(eventName, callback)
    })
  }
}

// 导出事件名称常量
export const EventNames = {
  SERIAL_DATA: 'serial-data',
  SERIAL_SEND: 'serial-send',
  DATA_UPDATE: 'data-update',
  TERM_WRITE: 'term-write',
  SERIAL_ERROR: 'error',
  SERIAL_CONFIG_CHANGE: 'serial-config-change'
} as const
