<template>
  <div v-if="algoRunner.logs.value.length > 0" class="section log-panel">
    <h3>{{ t('log.title') }}</h3>
    <div class="log-list">
      <div v-for="(l, i) in algoRunner.logs.value" :key="i" class="log-line">{{ l }}</div>
    </div>
    <div class="log-actions">
      <button class="clear-btn" @click="algoRunner.logs.value = []">{{ t('log.clear') }}</button>
      <button class="clear-btn" @click="exportLogs">{{ t('log.export') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { algoRunner } from '../algorithms/runner'
import { t } from '../i18n'

function exportLogs() {
  const lines = algoRunner.logs.value
  const head = `${t('log.title')} - ${new Date().toLocaleString()}`
  const text = [head, '='.repeat(40), ...lines].join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'algo-log.txt'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  max-height: 240px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.7;
}

.log-line {
  color: var(--text);
  border-bottom: 1px dashed var(--border);
  padding: 2px 0;
}

.clear-btn {
  padding: 3px 10px;
  font-size: 11px;
}

.log-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}
</style>
