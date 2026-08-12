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
  selectedEdgeId: string | null
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
  const spacing = graphStyle.gridSpacing
  const step = spacing * view.scale
  if (step < 8) return
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  const x0 = -view.offsetX / view.scale
  const y0 = -view.offsetY / view.scale
  const worldW = width / view.scale
  const worldH = height / view.scale
  const startX = Math.floor(x0 / spacing) * spacing
  const startY = Math.floor(y0 / spacing) * spacing
  for (let gx = startX; gx < x0 + worldW; gx += spacing) {
    const sx = gx * view.scale + view.offsetX
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, height)
  }
  for (let gy = startY; gy < y0 + worldH; gy += spacing) {
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

export function cubicPoint(a: { x: number; y: number }, c1: { x: number; y: number }, c2: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const s = 1 - t
  return {
    x: s * s * s * a.x + 3 * s * s * t * c1.x + 3 * s * t * t * c2.x + t * t * t * b.x,
    y: s * s * s * a.y + 3 * s * s * t * c1.y + 3 * s * t * t * c2.y + t * t * t * b.y,
  }
}

export function selfLoopGeometry(a: { x: number; y: number }, r: number, index: number, total: number) {
  // 同节点的自环共用同一对锚点方向:出口在正左、入口在正右(相差180°)
  // 控制点沿锚点切线竖直出发(不切穿节点圆),多条自环靠垂向错开
  const bulge = r * 3 + index * r * 2
  const sx = a.x - r
  const sy = a.y
  const ex = a.x + r
  const ey = a.y
  const cx1 = a.x - r
  const cy1 = a.y - bulge * 0.7
  const cx2 = a.x + r
  const cy2 = a.y - bulge * 0.7
  return { sx, sy, ex, ey, cx1, cy1, cx2, cy2 }
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
  const isAlgo = overlay.edgeColors.has(e.id)
  const isHover = hover.hoverEdgeId === e.id
  const isSelected = hover.selectedEdgeId === e.id
  const color = edgeColorOf(overlay, e.id) ?? (isHover ? theme.hover : isSelected ? theme.selected : graphStyle.edgeColor || theme.edgeColor)
  ctx.strokeStyle = color
  ctx.lineWidth = isAlgo || isSelected ? graphStyle.edgeWidth + 1 : isHover ? graphStyle.edgeWidth + 0.8 : graphStyle.edgeWidth
  ctx.fillStyle = color
  const arrow = graphStyle.arrowSize

  if (e.from === e.to) {
    const { index, total } = pinfo
    const g = selfLoopGeometry(a, r, index, total)
    ctx.beginPath()
    ctx.moveTo(g.sx, g.sy)
    ctx.bezierCurveTo(g.cx1, g.cy1, g.cx2, g.cy2, g.ex, g.ey)
    ctx.stroke()
    if (directed) {
      const tdx = g.ex - g.cx2
      const tdy = g.ey - g.cy2
      const tl = Math.hypot(tdx, tdy) || 1
      arrowHead(ctx, { x: g.ex - (tdx / tl) * r, y: g.ey - (tdy / tl) * r }, { x: g.ex, y: g.ey }, arrow)
    }
    const text = overlay.edgeValues.get(e.id) ?? (e.weight !== null ? String(e.weight) : '')
    if (text) {
      drawEdgeLabel(ctx, (g.sx + 3 * g.cx1 + 3 * g.cx2 + g.ex) / 8, (g.sy + 3 * g.cy1 + 3 * g.cy2 + g.ey) / 8, text, theme)
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
      arrowHead(ctx, { x: ex - (tdx / tl) * r, y: ey - (tdy / tl) * r }, { x: ex, y: ey }, arrow)
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
      arrowHead(ctx, { x: ex - ux * r, y: ey - uy * r }, { x: ex, y: ey }, arrow)
    }
  }

  const text = overlay.edgeValues.get(e.id) ?? (e.weight !== null ? String(e.weight) : '')
  if (text) {
    drawEdgeLabel(ctx, labelX, labelY, text, theme)
  }
}

function drawEdgeLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, theme: { bg: string; labelColor: string }) {
  const fs = Math.max(10, Math.round(graphStyle.nodeFontSize * 0.92))
  const h = fs + 6
  ctx.font = `600 ${fs}px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
  const w = ctx.measureText(text).width + 8
  ctx.fillStyle = theme.bg
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4)
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
  ctx.font = `600 ${graphStyle.nodeFontSize}px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
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
  transparentBg = false,
) {
  const theme = canvasTheme.value
  ctx.clearRect(0, 0, width, height)
  if (!transparentBg) {
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, width, height)
  }

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
