import type { GraphData } from '../types/graph'
import { ALGO_COLORS } from '../store/theme'
import type { AlgoContext, AlgoStep } from './types'
import type { AlgoEvent } from './types'
import { labelOf, neighbors } from './util'

function log(message: string, pause = false): AlgoStep {
  return { events: [{ type: 'log', message }], pause }
}

function evs(events: AlgoEvent[], pause = false): AlgoStep {
  return { events, pause }
}

function bipartiteColoring(g: GraphData): { ok: boolean; color: Map<string, number> } {
  const color = new Map<string, number>()
  let ok = true
  for (const start of g.nodes) {
    if (color.has(start.id)) continue
    color.set(start.id, 0)
    const q: string[] = [start.id]
    while (q.length && ok) {
      const u = q.shift()!
      for (const { v } of neighbors(g, u)) {
        if (!color.has(v)) {
          color.set(v, color.get(u)! ^ 1)
          q.push(v)
        } else if (color.get(v) === color.get(u)!) {
          ok = false
          break
        }
      }
    }
  }
  return { ok, color }
}

export function* hungarianMatching(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log('二分图最大匹配（匈牙利算法）')
  const { ok, color } = bipartiteColoring(g)
  if (!ok) {
    yield evs([{ type: 'log', message: '该图不是二分图，无法用匈牙利算法求匹配' }, { type: 'done', message: '非二分图' }])
    return
  }
  const left = g.nodes.filter((n) => color.get(n.id) === 0)
  const matchR = new Map<string, string | null>()
  for (const n of g.nodes) matchR.set(n.id, null)
  let total = 0
  const tryMatch = function* (u: string, vis: Set<string>): Generator<AlgoStep, boolean> {
    for (const { v, edge } of neighbors(g, u)) {
      if (color.get(v) !== 1 || vis.has(v)) continue
      vis.add(v)
      yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.info }, { type: 'log', message: `尝试匹配 ${labelOf(g, u)} → ${labelOf(g, v)}` }], true)
      const m = matchR.get(v)
      if (m === null || m === undefined || (yield* tryMatch(m, vis))) {
        matchR.set(v, u)
        yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.tree }, { type: 'log', message: `匹配 ${labelOf(g, u)} — ${labelOf(g, v)}` }], true)
        return true
      }
    }
    return false
  }
  for (const u of left) {
    const vis = new Set<string>()
    if (yield* tryMatch(u.id, vis)) {
      total++
    }
  }
  yield evs([{ type: 'log', message: `最大匹配数 = ${total}` }, { type: 'done', message: `匈牙利完成，最大匹配 ${total}` }])
}

export function* minVertexCover(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log('最小点覆盖（König 定理，基于最大匹配）')
  const { ok, color } = bipartiteColoring(g)
  if (!ok) {
    yield evs([{ type: 'log', message: '该图不是二分图，无法构造最小点覆盖' }, { type: 'done', message: '非二分图' }])
    return
  }
  const matchR = new Map<string, string | null>()
  const matchL = new Map<string, string | null>()
  for (const n of g.nodes) {
    matchR.set(n.id, null)
    matchL.set(n.id, null)
  }
  const dfsAug = (u: string, vis: Set<string>): boolean => {
    for (const { v, edge } of neighbors(g, u)) {
      if (color.get(v) !== 1 || vis.has(v)) continue
      vis.add(v)
      const m = matchR.get(v)
      if (m === null || m === undefined || dfsAug(m, vis)) {
        matchR.set(v, u)
        matchL.set(u, v)
        return true
      }
    }
    return false
  }
  for (const u of g.nodes.filter((n) => color.get(n.id) === 0)) {
    dfsAug(u.id, new Set())
  }
  const matchedEdges: string[] = []
  for (const e of g.edges) {
    if (matchR.get(e.to) === e.from || matchL.get(e.from) === e.to) matchedEdges.push(e.id)
  }
  yield evs([...matchedEdges.map((id) => ({ type: 'setEdgeColor' as const, edge: id, color: ALGO_COLORS.tree })), { type: 'log', message: '最大匹配计算完成，开始 König 构造点覆盖' }], true)
  const visL = new Set<string>()
  const visR = new Set<string>()
  const q: string[] = []
  for (const n of g.nodes) {
    if (color.get(n.id) === 0 && matchL.get(n.id) === null) q.push(n.id)
  }
  while (q.length) {
    const u = q.shift()!
    if (visL.has(u)) continue
    visL.add(u)
    for (const { v } of neighbors(g, u)) {
      if (color.get(v) !== 1) continue
      if (visR.has(v)) continue
      visR.add(v)
      const back = matchR.get(v)
      if (back !== null && back !== undefined && !visL.has(back)) {
        q.push(back)
      }
    }
  }
  const cover: string[] = []
  for (const n of g.nodes) {
    if (color.get(n.id) === 0 && !visL.has(n.id)) cover.push(n.id)
    if (color.get(n.id) === 1 && visR.has(n.id)) cover.push(n.id)
  }
  yield evs(
    [
      ...cover.map((id) => ({ type: 'setNodeColor' as const, node: id, color: ALGO_COLORS.bad })),
      { type: 'log', message: `最小点覆盖：{ ${cover.map((id) => labelOf(g, id)).join(', ')} }，大小 = 最大匹配数 = ${matchedEdges.length}` },
      { type: 'done', message: `最小点覆盖完成，大小 ${matchedEdges.length}` },
    ],
    true,
  )
}
