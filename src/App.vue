<template>
  <div class="app" :class="`theme-${themeName}`">
    <header class="topbar">
      <span class="logo">图编辑器 Graph Editor</span>
      <span class="sub">图论可视化 · 算法演示 · 自定义算法</span>
      <div class="spacer"></div>
      <button :disabled="!graphStore.canUndo" @click="graphStore.undo()">撤销</button>
      <button :disabled="!graphStore.canRedo" @click="graphStore.redo()">重做</button>
      <button class="ghost" @click="toggleTheme">{{ themeName === 'dark' ? '浅色' : '深色' }}</button>
    </header>

    <main class="main">
      <LeftPanel />

      <div class="canvas-wrap">
        <GraphCanvas
          ref="canvasRef"
          @edit-node="uiState.editingNodeId = $event"
          @edit-edge="uiState.editingEdgeId = $event"
        />
      </div>

      <aside class="side">
        <div class="tabs">
          <button :class="{ active: uiState.sideTab === 'algo' }" @click="uiState.sideTab = 'algo'">算法</button>
          <button :class="{ active: uiState.sideTab === 'custom' }" @click="uiState.sideTab = 'custom'">自定义</button>
          <button :class="{ active: uiState.sideTab === 'edit' }" @click="uiState.sideTab = 'edit'">编辑</button>
        </div>
        <div class="tab-pane" :class="{ hidden: uiState.sideTab !== 'algo' }">
          <AlgoPanel />
          <AlgoControlBar />
          <AlgoLog />
        </div>
        <div class="tab-pane" :class="{ hidden: uiState.sideTab !== 'custom' }">
          <AlgorithmEditor />
          <AlgoControlBar />
          <AlgoLog />
        </div>
        <div class="tab-pane" :class="{ hidden: uiState.sideTab !== 'edit' }">
          <ModeToolbar />
          <ConfigPanel />
          <CommandPanel :canvas="canvasRef" />
        </div>
      </aside>
    </main>

    <EditDialogs />
    <MarkupDialog />
    <MatrixDialog />
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
import AlgoPanel from './components/AlgoPanel.vue'
import AlgoControlBar from './components/AlgoControlBar.vue'
import AlgoLog from './components/AlgoLog.vue'
import AlgorithmEditor from './components/AlgorithmEditor.vue'
import MatrixDialog from './components/MatrixDialog.vue'
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

.sub {
  font-size: 11px;
  color: var(--text-dim);
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
  width: 270px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--panel);
  border-left: 1px solid var(--border);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
}

.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 5px 0;
  font-size: 12px;
  color: var(--text-dim);
}

.tabs button.active {
  background: var(--accent);
  color: #fff;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-pane.hidden {
  display: none;
}
</style>
