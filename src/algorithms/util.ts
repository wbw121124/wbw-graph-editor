import type { GraphData, GraphEdge } from '../types/graph'

export function labelOf(g: GraphData, id: string): string {
  return g.nodes.find((n) => n.id === id)?.label ?? id
}

export function edgeBetween(g: GraphData, from: string, to: string): GraphEdge | undefined {
  return g.edges.find((e) => e.from === from && e.to === to) || (!g.directed ? g.edges.find((e) => e.from === to && e.to === from) : undefined)
}

export function neighbors(g: GraphData, id: string): { v: string; edge: GraphEdge }[] {
  const out: { v: string; edge: GraphEdge }[] = []
  for (const e of g.edges) {
    if (e.from === id) out.push({ v: e.to, edge: e })
    else if (!g.directed && e.to === id) out.push({ v: e.from, edge: e })
  }
  return out
}

export function weightOf(e: GraphEdge, fallback = 1): number {
  return e.weight ?? fallback
}

export function capacityOf(e: GraphEdge): number {
  return e.capacity ?? 1
}
