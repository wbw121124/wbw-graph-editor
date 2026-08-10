<template>
  <div class="app" :class="`theme-${themeName}`">
    <header class="topbar">
      <span class="logo">图编辑器 Graph Editor</span>
      <div class="spacer"></div>
      <button :disabled="!graphStore.canUndo" @click="graphStore.undo()">撤销</button>
      <button :disabled="!graphStore.canRedo" @click="graphStore.redo()">重做</button>
      <button class="ghost" @click="toggleTheme">{{ themeName === 'dark' ? '浅色' : '深色' }}</button>
    </header>

    <main class="main">
      <LeftPanel />

      <div class="canvas-wrap">
        <GraphCanvas ref="canvasRef" @edit-node="uiState.editingNodeId = $event" @edit-edge="uiState.editingEdgeId = $event" />
      </div>

      <aside class="side">
        <ModeToolbar />
        <ConfigPanel />
        <CommandPanel :canvas="canvasRef" />
      </aside>
    </main>

    <EditDialogs />
    <MarkupDialog />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LeftPanel from './components/LeftPanel.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import ModeToolbar from './components/ModeToolbar.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import CommandPanel from './components/CommandPanel.vue'
import EditDialogs from './components/EditDialogs.vue'
import MarkupDialog from './components/MarkupDialog.vue'
import { graphStore } from './store/graphStore'
import { themeName, toggleTheme } from './store/theme'
import { uiState } from './store/ui'

const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
</script>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.topbar {
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.logo {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.spacer {
  flex: 1;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.canvas-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  background: var(--bg);
}

.side {
  width: 252px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--panel);
  border-left: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
