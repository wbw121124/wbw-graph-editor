<template>
  <div v-if="algoRunner.matrix.value" class="dialog-mask" @mousedown.self="close">
    <div class="dialog">
      <h3>{{ algoRunner.matrix.value.title }}</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th v-for="l in algoRunner.matrix.value.labels" :key="l">{{ l }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in algoRunner.matrix.value.rows" :key="i">
              <th>{{ algoRunner.matrix.value.labels[i] }}</th>
              <td v-for="(v, j) in row" :key="j" :class="{ inf: v === null }">{{ v === null ? '∞' : v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { algoRunner } from '../algorithms/runner'

function close() {
  algoRunner.matrix.value = null
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 8px 30px var(--shadow);
}

.table-wrap {
  overflow: auto;
}

table {
  border-collapse: collapse;
  font-size: 12px;
  font-family: Consolas, monospace;
}

th,
td {
  border: 1px solid var(--border);
  padding: 4px 8px;
  text-align: center;
  min-width: 36px;
}

th {
  color: var(--accent);
  background: var(--panel-2);
}

td.inf {
  color: var(--danger);
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
