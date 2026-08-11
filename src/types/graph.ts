export const WORLD_SIZE = 1000

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  fixed: boolean
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  weight: number | null
  capacity: number | null
  cost: number | null
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
  nodeFill: string
  nodeStroke: string
  labelColor: string
  edgeColor: string
  showGrid: boolean
}
