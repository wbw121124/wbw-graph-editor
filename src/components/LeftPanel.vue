<template>
  <aside class="panel left-panel">
    <div class="section">
      <div class="row between">
        <span class="label">图类型</span>
        <div class="seg">
          <button :class="{ active: !directed }" @click="setDirected(false)">无向</button>
          <button :class="{ active: directed }" @click="setDirected(true)">有向</button>
        </div>
      </div>
      <div class="stats">
        <span>节点数 <b>{{ graph.nodes.length }}</b></span>
        <span>边数 <b>{{ graph.edges.length }}</b></span>
      </div>
    </div>

    <div class="section grow">
      <div class="row between">
        <span class="label">Graph Data</span>
        <label class="check"><input v-model="custom" type="checkbox" /> 自定义标签</label>
      </div>
      <textarea
        ref="textRef"
        v-model="text"
        class="graph-text"
        spellcheck="false"
        @input="onInput"
      ></textarea>
      <div class="row between">
        <div class="btn-group">
          <button title="编号从 0 开始" @click="renumber(0)">0-based</button>
          <button title="编号从 1 开始" @click="renumber(1)">1-based</button>
        </div>
        <div class="btn-group">
          <button @click="pickFile">导入</button>
          <button @click="exportFile">导出</button>
        </div>
      </div>
      <input ref="fileRef" type="file" accept=".txt,.graph,text/plain" hidden @change="onFile" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { graphStore } from '../store/graphStore'

const text = ref('')
const custom = ref(graphStore.customLabels)
const textRef = ref<HTMLTextAreaElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)

let timer: number | undefined
let suppress = false

const graph = computed(() => graphStore.graph)
const directed = computed(() => graphStore.graph.directed)

watch(
  () => graphStore.graph,
  () => {
    if (suppress) {
      suppress = false
      return
    }
    const s = graphStore.serializeText()
    if (s !== text.value) text.value = s
  },
  { deep: true },
)

watch(custom, (v) => {
  graphStore.customLabels = v
  graphStore.loadText(text.value)
})

function onInput() {
  clearTimeout(timer)
  suppress = true
  timer = window.setTimeout(() => {
    graphStore.loadText(text.value)
  }, 500)
}

function setDirected(v: boolean) {
  graphStore.setDirected(v)
}

function renumber(base: 0 | 1) {
  graphStore.renumberTo(base)
}

function pickFile() {
  fileRef.value?.click()
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    text.value = String(reader.result ?? '')
    graphStore.loadText(text.value)
    input.value = ''
  }
  reader.readAsText(file)
}

function exportFile() {
  const blob = new Blob([graphStore.serializeText()], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'graph.txt'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  text.value = graphStore.serializeText()
})
</script>

<style scoped>
.grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.graph-text {
  flex: 1;
  width: 100%;
  min-height: 120px;
  resize: none;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: var(--input-bg);
  color: var(--text);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 8px;
  outline: none;
}

.graph-text:focus {
  border-color: var(--accent);
}

.stats {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  color: var(--text-dim);
  font-size: 12px;
}

.stats b {
  color: var(--accent);
  font-size: 14px;
}
</style>
