export const WORLD_SIZE = 2000

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  fixed: boolean
  comment?: string
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  weight: number | null
  capacity: number | null
  cost: number | null
  comment?: string
}

export interface GraphData {
  directed: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type EditorMode = 'force' | 'draw' | 'edit' | 'delete' | 'drag'

export interface GraphStyle {
  nodeRadius: number
  edgeIdealLength: number
  repulsionK: number
  nodeFill: string
  nodeStroke: string
  labelColor: string
  edgeColor: string
  showGrid: boolean
}
