<template>
  <div class="graph-host">
    <canvas
      ref="canvasRef"
      class="graph-canvas"
      @mousedown="handlers.onMouseDown"
      @mousemove="onCanvasMove"
      @mouseup="handlers.onMouseUp"
      @mouseleave="onCanvasLeave"
      @wheel="handlers.onWheel"
    ></canvas>
    <Transition name="tip">
    <div
      v-if="tipVisible"
      ref="tipEl"
      class="tooltip"
      :style="{ left: tipX + 'px', top: tipY + 'px' }"
      @mouseenter="onTipEnter"
      @mousemove="onTipMove"
      @mouseleave="unlockTip"
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
import { WORLD_SIZE } from '../types/graph'

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
let tipLock = false
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
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxX = vw - tipW
  const maxY = vh - tipH
  const xs = mx < vw / 2 ? [mx + gap, mx - tipW - gap] : [mx - tipW - gap, mx + gap]
  const ys = my < vh / 2 ? [my + gap, my - tipH - gap] : [my - tipH - gap, my + gap]
  for (const x0 of xs) {
    for (const y0 of ys) {
      const x = Math.min(Math.max(x0, 0), maxX)
      const y = Math.min(Math.max(y0, 0), maxY)
      const covers = mx >= x && mx <= x + tipW && my >= y && my <= y + tipH
      if (!covers) {
        tipX.value = x
        tipY.value = y
        return
      }
    }
  }
  tipX.value = Math.min(Math.max(mx + gap, 0), maxX)
  tipY.value = Math.min(Math.max(my + gap, 0), maxY)
}

function updateTip() {
  if (tipLock) return
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
    if (!tipLock) tipVisible.value = false
  }, 100)
}

function lockTip() {
  tipLock = true
  clearTimeout(tipTimer)
}

function onTipEnter(e: MouseEvent) {
  lockTip()
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  placeTip(e.clientX, e.clientY)
}

function onTipMove(e: MouseEvent) {
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  placeTip(e.clientX, e.clientY)
}

function unlockTip() {
  tipLock = false
  updateTip()
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

onMounted(() => {
  resize()
  resizeObserver = new ResizeObserver(() => resize())
  if (canvasRef.value?.parentElement) {
    resizeObserver.observe(canvasRef.value.parentElement)
  }
  loop()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  clearTimeout(tipTimer)
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
  pointer-events: auto;
  user-select: none;
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.15s ease;
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
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
