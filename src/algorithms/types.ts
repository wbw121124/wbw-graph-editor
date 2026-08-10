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

export type AlgoCategory = '遍历' | '最短路' | '最小生成树' | '结构' | '网络流' | '匹配'

export interface AlgoMeta {
  id: string
  name: string
  category: AlgoCategory
  needsSource?: boolean
  needsTarget?: boolean
  requiresWeights?: boolean
  requiresCapacity?: boolean
  requiresDirected?: boolean
  hint?: string
}
