<template>
  <div v-if="uiState.showMarkup" class="dialog-mask" @mousedown.self="close">
    <div class="dialog wide">
      <div class="header">
        <h3>生成标记</h3>
        <button class="primary" @click="copy">复制</button>
        <button @click="close">关闭</button>
      </div>
      <textarea readonly class="markup-text" :value="uiState.markupContent"></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uiState } from '../store/ui'

function close() {
  uiState.showMarkup = false
}

async function copy() {
  await navigator.clipboard.writeText(uiState.markupContent)
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

.dialog.wide {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  width: 640px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px var(--shadow);
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.header h3 {
  flex: 1;
  font-size: 14px;
}

.markup-text {
  flex: 1;
  min-height: 300px;
  resize: none;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: var(--input-bg);
  color: var(--text);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 10px;
  outline: none;
}
</style>
