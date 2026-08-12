import { WORLD_SIZE, type GraphData, type GraphEdge, type GraphNode } from '../types/graph'
import { ALGO_COLORS, canvasTheme, graphStyle } from '../store/theme'
import type { AlgoOverlayState } from './overlay'
import { bendOf, buildParallelInfo, edgeControlPoint, selfLoopGeometry } from './canvasRenderer'
import { computeEdgeRoute, quadHitsNode, routeMid } from '../core/edgeRouting'

const FONT_FAMILY = 'Segoe UI, PingFang SC, Microsoft YaHei, sans-serif'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100)
}

function approxTextWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u2000-\u206f]/.test(ch) ? fontSize : fontSize * 0.62
  }
  return w
}

function nodeRadius(): number {
  return graphStyle.nodeRadius
}

function arrowPoints(fromX: number, fromY: number, toX: number, toY: number, size: number): string {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const a1 = angle + Math.PI / 7
  const a2 = angle - Math.PI / 7
  const p1 = `${num(toX)},${num(toY)}`
  const p2 = `${num(toX - size * Math.cos(a1))},${num(toY - size * Math.sin(a1))}`
  const p3 = `${num(toX - size * Math.cos(a2))},${num(toY - size * Math.sin(a2))}`
  return `${p1} ${p2} ${p3}`
}

function edgeMarkup(
  e: GraphEdge,
  a: GraphNode,
  b: GraphNode,
  directed: boolean,
  overlay: AlgoOverlayState,
  pinfo: { index: number; total: number },
  nodes: GraphNode[],
): { markup: string; label: { x: number; y: number; text: string } | null } {
  const theme = canvasTheme.value
  const r = nodeRadius()
  const color = overlay.edgeColors.get(e.id) ?? (graphStyle.edgeColor || theme.edgeColor)
  const isAlgo = overlay.edgeColors.has(e.id)
  const width = isAlgo ? graphStyle.edgeWidth + 1 : graphStyle.edgeWidth
  const arrow = graphStyle.arrowSize
  const parts: string[] = []

  const text = overlay.edgeValues.get(e.id) ?? (e.weight !== null ? String(e.weight) : '')

  if (e.from === e.to) {
    const { index, total } = pinfo
    const g = selfLoopGeometry(a, r, index, total)
    parts.push(
      `<path d="M ${num(g.sx)} ${num(g.sy)} A ${num(g.R)} ${num(g.R)} 0 1 0 ${num(g.ex)} ${num(g.ey)}" fill="none" stroke="${esc(color)}" stroke-width="${width}"/>`,
    )
    if (directed) {
      const dx = Math.sin(g.a1)
      const dy = -Math.cos(g.a1)
      parts.push(
        `<polygon points="${arrowPoints(g.ex - dx * arrow, g.ey - dy * arrow, g.ex, g.ey, arrow)}" fill="${esc(color)}"/>`,
      )
    }
    if (text) {
      return { markup: parts.join(''), label: { x: g.cx, y: g.cy - g.R, text } }
    }
    return { markup: parts.join(''), label: null }
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
  const blockers = nodes.filter((n) => n.id !== e.from && n.id !== e.to)
  // 形状决策: null=直线, {c}=二次贝塞尔(路由/平行弯曲共用)
  let shape: { c: { x: number; y: number } } | null = null
  if (bend !== 0) {
    const c = edgeControlPoint(a, b, bend)
    if (quadHitsNode(sx, sy, c.x, c.y, ex, ey, blockers, r)) {
      // 平行弯曲曲线穿过挡点 -> 改用绕行路由(控制点叠加平行偏移保持重边分离)
      const route = computeEdgeRoute(sx, sy, ex, ey, r, blockers, e.id)
      if (route.length > 0) shape = { c: { x: route[0].x - uy * bend, y: route[0].y + ux * bend } }
    } else {
      shape = { c }
    }
  } else {
    const route = computeEdgeRoute(sx, sy, ex, ey, r, blockers, e.id)
    if (route.length > 0) shape = { c: route[0] }
  }

  if (shape) {
    const c = shape.c
    parts.push(
      `<path d="M ${num(sx)} ${num(sy)} Q ${num(c.x)} ${num(c.y)} ${num(ex)} ${num(ey)}" fill="none" stroke="${esc(color)}" stroke-width="${width}"/>`,
    )
    if (directed) {
      const tdx = ex - c.x
      const tdy = ey - c.y
      const tl = Math.hypot(tdx, tdy) || 1
      parts.push(
        `<polygon points="${arrowPoints(ex - (tdx / tl) * r, ey - (tdy / tl) * r, ex, ey, arrow)}" fill="${esc(color)}"/>`,
      )
    }
    const mid = routeMid(sx, sy, c, ex, ey)
    labelX = mid.x
    labelY = mid.y
  } else {
    parts.push(`<line x1="${num(sx)}" y1="${num(sy)}" x2="${num(ex)}" y2="${num(ey)}" stroke="${esc(color)}" stroke-width="${width}"/>`)
    if (directed) {
      parts.push(`<polygon points="${arrowPoints(ex - ux * r, ey - uy * r, ex, ey, arrow)}" fill="${esc(color)}"/>`)
    }
  }

  if (text) {
    return { markup: parts.join(''), label: { x: labelX, y: labelY, text } }
  }
  return { markup: parts.join(''), label: null }
}

function labelMarkup(l: { x: number; y: number; text: string }): string {
  const theme = canvasTheme.value
  const fs = Math.max(10, Math.round(graphStyle.nodeFontSize * 0.92))
  const h = fs + 6
  const w = approxTextWidth(l.text, fs) + 8
  return (
    `<rect x="${num(l.x - w / 2)}" y="${num(l.y - h / 2)}" width="${num(w)}" height="${num(h)}" rx="4" fill="${esc(theme.bg)}"/>` +
    `<text x="${num(l.x)}" y="${num(l.y)}" font-family="${FONT_FAMILY}" font-size="${fs}" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="${esc(theme.labelColor)}">${esc(l.text)}</text>`
  )
}

function nodeMarkup(n: GraphNode, overlay: AlgoOverlayState): string {
  const theme = canvasTheme.value
  const r = nodeRadius()
  const isCurrent = overlay.nodeMarks.get(n.id) === 'current'
  const isVisited = overlay.nodeMarks.get(n.id) === 'visited'
  const fill = overlay.nodeColors.get(n.id) ?? (graphStyle.nodeFill || theme.nodeFill)
  let stroke = graphStyle.nodeStroke || theme.nodeStroke
  let strokeWidth = 1.6
  if (isCurrent) {
    stroke = ALGO_COLORS.current
    strokeWidth = 3.2
  } else if (isVisited) {
    stroke = ALGO_COLORS.visited
    strokeWidth = 2.4
  }
  const parts: string[] = []
  parts.push(`<circle cx="${num(n.x)}" cy="${num(n.y)}" r="${num(r)}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${strokeWidth}"/>`)
  if (isCurrent) {
    parts.push(`<circle cx="${num(n.x)}" cy="${num(n.y)}" r="${num(r + 6)}" fill="none" stroke="rgba(255,167,38,0.35)" stroke-width="3"/>`)
  }
  parts.push(
    `<text x="${num(n.x)}" y="${num(n.y)}" font-family="${FONT_FAMILY}" font-size="${graphStyle.nodeFontSize}" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="${esc(graphStyle.labelColor || theme.labelColor)}">${esc(n.label)}</text>`,
  )
  const value = overlay.nodeValues.get(n.id)
  if (value !== undefined) {
    parts.push(
      `<text x="${num(n.x)}" y="${num(n.y - r - 8)}" font-family="Consolas, monospace" font-size="11" text-anchor="middle" dominant-baseline="middle" fill="${esc(ALGO_COLORS.info)}">${esc(value)}</text>`,
    )
  }
  if (n.fixed) {
    parts.push(
      `<circle cx="${num(n.x + r * 0.72)}" cy="${num(n.y - r * 0.72)}" r="4.5" fill="${esc(theme.fixedMarker)}"/>`,
    )
  }
  return parts.join('')
}

export interface SvgExportOptions {
  transparentBg?: boolean
}

export function buildSvg(graph: GraphData, overlay: AlgoOverlayState, opts: SvgExportOptions = {}): string {
  const theme = canvasTheme.value
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_SIZE} ${WORLD_SIZE}" width="${WORLD_SIZE}" height="${WORLD_SIZE}">`,
  )
  if (!opts.transparentBg) {
    parts.push(`<rect x="0" y="0" width="${WORLD_SIZE}" height="${WORLD_SIZE}" fill="${esc(theme.bg)}"/>`)
  }

  if (graphStyle.showGrid) {
    const gridParts: string[] = []
    for (let g = 0; g <= WORLD_SIZE; g += graphStyle.gridSpacing) {
      gridParts.push(`M ${g} 0 V ${WORLD_SIZE}`)
      gridParts.push(`M 0 ${g} H ${WORLD_SIZE}`)
    }
    parts.push(`<path d="${gridParts.join(' ')}" stroke="${esc(theme.grid)}" stroke-width="1" fill="none"/>`)
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const parallel = buildParallelInfo(graph.edges)
  const labels: { x: number; y: number; text: string }[] = []
  for (const e of graph.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const pinfo = parallel.get(e.id) ?? { index: 0, total: 1 }
    const res = edgeMarkup(e, a, b, graph.directed, overlay, pinfo, graph.nodes)
    parts.push(res.markup)
    if (res.label) labels.push(res.label)
  }
  for (const l of labels) {
    parts.push(labelMarkup(l))
  }
  for (const n of graph.nodes) {
    parts.push(nodeMarkup(n, overlay))
  }
  parts.push('</svg>')
  return parts.join('')
}
