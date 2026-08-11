import { WORLD_SIZE, type GraphData, type GraphEdge, type GraphNode, type GraphStyle } from '../types/graph'
import { ALGO_COLORS, canvasTheme, graphStyle } from '../store/theme'
import type { AlgoOverlayState } from './overlay'

export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export interface UiHoverState {
  hoverNodeId: string | null
  hoverEdgeId: string | null
  selectedNodeId: string | null
  tempEdgeFromId: string | null
  tempEdgeTarget: { x: number; y: number } | null
  draggingNodeId: string | null
}

export function screenToWorld(view: ViewTransform, sx: number, sy: number) {
  return { x: (sx - view.offsetX) / view.scale, y: (sy - view.offsetY) / view.scale }
}

export function worldToScreen(view: ViewTransform, wx: number, wy: number) {
  return { x: wx * view.scale + view.offsetX, y: wy * view.scale + view.offsetY }
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function fitWorld(view: ViewTransform, width: number, height: number) {
  view.scale = clamp(Math.min((width - 80) / WORLD_SIZE, (height - 80) / WORLD_SIZE), 0.15, 1.5)
  view.offsetX = width / 2 - (WORLD_SIZE / 2) * view.scale
  view.offsetY = height / 2 - (WORLD_SIZE / 2) * view.scale
}

export function fitView(view: ViewTransform, graph: GraphData, width: number, height: number) {
  if (graph.nodes.length === 0) {
    fitWorld(view, width, height)
    return
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of graph.nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  }
  const pad = 80
  const bw = Math.max(maxX - minX, 1)
  const bh = Math.max(maxY - minY, 1)
  view.scale = clamp(Math.min((width - pad * 2) / bw, (height - pad * 2) / bh), 0.15, 1.5)
  view.offsetX = width / 2 - ((minX + maxX) / 2) * view.scale
  view.offsetY = height / 2 - ((minY + maxY) / 2) * view.scale
}

function nodeRadius(): number {
  return graphStyle.nodeRadius
}

function edgeColorOf(overlay: AlgoOverlayState, id: string): string | null {
  return overlay.edgeColors.get(id) ?? null
}

function drawGrid(ctx: CanvasRenderingContext2D, view: ViewTransform, width: number, height: number) {
  const theme = canvasTheme.value
  const step = 50 * view.scale
  if (step < 8) return
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  const x0 = -view.offsetX / view.scale
  const y0 = -view.offsetY / view.scale
  const worldW = width / view.scale
  const worldH = height / view.scale
  const startX = Math.floor(x0 / 50) * 50
  const startY = Math.floor(y0 / 50) * 50
  for (let gx = startX; gx < x0 + worldW; gx += 50) {
    const sx = gx * view.scale + view.offsetX
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, height)
  }
  for (let gy = startY; gy < y0 + worldH; gy += 50) {
    const sy = gy * view.scale + view.offsetY
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
  }
  ctx.stroke()
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}<>${b}` : `${b}<>${a}`
}

export function buildParallelInfo(edges: GraphEdge[]): Map<string, { index: number; total: number }> {
  const groups = new Map<string, { dir0: string[]; dir1: string[] }>()
  for (const e of edges) {
    const k = pairKey(e.from, e.to)
    let g = groups.get(k)
    if (!g) {
      g = { dir0: [], dir1: [] }
      groups.set(k, g)
    }
    ;(e.from <= e.to ? g.dir0 : g.dir1).push(e.id)
  }
  const info = new Map<string, { index: number; total: number }>()
  for (const g of groups.values()) {
    const ids = [...g.dir0, ...g.dir1]
    const total = ids.length
    ids.forEach((id, index) => info.set(id, { index, total }))
  }
  return info
}

const PARALLEL_GAP = 14

export function bendOf(index: number, total: number) {
  if (total <= 1) return 0
  return (index - (total - 1) / 2) * PARALLEL_GAP
}

export function edgeControlPoint(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return { x: mx - uy * bend, y: my + ux * bend }
}

export function quadPoint(a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const s = 1 - t
  return {
    x: s * s * a.x + 2 * s * t * c.x + t * t * b.x,
    y: s * s * a.y + 2 * s * t * c.y + t * t * b.y,
  }
}

function arrowHead(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const a1 = angle + Math.PI / 7
  const a2 = angle - Math.PI / 7
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(a1), to.y - size * Math.sin(a1))
  ctx.lineTo(to.x - size * Math.cos(a2), to.y - size * Math.sin(a2))
  ctx.closePath()
  ctx.fill()
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  e: GraphEdge,
  a: GraphNode,
  b: GraphNode,
  directed: boolean,
  overlay: AlgoOverlayState,
  hover: UiHoverState,
  pinfo: { index: number; total: number },
) {
  const theme = canvasTheme.value
  const r = nodeRadius()
  const color = edgeColorOf(overlay, e.id) ?? (hover.hoverEdgeId === e.id ? theme.hover : graphStyle.edgeColor || theme.edgeColor)
  const isAlgo = overlay.edgeColors.has(e.id)
  const isHover = hover.hoverEdgeId === e.id
  ctx.strokeStyle = color
  ctx.lineWidth = isAlgo ? 2.6 : isHover ? 2.4 : 1.6
  ctx.fillStyle = color

  if (e.from === e.to) {
    const { index, total } = pinfo
    const ang = total > 1 ? (-Math.PI / 4 + (index / total) * Math.PI * 2) : Math.PI / 4
    const cx = a.x + Math.cos(ang) * r * 1.7
    const cy = a.y + Math.sin(ang) * r * 1.7
    const rr = r * 0.55
    ctx.beginPath()
    ctx.arc(cx, cy, rr, 0, Math.PI * 2)
    ctx.stroke()
    if (directed) {
      const ax = Math.cos(ang + Math.PI / 2)
      const ay = Math.sin(ang + Math.PI / 2)
      arrowHead(ctx, { x: cx + ax * rr, y: cy + ay * rr }, { x: cx + ax * rr * 1.15, y: cy + ay * rr * 1.15 }, 8)
    }
    const text = overlay.edgeValues.get(e.id) ?? (e.weight !== null ? String(e.weight) : '')
    if (text) {
      drawEdgeLabel(ctx, cx, cy, text, theme)
    }
    return
  }

  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const sx = a.x + ux * r
  const sy = a.y + uy * r
  const ex = b.x - ux * r
  const ey = b.y - uy * r

  let labelX = (sx + ex) / 2
  let labelY = (sy + ey) / 2

  const bend = bendOf(pinfo.index, pinfo.total) * (e.from <= e.to ? 1 : -1)
  if (bend !== 0) {
    const c = edgeControlPoint(a, b, bend)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(c.x, c.y, ex, ey)
    ctx.stroke()
    if (directed) {
      const tdx = ex - c.x
      const tdy = ey - c.y
      const tl = Math.hypot(tdx, tdy) || 1
      arrowHead(ctx, { x: ex - (tdx / tl) * r, y: ey - (tdy / tl) * r }, { x: ex, y: ey }, 9)
    }
    const mid = quadPoint({ x: sx, y: sy }, c, { x: ex, y: ey }, 0.5)
    labelX = mid.x
    labelY = mid.y
  } else {
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()

    if (directed) {
      arrowHead(ctx, { x: ex - ux * r, y: ey - uy * r }, { x: ex, y: ey }, 9)
    }
  }

  const text = overlay.edgeValues.get(e.id) ?? (e.weight !== null ? String(e.weight) : '')
  if (text) {
    drawEdgeLabel(ctx, labelX, labelY, text, theme)
  }
}

function drawEdgeLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, theme: { bg: string; labelColor: string }) {
  ctx.font = '600 12px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  const w = ctx.measureText(text).width + 8
  ctx.fillStyle = theme.bg
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 10, w, 18, 4)
  ctx.fill()
  ctx.fillStyle = theme.labelColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 0.5)
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  n: GraphNode,
  overlay: AlgoOverlayState,
  hover: UiHoverState,
) {
  const theme = canvasTheme.value
  const r = nodeRadius()
  const isHover = hover.hoverNodeId === n.id
  const isSelected = hover.selectedNodeId === n.id
  const isCurrent = overlay.nodeMarks.get(n.id) === 'current'
  const isVisited = overlay.nodeMarks.get(n.id) === 'visited'
  const fill = overlay.nodeColors.get(n.id) ?? (graphStyle.nodeFill || theme.nodeFill)

  ctx.beginPath()
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()

  let stroke = graphStyle.nodeStroke || theme.nodeStroke
  let lineWidth = 1.6
  if (isCurrent) {
    stroke = ALGO_COLORS.current
    lineWidth = 3.2
  } else if (isVisited) {
    stroke = ALGO_COLORS.visited
    lineWidth = 2.4
  } else if (isSelected) {
    stroke = theme.selected
    lineWidth = 2.6
  } else if (isHover) {
    stroke = theme.hover
    lineWidth = 2.4
  }
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()

  if (isCurrent) {
    ctx.beginPath()
    ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,167,38,0.35)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  ctx.fillStyle = graphStyle.labelColor || theme.labelColor
  ctx.font = '600 13px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(n.label, n.x, n.y + 0.5)

  const value = overlay.nodeValues.get(n.id)
  if (value !== undefined) {
    ctx.font = '11px Consolas, monospace'
    ctx.fillStyle = ALGO_COLORS.info
    ctx.fillText(value, n.x, n.y - r - 8)
  }

  if (n.fixed) {
    ctx.beginPath()
    ctx.arc(n.x + r * 0.72, n.y - r * 0.72, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = theme.fixedMarker
    ctx.fill()
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  graph: GraphData,
  view: ViewTransform,
  overlay: AlgoOverlayState,
  hover: UiHoverState,
  width: number,
  height: number,
  showWorldBounds = true,
) {
  const theme = canvasTheme.value
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(view.offsetX, view.offsetY)
  ctx.scale(view.scale, view.scale)

  if (graphStyle.showGrid) {
    ctx.restore()
    drawGrid(ctx, view, width, height)
    ctx.save()
    ctx.translate(view.offsetX, view.offsetY)
    ctx.scale(view.scale, view.scale)
  }

  const wx0 = -view.offsetX / view.scale
  const wy0 = -view.offsetY / view.scale
  const wx1 = wx0 + width / view.scale
  const wy1 = wy0 + height / view.scale
  if (showWorldBounds) {
    ctx.beginPath()
    ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0)
    ctx.rect(0, 0, WORLD_SIZE, WORLD_SIZE)
    ctx.fillStyle = 'rgba(255,0,0,0.25)'
    ctx.fill('evenodd')
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const parallel = buildParallelInfo(graph.edges)
  for (const e of graph.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const pinfo = parallel.get(e.id) ?? { index: 0, total: 1 }
    drawEdge(ctx, e, a, b, graph.directed, overlay, hover, pinfo)
  }

  for (const n of graph.nodes) {
    drawNode(ctx, n, overlay, hover)
  }

  if (hover.tempEdgeFromId) {
    const from = byId.get(hover.tempEdgeFromId)
    if (from && hover.tempEdgeTarget) {
      const t = hover.tempEdgeTarget
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(t.x, t.y)
      ctx.strokeStyle = theme.tempEdge
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  if (showWorldBounds) {
    ctx.strokeStyle = 'rgba(255,0,0,0.5)'
    ctx.lineWidth = 1.6
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE)
  }

  ctx.restore()
}
