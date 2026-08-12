export type AlgoEvent =
  | { type: 'visit'; node: string }
  | { type: 'current'; node: string | null }
  | { type: 'setNodeColor'; node: string; color: string }
  | { type: 'setNodeValue'; node: string; text: string }
  | { type: 'clearNode'; node: string }
  | { type: 'clearNodes' }
  | { type: 'setEdgeColor'; edge: string; color: string }
  | { type: 'setEdgeValue'; edge: string; text: string }
  | { type: 'clearEdge'; edge: string }
  | { type: 'clearEdges' }
  | { type: 'log'; message: string }
  | { type: 'matrix'; title: string; labels: string[]; matrix: (number | null)[][] }
  | { type: 'done'; message?: string }

export interface AlgoStep {
  events: AlgoEvent[]
  pause: boolean
}

export interface MatrixData {
  title: string
  labels: string[]
  rows: (number | null)[][]
}

export interface AlgoContext {
  graph: import('../types/graph').GraphData
  sourceId: string | null
  targetId: string | null
}

export type AlgoCategory = 'cat.traverse' | 'cat.shortest' | 'cat.mst' | 'cat.structure' | 'cat.flow' | 'cat.matching'

export interface AlgoMeta {
  id: string
  nameKey: string
  category: AlgoCategory
  needsSource?: boolean
  needsTarget?: boolean
  requiresWeights?: boolean
  requiresCapacity?: boolean
  requiresDirected?: boolean
  hintKey?: string
}
