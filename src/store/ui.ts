import { reactive } from 'vue'
import type { EditorMode } from '../types/graph'

export const uiState = reactive({
  mode: 'draw' as EditorMode,
  editingNodeId: null as string | null,
  editingEdgeId: null as string | null,
  showMarkup: false,
  markupContent: '',
})
