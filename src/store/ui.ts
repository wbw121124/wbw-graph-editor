import { reactive } from 'vue'
import type { EditorMode } from '../types/graph'

export type SideTab = 'algo' | 'custom' | 'edit'

export interface CtxMenuState {
  x: number
  y: number
  visible: boolean
  nodeId: string | null
  edgeId: string | null
  wx: number
  wy: number
}

export const uiState = reactive({
  mode: 'draw' as EditorMode,
  sideTab: 'algo' as SideTab,
  editingNodeId: null as string | null,
  editingEdgeId: null as string | null,
  showMarkup: false,
  markupContent: '',
  showShortcuts: false,
  ctxMenu: { x: 0, y: 0, visible: false, nodeId: null, edgeId: null, wx: 0, wy: 0 } as CtxMenuState,
})
