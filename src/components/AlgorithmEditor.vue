<template>
  <div class="section algo-editor">
    <div class="head">
      <h3>{{ t('ce.title') }}</h3>
      <button class="primary" :disabled="running" @click="run">{{ t('ce.run') }}</button>
    </div>
    <div class="row between">
      <input v-model="name" class="input name-input" :placeholder="t('ce.namePlaceholder')" />
      <button @click="save">{{ t('ce.save') }}</button>
    </div>
    <select v-model="selectedKey" class="select" @change="applySelected">
      <option value="">{{ t('ce.selectPlaceholder') }}</option>
      <optgroup :label="t('ce.grpTemplates')">
        <option v-for="tpl in templates" :key="tpl.id" :value="`t:${tpl.id}`">{{ t(tpl.nameKey) }}</option>
      </optgroup>
      <optgroup :label="t('ce.grpSaved')">
        <option v-for="a in savedAlgos" :key="a.id" :value="`s:${a.id}`">{{ a.name }}</option>
      </optgroup>
    </select>
    <div ref="editorEl" class="cm-host"></div>
    <div class="row between foot">
      <span class="dim">{{ currentSaved ? t('ce.saved') : t('ce.draft') }}</span>
      <button v-if="currentSaved" @click="del">{{ t('ce.del') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { graphStore } from '../store/graphStore'
import { algoRunner } from '../algorithms/runner'
import { createGraphAPI } from '../algorithms/graphAPI'
import { ALGO_TEMPLATES } from '../algorithms/templates'
import { themeName } from '../store/theme'
import { locale, t } from '../i18n'

interface SavedAlgo {
  id: string
  name: string
  code: string
}

const STORAGE_KEY = 'wbw-algos'

function loadSaved(): SavedAlgo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedAlgo[]
  } catch {
    return []
  }
}

const savedAlgos = ref<SavedAlgo[]>(loadSaved())
const name = ref('')
const code = ref('')
const selectedKey = ref('')
const currentSavedId = ref<string | null>(null)
const editorEl = ref<HTMLDivElement | null>(null)

let editor: EditorView | null = null

const templates = ALGO_TEMPLATES
const running = computed(() => algoRunner.isActive)
const currentSaved = computed(() => savedAlgos.value.find((a) => a.id === currentSavedId.value) ?? null)

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAlgos.value))
}

function buildEditor(doc: string) {
  if (!editorEl.value) return
  editor?.destroy()
  const isDark = themeName.value === 'dark'
  editor = new EditorView({
    parent: editorEl.value,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        javascript(),
        isDark ? oneDark : [],
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            code.value = u.state.doc.toString()
            currentSavedId.value = null
            selectedKey.value = ''
          }
        }),
        EditorView.theme({
          '&': { height: '280px', fontSize: '12.5px' },
          '.cm-scroller': { fontFamily: 'Consolas, "Courier New", monospace' },
        }),
      ],
    }),
  })
}

function applySelected() {
  const key = selectedKey.value
  if (key.startsWith('t:')) {
    const tpl = templates.find((x) => x.id === key.slice(2))
    if (!tpl) return
    const tplCode = tpl.codes[locale.value]
    code.value = tplCode
    name.value = t(tpl.nameKey)
    currentSavedId.value = null
    buildEditor(tplCode)
  } else if (key.startsWith('s:')) {
    const a = savedAlgos.value.find((x) => x.id === key.slice(2))
    if (!a) return
    code.value = a.code
    name.value = a.name
    currentSavedId.value = a.id
    buildEditor(a.code)
  }
}

function save() {
  const trimmed = code.value
  if (!name.value.trim()) return
  if (currentSavedId.value) {
    const a = savedAlgos.value.find((x) => x.id === currentSavedId.value)
    if (a) {
      a.name = name.value.trim()
      a.code = trimmed
    }
  } else {
    savedAlgos.value.push({ id: String(Date.now()), name: name.value.trim(), code: trimmed })
  }
  persist()
  selectedKey.value = ''
}

function del() {
  if (!currentSavedId.value) return
  savedAlgos.value = savedAlgos.value.filter((a) => a.id !== currentSavedId.value)
  persist()
  currentSavedId.value = null
  selectedKey.value = ''
}

function run() {
  try {
    algoRunner.startUserCode((api) => {
      const G = createGraphAPI(graphStore.graph)
      const fn = new Function('G', 'api', code.value)
      return fn(G, api)
    })
  } catch (err) {
    algoRunner.logs.value.push(t('ce.compileError', { msg: String(err) }))
  }
}

watch(themeName, () => buildEditor(code.value))

onMounted(() => {
  buildEditor(code.value || t('ce.placeholderCode'))
})

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>

<style scoped>
.algo-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name-input {
  flex: 1;
  min-width: 0;
}

.select {
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 6px;
  outline: none;
  width: 100%;
}

.cm-host {
  border: 1px solid var(--input-border);
  border-radius: 6px;
  overflow: hidden;
}

.foot {
  min-height: 22px;
}

.dim {
  font-size: 11px;
  color: var(--text-dim);
}
</style>
