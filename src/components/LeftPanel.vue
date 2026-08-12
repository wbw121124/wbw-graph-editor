<template>
  <aside class="panel left-panel">
    <div class="section">
      <div class="row between">
        <span class="label">{{ t('lp.graphType') }}</span>
        <div class="seg">
          <button :class="{ active: !directed }" @click="setDirected(false)">{{ t('lp.undirected') }}</button>
          <button :class="{ active: directed }" @click="setDirected(true)">{{ t('lp.directed') }}</button>
        </div>
      </div>
      <div class="stats">
        <span>{{ t('lp.nodes') }} <b>{{ graph.nodes.length }}</b></span>
        <span>{{ t('lp.edges') }} <b>{{ graph.edges.length }}</b></span>
      </div>
    </div>

    <div class="section grow">
      <div class="row between">
        <span class="label">Graph Data</span>
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
          <button :title="t('lp.fromZero')" @click="renumber(0)">0-based</button>
          <button :title="t('lp.fromOne')" @click="renumber(1)">1-based</button>
        </div>
        <div class="btn-group">
          <button @click="pickFile">{{ t('lp.import') }}</button>
          <button @click="exportFile">{{ t('lp.export') }}</button>
        </div>
      </div>
      <input ref="fileRef" type="file" accept=".txt,.graph,text/plain" hidden @change="onFile" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { graphStore } from '../store/graphStore'
import { t } from '../i18n'

const text = ref('')
const textRef = ref<HTMLTextAreaElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)

let timer: number | undefined
let lastLoaded = ''

const graph = computed(() => graphStore.graph)
const directed = computed(() => graphStore.graph.directed)

watch(
  () => graphStore.graph,
  () => {
    const s = graphStore.serializeText()
    if (s === lastLoaded) return
    if (s !== text.value) text.value = s
    lastLoaded = s
  },
  { deep: true },
)

function loadFromText() {
  graphStore.loadText(text.value)
  lastLoaded = graphStore.serializeText()
}

function onInput() {
  clearTimeout(timer)
  timer = window.setTimeout(loadFromText, 500)
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
    loadFromText()
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
  lastLoaded = text.value
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
