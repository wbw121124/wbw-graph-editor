import { reactive } from 'vue'
import type { EditorMode } from '../types/graph'

export type SideTab = 'algo' | 'custom' | 'edit'

export const uiState = reactive({
  mode: 'draw' as EditorMode,
  sideTab: 'algo' as SideTab,
  editingNodeId: null as string | null,
  editingEdgeId: null as string | null,
  showMarkup: false,
  markupContent: '',
})
