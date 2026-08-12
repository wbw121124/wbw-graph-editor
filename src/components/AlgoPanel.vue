<template>
  <div class="section">
    <h3>{{ t('algo.builtin') }}</h3>
    <div v-for="cat in ALGO_CATEGORIES" :key="cat" class="algo-group">
      <div class="cat-label">{{ t(cat) }}</div>
      <div class="algo-grid">
        <button
          v-for="a in byCategory(cat)"
          :key="a.id"
          :class="['algo-btn', { active: selected?.id === a.id }]"
          @click="select(a)"
        >
          {{ t(a.nameKey) }}
        </button>
      </div>
    </div>

    <template v-if="selected">
      <div class="params">
        <label v-if="selected.params.includes('source')" class="param">
          {{ t('algo.source') }}
          <select v-model="sourceId">
            <option :value="null">{{ t('algo.none') }}</option>
            <option v-for="n in graphStore.graph.nodes" :key="n.id" :value="n.id">{{ n.label }}</option>
          </select>
        </label>
        <label v-if="selected.params.includes('target')" class="param">
          {{ t('algo.target') }}
          <select v-model="targetId">
            <option :value="null">{{ t('algo.none') }}</option>
            <option v-for="n in graphStore.graph.nodes" :key="n.id" :value="n.id">{{ n.label }}</option>
          </select>
        </label>
        <p v-if="selected.hintKey" class="hint">{{ t(selected.hintKey) }}</p>
        <button class="primary run-btn" @click="run">{{ t('algo.run') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { graphStore } from '../store/graphStore'
import { algoRunner } from '../algorithms/runner'
import { ALGO_CATEGORIES, ALGORITHMS, type AlgoEntry } from '../algorithms/registry'
import { t } from '../i18n'

const selectedId = ref<string | null>(null)
const sourceId = ref<string | null>(null)
const targetId = ref<string | null>(null)

const selected = computed(() => ALGORITHMS.find((a) => a.id === selectedId.value) ?? null)

function byCategory(cat: string) {
  return ALGORITHMS.filter((a) => a.category === cat)
}

function select(algo: AlgoEntry) {
  algoRunner.cancel()
  algoRunner.logs.value = []
  if (selectedId.value === algo.id) {
    selectedId.value = null
    return
  }
  selectedId.value = algo.id
}

function run() {
  const algo = selected.value
  if (!algo) return
  if (graphStore.graph.nodes.length === 0) {
    algoRunner.logs.value.push(t('algo.noNodes'))
    return
  }
  algoRunner.start(
    algo.run({
      graph: graphStore.graph,
      sourceId: sourceId.value,
      targetId: targetId.value,
    }),
  )
}
</script>

<style scoped>
.algo-group {
  margin-bottom: 8px;
}

.cat-label {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.algo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.algo-btn {
  padding: 5px 6px;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.params {
  border-top: 1px solid var(--border);
  margin-top: 8px;
  padding-top: 8px;
}

.param {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.param select {
  flex: 1;
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 5px;
  outline: none;
}

.hint {
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.6;
  margin: 6px 0;
}

.run-btn {
  width: 100%;
}
</style>
