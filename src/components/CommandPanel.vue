<template>
  <div class="section">
    <h3>命令</h3>
    <div class="cmd-grid">
      <button @click="fixAll(true)">固定全部</button>
      <button @click="fixAll(false)">解除固定</button>
      <button @click="treeLayout">树形排列</button>
      <button @click="fit">适应视图</button>
      <button @click="downloadPng">下载 PNG</button>
      <button @click="downloadSvg">下载 SVG</button>
      <button @click="showMarkup">生成标记</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { graphStore } from '../store/graphStore'
import { arrangeAsTree } from '../core/treeLayout'
import { generateTikZ } from '../core/markup'
import { uiState } from '../store/ui'
import { drawScene, type UiHoverState } from '../render/canvasRenderer'
import { buildSvg } from '../render/svgExport'
import { algoOverlay } from '../render/overlay'
import { WORLD_SIZE } from '../types/graph'
import type GraphCanvas from './GraphCanvas.vue'

const props = defineProps<{ canvas: InstanceType<typeof GraphCanvas> | null }>()

function fixAll(fixed: boolean) {
  if (graphStore.graph.nodes.length === 0) return
  graphStore.beginDrag()
  for (const n of graphStore.graph.nodes) n.fixed = fixed
}

function treeLayout() {
  arrangeAsTree()
}

function fit() {
  props.canvas?.fitView()
}

function downloadPng() {
  const exportScale = graphStore.graph.nodes.length > 300 ? 3 : 4
  const size = WORLD_SIZE * exportScale
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0)
  const emptyHover: UiHoverState = {
    hoverNodeId: null,
    hoverEdgeId: null,
    selectedNodeId: null,
    tempEdgeFromId: null,
    tempEdgeTarget: null,
    draggingNodeId: null,
  }
  drawScene(
    ctx,
    graphStore.graph,
    { scale: 1, offsetX: 0, offsetY: 0 },
    algoOverlay,
    emptyHover,
    WORLD_SIZE,
    WORLD_SIZE,
    false,
  )
  const a = document.createElement('a')
  a.download = 'graph.png'
  a.href = cv.toDataURL('image/png')
  a.click()
}

function downloadSvg() {
  const svg = buildSvg(graphStore.graph, algoOverlay)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'graph.svg'
  a.click()
  URL.revokeObjectURL(url)
}

function showMarkup() {
  const text = graphStore.serializeText()
  const tikz = generateTikZ(graphStore.graph)
  uiState.markupContent = `=== Graph Data ===\n${text}\n\n=== LaTeX TikZ ===\n${tikz}`
  uiState.showMarkup = true
}
</script>

<style scoped>
.cmd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
</style>
