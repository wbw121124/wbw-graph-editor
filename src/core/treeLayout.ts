import { graphStore } from '../store/graphStore'
import { WORLD_SIZE } from '../types/graph'

export function arrangeAsTree(layerGap = 90, nodeGap = 60) {
  const g = graphStore.graph
  if (g.nodes.length === 0) return
  graphStore.beginDrag()

  const visited = new Set<string>()
  const depthOf = new Map<string, number>()
  const xOf = new Map<string, number>()
  let nextX = 0

  for (const root of g.nodes) {
    if (visited.has(root.id)) continue
    const parent = new Map<string, string>()
    const children = new Map<string, string[]>()
    const stack: string[] = [root.id]
    visited.add(root.id)
    depthOf.set(root.id, 0)
    while (stack.length) {
      const id = stack.pop()!
      for (const e of g.edges) {
        const nb = e.from === id ? e.to : !g.directed && e.to === id ? e.from : null
        if (!nb || visited.has(nb)) continue
        visited.add(nb)
        parent.set(nb, id)
        depthOf.set(nb, (depthOf.get(id) ?? 0) + 1)
        stack.push(nb)
      }
    }
    for (const [child, p] of parent) {
      if (!children.has(p)) children.set(p, [])
      children.get(p)!.push(child)
    }
    const place = (id: string): number => {
      const ch = children.get(id) ?? []
      if (ch.length === 0) {
        const x = nextX
        nextX += nodeGap
        xOf.set(id, x)
        return x
      }
      const xs = ch.map(place)
      const x = (Math.min(...xs) + Math.max(...xs)) / 2
      xOf.set(id, x)
      return x
    }
    place(root.id)
  }

  for (const n of g.nodes) {
    n.x = Math.min(WORLD_SIZE, Math.max(0, xOf.get(n.id) ?? 0))
    n.y = Math.min(WORLD_SIZE, Math.max(0, (depthOf.get(n.id) ?? 0) * layerGap))
    n.fixed = true
  }
}
