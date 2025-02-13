
export class TimerManager {
  private static instance: TimerManager
  private timers: Map<string, {
    callback: () => void,
    interval: number,
    lastTime: number,
    requestId: number | null,
    isRunning: boolean
  }>

  private constructor() {
    this.timers = new Map()
  }

  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager()
    }
    return TimerManager.instance
  }

  private animationFrame(timerId: string) {
    const timer = this.timers.get(timerId)
    if (!timer || !timer.isRunning) return

    const currentTime = performance.now()
    const elapsed = currentTime - timer.lastTime

    if (elapsed >= timer.interval) {
      timer.callback()
      timer.lastTime = currentTime - (elapsed % timer.interval)
    }

    timer.requestId = requestAnimationFrame(() => this.animationFrame(timerId))
  }

  public startTimer(timerId: string, callback: () => void, interval: number) {
    if (this.timers.has(timerId)) {
      this.stopTimer(timerId)
    }

    this.timers.set(timerId, {
      callback,
      interval,
      lastTime: performance.now(),
      requestId: null,
      isRunning: true
    })

    const timer = this.timers.get(timerId)!
    timer.requestId = requestAnimationFrame(() => this.animationFrame(timerId))
  }

  public stopTimer(timerId: string) {
    const timer = this.timers.get(timerId)
    if (timer) {
      timer.isRunning = false
      if (timer.requestId !== null) {
        cancelAnimationFrame(timer.requestId)
        timer.requestId = null
      }
    }
  }

  public resumeTimer(timerId: string) {
    const timer = this.timers.get(timerId)
    if (timer && !timer.isRunning) {
      timer.isRunning = true
      timer.lastTime = performance.now()
      timer.requestId = requestAnimationFrame(() => this.animationFrame(timerId))
    }
  }

  public clearTimer(timerId: string) {
    this.stopTimer(timerId)
    this.timers.delete(timerId)
  }

  public clearAllTimers() {
    for (const timerId of this.timers.keys()) {
      this.clearTimer(timerId)
    }
  }

  public isTimerRunning(timerId: string): boolean {
    const timer = this.timers.get(timerId)
    return timer ? timer.isRunning : false
  }
}