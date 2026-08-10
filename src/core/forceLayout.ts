import { graphStore } from '../store/graphStore'
import { graphStyle } from '../store/theme'

export function layoutTick(dt = 1) {
  const { nodes, edges } = graphStore.graph
  const n = nodes.length
  if (n === 0) return
  const k = graphStyle.edgeIdealLength
  const fx = new Float64Array(n)
  const fy = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dx = nodes[i].x - nodes[j].x
      let dy = nodes[i].y - nodes[j].y
      let d2 = dx * dx + dy * dy
      if (d2 < 1) {
        dx = (Math.random() - 0.5) * 2
        dy = (Math.random() - 0.5) * 2
        d2 = 1
      }
      const d = Math.sqrt(d2)
      const f = (k * k) / d
      const ux = dx / d
      const uy = dy / d
      fx[i] += ux * f
      fy[i] += uy * f
      fx[j] -= ux * f
      fy[j] -= uy * f
    }
  }

  const idxById = new Map(nodes.map((nd, idx) => [nd.id, idx]))
  for (const e of edges) {
    const i = idxById.get(e.from)
    const j = idxById.get(e.to)
    if (i === undefined || j === undefined || i === j) continue
    const dx = nodes[j].x - nodes[i].x
    const dy = nodes[j].y - nodes[i].y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const f = (d - k) * 0.08
    const ux = dx / d
    const uy = dy / d
    fx[i] += ux * f
    fy[i] += uy * f
    fx[j] -= ux * f
    fy[j] -= uy * f
  }

  for (let i = 0; i < n; i++) {
    fx[i] -= nodes[i].x * 0.003
    fy[i] -= nodes[i].y * 0.003
  }

  const speed = 0.06 * dt
  for (let i = 0; i < n; i++) {
    const node = nodes[i]
    if (node.fixed) continue
    const mag = Math.hypot(fx[i], fy[i])
    if (mag === 0) continue
    const step = Math.min(mag, 50) * speed
    node.x += (fx[i] / mag) * step
    node.y += (fy[i] / mag) * step
  }
}
