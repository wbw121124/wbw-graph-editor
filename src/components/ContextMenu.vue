<template>
  <Teleport to="body">
    <div
      v-if="menu.visible"
      class="ctx-menu"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <template v-if="menu.nodeId">
        <button @click="act(editNode)">{{ t('ctx.edit') }}</button>
        <button @click="act(selfLoop)">{{ t('ctx.selfLoop') }}</button>
        <button @click="act(toggleFix)">{{ fixed ? t('ctx.unfix') : t('ctx.fix') }}</button>
        <button class="danger" @click="act(removeNode)">{{ t('ctx.delete') }}</button>
      </template>
      <template v-else-if="menu.edgeId">
        <button @click="act(editEdge)">{{ t('ctx.edit') }}</button>
        <button :disabled="!directed" @click="act(reverseEdge)">{{ t('ctx.reverse') }}</button>
        <button class="danger" @click="act(removeEdge)">{{ t('ctx.delete') }}</button>
      </template>
      <template v-else>
        <button @click="act(addNode)">{{ t('ctx.addNode') }}</button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { uiState } from '../store/ui'
import { graphStore } from '../store/graphStore'
import { t } from '../i18n'

const menu = uiState.ctxMenu

const pos = computed(() => ({
  x: Math.min(menu.x, window.innerWidth - 150),
  y: Math.min(menu.y, window.innerHeight - 170),
}))

const fixed = computed(
  () => (menu.nodeId ? (graphStore.graph.nodes.find((n) => n.id === menu.nodeId)?.fixed ?? false) : false),
)
const directed = computed(() => graphStore.graph.directed)

function close() {
  menu.visible = false
}

function act(fn: () => void) {
  fn()
  close()
}

function editNode() {
  if (menu.nodeId) uiState.editingNodeId = menu.nodeId
}

function editEdge() {
  if (menu.edgeId) uiState.editingEdgeId = menu.edgeId
}

function selfLoop() {
  if (menu.nodeId) graphStore.addEdgeBetween(menu.nodeId, menu.nodeId)
}

function toggleFix() {
  if (menu.nodeId) graphStore.toggleFixed(menu.nodeId)
}

function removeNode() {
  if (menu.nodeId) graphStore.removeNode(menu.nodeId)
}

function reverseEdge() {
  if (menu.edgeId) graphStore.reverseEdge(menu.edgeId)
}

function removeEdge() {
  if (menu.edgeId) graphStore.removeEdge(menu.edgeId)
}

function addNode() {
  graphStore.addNodeAt(menu.wx, menu.wy)
}

function onGlobalDown(e: MouseEvent) {
  if (!menu.visible) return
  const el = (e.target as HTMLElement)?.closest?.('.ctx-menu')
  if (el) return
  close()
}

function onGlobalWheel() {
  if (menu.visible) close()
}

onMounted(() => {
  window.addEventListener('mousedown', onGlobalDown, true)
  window.addEventListener('wheel', onGlobalWheel, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onGlobalDown, true)
  window.removeEventListener('wheel', onGlobalWheel)
})
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 130px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--shadow);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ctx-menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 10px;
  font-size: 12.5px;
  border-radius: 5px;
  color: var(--text);
  cursor: pointer;
}

.ctx-menu button:hover {
  background: var(--panel-2);
}

.ctx-menu button:disabled {
  opacity: 0.45;
  cursor: default;
}

.ctx-menu .danger {
  color: #e05555;
}
</style>