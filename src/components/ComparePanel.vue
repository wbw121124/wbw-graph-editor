<template>
  <div class="section">
    <div class="cp-head">
      <h3>{{ t('algo.compare') }}</h3>
      <button class="ghost-btn" @click="uiState.compareMode = false">{{ t('algo.compareExit') }}</button>
    </div>
    <div class="cmp-col">
      <AlgoPicker :title="t('algo.cmpA')" :use="a.use" />
      <AlgoControlBar :runner="a.runner" />
      <AlgoLog :runner="a.runner" />
    </div>
    <div class="cmp-col">
      <AlgoPicker :title="t('algo.cmpB')" :use="b.use" />
      <AlgoControlBar :runner="b.runner" />
      <AlgoLog :runner="b.runner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { createRunner } from '../algorithms/runner'
import { uiState } from '../store/ui'
import { useAlgoRun } from '../composables/useAlgoRun'
import { t } from '../i18n'
import AlgoPicker from './AlgoPicker.vue'
import AlgoControlBar from './AlgoControlBar.vue'
import AlgoLog from './AlgoLog.vue'

const runnerA = createRunner()
const runnerB = createRunner()
const a = { runner: runnerA, use: useAlgoRun(runnerA) }
const b = { runner: runnerB, use: useAlgoRun(runnerB) }
</script>

<style scoped>
.cp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.cp-head h3 {
  margin: 0;
}

.ghost-btn {
  font-size: 11px;
  padding: 2px 8px;
}

.cmp-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed var(--border);
  padding: 8px 0;
}
</style>