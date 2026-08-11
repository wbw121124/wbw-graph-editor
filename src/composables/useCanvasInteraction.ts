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
  quadPoint,
  screenToWorld,
  type UiHoverState,
  type ViewTransform,
} from '../render/canvasRenderer'

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
      if (a === b) continue
      const { index, total } = parallel.get(e.id) ?? { index: 0, total: 1 }
      const bend = bendOf(index, total) * (e.from <= e.to ? 1 : -1)
      const c = edgeControlPoint(a, b, bend)
      let d = Infinity
      let prev = { x: a.x, y: a.y }
      for (let s = 1; s <= 8; s++) {
        const cur = quadPoint(a, c, b, s / 8)
        d = Math.min(d, distToSegment(p.x, p.y, prev.x, prev.y, cur.x, cur.y))
        prev = cur
      }
      if (d < bestDist && d < 10 / view.scale + 2) {
        bestDist = d
        bestEdge = e.id
      }
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
      if (mode === 'draw') {
        if (hitNode) {
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
        } else {
          const w = screenToWorld(view, mx, my)
          graphStore.addNodeAt(clamp(w.x, 0, WORLD_SIZE), clamp(w.y, 0, WORLD_SIZE))
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

  return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel }
}
