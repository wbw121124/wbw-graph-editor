import { ALGO_COLORS } from '../store/theme'
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
  yield log('BFS 广度优先遍历')
  const visited = new Set<string>()
  for (const start of g.nodes) {
    if (visited.has(start.id)) continue
    const queue: string[] = [start.id]
    visited.add(start.id)
    yield evs([{ type: 'visit', node: start.id }, { type: 'log', message: `从 ${labelOf(g, start.id)} 出发` }], true)
    while (queue.length) {
      const u = queue.shift()!
      yield evs([{ type: 'current', node: u }, { type: 'log', message: `出队 ${labelOf(g, u)}` }], true)
      for (const { v, edge } of neighbors(g, u)) {
        if (visited.has(v)) continue
        visited.add(v)
        queue.push(v)
        yield evs(
          [
            { type: 'visit', node: v },
            { type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited },
            { type: 'log', message: `入队 ${labelOf(g, u)} → ${labelOf(g, v)}` },
          ],
          true,
        )
      }
    }
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: 'BFS 完成' }])
}

export function* dfsTraversal(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log('DFS 深度优先遍历')
  const visited = new Set<string>()
  const stack: string[] = []
  for (const start of g.nodes) {
    if (visited.has(start.id)) continue
    stack.push(start.id)
    yield evs([{ type: 'log', message: `从 ${labelOf(g, start.id)} 开始 DFS` }], true)
    while (stack.length) {
      const u = stack.pop()!
      if (visited.has(u)) continue
      visited.add(u)
      yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: `访问 ${labelOf(g, u)}` }], true)
      for (const { v, edge } of neighbors(g, u)) {
        if (visited.has(v)) continue
        stack.push(v)
        yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }, { type: 'log', message: `探索 ${labelOf(g, u)} → ${labelOf(g, v)}` }], true)
      }
    }
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: 'DFS 完成' }])
}

export function* dijkstra(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log('图中没有节点')
    return
  }
  yield log(`Dijkstra 最短路，源点 ${labelOf(g, source)}（边无权重时按 1 计算）`)
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
    yield evs([{ type: 'current', node: u }, { type: 'log', message: `确定 ${labelOf(g, u)} 最短距离 ${dist.get(u)}` }], true)
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
            { type: 'log', message: `松弛 ${labelOf(g, u)} → ${labelOf(g, v)}，距离 ${nd}` },
          ],
          true,
        )
      }
    }
  }
  if (ctx.targetId) {
    const target = ctx.targetId
    if (dist.get(target) === Infinity) {
      yield evs([{ type: 'log', message: `节点 ${labelOf(g, target)} 不可达` }])
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
          { type: 'log', message: `${labelOf(g, source)} → ${labelOf(g, target)} 最短路径长度 ${dist.get(target)}` },
        ],
        true,
      )
    }
  } else {
    for (const [v, p] of pred) {
      const e = edgeBetween(g, p, v)
      if (e) yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.path }])
    }
    yield evs([{ type: 'log', message: '最短路径树已高亮' }])
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: 'Dijkstra 完成' }])
}

export function* bellmanFord(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log('图中没有节点')
    return
  }
  yield log(`Bellman-Ford 最短路，源点 ${labelOf(g, source)}（支持负权，可检测负环）`)
  const dist = new Map<string, number>()
  const pred = new Map<string, string>()
  for (const n of g.nodes) dist.set(n.id, Infinity)
  dist.set(source, 0)
  yield evs([{ type: 'setNodeValue', node: source, text: '0' }], true)
  const allEdges = g.edges
  for (let round = 0; round < g.nodes.length - 1; round++) {
    let changed = false
    yield evs([{ type: 'log', message: `第 ${round + 1} 轮松弛` }], true)
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
            { type: 'log', message: `松弛 ${labelOf(g, e.from)} → ${labelOf(g, e.to)}，距离 ${nd}` },
          ],
          true,
        )
      }
    }
    if (!changed) {
      yield log('本轮无松弛，提前结束')
      break
    }
  }
  let hasNegativeCycle = false
  for (const e of allEdges) {
    const d = dist.get(e.from)!
    if (d !== Infinity && d + weightOf(e) < dist.get(e.to)!) {
      hasNegativeCycle = true
      yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.bad }, { type: 'log', message: `检测到负环：边 ${labelOf(g, e.from)} → ${labelOf(g, e.to)} 仍可松弛` }], true)
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
      yield evs([...path.map((id) => ({ type: 'setEdgeColor' as const, edge: id, color: ALGO_COLORS.path })), { type: 'log', message: `最短路径长度 ${dist.get(target)}` }], true)
    }
  }
  yield evs([{ type: 'done', message: hasNegativeCycle ? '存在负环！' : 'Bellman-Ford 完成' }])
}

export function* spfa(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log('图中没有节点')
    return
  }
  yield log(`SPFA 最短路，源点 ${labelOf(g, source)}`)
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
    yield evs([{ type: 'current', node: u }, { type: 'log', message: `处理 ${labelOf(g, u)}` }], true)
    for (const { v, edge } of neighbors(g, u)) {
      const nd = dist.get(u)! + weightOf(edge)
      if (nd < dist.get(v)!) {
        dist.set(v, nd)
        pred.set(v, u)
        yield evs(
          [
            { type: 'setNodeValue', node: v, text: String(nd) },
            { type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.info },
            { type: 'log', message: `松弛 ${labelOf(g, u)} → ${labelOf(g, v)}，距离 ${nd}` },
          ],
          true,
        )
        if (!inQueue.has(v)) {
          queue.push(v)
          inQueue.add(v)
          cnt.set(v, (cnt.get(v) ?? 0) + 1)
          if (cnt.get(v)! >= g.nodes.length) {
            negative = true
            yield evs([{ type: 'setNodeColor', node: v, color: ALGO_COLORS.bad }, { type: 'log', message: `节点 ${labelOf(g, v)} 入队超过 n 次，存在负环` }], true)
            break
          }
        }
      }
    }
    if (negative) break
  }
  yield evs([{ type: 'current', node: null }, { type: 'done', message: negative ? '存在负环！' : 'SPFA 完成' }])
}

export function* primMST(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const source = ctx.sourceId ?? g.nodes[0]?.id
  if (!source) {
    yield log('图中没有节点')
    return
  }
  yield log(`Prim 最小生成树，起点 ${labelOf(g, source)}（边无权重时按 1 计算）`)
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
        { type: 'log', message: `加入 ${labelOf(g, u)}（边权 ${bestD}，MST 总权 ${total}）` },
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
  yield evs([{ type: 'log', message: `MST 总权值 ${total}` }, { type: 'done', message: 'Prim 完成' }])
}

export function* kruskalMST(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(`Kruskal 最小生成树（边无权重时按 1 计算）`)
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
    yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.info }, { type: 'log', message: `考虑边 ${labelOf(g, e.from)} — ${labelOf(g, e.to)}（权 ${w}）` }], true)
    const ra = find(e.from)
    const rb = find(e.to)
    if (ra !== rb) {
      parent.set(ra, rb)
      total += w
      count++
      yield evs([{ type: 'setEdgeColor', edge: e.id, color: ALGO_COLORS.tree }, { type: 'log', message: `加入边，MST 总权 ${total}` }], true)
    }
  }
  yield evs([{ type: 'log', message: count < g.nodes.length - 1 ? '图不连通，未形成完整生成树' : `MST 总权值 ${total}` }, { type: 'done', message: 'Kruskal 完成' }])
}

export function* cycleDetection(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  yield log(`环检测（${g.directed ? '有向' : '无向'}图，DFS 三色法）`)
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
        yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: `访问 ${labelOf(g, u)}` }], true)
        const nb = neighbors(g, u)
        for (const { v, edge } of nb) {
          if (!g.directed && v === parent.get(u)) continue
          if (color.get(v) === 'gray') {
            backEdge.id = edge.id
            yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.bad }, { type: 'log', message: `发现回边 ${labelOf(g, u)} → ${labelOf(g, v)}，构成环！` }], true)
            break
          }
          if (!color.has(v)) {
            parent.set(v, u)
            yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }, { type: 'log', message: `向下探索 ${labelOf(g, u)} → ${labelOf(g, v)}` }], true)
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
  yield evs([{ type: 'current', node: null }, { type: 'done', message: backEdge.id ? '存在环！' : '图中无环' }])
}

export function* topologicalSort(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  if (!g.directed) {
    yield evs([{ type: 'log', message: '拓扑排序需要有向图，请切换为有向图' }, { type: 'done', message: '需要有向图' }])
    return
  }
  yield log('拓扑排序（Kahn 算法）')
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
    yield evs([{ type: 'visit', node: u }, { type: 'log', message: `输出 ${labelOf(g, u)}（入度 0）` }], true)
    for (const { v, edge } of neighbors(g, u)) {
      indeg.set(v, indeg.get(v)! - 1)
      yield evs([{ type: 'setEdgeColor', edge: edge.id, color: ALGO_COLORS.visited }], true)
      if (indeg.get(v) === 0) queue.push(v)
    }
  }
  if (order.length < g.nodes.length) {
    yield evs([{ type: 'log', message: '存在环，无法完成拓扑排序' }, { type: 'done', message: '存在环！' }])
  } else {
    yield evs([{ type: 'log', message: `拓扑序：${order.map((id) => labelOf(g, id)).join(' → ')}` }, { type: 'done', message: '拓扑排序完成' }])
  }
}

export function* tarjanSCC(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  if (!g.directed) {
    yield evs([{ type: 'log', message: '强连通分量需要基于有向图，请切换为有向图' }, { type: 'done', message: '需要有向图' }])
    return
  }
  yield log('Tarjan 求强连通分量')
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
    yield evs([{ type: 'visit', node: u }, { type: 'current', node: u }, { type: 'log', message: `DFS ${labelOf(g, u)}，dfn=${dfn.get(u)}` }], true)
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
          { type: 'log', message: `分量 ${compIndex}：{ ${comp.map((id) => labelOf(g, id)).join(', ')} }` },
        ],
        true,
      )
    }
  }
  for (const n of g.nodes) {
    if (!dfn.has(n.id)) yield* dfs(n.id)
  }
  yield evs([{ type: 'current', node: null }, { type: 'log', message: `共 ${compIndex} 个强连通分量` }, { type: 'done', message: 'Tarjan 完成' }])
}

export function* floydWarshall(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const nodes = g.nodes
  const n = nodes.length
  if (n === 0) {
    yield log('图中没有节点')
    return
  }
  yield log('Floyd-Warshall 全源最短路（边无权重时按 1 计算）')
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
  const emitMatrix = (k: number): AlgoEvent => ({ type: 'matrix', title: `经过前 ${k + 1} 个中转点后的距离矩阵`, labels, matrix: dp.map((row) => row.map((v) => (v === Infinity ? null : v))) })
  yield evs([emitMatrix(-1)], false)
  for (let k = 0; k < n; k++) {
    yield evs([{ type: 'log', message: `以 ${labelOf(g, nodes[k].id)} 为中转点更新` }], true)
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
  yield evs([{ type: 'done', message: 'Floyd-Warshall 完成，结果见矩阵弹窗' }])
}
