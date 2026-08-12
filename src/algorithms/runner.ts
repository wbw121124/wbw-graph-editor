import { ref } from 'vue'
import { algoOverlay, resetAlgoOverlay } from '../render/overlay'
import { t } from '../i18n'
import type { AlgoEvent, AlgoStep, MatrixData } from './types'

export type AlgoStatus = 'idle' | 'running' | 'paused' | 'done'

export interface AlgoBookmark {
  id: number
  name: string
  stepIndex: number
}

export interface UserVisualAPI {
  step: () => Promise<void>
  emit: (ev: AlgoEvent) => void
  log: (message: string) => void
  done: (message?: string) => void
}

export class AlgorithmRunner {
  status: AlgoStatus = 'idle'
  auto = ref(false)
  speed = ref(500)
  logs = ref<string[]>([])
  matrix = ref<MatrixData | null>(null)
  doneMessage = ref('')
  bookmarks = ref<AlgoBookmark[]>([])

  private gen: Generator<AlgoStep> | null = null
  private genMode = false
  private timer: number | undefined
  private pendingResolve: (() => void) | null = null
  private executedSteps: AlgoStep[] = []
  private replayAnchor: number | null = null

  get isActive() {
    return this.status === 'running' || this.status === 'paused'
  }

  get canBookmark() {
    return this.genMode
  }

  start(gen: Generator<AlgoStep>) {
    this.cancel()
    this.logs.value = []
    this.matrix.value = null
    this.bookmarks.value = []
    this.gen = gen
    this.genMode = true
    this.executedSteps = []
    this.replayAnchor = null
    this.status = 'running'
    this.proceed()
  }

  startUserCode(run: (api: UserVisualAPI) => Promise<void> | void) {
    this.cancel()
    this.logs.value = []
    this.matrix.value = null
    this.bookmarks.value = []
    this.genMode = false
    this.executedSteps = []
    this.replayAnchor = null
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
        if (this.status !== 'done' && !this.pendingResolve) this.finish()
      } catch (err) {
        this.applyEvent({ type: 'log', message: t('run.error', { msg: String(err) }) })
        this.finish(t('run.executeError'))
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
    this.executedSteps.push(r.value)
    this.applyStep(r.value)
    if (r.value.pause) {
      if (this.auto.value) {
        this.timer = window.setTimeout(() => this.proceed(), this.speed.value)
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
    if (this.auto.value) {
      this.timer = globalThis.setTimeout(() => this.doResume(), this.speed.value)
    } else {
      this.status = 'paused'
    }
  }

  private doResume() {
    this.status = 'running'
    if (this.replayAnchor != null) {
      this.catchUp()
      this.status = 'paused'
      return
    }
    if (this.pendingResolve) {
      const r = this.pendingResolve
      this.pendingResolve = null
      r()
    } else if (this.gen) {
      this.proceed()
    }
  }

  private catchUp() {
    if (this.replayAnchor == null || !this.gen) return
    const n = this.executedSteps.length
    if (this.replayAnchor < n) {
      this.silentlyReplay(this.executedSteps.slice(this.replayAnchor, n))
    }
    this.replayAnchor = null
  }

  private silentlyReplay(steps: AlgoStep[]) {
    for (const s of steps) {
      for (const ev of s.events) this.applyEvent(ev)
    }
  }

  private resetOverlayState() {
    this.logs.value = []
    this.matrix.value = null
    this.doneMessage.value = ''
    resetAlgoOverlay()
  }

  listBookmarks() {
    return this.bookmarks.value
  }

  addBookmark() {
    if (!this.genMode) return null
    const bm: AlgoBookmark = {
      id: Date.now(),
      name: t('bookmark.prefix') + ' ' + (this.bookmarks.value.length + 1),
      stepIndex: this.executedSteps.length,
    }
    this.bookmarks.value.push(bm)
    return bm
  }

  removeBookmark(id: number) {
    const i = this.bookmarks.value.findIndex((b) => b.id === id)
    if (i >= 0) this.bookmarks.value.splice(i, 1)
  }

  jumpToBookmark(id: number) {
    const bm = this.bookmarks.value.find((b) => b.id === id)
    if (!bm) return
    const n = Math.min(bm.stepIndex, this.executedSteps.length)
    this.resetOverlayState()
    this.silentlyReplay(this.executedSteps.slice(0, n))
    if (this.gen) {
      this.auto.value = false
      clearTimeout(this.timer)
      this.status = 'paused'
      this.replayAnchor = n
    }
  }

  step() {
    if (this.status === 'paused') {
      this.doResume()
    }
  }

  play() {
    this.auto.value = true
    if (this.status === 'paused') {
      this.doResume()
    } else if (this.status === 'running') {
      this.catchUp()
      this.timer = globalThis.setTimeout(() => this.doResume(), this.speed.value)
    }
  }

  pause() {
    this.auto.value = false
    clearTimeout(this.timer)
    this.status = 'paused'
  }

  cancel() {
    this.auto.value = false
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
    else this.doneMessage.value = t('run.finished')
    this.gen = null
    this.pendingResolve = null
    this.status = 'done'
  }
}

export const algoRunner = new AlgorithmRunner()

export function createRunner() {
  return new AlgorithmRunner()
}
