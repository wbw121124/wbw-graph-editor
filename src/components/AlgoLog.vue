<template>
  <div v-if="algoRunner.logs.value.length > 0" class="section log-panel">
    <h3>日志</h3>
    <div class="log-list">
      <div v-for="(l, i) in algoRunner.logs.value" :key="i" class="log-line">{{ l }}</div>
    </div>
    <button class="clear-btn" @click="algoRunner.logs.value = []">清空</button>
  </div>
</template>

<script setup lang="ts">
import { algoRunner } from '../algorithms/runner'
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
  align-self: flex-end;
  margin-top: 6px;
  padding: 3px 10px;
  font-size: 11px;
}
</style>
