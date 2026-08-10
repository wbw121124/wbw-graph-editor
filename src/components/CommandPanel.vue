<template>
  <div class="section">
    <h3>命令</h3>
    <div class="cmd-grid">
      <button @click="fixAll(true)">固定全部</button>
      <button @click="fixAll(false)">解除固定</button>
      <button @click="treeLayout">树形排列</button>
      <button @click="fit">适应视图</button>
      <button @click="downloadPng">下载 PNG</button>
      <button @click="showMarkup">生成标记</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { graphStore } from '../store/graphStore'
import { arrangeAsTree } from '../core/treeLayout'
import { generateTikZ } from '../core/markup'
import { uiState } from '../store/ui'
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
  const el = document.querySelector<HTMLCanvasElement>('.graph-canvas')
  if (!el) return
  const a = document.createElement('a')
  a.download = 'graph.png'
  a.href = el.toDataURL('image/png')
  a.click()
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
