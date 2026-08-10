import type { GraphEdge } from '../types/graph'
import { ALGO_COLORS } from '../store/theme'
import type { AlgoContext, AlgoStep } from './types'
import type { AlgoEvent } from './types'
import { labelOf } from './util'

interface Arc {
  u: string
  v: string
  cap: number
  cost: number
  origCap: number
  orig: string | null
  rev: Arc
}

function log(message: string, pause = false): AlgoStep {
  return { events: [{ type: 'log', message }], pause }
}

function evs(events: AlgoEvent[], pause = false): AlgoStep {
  return { events, pause }
}

function buildNet(ctx: AlgoContext) {
  const g = ctx.graph
  const adj = new Map<string, Arc[]>()
  for (const n of g.nodes) adj.set(n.id, [])
  const arcs: Arc[] = []
  const add = (u: string, v: string, cap: number, cost: number, orig: string | null) => {
    const a: Arc = { u, v, cap, cost, origCap: cap, orig, rev: undefined as unknown as Arc }
    const b: Arc = { u: v, v: u, cap: 0, cost: -cost, origCap: 0, orig, rev: a }
    a.rev = b
    arcs.push(a, b)
    adj.get(u)!.push(a)
    adj.get(v)!.push(b)
  }
  for (const e of g.edges) {
    const cap = e.capacity ?? 1
    const cost = e.cost ?? 0
    if (g.directed) {
      add(e.from, e.to, cap, cost, e.id)
    } else {
      add(e.from, e.to, cap, cost, e.id)
      add(e.to, e.from, cap, cost, e.id)
    }
  }
  return { adj, arcs }
}

function flowEvents(adj: Map<string, Arc[]>, edges: GraphEdge[], includeAll = true): AlgoEvent[] {
  const events: AlgoEvent[] = []
  for (const e of edges) {
    const cap = e.capacity ?? 1
    let f = 0
    for (const a of adj.get(e.from) ?? []) {
      if (a.orig !== e.id) continue
      if (a.u === e.from && a.v === e.to) f += a.origCap - a.cap
      else if (a.u === e.to && a.v === e.from) f -= a.origCap - a.cap
    }
    if (includeAll || f !== 0 || e.capacity !== null) {
      events.push({ type: 'setEdgeValue', edge: e.id, text: `${f}/${cap}` })
    }
  }
  return events
}

function sstFlow(adj: Map<string, Arc[]>, s: string, t: string): number {
  let maxflow = 0
  while (true) {
    const level = new Map<string, number>()
    const q: string[] = [s]
    level.set(s, 0)
    while (q.length) {
      const u = q.shift()!
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && !level.has(a.v)) {
          level.set(a.v, level.get(u)! + 1)
          q.push(a.v)
        }
      }
    }
    if (!level.has(t)) break
    const it = new Map<string, number>()
    const dfs = (u: string, f: number): number => {
      if (u === t) return f
      for (let i = it.get(u) ?? 0; i < adj.get(u)!.length; i++) {
        it.set(u, i)
        const a = adj.get(u)![i]
        if (a.cap > 0 && level.get(a.v) === level.get(u)! + 1) {
          const pushed = dfs(a.v, Math.min(f, a.cap))
          if (pushed > 0) {
            a.cap -= pushed
            a.rev.cap += pushed
            return pushed
          }
        }
      }
      return 0
    }
    while (true) {
      const pushed = dfs(s, Infinity)
      if (pushed === 0) break
      maxflow += pushed
    }
  }
  return maxflow
}

export function* dinic(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`Dinic 最大流，源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}（边无容量时按 1 计算）`)
  const { adj, arcs } = buildNet(ctx)
  let maxflow = 0
  while (true) {
    const level = new Map<string, number>()
    const q: string[] = [s]
    level.set(s, 0)
    while (q.length) {
      const u = q.shift()!
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && !level.has(a.v)) {
          level.set(a.v, level.get(u)! + 1)
          q.push(a.v)
        }
      }
    }
    if (!level.has(t)) break
    yield evs([{ type: 'log', message: `BFS 分层完成，汇点深度 ${level.get(t)}` }, ...flowEvents(adj, g.edges)], true)
    const it = new Map<string, number>()
    const dfs = (u: string, f: number): number => {
      if (u === t) return f
      for (let i = it.get(u) ?? 0; i < adj.get(u)!.length; i++) {
        it.set(u, i)
        const a = adj.get(u)![i]
        if (a.cap > 0 && level.get(a.v) === level.get(u)! + 1) {
          const pushed = dfs(a.v, Math.min(f, a.cap))
          if (pushed > 0) {
            a.cap -= pushed
            a.rev.cap += pushed
            return pushed
          }
        }
      }
      return 0
    }
    while (true) {
      const pushed = dfs(s, Infinity)
      if (pushed === 0) break
      maxflow += pushed
      yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `阻塞流增广 ${pushed}，当前最大流 ${maxflow}` }], true)
    }
  }
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 = ${maxflow}` }, { type: 'done', message: `Dinic 完成，最大流 ${maxflow}` }])
}

export function* isap(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`ISAP 最大流（距离标号 + gap 优化），源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}`)
  const { adj } = buildNet(ctx)
  const n = g.nodes.length
  const d = new Map<string, number>()
  const gap = new Map<number, number>()
  for (const node of g.nodes) d.set(node.id, n)
  const bfs = () => {
    d.set(t, 0)
    const q: string[] = [t]
    while (q.length) {
      const u = q.shift()!
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && d.get(a.v) === n) {
          d.set(a.v, d.get(u)! + 1)
          q.push(a.v)
        }
      }
    }
  }
  bfs()
  if (d.get(s) === n) {
    yield evs([{ type: 'log', message: '源点无法到达汇点，最大流 = 0' }, { type: 'done', message: '最大流 0' }])
    return
  }
  for (const node of g.nodes) {
    const dv = d.get(node.id)!
    gap.set(dv, (gap.get(dv) ?? 0) + 1)
  }
  yield evs([{ type: 'log', message: '距离标号初始化完成' }], true)
  const it = new Map<string, number>()
  let maxflow = 0
  const aug = (u: string, f: number): number => {
    if (u === t) return f
    for (let i = it.get(u) ?? 0; i < adj.get(u)!.length; i++) {
      it.set(u, i)
      const a = adj.get(u)![i]
      if (a.cap > 0 && d.get(a.v) === d.get(u)! - 1) {
        const pushed = aug(a.v, Math.min(f, a.cap))
        if (pushed > 0) {
          a.cap -= pushed
          a.rev.cap += pushed
          return pushed
        }
      }
    }
    return 0
  }
  while (d.get(s)! < n) {
    const pushed = aug(s, Infinity)
    if (pushed > 0) {
      maxflow += pushed
      yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `增广 ${pushed}，当前最大流 ${maxflow}` }], true)
      continue
    }
    let mind = n - 1
    for (const a of adj.get(s)!) if (a.cap > 0) mind = Math.min(mind, d.get(a.v)!)
    const oldD = d.get(s)!
    gap.set(oldD, gap.get(oldD)! - 1)
    if (gap.get(oldD) === 0) break
    const newD = mind + 1
    d.set(s, newD)
    gap.set(newD, (gap.get(newD) ?? 0) + 1)
    it.set(s, 0)
    yield evs([{ type: 'log', message: `重标号：d[${labelOf(g, s)}] = ${newD}` }], true)
  }
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 = ${maxflow}` }, { type: 'done', message: `ISAP 完成，最大流 ${maxflow}` }])
}

export function* mpm(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`MPM 最大流（潜势瓶颈），源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}`)
  const { adj } = buildNet(ctx)
  let maxflow = 0
  const level = () => {
    const lv = new Map<string, number>()
    const q: string[] = [s]
    lv.set(s, 0)
    while (q.length) {
      const u = q.shift()!
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && !lv.has(a.v)) {
          lv.set(a.v, lv.get(u)! + 1)
          q.push(a.v)
        }
      }
    }
    return lv
  }
  while (true) {
    const lv = level()
    if (!lv.has(t)) break
    yield evs([{ type: 'log', message: `构建允许弧网络，汇点深度 ${lv.get(t)}` }, ...flowEvents(adj, g.edges)], true)
    const allowed = (u: string, a: Arc) => a.cap > 0 && lv.get(a.v) === lv.get(u)! + 1
    const potIn = new Map<string, number>()
    const potOut = new Map<string, number>()
    for (const node of g.nodes) {
      potIn.set(node.id, 0)
      potOut.set(node.id, 0)
    }
    for (const node of g.nodes) {
      for (const a of adj.get(node.id)!) {
        if (allowed(node.id, a)) {
          potOut.set(node.id, potOut.get(node.id)! + a.cap)
          potIn.set(a.v, potIn.get(a.v)! + a.cap)
        }
      }
    }
    let bottleneck = Infinity
    let v: string | null = null
    for (const node of g.nodes) {
      if (node.id === s || node.id === t) continue
      const p = Math.min(potIn.get(node.id)!, potOut.get(node.id)!)
      if (p < bottleneck) {
        bottleneck = p
        v = node.id
      }
    }
    if (v === null || bottleneck <= 0) break
    yield evs([{ type: 'log', message: `瓶颈节点 ${labelOf(g, v)}，潜势 ${bottleneck}` }], true)
    const pushToT = (u: string, f: number, seen: Set<string>): number => {
      if (u === t) return f
      if (seen.has(u)) return 0
      seen.add(u)
      for (const a of adj.get(u)!) {
        if (allowed(u, a) && a.cap > 0) {
          const pushed = pushToT(a.v, Math.min(f, a.cap), seen)
          if (pushed > 0) {
            a.cap -= pushed
            a.rev.cap += pushed
            return pushed
          }
        }
      }
      return 0
    }
    const pullFromS = (u: string, f: number, seen: Set<string>): number => {
      if (u === s) return f
      if (seen.has(u)) return 0
      seen.add(u)
      for (const a of adj.get(u)!) {
        const rev = a.rev
        if (allowed(u, rev) && rev.cap > 0) {
          const pushed = pullFromS(a.v, Math.min(f, rev.cap), seen)
          if (pushed > 0) {
            rev.cap -= pushed
            a.cap += pushed
            return pushed
          }
        }
      }
      return 0
    }
    let remain = bottleneck
    while (remain > 0) {
      const outP = pushToT(v!, remain, new Set())
      if (outP <= 0) break
      const inP = pullFromS(v!, outP, new Set())
      if (inP <= 0) break
      remain -= inP
      maxflow += inP
      yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `通过 ${labelOf(g, v)} 增广 ${inP}，当前最大流 ${maxflow}` }], true)
    }
  }
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 = ${maxflow}` }, { type: 'done', message: `MPM 完成，最大流 ${maxflow}` }])
}

export function* hlpp(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`HLPP 预流推进，源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}`)
  const { adj } = buildNet(ctx)
  const n = g.nodes.length
  const d = new Map<string, number>()
  const excess = new Map<string, number>()
  for (const node of g.nodes) {
    d.set(node.id, n)
    excess.set(node.id, 0)
  }
  const bfs = () => {
    d.set(t, 0)
    const q: string[] = [t]
    while (q.length) {
      const u = q.shift()!
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && d.get(a.v) === n) {
          d.set(a.v, d.get(u)! + 1)
          q.push(a.v)
        }
      }
    }
  }
  bfs()
  if (d.get(s) === n) {
    yield evs([{ type: 'log', message: '源点无法到达汇点，最大流 = 0' }, { type: 'done', message: '最大流 0' }])
    return
  }
  for (const a of adj.get(s)!) {
    if (a.cap > 0) {
      a.cap = 0
      a.rev.cap += a.origCap
      excess.set(a.v, excess.get(a.v)! + a.origCap)
    }
  }
  const overflow: string[] = []
  for (const node of g.nodes) {
    if (node.id !== s && node.id !== t && excess.get(node.id)! > 0) overflow.push(node.id)
  }
  yield evs([...flowEvents(adj, g.edges), ...overflow.map((id) => ({ type: 'setNodeValue' as const, node: id, text: `+${excess.get(id)}` })), { type: 'log', message: '源点推满预流' }], true)
  const push = (u: string, a: Arc, f: number) => {
    a.cap -= f
    a.rev.cap += f
    excess.set(u, excess.get(u)! - f)
    excess.set(a.v, excess.get(a.v)! + f)
  }
  const relabel = () => {
    let minD = Infinity
    for (const a of adj.get(overflow[0])!) {
      if (a.cap > 0) minD = Math.min(minD, d.get(a.v)!)
    }
    d.set(overflow[0], minD + 1)
    return minD + 1
  }
  while (overflow.length) {
    overflow.sort((a, b) => d.get(b)! - d.get(a)!)
    const u = overflow[0]
    if (excess.get(u)! <= 0) {
      overflow.shift()
      continue
    }
    const uLevel = d.get(u)!
    let pushed = false
    for (const a of adj.get(u)!) {
      if (a.cap > 0 && d.get(a.v) === uLevel - 1) {
        const f = Math.min(excess.get(u)!, a.cap)
        push(u, a, f)
        pushed = true
        if (a.v !== s && a.v !== t && excess.get(a.v)! > 0 && !overflow.includes(a.v)) overflow.push(a.v)
        yield evs(
          [
            ...flowEvents(adj, g.edges),
            { type: 'setNodeValue', node: u, text: excess.get(u)! > 0 ? `+${excess.get(u)}` : '' },
            { type: 'setNodeValue', node: a.v, text: `+${excess.get(a.v)}` },
            { type: 'setEdgeColor', edge: a.orig ?? '', color: ALGO_COLORS.info },
          ],
          true,
        )
        if (excess.get(u)! <= 0) break
      }
    }
    if (!pushed || excess.get(u)! > 0) {
      const oldD = uLevel
      const newD = relabel()
      yield evs([{ type: 'log', message: `重标号 d[${labelOf(g, u)}]: ${oldD} → ${newD}` }], true)
      overflow.sort((a, b) => d.get(b)! - d.get(a)!)
      if (d.get(u)! >= n) overflow.shift()
    }
  }
  const maxflow = excess.get(t)!
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 = ${maxflow}` }, { type: 'done', message: `HLPP 完成，最大流 ${maxflow}` }])
}

export function* sspMinCostFlow(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`费用流（SSP 逐次最短路），源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}（费用取边 cost，缺省 0）`)
  const { adj } = buildNet(ctx)
  let maxflow = 0
  let totalCost = 0
  while (true) {
    const dist = new Map<string, number>()
    const pred = new Map<string, Arc | null>()
    const inQueue = new Set<string>()
    for (const node of g.nodes) dist.set(node.id, Infinity)
    dist.set(s, 0)
    const q: string[] = [s]
    inQueue.add(s)
    while (q.length) {
      const u = q.shift()!
      inQueue.delete(u)
      for (const a of adj.get(u)!) {
        if (a.cap > 0 && dist.get(u)! + a.cost < dist.get(a.v)!) {
          dist.set(a.v, dist.get(u)! + a.cost)
          pred.set(a.v, a)
          if (!inQueue.has(a.v)) {
            q.push(a.v)
            inQueue.add(a.v)
          }
        }
      }
    }
    if (dist.get(t) === Infinity) break
    let f = Infinity
    let cur = t
    const path: Arc[] = []
    while (cur !== s) {
      const a = pred.get(cur)!
      if (!a) break
      path.push(a)
      f = Math.min(f, a.cap)
      cur = a.u
    }
    for (const a of path) {
      a.cap -= f
      a.rev.cap += f
    }
    maxflow += f
    totalCost += f * dist.get(t)!
    yield evs(
      [
        ...flowEvents(adj, g.edges),
        ...path.filter((a) => a.orig).map((a) => ({ type: 'setEdgeColor' as const, edge: a.orig!, color: ALGO_COLORS.path })),
        { type: 'log', message: `增广 ${f}，单位费用 ${dist.get(t)}，当前总费用 ${totalCost}` },
      ],
      true,
    )
  }
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 ${maxflow}，最小费用 ${totalCost}` }, { type: 'done', message: `费用流完成：流 ${maxflow}，费用 ${totalCost}` }])
}

export function* boundedFlow(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  const lower = (e: GraphEdge) => e.weight ?? 0
  const upper = (e: GraphEdge) => e.capacity ?? Infinity
  const hasBounds = g.edges.some((e) => e.capacity !== null)
  if (!hasBounds) {
    yield log('上下界流需要边设置容量（上界）与权重（下界），当前边无容量，使用 weight 作为下界、capacity 作为上界，全部为 0/∞ 无意义')
    return
  }
  const bounded = s !== null && t !== null
  if (bounded) yield log(`有源汇上下界可行流，源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}`)
  else yield log('无源汇上下界可行流（循环流）')
  const { adj, arcs } = buildNet(ctx)
  const SS = '$SS'
  const ST = '$ST'
  adj.set(SS, [])
  adj.set(ST, [])
  const add = (u: string, v: string, cap: number, cost: number, orig: string | null) => {
    const a: Arc = { u, v, cap, cost, origCap: cap, orig, rev: arcs.length + 1 }
    const b: Arc = { u: v, v: u, cap: 0, cost: -cost, origCap: 0, orig, rev: arcs.length }
    arcs.push(a, b)
    adj.get(u)!.push(a)
    adj.get(v)!.push(b)
  }
  let totalLower = 0
  const boundInfo = new Map<string, { l: number; u: number }>()
  for (const e of g.edges) {
    const l = lower(e)
    const u = upper(e)
    boundInfo.set(e.id, { l, u })
    totalLower += l
    add(e.from, e.to, u - l, 0, e.id)
  }
  for (const e of g.edges) {
    const l = lower(e)
    if (l > 0) {
      add(e.to, SS, l, 0, null)
      add(SS, e.from, l, 0, null)
    }
  }
  if (bounded) add(t, s, Infinity, 0, null)
  yield evs([{ type: 'log', message: `构建超级源汇辅助网络，Σ下界 = ${totalLower}` }], true)
  const flow = sstFlow(adj, SS, ST)
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `超级源汇最大流 ${flow} / 需要 ${totalLower}` }], true)
  if (flow < totalLower) {
    yield evs([{ type: 'log', message: '无法满足所有边下界，不存在可行流' }, { type: 'done', message: '无可行流' }])
    return
  }
  yield evs([{ type: 'log', message: '可行流存在，计算剩余容量上界内的增广' }], true)
  let extra = 0
  if (bounded) {
    extra = sstFlow(adj, s, t)
  }
  yield evs([
    ...flowEvents(adj, g.edges),
    { type: 'log', message: bounded ? `最大流 = ${totalLower + extra}` : `循环可行流 = ${totalLower}` },
    { type: 'done', message: '上下界流计算完成' },
  ])
}

export function* minCut(ctx: AlgoContext): Generator<AlgoStep> {
  const g = ctx.graph
  const s = ctx.sourceId
  const t = ctx.targetId
  if (!s || !t) {
    yield log('请选择源点与汇点')
    return
  }
  yield log(`最小割（基于 Dinic 最大流），源 ${labelOf(g, s)} → 汇 ${labelOf(g, t)}`)
  const { adj } = buildNet(ctx)
  const maxflow = sstFlow(adj, s, t)
  const side = new Set<string>()
  const q: string[] = [s]
  side.add(s)
  while (q.length) {
    const u = q.shift()!
    for (const a of adj.get(u)!) {
      if (a.cap > 0 && !side.has(a.v)) {
        side.add(a.v)
        q.push(a.v)
      }
    }
  }
  yield evs([...flowEvents(adj, g.edges), { type: 'log', message: `最大流 = ${maxflow}，割集 S = { ${[...side].map((id) => labelOf(g, id)).join(', ')} }` }], true)
  const cutEdges: string[] = []
  for (const e of g.edges) {
    const inS = side.has(e.from)
    const inT = !side.has(e.to)
    if ((g.directed && inS && inT) || (!g.directed && side.has(e.from) !== side.has(e.to))) {
      cutEdges.push(e.id)
    }
  }
  yield evs(
    [
      ...cutEdges.map((id) => ({ type: 'setEdgeColor' as const, edge: id, color: ALGO_COLORS.bad })),
      { type: 'log', message: `割边共 ${cutEdges.length} 条，割容量 = ${maxflow}` },
      { type: 'done', message: `最小割完成，容量 ${maxflow}` },
    ],
    true,
  )
}
