export type NodeMark = 'visited' | 'current'

export interface AlgoOverlayState {
  nodeColors: Map<string, string>
  nodeValues: Map<string, string>
  nodeMarks: Map<string, NodeMark>
  edgeColors: Map<string, string>
  edgeValues: Map<string, string>
}

export const algoOverlay: AlgoOverlayState = {
  nodeColors: new Map(),
  nodeValues: new Map(),
  nodeMarks: new Map(),
  edgeColors: new Map(),
  edgeValues: new Map(),
}

export function resetAlgoOverlay() {
  algoOverlay.nodeColors.clear()
  algoOverlay.nodeValues.clear()
  algoOverlay.nodeMarks.clear()
  algoOverlay.edgeColors.clear()
  algoOverlay.edgeValues.clear()
}
