<template>
  <canvas ref="canvasRef" class="graph-canvas"></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { graphStore } from '../store/graphStore'
import { graphStyle } from '../store/theme'
import { algoOverlay } from '../render/overlay'
import {
  clamp,
  drawScene,
  fitView,
  screenToWorld,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'

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

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let resizeObserver: ResizeObserver | null = null
let panning = false
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0
let width = 0
let height = 0
let fitted = false

function canvasSize(): { w: number; h: number } {
  const el = canvasRef.value
  if (!el) return { w: 0, h: 0 }
  return { w: el.clientWidth, h: el.clientHeight }
}

function resize() {
  const el = canvasRef.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  const { w, h } = canvasSize()
  width = w
  height = h
  if (el.width !== w * dpr || el.height !== h * dpr) {
    el.width = w * dpr
    el.height = h * dpr
  }
  ctx = el.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!fitted && graphStore.graph.nodes.length > 0) {
    fitted = true
    fitView(view, graphStore.graph, w, h)
  }
}

function render() {
  if (!ctx || width === 0) return
  drawScene(ctx, graphStore.graph, view, algoOverlay, hover, width, height)
}

function loop() {
  render()
  raf = requestAnimationFrame(loop)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const w = screenToWorld(view, mx, my)
  view.scale = clamp(view.scale * factor, 0.15, 5)
  view.offsetX = mx - w.x * view.scale
  view.offsetY = my - w.y * view.scale
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const hit = hitTest(mx, my)
  if (!hit.nodeId && !hit.edgeId) {
    panning = true
    panStartX = mx
    panStartY = my
    panOriginX = view.offsetX
    panOriginY = view.offsetY
  }
}

function onMouseMove(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  if (panning) {
    view.offsetX = panOriginX + (mx - panStartX)
    view.offsetY = panOriginY + (my - panStartY)
    return
  }
  const hit = hitTest(mx, my)
  hover.hoverNodeId = hit.nodeId
  hover.hoverEdgeId = hit.edgeId
}

function onMouseUp() {
  panning = false
}

function hitTest(mx: number, my: number) {
  const p = screenToWorld(view, mx, my)
  const nodes = graphStore.graph.nodes
  const edges = graphStore.graph.edges
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const rr = graphStyle.nodeRadius + 4
    if (Math.hypot(p.x - n.x, p.y - n.y) <= rr) {
      return { nodeId: n.id, edgeId: null }
    }
  }
  let bestEdge: string | null = null
  let bestDist = Infinity
  for (const e of edges) {
    const a = nodes.find((n) => n.id === e.from)
    const b = nodes.find((n) => n.id === e.to)
    if (!a || !b) continue
    const d = distToSegment(p.x, p.y, a.x, a.y, b.x, b.y)
    if (d < bestDist && d < 12 / view.scale + 3) {
      bestDist = d
      bestEdge = e.id
    }
  }
  return { nodeId: null, edgeId: bestEdge }
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = clamp(t, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
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
})

defineExpose({
  fitView: () => {
    fitted = true
    fitView(view, graphStore.graph, width, height)
  },
})
</script>

<style scoped>
.graph-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  touch-action: none;
}
</style>
