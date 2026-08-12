export interface RoutePoint {
  x: number
  y: number
}

const PAD = 6
const MAX_OFF_K = 8
/** 滞回: 每条边上次的弯曲方向(+1/-1), 挡点贴近线段时沿用上次方向 */
const sideCache = new Map<string, number>()
/** 滞回: 每条边上次选择的最佳挡点 id, 多挡点 t 相近时沿用上次避免跳变 */
const bestCache = new Map<string, string>()

function segInfo(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return { d: Math.hypot(px - ax, py - ay), t: 0, p: { x: ax, y: ay } }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.min(1, Math.max(0, t))
  return {
    d: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)),
    t,
    p: { x: ax + t * dx, y: ay + t * dy },
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.min(1, Math.max(0, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** 二次贝塞尔曲线(16段折线采样)到所有挡点圆的最小距离是否 >= r+PAD */
function curveClear(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
  blockers: { x: number; y: number }[],
  minD: number,
) {
  for (const n of blockers) {
    let px = sx
    let py = sy
    for (let i = 1; i <= 16; i++) {
      const t = i / 16
      const s = 1 - t
      const qx = s * s * sx + 2 * s * t * cx + t * t * ex
      const qy = s * s * sy + 2 * s * t * cy + t * t * ey
      if (distToSeg(n.x, n.y, px, py, qx, qy) < minD - 1e-6) return false
      px = qx
      py = qy
    }
  }
  return true
}

/**
 * 边视觉绕点路由: 线段(sx,sy)-(ex,ey) 若穿过任一 blocker 圆(r+PAD),
 * 返回单条二次贝塞尔曲线的控制点(空数组=直线)。
 * 控制点在穿过点法线方向(弯向远离挡点侧), 偏移量与挡点穿透深度连续过渡:
 * 挡点圆心距线段 d -> 深度 depth = (r+PAD-d)/(r+PAD), 控制点偏移 = 2.5*(r+PAD)*depth,
 * 挡点刚擦过边缘(depth≈0)曲线几乎不弯, 完全压线(depth=1)弯曲最大, 拖拽时平滑过渡无跳变。
 * 挡点贴近线段(|sn| < 0.1*(r+PAD))时带滞回保持上次弯曲方向, 避免浮点噪声导致左右跳动。
 * 若曲线采样仍穿过其他挡点圆则逐级加大偏移兜底, 达上限放弃绕行(返回直线)。
 */
export function computeEdgeRoute(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  r: number,
  blockers: { x: number; y: number }[],
  id?: string,
): RoutePoint[] {
  const minD = r + PAD
  let best: { t: number; d: number; p: { x: number; y: number }; node: { x: number; y: number } } | null = null
  for (const n of blockers) {
    const info = segInfo(n.x, n.y, sx, sy, ex, ey)
    // 仅线段内部的挡点触发绕行: 端点附近(t≈0/1)是曲线/绕行点所在,不视为穿过
    if (info.d < minD && info.t > 0.02 && info.t < 0.98) {
      if (best === null) {
        best = { t: info.t, d: info.d, p: info.p, node: n }
      } else if (Math.abs(info.t - best.t) > 0.05 ? info.t < best.t : info.d < best.d) {
        // t 相差较大选更靠前的挡点; t 相近选穿透最深(d 最小)的, 避免多挡点并存时选择抖动
        best = { t: info.t, d: info.d, p: info.p, node: n }
      }
    }
  }
  if (!best) {
    if (id !== undefined) {
      sideCache.delete(id)
      bestCache.delete(id)
    }
    return []
  }
  // best 滞回: 上次最佳挡点仍挡且 t 相近(±0.05)时沿用, 消除挡点间切换导致的曲线跳动
  if (id !== undefined) {
    const prevId = bestCache.get(id)
    if (prevId !== undefined && prevId !== best.node.id) {
      const prevNode = blockers.find((n) => n.id === prevId)
      if (prevNode) {
        const info = segInfo(prevNode.x, prevNode.y, sx, sy, ex, ey)
        if (info.d < minD && info.t > 0.02 && info.t < 0.98 && Math.abs(info.t - best.t) <= 0.05) {
          best = { t: info.t, d: info.d, p: info.p, node: prevNode }
        }
      }
    }
    bestCache.set(id, best.node.id)
  }

  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  // 弯向远离挡点的一侧: 挡点在 +n 侧(sn>0)则取 -n 方向, 反之取 +n
  const sn = (best.node.x - best.p.x) * nx + (best.node.y - best.p.y) * ny
  let side = sn >= 0 ? -1 : 1
  // 滞回: 挡点贴近线段时保持上次方向, 消除浮点噪声引起的方向抖动
  if (id !== undefined) {
    const prev = sideCache.get(id)
    if (prev !== undefined && Math.abs(sn) < (r + PAD) * 0.1) {
      side = prev
    } else {
      sideCache.set(id, side)
    }
  }

  const depth = Math.min(1, Math.max(0, (minD - best.d) / minD))
  const off = minD * 2.5 * depth
  let c = { x: best.p.x + nx * off * side, y: best.p.y + ny * off * side }
  if (curveClear(sx, sy, c.x, c.y, ex, ey, blockers, minD)) return [c]
  for (let k = 1; k < MAX_OFF_K; k++) {
    const o2 = off + minD * 0.5 * k
    c = { x: best.p.x + nx * o2 * side, y: best.p.y + ny * o2 * side }
    if (curveClear(sx, sy, c.x, c.y, ex, ey, blockers, minD)) return [c]
  }
  return []
}

/** 二次贝塞尔曲线中点(用于标签定位) */
export function routeMid(
  sx: number,
  sy: number,
  c: { x: number; y: number },
  ex: number,
  ey: number,
) {
  return { x: (sx + 2 * c.x + ex) / 4, y: (sy + 2 * c.y + ey) / 4 }
}

/** 二次贝塞尔曲线上的点(控制点 c, 起点 a, 终点 b, 参数 t) */
export function quadPoint(
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
) {
  const s = 1 - t
  return {
    x: s * s * a.x + 2 * s * t * c.x + t * t * b.x,
    y: s * s * a.y + 2 * s * t * c.y + t * t * b.y,
  }
}

/**
 * 二次贝塞尔曲线(8段采样)是否穿过任一挡点圆(r+PAD)。
 * 用于平行边(bend 曲线)的穿透检测: 穿过则改用绕行路由。
 */
export function quadHitsNode(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
  blockers: { x: number; y: number }[],
  minD: number,
) {
  for (const n of blockers) {
    let px = sx
    let py = sy
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      const s = 1 - t
      const qx = s * s * sx + 2 * s * t * cx + t * t * ex
      const qy = s * s * sy + 2 * s * t * cy + t * t * ey
      if (distToSeg(n.x, n.y, px, py, qx, qy) < minD - 1e-6) return true
      px = qx
      py = qy
    }
  }
  return false
}
