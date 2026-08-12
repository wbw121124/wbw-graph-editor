<template>
  <div class="section">
    <h3>{{ t('mode.title') }}</h3>
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
import { t } from '../i18n'

const modes: { id: EditorMode; name: string }[] = [
  { id: 'force', name: 'Force' },
  { id: 'draw', name: 'Draw' },
  { id: 'edit', name: 'Edit' },
  { id: 'delete', name: 'Delete' },
  { id: 'drag', name: 'Drag' },
  { id: 'select', name: 'Select' },
]

const hint = computed(() => t(`mode.hint.${uiState.mode}`))
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
