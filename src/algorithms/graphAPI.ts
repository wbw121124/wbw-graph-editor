import type { GraphData } from '../types/graph'

export interface UserEdge {
  id: string
  from: string
  to: string
  weight: number | null
  capacity: number | null
  cost: number | null
}

export interface GraphAPI {
  nodeCount: () => number
  edgeCount: () => number
  nodes: () => string[]
  labels: () => string[]
  isDirected: () => boolean
  label: (u: string | number) => string
  neighbors: (u: string | number) => { node: string; edge: UserEdge }[]
  edge: (u: string | number, v: string | number) => UserEdge | null
  edges: () => UserEdge[]
}

export function createGraphAPI(g: GraphData): GraphAPI {
  const nodes = [...g.nodes]
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const resolve = (u: string | number): string => {
    if (typeof u === 'number') {
      if (byId.has(`n${u}`)) return `n${u}`
      return nodes[u]?.id ?? String(u)
    }
    if (byId.has(u)) return u
    return g.nodes.find((n) => n.label === u)?.id ?? u
  }
  const toUserEdge = (e: GraphData['edges'][number]): UserEdge => ({
    id: e.id,
    from: e.from,
    to: e.to,
    weight: e.weight,
    capacity: e.capacity,
    cost: e.cost,
  })
  return {
    nodeCount: () => nodes.length,
    edgeCount: () => g.edges.length,
    nodes: () => nodes.map((n) => n.id),
    labels: () => nodes.map((n) => n.label),
    isDirected: () => g.directed,
    label: (u) => byId.get(resolve(u))?.label ?? String(u),
    neighbors: (u) => {
      const id = resolve(u)
      const out: { node: string; edge: UserEdge }[] = []
      for (const e of g.edges) {
        if (e.from === id) out.push({ node: e.to, edge: toUserEdge(e) })
        else if (!g.directed && e.to === id) out.push({ node: e.from, edge: toUserEdge(e) })
      }
      return out
    },
    edge: (u, v) => {
      const a = resolve(u)
      const b = resolve(v)
      const e =
        g.edges.find((x) => x.from === a && x.to === b) ||
        (!g.directed ? g.edges.find((x) => x.from === b && x.to === a) : undefined)
      return e ? toUserEdge(e) : null
    },
    edges: () => g.edges.map(toUserEdge),
  }
}
