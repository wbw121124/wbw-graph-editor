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
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { graphStore } from '../store/graphStore'
import { algoOverlay } from '../render/overlay'
import { graphStyle } from '../store/theme'
import {
  drawScene,
  fitView,
  fitWorld,
  worldToScreen,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'
import { useCanvasInteraction } from '../composables/useCanvasInteraction'
import { layoutTick } from '../core/forceLayout'
import { WORLD_SIZE, type EditorMode } from '../types/graph'
import { uiState } from '../store/ui'

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
    lines.push(`节点 ${n.id}`)
    lines.push(`标签: ${n.label}`)
    lines.push(g.directed ? `度数: 出 ${degOut} / 入 ${degIn}` : `度数: ${degIn}`)
    lines.push(`位置: (${Math.round(n.x)}, ${Math.round(n.y)})`)
    lines.push(`固定: ${n.fixed ? '是' : '否'}`)
    const color = algoOverlay.nodeColors.get(n.id) ?? graphStyle.nodeFill
    if (color) lines.push(`颜色: ${color}`)
    if (n.comment) lines.push(`注释: ${n.comment}`)
  } else if (e) {
    lines.push(`边 ${e.id}`)
    lines.push(`${graphStore.nodeLabel(e.from)} → ${graphStore.nodeLabel(e.to)}`)
    if (e.weight !== null) lines.push(`权重: ${e.weight}`)
    if (e.capacity !== null) lines.push(`容量: ${e.capacity}`)
    if (e.cost !== null) lines.push(`费用: ${e.cost}`)
    const color = algoOverlay.edgeColors.get(e.id) ?? graphStyle.edgeColor
    if (color) lines.push(`颜色: ${color}`)
    if (e.comment) lines.push(`注释: ${e.comment}`)
  }
  placeTip(lastMouseX, lastMouseY)
  tipLines.value = lines
  tipVisible.value = true
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
  if (e.key === 'Escape') {
    hover.selectedNodeId = null
    hover.selectedEdgeId = null
    hover.tempEdgeFromId = null
    hover.tempEdgeTarget = null
    return
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
