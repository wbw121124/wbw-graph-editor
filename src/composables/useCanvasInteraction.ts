import type { Ref } from 'vue'
import { graphStore } from '../store/graphStore'
import { graphStyle } from '../store/theme'
import { uiState } from '../store/ui'
import { WORLD_SIZE } from '../types/graph'
import {
  bendOf,
  buildParallelInfo,
  clamp,
  edgeControlPoint,
  screenToWorld,
  selfLoopGeometry,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'
import { computeEdgeRoute, quadHitsNode } from '../core/edgeRouting'

export type CanvasInteractionEvent = 'edit-node' | 'edit-edge'

export function useCanvasInteraction(
  canvasRef: Ref<HTMLCanvasElement | null>,
  view: ViewTransform,
  hover: UiHoverState,
  emit: (event: CanvasInteractionEvent, id: string) => void,
  getBounds?: () => { width: number; height: number },
) {
  let action: 'none' | 'pan' | 'drag' = 'none'
  let mouseDown = false
  let draggingNodeId: string | null = null
  let downScreenX = 0
  let downScreenY = 0
  let hitNode: string | null = null
  let hitEdge: string | null = null
  let panOriginX = 0
  let panOriginY = 0

  const THRESHOLD = 4
  // 双击检测:浏览器对快速连击只会派发一个 dblclick(其余 click 的 detail 递增),需要自己按点击链计数
  let lastClickT = 0
  let lastClickX = 0
  let lastClickY = 0
  let clickChain = 0
  let lastAddT = -1000

  function localPos(e: MouseEvent) {
    const rect = canvasRef.value!.getBoundingClientRect()
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top }
  }

  function hitTest(mx: number, my: number) {
    const p = screenToWorld(view, mx, my)
    const nodes = graphStore.graph.nodes
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      if (Math.hypot(p.x - n.x, p.y - n.y) <= graphStyle.nodeRadius + 6 / view.scale) {
        return { nodeId: n.id, edgeId: null }
      }
    }
    let bestEdge: string | null = null
    let bestDist = Infinity
    const parallel = buildParallelInfo(graphStore.graph.edges)
    for (const e of graphStore.graph.edges) {
      const a = graphStore.graph.nodes.find((n) => n.id === e.from)
      const b = graphStore.graph.nodes.find((n) => n.id === e.to)
      if (!a || !b) continue
      const { index, total } = parallel.get(e.id) ?? { index: 0, total: 1 }
      if (a === b) {
        const g = selfLoopGeometry(a, graphStyle.nodeRadius, index, total)
        const sweep = g.a0 - (g.a1 - Math.PI * 2)
        let d = Infinity
        let prev = { x: g.sx, y: g.sy }
        for (let s = 1; s <= 24; s++) {
          const th = g.a0 - (sweep * s) / 24
          const cur = { x: g.cx + g.R * Math.cos(th), y: g.cy + g.R * Math.sin(th) }
          d = Math.min(d, distToSegment(p.x, p.y, prev.x, prev.y, cur.x, cur.y))
          prev = cur
        }
        if (d < bestDist && d < 10 / view.scale + 2) {
          bestDist = d
          bestEdge = e.id
        }
        continue
      }
      const bend = bendOf(index, total) * (e.from <= e.to ? 1 : -1)
      const r = graphStyle.nodeRadius
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const sx = a.x + ux * r
      const sy = a.y + uy * r
      const ex = b.x - ux * r
      const ey = b.y - uy * r
      const blockers = nodes.filter((n) => n.id !== e.from && n.id !== e.to)
      let d = Infinity
      if (bend !== 0) {
        const c = edgeControlPoint(a, b, bend)
        if (quadHitsNode(sx, sy, c.x, c.y, ex, ey, blockers, r)) {
          // 平行弯曲曲线穿过挡点 -> 命中检测跟随绕行路由(控制点叠加平行偏移)
          const route = computeEdgeRoute(sx, sy, ex, ey, r, blockers, e.id)
          if (route.length > 0) {
            const rc = { x: route[0].x - uy * bend, y: route[0].y + ux * bend }
            d = quadDist(p.x, p.y, sx, sy, rc.x, rc.y, ex, ey)
          } else {
            d = distToSegment(p.x, p.y, sx, sy, ex, ey)
          }
        } else {
          d = quadDist(p.x, p.y, sx, sy, c.x, c.y, ex, ey)
        }
      } else {
        const route = computeEdgeRoute(sx, sy, ex, ey, r, blockers, e.id)
        if (route.length > 0) {
          d = quadDist(p.x, p.y, sx, sy, route[0].x, route[0].y, ex, ey)
        } else {
          d = distToSegment(p.x, p.y, sx, sy, ex, ey)
        }
      }
      if (d < bestDist && d < 10 / view.scale + 2) {
        bestDist = d
        bestEdge = e.id
      }
      continue
    }
    return { nodeId: null, edgeId: bestEdge }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    mouseDown = true
    const { mx, my } = localPos(e)
    downScreenX = mx
    downScreenY = my
    const hit = hitTest(mx, my)
    hitNode = hit.nodeId
    hitEdge = hit.edgeId
    action = 'none'
  }

  function onMouseMove(e: MouseEvent) {
    const { mx, my } = localPos(e)
    if (action === 'pan') {
      view.offsetX = panOriginX + (mx - downScreenX)
      view.offsetY = panOriginY + (my - downScreenY)
      return
    }
    if (action === 'drag' && draggingNodeId) {
      const w = screenToWorld(view, mx, my)
      const b = getBounds?.()
      if (b) {
        w.x = clamp(w.x, 0, b.width)
        w.y = clamp(w.y, 0, b.height)
      }
      graphStore.moveNode(draggingNodeId, w.x, w.y)
      return
    }
    if (mouseDown && action === 'none' && Math.hypot(mx - downScreenX, my - downScreenY) > THRESHOLD) {
      if (hitNode) {
        action = 'drag'
        draggingNodeId = hitNode
        graphStore.beginDrag()
        hover.draggingNodeId = hitNode
      } else {
        action = 'pan'
        panOriginX = view.offsetX
        panOriginY = view.offsetY
      }
    }
    if (action === 'none') {
      const hit = hitTest(mx, my)
      hover.hoverNodeId = hit.nodeId
      hover.hoverEdgeId = hit.edgeId
      if (hover.tempEdgeFromId) {
        hover.tempEdgeTarget = screenToWorld(view, mx, my)
      }
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (action === 'drag' && draggingNodeId) {
      const n = graphStore.graph.nodes.find((x) => x.id === draggingNodeId)
      if (n && uiState.mode === 'force' && !n.fixed) {
        graphStore.toggleFixed(draggingNodeId)
      }
    } else if (action === 'none') {
      const { mx, my } = localPos(e)
      const mode = uiState.mode
      // 点击链计数:相邻点击(500ms/8px 内)组成一条链,每 2 次点击构成用户的一次双击
      const now = Date.now()
      if (now - lastClickT <= 500 && Math.hypot(mx - lastClickX, my - lastClickY) <= 8) {
        clickChain++
      } else {
        clickChain = 1
      }
      lastClickT = now
      lastClickX = mx
      lastClickY = my
      if (mode === 'draw') {
        if (clickChain % 2 === 0) {
          // 点击链偶数次:本次是双击 -> 加节点,并清掉残留的连边待选状态
          hover.selectedNodeId = null
          hover.tempEdgeFromId = null
          hover.tempEdgeTarget = null
          const w = screenToWorld(view, mx, my)
          graphStore.addNodeAt(clamp(w.x, 0, WORLD_SIZE), clamp(w.y, 0, WORLD_SIZE))
          lastAddT = now
        } else if (hitNode) {
          if (hover.selectedNodeId === hitNode) {
            hover.selectedNodeId = null
            hover.tempEdgeFromId = null
          } else if (hover.selectedNodeId) {
            graphStore.addEdgeBetween(hover.selectedNodeId, hitNode)
            hover.selectedNodeId = null
            hover.tempEdgeFromId = null
          } else {
            hover.selectedNodeId = hitNode
            hover.tempEdgeFromId = hitNode
            hover.tempEdgeTarget = screenToWorld(view, mx, my)
          }
        }
      } else if (mode === 'edit') {
        if (hitNode) emit('edit-node', hitNode)
        else if (hitEdge) emit('edit-edge', hitEdge)
      } else if (mode === 'delete') {
        if (hitNode) graphStore.removeNode(hitNode)
        else if (hitEdge) graphStore.removeEdge(hitEdge)
      } else if (mode === 'force') {
        if (hitNode) graphStore.toggleFixed(hitNode)
      } else if (mode === 'select') {
        if (hitNode) {
          hover.selectedNodeId = hover.selectedNodeId === hitNode ? null : hitNode
          hover.selectedEdgeId = null
        } else if (hitEdge) {
          hover.selectedEdgeId = hover.selectedEdgeId === hitEdge ? null : hitEdge
          hover.selectedNodeId = null
        } else {
          hover.selectedNodeId = null
          hover.selectedEdgeId = null
        }
      }
    }
    action = 'none'
    mouseDown = false
    draggingNodeId = null
    hover.draggingNodeId = null
  }

  function onDblClick(e: MouseEvent) {
    const { mx, my } = localPos(e)
    if (uiState.mode === 'draw') {
      // draw 模式:双击永远加节点,不弹编辑框
      // 常规路径是 mouseup 的点击链检测(点击链偶数次)已加点;这里兜底(如事件流缺 mouseup)并去重
      hover.selectedNodeId = null
      hover.tempEdgeFromId = null
      hover.tempEdgeTarget = null
      if (Date.now() - lastAddT > 80) {
        const w = screenToWorld(view, mx, my)
        graphStore.addNodeAt(clamp(w.x, 0, WORLD_SIZE), clamp(w.y, 0, WORLD_SIZE))
        lastAddT = Date.now()
      }
      return
    }
    const hit = hitTest(mx, my)
    if (hit.nodeId) {
      emit('edit-node', hit.nodeId)
    } else if (hit.edgeId) {
      emit('edit-edge', hit.edgeId)
    }
  }

  function onMouseLeave() {
    mouseDown = false
    hover.hoverNodeId = null
    hover.hoverEdgeId = null
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const { mx, my } = localPos(e)
    const w = screenToWorld(view, mx, my)
    view.scale = clamp(view.scale * factor, 0.15, 5)
    view.offsetX = mx - w.x * view.scale
    view.offsetY = my - w.y * view.scale
  }

  function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(px - ax, py - ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / len2
    t = clamp(t, 0, 1)
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  // 点到二次贝塞尔曲线(8段折线采样)的距离
  function quadDist(px: number, py: number, sx: number, sy: number, cx: number, cy: number, ex: number, ey: number) {
    let d = Infinity
    let prev = { x: sx, y: sy }
    for (let s = 1; s <= 8; s++) {
      const t = s / 8
      const k = 1 - t
      const cur = {
        x: k * k * sx + 2 * k * t * cx + t * t * ex,
        y: k * k * sy + 2 * k * t * cy + t * t * ey,
      }
      d = Math.min(d, distToSegment(px, py, prev.x, prev.y, cur.x, cur.y))
      prev = cur
    }
    return d
  }

  return { onMouseDown, onMouseMove, onMouseUp, onDblClick, onMouseLeave, onWheel, hitTest }
}
