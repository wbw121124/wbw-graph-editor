<template>
  <div class="picker">
    <div class="p-head">
      <span class="p-title">{{ title }}</span>
      <button class="primary run-btn" @click="run">{{ t('algo.run') }}</button>
    </div>
    <div class="algo-group">
      <div class="algo-grid">
        <button
          v-for="a in ALGORITHMS"
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { graphStore } from '../store/graphStore'
import { ALGORITHMS } from '../algorithms/registry'
import type { UseAlgoRun } from '../composables/useAlgoRun'
import { t } from '../i18n'

const props = defineProps<{ title: string; use: UseAlgoRun }>()

const { selected, sourceId, targetId, select, run } = props.use
</script>

<style scoped>
.p-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.p-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.algo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.algo-btn {
  padding: 4px 6px;
  font-size: 11.5px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.algo-btn.active {
  background: var(--accent);
  color: #fff;
}

.params {
  margin-top: 6px;
}

.param {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.param select {
  flex: 1;
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 4px;
  outline: none;
}

.hint {
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.6;
  margin: 4px 0;
}

.run-btn {
  padding: 3px 12px;
  font-size: 11.5px;
}
</style>