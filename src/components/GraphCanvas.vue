<template>
  <canvas
    ref="canvasRef"
    class="graph-canvas"
    @mousedown="handlers.onMouseDown"
    @mousemove="handlers.onMouseMove"
    @mouseup="handlers.onMouseUp"
    @mouseleave="handlers.onMouseLeave"
    @wheel="handlers.onWheel"
  ></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { graphStore } from '../store/graphStore'
import { algoOverlay } from '../render/overlay'
import {
  drawScene,
  fitView,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'
import { useCanvasInteraction, type CanvasInteractionEvent } from '../composables/useCanvasInteraction'

const emit = defineEmits<{
  (e: 'edit-node', id: string): void
  (e: 'edit-edge', id: string): void
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

const handlers = useCanvasInteraction(canvasRef, view, hover, (ev: CanvasInteractionEvent, id: string) => emit(ev, id))

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let resizeObserver: ResizeObserver | null = null
let width = 0
let height = 0
let fitted = false

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
  if (!fitted && graphStore.graph.nodes.length > 0) {
    fitted = true
    fitView(view, graphStore.graph, width, height)
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
