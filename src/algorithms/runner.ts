import { ref } from 'vue'
import { algoOverlay, resetAlgoOverlay } from '../render/overlay'
import type { AlgoEvent, AlgoStep, MatrixData } from './types'

export type AlgoStatus = 'idle' | 'running' | 'paused' | 'done'

export interface UserVisualAPI {
  step: () => Promise<void>
  emit: (ev: AlgoEvent) => void
  log: (message: string) => void
  done: (message?: string) => void
}

class AlgorithmRunner {
  status: AlgoStatus = 'idle'
  auto = false
  speed = 500
  logs = ref<string[]>([])
  matrix = ref<MatrixData | null>(null)
  doneMessage = ref('')

  private gen: Generator<AlgoStep> | null = null
  private timer: number | undefined
  private pendingResolve: (() => void) | null = null

  get isActive() {
    return this.status === 'running' || this.status === 'paused'
  }

  start(gen: Generator<AlgoStep>) {
    this.cancel()
    this.logs.value = []
    this.matrix.value = null
    this.gen = gen
    this.status = 'running'
    this.proceed()
  }

  startUserCode(run: (api: UserVisualAPI) => Promise<void> | void) {
    this.cancel()
    this.logs.value = []
    this.matrix.value = null
    this.status = 'running'
    const api: UserVisualAPI = {
      step: () =>
        new Promise<void>((resolve) => {
          this.pendingResolve = resolve
          this.scheduleResume()
        }),
      emit: (ev) => this.applyEvent(ev),
      log: (message) => this.applyEvent({ type: 'log', message }),
      done: (message) => {
        this.doneMessage.value = message ?? ''
        this.finish(message)
      },
    }
    const exec = async () => {
      try {
        await run(api)
        if (this.status !== 'done') this.finish()
      } catch (err) {
        this.applyEvent({ type: 'log', message: `错误: ${String(err)}` })
        this.finish('执行出错')
      }
    }
    void exec()
  }

  private proceed() {
    if (!this.gen || this.status === 'idle') return
    const r = this.gen.next()
    if (r.done) {
      this.finish()
      return
    }
    this.applyStep(r.value)
    if (r.value.pause) {
      if (this.auto) {
        this.timer = window.setTimeout(() => this.proceed(), this.speed)
      } else {
        this.status = 'paused'
      }
    } else {
      this.proceed()
    }
  }

  private applyStep(step: AlgoStep) {
    for (const ev of step.events) this.applyEvent(ev)
  }

  applyEvent(ev: AlgoEvent) {
    switch (ev.type) {
      case 'visit':
        algoOverlay.nodeMarks.set(ev.node, 'visited')
        break
      case 'current':
        for (const [id, mark] of algoOverlay.nodeMarks) {
          if (mark === 'current') algoOverlay.nodeMarks.delete(id)
        }
        if (ev.node) algoOverlay.nodeMarks.set(ev.node, 'current')
        break
      case 'setNodeColor':
        algoOverlay.nodeColors.set(ev.node, ev.color)
        break
      case 'setNodeValue':
        algoOverlay.nodeValues.set(ev.node, ev.text)
        break
      case 'clearNode':
        algoOverlay.nodeColors.delete(ev.node)
        algoOverlay.nodeValues.delete(ev.node)
        algoOverlay.nodeMarks.delete(ev.node)
        break
      case 'clearNodes':
        algoOverlay.nodeColors.clear()
        algoOverlay.nodeValues.clear()
        algoOverlay.nodeMarks.clear()
        break
      case 'setEdgeColor':
        algoOverlay.edgeColors.set(ev.edge, ev.color)
        break
      case 'setEdgeValue':
        algoOverlay.edgeValues.set(ev.edge, ev.text)
        break
      case 'clearEdge':
        algoOverlay.edgeColors.delete(ev.edge)
        algoOverlay.edgeValues.delete(ev.edge)
        break
      case 'clearEdges':
        algoOverlay.edgeColors.clear()
        algoOverlay.edgeValues.clear()
        break
      case 'log':
        this.logs.value.push(ev.message)
        break
      case 'matrix':
        this.matrix.value = { title: ev.title, labels: ev.labels, rows: ev.matrix }
        break
      case 'done':
        this.doneMessage.value = ev.message ?? ''
        break
    }
  }

  private scheduleResume() {
    if (this.auto) {
      this.timer = window.setTimeout(() => this.doResume(), this.speed)
    } else {
      this.status = 'paused'
    }
  }

  private doResume() {
    this.status = 'running'
    if (this.pendingResolve) {
      const r = this.pendingResolve
      this.pendingResolve = null
      r()
    } else if (this.gen) {
      this.proceed()
    }
  }

  step() {
    if (this.status === 'paused') {
      this.doResume()
    }
  }

  play() {
    this.auto = true
    if (this.status === 'paused') {
      this.doResume()
    } else if (this.status === 'running') {
      this.timer = window.setTimeout(() => this.doResume(), this.speed)
    }
  }

  pause() {
    this.auto = false
    clearTimeout(this.timer)
    this.status = 'paused'
  }

  cancel() {
    this.auto = false
    clearTimeout(this.timer)
    this.pendingResolve = null
    this.gen = null
    this.status = 'idle'
    this.doneMessage.value = ''
    resetAlgoOverlay()
  }

  private finish(message?: string) {
    clearTimeout(this.timer)
    if (message !== undefined) this.doneMessage.value = message
    this.gen = null
    this.pendingResolve = null
    this.status = 'done'
  }
}

export const algoRunner = new AlgorithmRunner()
