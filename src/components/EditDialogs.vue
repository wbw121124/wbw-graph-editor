<template>
  <div v-if="node" class="dialog-mask" @mousedown.self="close">
    <div class="dialog">
      <h3>编辑节点标签</h3>
      <input v-model="labelInput" class="input" @keydown.enter="save" />
      <div class="field">
        <span>注释</span>
        <input v-model="nodeCommentInput" class="input" placeholder="可选" @keydown.enter="save" />
      </div>
      <div class="dialog-actions">
        <button @click="close">取消</button>
        <button class="primary" @click="save">保存</button>
      </div>
    </div>
  </div>

  <div v-if="edge" class="dialog-mask" @mousedown.self="close">
    <div class="dialog">
      <h3>
        编辑边
        <span class="dim">({{ fromLabel }} → {{ toLabel }})</span>
      </h3>
      <div class="field">
        <span>权重</span>
        <input v-model="weightInput" class="input" placeholder="空表示无权重" />
      </div>
      <div class="field">
        <span>容量</span>
        <input v-model="capacityInput" class="input" placeholder="空表示未设置" />
      </div>
      <div class="field">
        <span>费用</span>
        <input v-model="costInput" class="input" placeholder="空表示未设置" />
      </div>
      <div class="field">
        <span>注释</span>
        <input v-model="edgeCommentInput" class="input" placeholder="可选" />
      </div>
      <div class="dialog-actions">
        <button @click="close">取消</button>
        <button class="primary" @click="saveEdge">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { graphStore } from '../store/graphStore'
import { uiState } from '../store/ui'

const labelInput = ref('')
const nodeCommentInput = ref('')
const weightInput = ref('')
const capacityInput = ref('')
const costInput = ref('')
const edgeCommentInput = ref('')

const node = computed(() => graphStore.graph.nodes.find((n) => n.id === uiState.editingNodeId) ?? null)
const edge = computed(() => graphStore.graph.edges.find((e) => e.id === uiState.editingEdgeId) ?? null)
const fromLabel = computed(() => (edge.value ? graphStore.nodeLabel(edge.value.from) : ''))
const toLabel = computed(() => (edge.value ? graphStore.nodeLabel(edge.value.to) : ''))

watch(node, (n) => {
  if (n) {
    labelInput.value = n.label
    nodeCommentInput.value = n.comment ?? ''
  }
})

watch(edge, (e) => {
  if (e) {
    weightInput.value = e.weight !== null ? String(e.weight) : ''
    capacityInput.value = e.capacity !== null ? String(e.capacity) : ''
    costInput.value = e.cost !== null ? String(e.cost) : ''
    edgeCommentInput.value = e.comment ?? ''
  }
})

function parseNum(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const v = Number(t)
  return isNaN(v) ? null : v
}

function save() {
  if (node.value) {
    graphStore.setNodeLabel(node.value.id, labelInput.value.trim() || node.value.label)
    graphStore.setNodeComment(node.value.id, nodeCommentInput.value)
  }
  close()
}

function saveEdge() {
  if (edge.value) {
    graphStore.setEdgeProps(edge.value.id, parseNum(weightInput.value), parseNum(capacityInput.value), parseNum(costInput.value))
    graphStore.setEdgeComment(edge.value.id, edgeCommentInput.value)
  }
  close()
}

function close() {
  uiState.editingNodeId = null
  uiState.editingEdgeId = null
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
  width: 320px;
  box-shadow: 0 8px 30px var(--shadow);
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-dim);
}

.field .input {
  flex: 1;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.dim {
  font-weight: normal;
  color: var(--text-dim);
}
</style>
