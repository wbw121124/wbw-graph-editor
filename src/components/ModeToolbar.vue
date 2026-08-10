<template>
  <div class="section">
    <h3>模式</h3>
    <div class="modes">
      <button
        v-for="m in modes"
        :key="m.id"
        :class="['mode-btn', { active: uiState.mode === m.id }]"
        @click="uiState.mode = m.id"
      >
        {{ m.name }}
      </button>
    </div>
    <p class="hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorMode } from '../types/graph'
import { uiState } from '../store/ui'

const modes: { id: EditorMode; name: string }[] = [
  { id: 'force', name: 'Force' },
  { id: 'draw', name: 'Draw' },
  { id: 'edit', name: 'Edit' },
  { id: 'delete', name: 'Delete' },
]

const hints: Record<EditorMode, string> = {
  force: '节点受力自动布局。单击节点固定/解除固定，拖拽后节点被固定。',
  draw: '单击空白处添加节点，依次单击两个节点添加边，拖拽移动节点。',
  edit: '单击节点修改标签，单击边修改权重 / 容量 / 费用。',
  delete: '单击节点删除节点及其所有边，单击边删除边。',
}

const hint = computed(() => hints[uiState.mode])
</script>

<style scoped>
.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-dim);
}
</style>
