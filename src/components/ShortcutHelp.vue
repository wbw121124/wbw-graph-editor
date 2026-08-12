<template>
  <Teleport to="body">
    <div v-if="uiState.showShortcuts" class="short-mask" @mousedown.self="close" @keydown.esc="close">
      <div class="short-dialog" role="dialog">
        <h3>{{ t('short.title') }}</h3>
        <table>
          <tbody>
            <tr v-for="row in rows" :key="row.keys">
              <td class="keys">{{ row.keys }}</td>
              <td>{{ row.desc }}</td>
            </tr>
          </tbody>
        </table>
        <div class="actions">
          <button class="primary" @click="close">{{ t('short.close') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { uiState } from '../store/ui'
import { t } from '../i18n'

const rows = computed(() => [
  { keys: 'v / d / e / x / g / f', desc: t('short.modes') },
  { keys: 'Ctrl+Z · Ctrl+Shift+Z / Ctrl+Y', desc: t('short.undo') },
  { keys: 'Esc', desc: t('short.esc') },
  { keys: 'Enter', desc: t('short.enter') },
  { keys: 'Delete / Backspace', desc: t('short.del') },
  { keys: 'F1 / ?', desc: t('short.help') },
  { keys: t('short.mouse'), desc: t('short.mouseDesc') },
])

function close() {
  uiState.showShortcuts = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'F1' || e.key === '?') close()
}

onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.short-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.short-dialog {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 22px;
  width: 420px;
  box-shadow: 0 8px 30px var(--shadow);
}

h3 {
  margin: 0 0 12px;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}

.keys {
  color: var(--accent);
  font-family: Consolas, monospace;
  white-space: nowrap;
  width: 45%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>