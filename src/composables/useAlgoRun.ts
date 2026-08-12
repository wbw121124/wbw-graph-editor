import { computed, ref } from 'vue'
import { graphStore } from '../store/graphStore'
import type { AlgorithmRunner } from '../algorithms/runner'
import { ALGORITHMS, type AlgoEntry } from '../algorithms/registry'
import { t } from '../i18n'

export function useAlgoRun(runner: AlgorithmRunner) {
  const selectedId = ref<string | null>(null)
  const sourceId = ref<string | null>(null)
  const targetId = ref<string | null>(null)

  const selected = computed(() => ALGORITHMS.find((a) => a.id === selectedId.value) ?? null)

  function byCategory(cat: string) {
    return ALGORITHMS.filter((a) => a.category === cat)
  }

  function select(algo: AlgoEntry) {
    runner.cancel()
    runner.logs.value = []
    if (selectedId.value === algo.id) {
      selectedId.value = null
      return
    }
    selectedId.value = algo.id
  }

  function run() {
    const algo = selected.value
    if (!algo) return
    if (graphStore.graph.nodes.length === 0) {
      runner.logs.value.push(t('algo.noNodes'))
      return
    }
    runner.start(
      algo.run({
        graph: graphStore.graph,
        sourceId: sourceId.value,
        targetId: targetId.value,
      }),
    )
  }

  return { selectedId, sourceId, targetId, selected, byCategory, select, run }
}

export type UseAlgoRun = ReturnType<typeof useAlgoRun>