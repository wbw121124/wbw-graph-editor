import { WORLD_SIZE, type GraphData, type GraphEdge, type GraphNode } from '../types/graph'
import { ALGO_COLORS, canvasTheme, graphStyle } from '../store/theme'
import type { AlgoOverlayState } from './overlay'
import { bendOf, buildParallelInfo, edgeControlPoint } from './canvasRenderer'

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
): string {
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
    const ang = total > 1 ? -Math.PI / 4 + (index / total) * Math.PI * 2 : Math.PI / 4
    const cx = a.x + Math.cos(ang) * r * 1.7
    const cy = a.y + Math.sin(ang) * r * 1.7
    const rr = r * 0.55
    parts.push(
      `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(rr)}" fill="none" stroke="${esc(color)}" stroke-width="${width}"/>`,
    )
    if (directed) {
      const ax = Math.cos(ang + Math.PI / 2)
      const ay = Math.sin(ang + Math.PI / 2)
      parts.push(
        `<polygon points="${arrowPoints(cx + ax * rr, cy + ay * rr, cx + ax * rr * 1.15, cy + ay * rr * 1.15, arrow)}" fill="${esc(color)}"/>`,
      )
    }
    if (text) {
      const fs = Math.max(10, Math.round(graphStyle.nodeFontSize * 0.92))
      const h = fs + 6
      const w = approxTextWidth(text, fs) + 8
      parts.push(`<rect x="${num(cx - w / 2)}" y="${num(cy - h / 2)}" width="${num(w)}" height="${num(h)}" rx="4" fill="${esc(theme.bg)}"/>`)
      parts.push(
        `<text x="${num(cx)}" y="${num(cy)}" font-family="${FONT_FAMILY}" font-size="${fs}" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="${esc(theme.labelColor)}">${esc(text)}</text>`,
      )
    }
    return parts.join('')
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
    labelX = (sx + ex) / 2 - (uy * bend) / 2
    labelY = (sy + ey) / 2 + (ux * bend) / 2
  } else {
    parts.push(`<line x1="${num(sx)}" y1="${num(sy)}" x2="${num(ex)}" y2="${num(ey)}" stroke="${esc(color)}" stroke-width="${width}"/>`)
    if (directed) {
      parts.push(`<polygon points="${arrowPoints(ex - ux * r, ey - uy * r, ex, ey, arrow)}" fill="${esc(color)}"/>`)
    }
  }

  if (text) {
    const fs = Math.max(10, Math.round(graphStyle.nodeFontSize * 0.92))
    const h = fs + 6
    const w = approxTextWidth(text, fs) + 8
    parts.push(`<rect x="${num(labelX - w / 2)}" y="${num(labelY - h / 2)}" width="${num(w)}" height="${num(h)}" rx="4" fill="${esc(theme.bg)}"/>`)
    parts.push(
      `<text x="${num(labelX)}" y="${num(labelY)}" font-family="${FONT_FAMILY}" font-size="${fs}" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="${esc(theme.labelColor)}">${esc(text)}</text>`,
    )
  }
  return parts.join('')
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
  for (const e of graph.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const pinfo = parallel.get(e.id) ?? { index: 0, total: 1 }
    parts.push(edgeMarkup(e, a, b, graph.directed, overlay, pinfo))
  }
  for (const n of graph.nodes) {
    parts.push(nodeMarkup(n, overlay))
  }
  parts.push('</svg>')
  return parts.join('')
}
