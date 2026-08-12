<template>
  <div class="graph-host">
    <canvas
      ref="canvasRef"
      class="graph-canvas"
      @mousedown="handlers.onMouseDown"
      @mousemove="onCanvasMove"
      @mouseup="handlers.onMouseUp"
      @dblclick="handlers.onDblClick"
      @mouseleave="onCanvasLeave"
      @wheel="handlers.onWheel"
      @contextmenu="onCanvasMenu"
    ></canvas>
    <Transition name="tip">
      <div
        v-if="tipVisible"
        ref="tipEl"
        class="tooltip"
        :style="{ left: tipX + 'px', top: tipY + 'px' }"
      >
        <div v-for="line in tipLines" :key="line" class="tip-line">{{ line }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { graphStore } from '../store/graphStore'
import { algoOverlay } from '../render/overlay'
import { graphStyle } from '../store/theme'
import {
  drawScene,
  fitView,
  fitWorld,
  screenToWorld,
  worldToScreen,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'
import { useCanvasInteraction } from '../composables/useCanvasInteraction'
import { layoutTick } from '../core/forceLayout'
import { WORLD_SIZE, type EditorMode } from '../types/graph'
import { uiState } from '../store/ui'
import { t } from '../i18n'

const emit = defineEmits<{
  'edit-node': [id: string]
  'edit-edge': [id: string]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const view = reactive<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 })
const hover = reactive<UiHoverState>({
  hoverNodeId: null,
  hoverEdgeId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  tempEdgeFromId: null,
  tempEdgeTarget: null,
  draggingNodeId: null,
})

const handlers = useCanvasInteraction(canvasRef, view, hover, (ev, id) => {
  if (ev === 'edit-node') emit('edit-node', id)
  else emit('edit-edge', id)
}, () => ({ width: WORLD_SIZE, height: WORLD_SIZE }))

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let resizeObserver: ResizeObserver | null = null
let width = 0
let height = 0
let fitted = false
let tipTimer: number | undefined
let lastMouseX = 0
let lastMouseY = 0

const tipVisible = ref(false)
const tipX = ref(0)
const tipY = ref(0)
const tipLines = ref<string[]>([])
const tipEl = ref<HTMLDivElement | null>(null)

function resize() {
  const el = canvasRef.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  width = el.clientWidth
  height = el.clientHeight
  if (el.width !== width * dpr || el.height !== height * dpr) {
    el.width = width * dpr
    el.height = height * dpr
  }
  ctx = el.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!fitted) {
    fitted = true
    fitWorld(view, width, height)
  }
}

function render() {
  if (!ctx || width === 0) return
  drawScene(ctx, graphStore.graph, view, algoOverlay, hover, width, height)
}

function placeTip(mx: number, my: number) {
  const el = tipEl.value
  if (!el) return
  const tipW = el.offsetWidth || 160
  const tipH = el.offsetHeight || 120
  const gap = 12
  tipX.value = Math.min(Math.max(mx + gap, 4), window.innerWidth - tipW)
  tipY.value = Math.min(Math.max(my + gap, 4), window.innerHeight - tipH)
}

function updateTip() {
  const g = graphStore.graph
  const n = hover.hoverNodeId ? (g.nodes.find((x) => x.id === hover.hoverNodeId) ?? null) : null
  const e = hover.hoverEdgeId ? (g.edges.find((x) => x.id === hover.hoverEdgeId) ?? null) : null
  if (!n && !e) {
    tipVisible.value = false
    return
  }
  const lines: string[] = []
  if (n) {
    let degIn = 0
    let degOut = 0
    for (const ee of g.edges) {
      if (!g.directed) {
        if (ee.from === n.id || ee.to === n.id) degIn++
      } else {
        if (ee.from === n.id) degOut++
        if (ee.to === n.id) degIn++
      }
    }
    lines.push(t('tip.node', { id: n.id }))
    lines.push(t('tip.label', { label: n.label }))
    lines.push(g.directed ? t('tip.degreeDir', { out: degOut, in: degIn }) : t('tip.degree', { n: degIn }))
    lines.push(t('tip.pos', { x: Math.round(n.x), y: Math.round(n.y) }))
    lines.push(n.fixed ? t('tip.fixedYes') : t('tip.fixedNo'))
    const color = algoOverlay.nodeColors.get(n.id) ?? graphStyle.nodeFill
    if (color) lines.push(t('tip.color', { color }))
    if (n.comment) lines.push(t('tip.comment', { comment: n.comment }))
  } else if (e) {
    lines.push(t('tip.edge', { id: e.id }))
    lines.push(`${graphStore.nodeLabel(e.from)} → ${graphStore.nodeLabel(e.to)}`)
    if (e.weight !== null) lines.push(t('tip.weight', { v: e.weight }))
    if (e.capacity !== null) lines.push(t('tip.capacity', { v: e.capacity }))
    if (e.cost !== null) lines.push(t('tip.cost', { v: e.cost }))
    const color = algoOverlay.edgeColors.get(e.id) ?? graphStyle.edgeColor
    if (color) lines.push(t('tip.color', { color }))
    if (e.comment) lines.push(t('tip.comment', { comment: e.comment }))
  }
  placeTip(lastMouseX, lastMouseY)
  tipLines.value = lines
  tipVisible.value = true
  nextTick(() => placeTip(lastMouseX, lastMouseY))
}

function onCanvasMove(e: MouseEvent) {
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  handlers.onMouseMove(e)
  updateTip()
}

function onCanvasLeave() {
  clearTimeout(tipTimer)
  tipTimer = window.setTimeout(() => {
    tipVisible.value = false
  }, 100)
}

function onCanvasMenu(e: MouseEvent) {
  e.preventDefault()
  const el = canvasRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const hit = handlers.hitTest(mx, my)
  const w = screenToWorld(view, mx, my)
  uiState.ctxMenu = {
    x: e.clientX,
    y: e.clientY,
    visible: true,
    nodeId: hit.nodeId,
    edgeId: hit.edgeId,
    wx: w.x,
    wy: w.y,
  }
}

watch(
  () => [hover.hoverNodeId, hover.hoverEdgeId],
  () => updateTip(),
)

function loop(t = 0) {
  layoutTick(1, { width: WORLD_SIZE, height: WORLD_SIZE }, hover.draggingNodeId)
  render()
  raf = requestAnimationFrame(loop)
}

const MODE_KEYS: Record<string, EditorMode> = {
  v: 'select',
  d: 'draw',
  e: 'edit',
  x: 'delete',
  g: 'drag',
  f: 'force',
}

function onKeydown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) graphStore.redo()
    else graphStore.undo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    graphStore.redo()
    return
  }
  if (e.key === 'Escape') {
    hover.selectedNodeId = null
    hover.selectedEdgeId = null
    hover.tempEdgeFromId = null
    hover.tempEdgeTarget = null
    uiState.ctxMenu.visible = false
    return
  }
  if (e.key === 'F1' || e.key === '?') {
    e.preventDefault()
    uiState.showShortcuts = true
    return
  }
  if (e.key === 'Enter' && uiState.mode === 'select') {
    if (hover.selectedNodeId) {
      emit('edit-node', hover.selectedNodeId)
      return
    }
    if (hover.selectedEdgeId) {
      emit('edit-edge', hover.selectedEdgeId)
      return
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && uiState.mode === 'select') {
    e.preventDefault()
    if (hover.selectedNodeId) {
      graphStore.removeNode(hover.selectedNodeId)
      hover.selectedNodeId = null
    } else if (hover.selectedEdgeId) {
      graphStore.removeEdge(hover.selectedEdgeId)
      hover.selectedEdgeId = null
    }
    return
  }
  const mode = MODE_KEYS[e.key.toLowerCase()]
  if (mode) {
    if (mode === 'edit' && uiState.mode === 'select') {
      if (hover.selectedNodeId) {
        emit('edit-node', hover.selectedNodeId)
        return
      }
      if (hover.selectedEdgeId) {
        emit('edit-edge', hover.selectedEdgeId)
        return
      }
    }
    e.preventDefault()
    uiState.mode = mode
  }
}

onMounted(() => {
  resize()
  resizeObserver = new ResizeObserver(() => resize())
  if (canvasRef.value?.parentElement) {
    resizeObserver.observe(canvasRef.value.parentElement)
  }
  window.addEventListener('keydown', onKeydown)
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  clearTimeout(tipTimer)
  window.removeEventListener('keydown', onKeydown)
})

defineExpose({
  fitView: () => {
    fitted = true
    fitView(view, graphStore.graph, width, height)
  },
})
</script>

<style scoped>
.graph-host {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  touch-action: none;
}

.tooltip {
  position: fixed;
  z-index: 9999;
  min-width: 120px;
  max-width: 200px;
  padding: 8px 10px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 20px var(--shadow);
  pointer-events: none;
  user-select: none;
}

.tip-enter-active {
  transition: opacity 0.18s ease-out, transform 0.18s ease-out;
}

.tip-leave-active {
  transition: opacity 0.12s ease-in, transform 0.12s ease-in;
}

.tip-enter-from {
  opacity: 0;
  transform: translate(6px, 6px) scale(0.96);
}

.tip-leave-to {
  opacity: 0;
  transform: translate(-6px, -6px) scale(0.96);
}

.tip-line {
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
