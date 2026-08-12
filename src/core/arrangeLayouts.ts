import { graphStore } from '../store/graphStore'
import { WORLD_SIZE } from '../types/graph'

export function arrangeAsCircle(baseRadius = 200) {
  const g = graphStore.graph
  const n = g.nodes.length
  if (n === 0) return
  graphStore.beginDrag()
  const r = Math.min(WORLD_SIZE / 2 - 60, Math.max(140, baseRadius + n * 9))
  const cx = WORLD_SIZE / 2
  const cy = WORLD_SIZE / 2
  g.nodes.forEach((nd, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    nd.x = cx + Math.cos(a) * r
    nd.y = cy + Math.sin(a) * r
    nd.fixed = true
  })
}

export function arrangeAsGrid(cell = 170) {
  const g = graphStore.graph
  const n = g.nodes.length
  if (n === 0) return
  graphStore.beginDrag()
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.ceil(n / cols)
  const x0 = (WORLD_SIZE - (cols - 1) * cell) / 2
  const y0 = (WORLD_SIZE - (rows - 1) * cell) / 2
  g.nodes.forEach((nd, i) => {
    nd.x = x0 + (i % cols) * cell
    nd.y = y0 + Math.floor(i / cols) * cell
    nd.fixed = true
  })
}
