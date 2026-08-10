import { reactive } from 'vue'
import type { GraphData, GraphEdge, GraphNode } from '../types/graph'
import { parseGraphText } from '../core/parser'

let nodeSeq = 0
let edgeSeq = 0

function snapshotOf(g: GraphData): string {
  return JSON.stringify(g)
}

export class GraphStore {
  graph = reactive<GraphData>({ directed: false, nodes: [], edges: [] })
  customLabels = false

  private history: string[] = []
  private future: string[] = []
  private readonly maxHistory = 300
  private restoring = false

  get canUndo() {
    return this.history.length > 0
  }

  get canRedo() {
    return this.future.length > 0
  }

  private syncSeq() {
    nodeSeq = 0
    for (const n of this.graph.nodes) {
      const num = parseInt(n.id.slice(1), 10)
      if (!isNaN(num) && num >= nodeSeq) nodeSeq = num + 1
    }
    edgeSeq = 0
    for (const e of this.graph.edges) {
      const num = parseInt(e.id.slice(1), 10)
      if (!isNaN(num) && num >= edgeSeq) edgeSeq = num + 1
    }
  }

  private applySnapshot(snap: string) {
    this.restoring = true
    const data = JSON.parse(snap) as GraphData
    this.graph.directed = data.directed
    this.graph.nodes.splice(0, this.graph.nodes.length, ...data.nodes)
    this.graph.edges.splice(0, this.graph.edges.length, ...data.edges)
    this.syncSeq()
    this.restoring = false
  }

  private commit() {
    if (this.restoring) return
    this.history.push(snapshotOf(this.graph))
    if (this.history.length > this.maxHistory) this.history.shift()
    this.future = []
  }

  undo() {
    const snap = this.history.pop()
    if (!snap) return
    this.future.push(snapshotOf(this.graph))
    this.applySnapshot(snap)
  }

  redo() {
    const snap = this.future.pop()
    if (!snap) return
    this.history.push(snapshotOf(this.graph))
    this.applySnapshot(snap)
  }

  nodeLabel(id: string): string {
    const n = this.graph.nodes.find((x) => x.id === id)
    return n ? n.label : id
  }

  labelToId(label: string): string {
    const n = this.graph.nodes.find((x) => x.label === label)
    return n ? n.id : label
  }

  addNodeAt(x: number, y: number, label?: string): GraphNode {
    this.commit()
    const node: GraphNode = {
      id: `n${nodeSeq++}`,
      label: label ?? String(nodeSeq - 1),
      x,
      y,
      fixed: false,
    }
    this.graph.nodes.push(node)
    return node
  }

  removeNode(id: string) {
    this.commit()
    const idx = this.graph.nodes.findIndex((n) => n.id === id)
    if (idx < 0) return
    this.graph.nodes.splice(idx, 1)
    const keep = this.graph.edges.filter((e) => e.from !== id && e.to !== id)
    this.graph.edges.splice(0, this.graph.edges.length, ...keep)
  }

  setNodeLabel(id: string, label: string) {
    const n = this.graph.nodes.find((x) => x.id === id)
    if (!n || !label.trim() || n.label === label.trim()) return
    this.commit()
    n.label = label.trim()
  }

  toggleFixed(id: string) {
    const n = this.graph.nodes.find((x) => x.id === id)
    if (!n) return
    this.commit()
    n.fixed = !n.fixed
  }

  beginDrag() {
    this.commit()
  }

  moveNode(id: string, x: number, y: number) {
    const n = this.graph.nodes.find((x2) => x2.id === id)
    if (n) {
      n.x = x
      n.y = y
    }
  }

  addEdgeBetween(from: string, to: string, weight: number | null = null, capacity: number | null = null, cost: number | null = null): GraphEdge | null {
    if (from === to) return null
    this.commit()
    const edge: GraphEdge = {
      id: `e${edgeSeq++}`,
      from,
      to,
      weight,
      capacity,
      cost,
    }
    this.graph.edges.push(edge)
    return edge
  }

  removeEdge(id: string) {
    const idx = this.graph.edges.findIndex((e) => e.id === id)
    if (idx < 0) return
    this.commit()
    this.graph.edges.splice(idx, 1)
  }

  setEdgeProps(id: string, weight: number | null, capacity: number | null = null, cost: number | null = null) {
    const e = this.graph.edges.find((x) => x.id === id)
    if (!e) return
    if (e.weight === weight && e.capacity === capacity && e.cost === cost) return
    this.commit()
    e.weight = weight
    e.capacity = capacity
    e.cost = cost
  }

  setDirected(directed: boolean) {
    if (this.graph.directed === directed) return
    this.commit()
    this.graph.directed = directed
  }

  loadText(text: string) {
    const parsed = parseGraphText(text, this.customLabels)
    this.commit()
    const byLabel = new Map(this.graph.nodes.map((n) => [n.label, n]))
    const idOf = new Map<string, string>()
    const newNodes: GraphNode[] = []
    for (const pn of parsed.nodes) {
      const prev = byLabel.get(pn.label)
      if (prev) {
        idOf.set(pn.label, prev.id)
        newNodes.push({ ...prev })
      } else {
        const id = `n${nodeSeq++}`
        idOf.set(pn.label, id)
        newNodes.push({
          id,
          label: pn.label,
          x: 100 + Math.random() * 600,
          y: 80 + Math.random() * 400,
          fixed: false,
        })
      }
    }
    this.graph.nodes.splice(0, this.graph.nodes.length, ...newNodes)
    const newEdges: GraphEdge[] = parsed.edges.map((pe) => ({
      id: `e${edgeSeq++}`,
      from: idOf.get(pe.from) ?? pe.from,
      to: idOf.get(pe.to) ?? pe.to,
      weight: pe.weight,
      capacity: pe.capacity,
      cost: pe.cost,
    }))
    this.graph.edges.splice(0, this.graph.edges.length, ...newEdges)
  }

  serializeText(): string {
    const lines: string[] = []
    for (const n of this.graph.nodes) lines.push(n.label)
    for (const e of this.graph.edges) {
      let line = `${this.nodeLabel(e.from)} ${this.nodeLabel(e.to)}`
      if (e.weight !== null) line += ` ${e.weight}`
      if (e.capacity !== null) line += ` ${e.capacity}`
      if (e.cost !== null) line += ` ${e.cost}`
      lines.push(line)
    }
    return lines.join('\n')
  }

  renumberTo(base: 0 | 1) {
    let isOneBased = true
    for (const n of this.graph.nodes) {
      if (/^\d+$/.test(n.label)) {
        if (parseInt(n.label, 10) === 0) {
          isOneBased = false
          break
        }
      }
    }
    const delta = base === 1 ? (isOneBased ? 0 : 1) : isOneBased ? -1 : 0
    if (delta === 0) return
    this.commit()
    for (const n of this.graph.nodes) {
      if (/^\d+$/.test(n.label)) n.label = String(parseInt(n.label, 10) + delta)
    }
  }

  clear() {
    if (this.graph.nodes.length === 0 && this.graph.edges.length === 0) return
    this.commit()
    this.graph.nodes.splice(0, this.graph.nodes.length)
    this.graph.edges.splice(0, this.graph.edges.length)
  }
}

export const graphStore = new GraphStore()
