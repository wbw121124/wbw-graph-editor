import { ALGO_COLORS } from '../store/theme'
import { t } from '../i18n'
import type { AlgoContext, AlgoStep } from './types'
import type { AlgoEvent } from './types'
import { edgeBetween, labelOf, neighbors, weightOf } from './util'

function log(message: string, pause = false): AlgoStep {
  return { events: [{ type: 'log', message }], pause }
}

function evs(events: AlgoEvent[], pause = false): AlgoStep {
  return { events, pause }
}

export function* bfsTraversal(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(t('run.bfsStart'))
  const visited = new Set<string>()
  for (const start of g.nodes) {
    if (visited.has(start.id)) continue
    const queue: string[] = [start.id]
    visited.add(start.id)
    yield evs([{ type: 'visit', node: start.id }, { type: 'log', message: t('run.from', { a: labelOf(g, start.id) }) }], true)
    while (queue.length) {
      const u = queue.shift()!
      yield evs([{ type: 'current', node: u }, { type: 'log', message: t('run.dequeue', { a: labelOf(g, u) }) }], true)
      for (const { v, edge } of neighbors(g, u)) {
        if (visited.has(v)) continue
        visited.add(v)
        queue.push(v)
        yield evs(
          [
            { type: 'visit', node: v },
            { type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited },
            { type: 'log', message: t('run.enqueue', { a: labelOf(g, u), b: labelOf(g, v) }) },
          ],
          true,
        )
      }
    }
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: t('run.bfsDone') }])
}

export function* dfsTraversal(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(t('run.dfsStart'))
  const visited = new Set<string>()
  const stack: string[] = []
  for (const start of g.nodes) {
    if (visited.has(start.id)) continue
    stack.push(start.id)
    yield evs([{ type: 'log', message: t('run.dfsFrom', { a: labelOf(g, start.id) }) }], true)
    while (stack.length) {
      const u = stack.pop()!
      if (visited.has(u)) continue
      visited.add(u)
      yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: t('run.visit', { a: labelOf(g, u) }) }], true)
      for (const { v, edge } of neighbors(g, u)) {
        if (visited.has(v)) continue
        stack.push(v)
        yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }, { type: 'log', message: t('run.explore', { a: labelOf(g, u), b: labelOf(g, v) }) }], true)
      }
    }
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: t('run.dfsDone') }])
}

export function* dijkstra(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log(t('algo.noNodes'))
    return
  }
  yield log(t('run.dijkstraStart', { a: labelOf(g, source) }))
  const dist = new Map<string, number>()
  const pred = new Map<string, string>()
  const settled = new Set<string>()
  for (const n of g.nodes) dist.set(n.id, Infinity)
  dist.set(source, 0)
  yield evs([{ type: 'setNodeValue', node: source, text: '0' }, { type: 'current', node: source }], true)
  const heap: { id: string; d: number }[] = [{ id: source, d: 0 }]
  while (heap.length) {
    heap.sort((a, b) => a.d - b.d)
    const u = heap.shift()!.id
    if (settled.has(u)) continue
    settled.add(u)
    yield evs([{ type: 'current', node: u }, { type: 'log', message: t('run.settle', { a: labelOf(g, u), d: dist.get(u)! }) }], true)
    if (ctx.targetId && u === ctx.targetId) break
    for (const { v, edge } of neighbors(g, u)) {
      if (settled.has(v)) continue
      const nd = dist.get(u)! + weightOf(edge)
      if (nd < dist.get(v)!) {
        dist.set(v, nd)
        pred.set(v, u)
        heap.push({ id: v, d: nd })
        yield evs(
          [
            { type: 'setNodeValue', node: v, text: String(nd) },
            { type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.info },
            { type: 'log', message: t('run.relax', { a: labelOf(g, u), b: labelOf(g, v), d: nd }) },
          ],
          true,
        )
      }
    }
  }
  if (ctx.targetId) {
    const target = ctx.targetId
    if (dist.get(target) === Infinity) {
      yield evs([{ type: 'log', message: t('run.unreachable', { a: labelOf(g, target) }) }])
    } else {
      let cur = target
      const path: string[] = []
      while (cur !== source && pred.has(cur)) {
        const p = pred.get(cur)!
        const e = edgeBetween(g, p, cur)
        if (e) path.push(e.id)
        cur = p
      }
      yield evs(
        [
          ...path.map((id) => ({ type: 'setEdgeColor' as const, edge: id, color: ALGO_COLORS.path })),
          { type: 'log', message: t('run.pathLen', { a: labelOf(g, source), b: labelOf(g, target), d: dist.get(target)! }) },
        ],
        true,
      )
    }
  } else {
    for (const [v, p] of pred) {
      const e = edgeBetween(g, p, v)
      if (e) yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.path }])
    }
    yield evs([{ type: 'log', message: t('run.treeHighlighted') }])
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: t('run.dijkstraDone') }])
}

export function* bellmanFord(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log(t('algo.noNodes'))
    return
  }
  yield log(t('run.bellmanStart', { a: labelOf(g, source) }))
  const dist = new Map<string, number>()
  const pred = new Map<string, string>()
  for (const n of g.nodes) dist.set(n.id, Infinity)
  dist.set(source, 0)
  yield evs([{ type: 'setNodeValue', node: source, text: '0' }], true)
  const allEdges = g.edges
  for (let round = 0; round < g.nodes.length - 1; round++) {
    let changed = false
    yield evs([{ type: 'log', message: t('run.roundRelax', { n: round + 1 }) }], true)
    for (const e of allEdges) {
      const d = dist.get(e.from)!
      if (d === Infinity) continue
      const nd = d + weightOf(e)
      if (nd < dist.get(e.to)!) {
        dist.set(e.to, nd)
        pred.set(e.to, e.from)
        changed = true
        yield evs(
          [
            { type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.info },
            { type: 'setNodeValue', node: e.to, text: String(nd) },
            { type: 'log', message: t('run.relax', { a: labelOf(g, e.from), b: labelOf(g, e.to), d: nd }) },
          ],
          true,
        )
      }
    }
    if (!changed) {
      yield log(t('run.noRelaxEarly'))
      break
    }
  }
  let hasNegativeCycle = false
  for (const e of allEdges) {
    const d = dist.get(e.from)!
    if (d !== Infinity && d + weightOf(e) < dist.get(e.to)!) {
      hasNegativeCycle = true
      yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.bad }, { type: 'log', message: t('run.negCycleEdge', { a: labelOf(g, e.from), b: labelOf(g, e.to) }) }], true)
    }
  }
  if (!hasNegativeCycle && ctx.targetId) {
    const target = ctx.targetId
    if (dist.get(target) !== Infinity) {
      let cur = target
      const path: string[] = []
      while (cur !== source && pred.has(cur)) {
        const p = pred.get(cur)!
        const e = edgeBetween(g, p, cur)
        if (e) path.push(e.id)
        cur = p
      }
      yield evs([...path.map((id) => ({ type: 'setEdgeColor' as const, edge: id, color: ALGO_COLORS.path })), { type: 'log', message: t('run.pathLenOnly', { d: dist.get(target)! }) }], true)
    }
  }
  yield evs([{ type: 'done', message: hasNegativeCycle ? t('run.negCycle') : t('run.bellmanDone') }])
}

export function* spfa(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log(t('algo.noNodes'))
    return
  }
  yield log(t('run.spfaStart', { a: labelOf(g, source) }))
  const dist = new Map<string, number>()
  const pred = new Map<string, string>()
  const inQueue = new Set<string>()
  const cnt = new Map<string, number>()
  for (const n of g.nodes) dist.set(n.id, Infinity)
  dist.set(source, 0)
  const queue: string[] = [source]
  inQueue.add(source)
  yield evs([{ type: 'setNodeValue', node: source, text: '0' }], true)
  let negative = false
  while (queue.length) {
    const u = queue.shift()!
    inQueue.delete(u)
    yield evs([{ type: 'current', node: u }, { type: 'log', message: t('run.process', { a: labelOf(g, u) }) }], true)
    for (const { v, edge } of neighbors(g, u)) {
      const nd = dist.get(u)! + weightOf(edge)
      if (nd < dist.get(v)!) {
        dist.set(v, nd)
        pred.set(v, u)
        yield evs(
          [
            { type: 'setNodeValue', node: v, text: String(nd) },
            { type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.info },
            { type: 'log', message: t('run.relax', { a: labelOf(g, u), b: labelOf(g, v), d: nd }) },
          ],
          true,
        )
        if (!inQueue.has(v)) {
          queue.push(v)
          inQueue.add(v)
          cnt.set(v, (cnt.get(v) ?? 0) + 1)
          if (cnt.get(v)! >= g.nodes.length) {
            negative = true
            yield evs([{ type: 'setNodeColor', node: v, color: ALGO_COLORS.bad }, { type: 'log', message: t('run.queueOverflow', { a: labelOf(g, v) }) }], true)
            break
          }
        }
      }
    }
    if (negative) break
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: negative ? t('run.negCycle') : t('run.spfaDone') }])
}

export function* primMST(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log(t('algo.noNodes'))
    return
  }
  yield log(t('run.primStart', { a: labelOf(g, source) }))
  const inTree = new Set<string>([source])
  const best = new Map<string, number>()
  const bestEdge = new Map<string, string>()
  for (const n of g.nodes) best.set(n.id, Infinity)
  for (const { v, edge } of neighbors(g, source)) {
    best.set(v, weightOf(edge))
    bestEdge.set(v, edge.id)
  }
  yield evs([{ type: 'visit', node: source }], true)
  let total = 0
  for (let i = 0; i < g.nodes.length - 1; i++) {
    let u: string | null = null
    let bestD = Infinity
    for (const n of g.nodes) {
      if (!inTree.has(n.id) && best.get(n.id)! < bestD) {
        bestD = best.get(n.id)!
        u = n.id
      }
    }
    if (u === null) break
    inTree.add(u)
    total += bestD
    const e = bestEdge.get(u)!
    yield evs(
      [
        { type: 'visit', node: u },
        { type: 'setEdgeColor', edge: e, color: ALGO_COLORS.tree },
        { type: 'log', message: t('run.mstAdd', { a: labelOf(g, u), d: bestD, t: total }) },
      ],
      true,
    )
    for (const { v, edge } of neighbors(g, u)) {
      const w = weightOf(edge)
      if (!inTree.has(v) && w < best.get(v)!) {
        best.set(v, w)
        bestEdge.set(v, edge.id)
      }
    }
  }
  yield evs([{ type: 'log', message: t('run.mstTotal', { v: total }) }, { type: 'done', message: t('run.primDone') }])
}

export function* kruskalMST(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(t('run.kruskalStart'))
  const edges = [...g.edges].sort((a, b) => weightOf(a) - weightOf(b))
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      const p = parent.get(x)
      if (p === undefined) break
      parent.set(x, parent.get(p) ?? p)
      x = p
    }
    return x
  }
  for (const n of g.nodes) parent.set(n.id, n.id)
  let total = 0
  let count = 0
  for (const e of edges) {
    const w = weightOf(e)
    yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.info }, { type: 'log', message: t('run.considerEdge', { a: labelOf(g, e.from), b: labelOf(g, e.to), w }) }], true)
    const ra = find(e.from)
    const rb = find(e.to)
    if (ra !== rb) {
      parent.set(ra, rb)
      total += w
      count++
      yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.tree }, { type: 'log', message: t('run.mstAddEdge', { t: total }) }], true)
    }
  }
  yield evs([{ type: 'log', message: count < g.nodes.length - 1 ? t('run.notConnected') : t('run.mstTotal', { v: total }) }, { type: 'done', message: t('run.kruskalDone') }])
}

export function* cycleDetection(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(t('run.cycleStart', { dir: g.directed ? t('run.dirDirected') : t('run.dirUndirected') }))
  const color = new Map<string, 'gray' | 'black'>()
  const parent = new Map<string, string>()
  const stack: { id: string; done: boolean }[] = []
  const visited = new Set<string>()
  const backEdge = { id: '' }
  for (const start of g.nodes) {
    if (color.has(start.id)) continue
    stack.push({ id: start.id, done: false })
    while (stack.length && !backEdge.id) {
      const top = stack[stack.length - 1]
      const u = top.id
      if (!top.done) {
        if (visited.has(u)) continue
        visited.add(u)
        color.set(u, 'gray')
        yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: t('run.visit', { a: labelOf(g, u) }) }], true)
        const nb = neighbors(g, u)
        for (const { v, edge } of nb) {
          if (!g.directed && v === parent.get(u)) continue
          if (color.get(v) === 'gray') {
            backEdge.id = edge.id
            yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.bad }, { type: 'log', message: t('run.backEdge', { a: labelOf(g, u), b: labelOf(g, v) }) }], true)
            break
          }
          if (!color.has(v)) {
            parent.set(v, u)
            yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }, { type: 'log', message: t('run.downExplore', { a: labelOf(g, u), b: labelOf(g, v) }) }], true)
            stack.push({ id: v, done: false })
          }
        }
        top.done = true
      } else {
        stack.pop()
        color.set(u, 'black')
      }
    }
    if (backEdge.id) break
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: backEdge.id ? t('run.hasCycle') : t('run.noCycle') }])
}

export function* topologicalSort(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  if (!g.directed) {
    yield evs([{ type: 'log', message: t('run.topoNeedDirected') }, { type: 'done', message: t('run.needDirected') }])
    return
  }
  yield log(t('run.topoStart'))
  const indeg = new Map<string, number>()
  for (const n of g.nodes) indeg.set(n.id, 0)
  for (const e of g.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)
  const queue = g.nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
  const order: string[] = []
  const colorOrder = [...ALGO_COLORS.scc]
  while (queue.length) {
    queue.sort((a, b) => indeg.get(a)! - indeg.get(b)!)
    const u = queue.shift()!
    order.push(u)
    yield evs([{ type: 'visit', node: u }, { type: 'log', message: t('run.outputZero', { a: labelOf(g, u) }) }], true)
    for (const { v, edge } of neighbors(g, u)) {
      indeg.set(v, indeg.get(v)! - 1)
      yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }], true)
      if (indeg.get(v) === 0) queue.push(v)
    }
  }
  if (order.length < g.nodes.length) {
    yield evs([{ type: 'log', message: t('run.topoCycle') }, { type: 'done', message: t('run.hasCycle') }])
  } else {
    yield evs([{ type: 'log', message: t('run.topoOrder', { list: order.map((id) => labelOf(g, id)).join(' → ') }) }, { type: 'done', message: t('run.topoDone') }])
  }
}

export function* tarjanSCC(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  if (!g.directed) {
    yield evs([{ type: 'log', message: t('run.sccNeedDirected') }, { type: 'done', message: t('run.needDirected') }])
    return
  }
  yield log(t('run.tarjanStart'))
  const dfn = new Map<string, number>()
  const low = new Map<string, number>()
  const inStack = new Set<string>()
  const stack: string[] = []
  let ts = 0
  let compIndex = 0
  const colorList = ALGO_COLORS.scc
  const dfs = function* (u: string): Generator<AlgoStep> {
    dfn.set(u, ts)
    low.set(u, ts)
    ts++
    stack.push(u)
    inStack.add(u)
    yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: t('run.dfsDfn', { a: labelOf(g, u), d: dfn.get(u)! }) }], true)
    for (const { v, edge } of neighbors(g, u)) {
      yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }], true)
      if (!dfn.has(v)) {
        yield* dfs(v)
        low.set(u, Math.min(low.get(u)!, low.get(v)!))
      } else if (inStack.has(v)) {
        low.set(u, Math.min(low.get(u)!, dfn.get(v)!))
      }
    }
    if (low.get(u) === dfn.get(u)) {
      const comp: string[] = []
      while (true) {
        const w = stack.pop()!
        inStack.delete(w)
        comp.push(w)
        if (w === u) break
      }
      const color = colorList[compIndex % colorList.length]
      compIndex++
      yield evs(
        [
          ...comp.map((id) => ({ type: 'setNodeColor' as const, node: id, color })),
          { type: 'log', message: t('run.component', { n: compIndex, list: comp.map((id) => labelOf(g, id)).join(', ') }) },
        ],
        true,
      )
    }
  }
  for (const n of g.nodes) {
    if (!dfn.has(n.id)) yield* dfs(n.id)
  }
  yield evs([{ type: 'current', node: null }, { type: 'log', message: t('run.sccCount', { n: compIndex }) }, { type: 'done', message: t('run.tarjanDone') }])
}

export function* floydWarshall(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const nodes = g.nodes
  const n = nodes.length
  if (n === 0) {
    yield log(t('algo.noNodes'))
    return
  }
  yield log(t('run.floydStart'))
  const dp: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null))
  for (let i = 0; i < n; i++) dp[i][i] = 0
  for (const e of g.edges) {
    const i = nodes.findIndex((x) => x.id === e.from)
    const j = nodes.findIndex((x) => x.id === e.to)
    if (i < 0 || j < 0) continue
    dp[i][j] = Math.min(dp[i][j] ?? Infinity, weightOf(e))
    if (!g.directed) dp[j][i] = dp[i][j]
  }
  const labels = nodes.map((x) => x.label)
  const emitMatrix = (k: number): AlgoEvent => ({ type: 'matrix', title: t('run.floydMatrix', { n: k + 1 }), labels, matrix: dp.map((row) => row.map((v) => (v === Infinity ? null : v))) })
  yield evs([emitMatrix(-1)], false)
  for (let k = 0; k < n; k++) {
    yield evs([{ type: 'log', message: t('run.viaNode', { a: labelOf(g, nodes[k].id) }) }], true)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const a = dp[i][k]
        const b = dp[k][j]
        if (a === null || b === null) continue
        const via = a + b
        if (dp[i][j] === null || via < dp[i][j]!) {
          dp[i][j] = via
        }
      }
    }
    yield evs([emitMatrix(k)], true)
  }
  yield evs([{ type: 'done', message: t('run.floydDone') }])
}
