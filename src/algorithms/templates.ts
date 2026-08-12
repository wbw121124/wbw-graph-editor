import type { Locale } from '../i18n/messages'

export interface AlgoTemplate {
  id: string
  nameKey: string
  codes: Record<Locale, string>
}

export const ALGO_TEMPLATES: AlgoTemplate[] = [
  {
    id: 'bfs',
    nameKey: 'tpl.bfs',
    codes: {
      zh: `// 可用对象：
// G —— 只读图 API：G.nodes() / G.neighbors(u) / G.edge(u,v) / G.label(u) ...
// api —— 可视化 API：api.emit(事件) / await api.step() / api.log(msg) / api.done(msg)

async function solve() {
  const vis = new Set();
  const q = [];
  for (const start of G.nodes()) {
    if (vis.has(start)) continue;
    vis.add(start);
    q.push(start);
    api.emit({ type: 'visit', node: start });
    await api.step();
    while (q.length) {
      const u = q.shift();
      api.emit({ type: 'current', node: u });
      for (const { node: v, edge } of G.neighbors(u)) {
        if (vis.has(v)) continue;
        vis.add(v);
        q.push(v);
        api.emit({ type: 'visit', node: v });
        api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#66bb6a' });
        await api.step();
      }
    }
  }
  api.emit({ type: 'current', node: null });
  api.done('BFS 完成');
}

solve();
`,
      en: `// Available objects:
// G - read-only graph API: G.nodes() / G.neighbors(u) / G.edge(u,v) / G.label(u) ...
// api - visualization API: api.emit(event) / await api.step() / api.log(msg) / api.done(msg)

async function solve() {
  const vis = new Set();
  const q = [];
  for (const start of G.nodes()) {
    if (vis.has(start)) continue;
    vis.add(start);
    q.push(start);
    api.emit({ type: 'visit', node: start });
    await api.step();
    while (q.length) {
      const u = q.shift();
      api.emit({ type: 'current', node: u });
      for (const { node: v, edge } of G.neighbors(u)) {
        if (vis.has(v)) continue;
        vis.add(v);
        q.push(v);
        api.emit({ type: 'visit', node: v });
        api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#66bb6a' });
        await api.step();
      }
    }
  }
  api.emit({ type: 'current', node: null });
  api.done('BFS done');
}

solve();
`,
    },
  },
  {
    id: 'dfs',
    nameKey: 'tpl.dfs',
    codes: {
      zh: `async function solve() {
  const vis = new Set();
  async function dfs(u) {
    vis.add(u);
    api.emit({ type: 'visit', node: u });
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v, edge } of G.neighbors(u)) {
      if (vis.has(v)) continue;
      api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#66bb6a' });
      await dfs(v);
    }
  }
  for (const u of G.nodes()) {
    if (!vis.has(u)) await dfs(u);
  }
  api.emit({ type: 'current', node: null });
  api.done('DFS 完成');
}

solve();
`,
      en: `async function solve() {
  const vis = new Set();
  async function dfs(u) {
    vis.add(u);
    api.emit({ type: 'visit', node: u });
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v, edge } of G.neighbors(u)) {
      if (vis.has(v)) continue;
      api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#66bb6a' });
      await dfs(v);
    }
  }
  for (const u of G.nodes()) {
    if (!vis.has(u)) await dfs(u);
  }
  api.emit({ type: 'current', node: null });
  api.done('DFS done');
}

solve();
`,
    },
  },
  {
    id: 'dijkstra',
    nameKey: 'tpl.dijkstra',
    codes: {
      zh: `async function solve() {
  const source = G.nodes()[0];
  const dist = new Map();
  const pred = new Map();
  for (const u of G.nodes()) dist.set(u, Infinity);
  dist.set(source, 0);
  api.emit({ type: 'setNodeValue', node: source, text: '0' });
  await api.step();
  const settled = new Set();
  while (true) {
    let u = null;
    for (const v of G.nodes()) {
      if (!settled.has(v) && (u === null || dist.get(v) < dist.get(u))) u = v;
    }
    if (u === null || dist.get(u) === Infinity) break;
    settled.add(u);
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v, edge } of G.neighbors(u)) {
      const w = edge.weight ?? 1;
      const nd = dist.get(u) + w;
      if (nd < dist.get(v)) {
        dist.set(v, nd);
        pred.set(v, u);
        api.emit({ type: 'setNodeValue', node: v, text: String(nd) });
        api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#26c6da' });
        await api.step();
      }
    }
  }
  api.log('最短路计算完成，距离：' + [...dist.entries()].map(([u, d]) => G.label(u) + ':' + d).join(' '));
  api.emit({ type: 'current', node: null });
  api.done('Dijkstra 完成');
}

solve();
`,
      en: `async function solve() {
  const source = G.nodes()[0];
  const dist = new Map();
  const pred = new Map();
  for (const u of G.nodes()) dist.set(u, Infinity);
  dist.set(source, 0);
  api.emit({ type: 'setNodeValue', node: source, text: '0' });
  await api.step();
  const settled = new Set();
  while (true) {
    let u = null;
    for (const v of G.nodes()) {
      if (!settled.has(v) && (u === null || dist.get(v) < dist.get(u))) u = v;
    }
    if (u === null || dist.get(u) === Infinity) break;
    settled.add(u);
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v, edge } of G.neighbors(u)) {
      const w = edge.weight ?? 1;
      const nd = dist.get(u) + w;
      if (nd < dist.get(v)) {
        dist.set(v, nd);
        pred.set(v, u);
        api.emit({ type: 'setNodeValue', node: v, text: String(nd) });
        api.emit({ type: 'setEdgeColor', edge: edge.id, color: '#26c6da' });
        await api.step();
      }
    }
  }
  api.log('Shortest paths computed, distances: ' + [...dist.entries()].map(([u, d]) => G.label(u) + ':' + d).join(' '));
  api.emit({ type: 'current', node: null });
  api.done('Dijkstra done');
}

solve();
`,
    },
  },
  {
    id: 'tarjan',
    nameKey: 'tpl.tarjan',
    codes: {
      zh: `async function solve() {
  const dfn = new Map();
  const low = new Map();
  const inStack = new Set();
  const stack = [];
  const colors = ['#ef5350', '#ab47bc', '#5c6bc0', '#26c6da', '#66bb6a', '#ffca28'];
  let ts = 0;
  let ci = 0;
  async function dfs(u) {
    dfn.set(u, ts);
    low.set(u, ts);
    ts++;
    stack.push(u);
    inStack.add(u);
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v } of G.neighbors(u)) {
      if (!dfn.has(v)) {
        await dfs(v);
        low.set(u, Math.min(low.get(u), low.get(v)));
      } else if (inStack.has(v)) {
        low.set(u, Math.min(low.get(u), dfn.get(v)));
      }
    }
    if (low.get(u) === dfn.get(u)) {
      const comp = [];
      while (true) {
        const w = stack.pop();
        inStack.delete(w);
        comp.push(w);
        if (w === u) break;
      }
      const color = colors[ci % colors.length];
      ci++;
      for (const w of comp) api.emit({ type: 'setNodeColor', node: w, color });
      api.log('分量 ' + ci + '：' + comp.map((w) => G.label(w)).join(', '));
      await api.step();
    }
  }
  for (const u of G.nodes()) {
    if (!dfn.has(u)) await dfs(u);
  }
  api.emit({ type: 'current', node: null });
  api.done('Tarjan 完成，共 ' + ci + ' 个分量');
}

solve();
`,
      en: `async function solve() {
  const dfn = new Map();
  const low = new Map();
  const inStack = new Set();
  const stack = [];
  const colors = ['#ef5350', '#ab47bc', '#5c6bc0', '#26c6da', '#66bb6a', '#ffca28'];
  let ts = 0;
  let ci = 0;
  async function dfs(u) {
    dfn.set(u, ts);
    low.set(u, ts);
    ts++;
    stack.push(u);
    inStack.add(u);
    api.emit({ type: 'current', node: u });
    await api.step();
    for (const { node: v } of G.neighbors(u)) {
      if (!dfn.has(v)) {
        await dfs(v);
        low.set(u, Math.min(low.get(u), low.get(v)));
      } else if (inStack.has(v)) {
        low.set(u, Math.min(low.get(u), dfn.get(v)));
      }
    }
    if (low.get(u) === dfn.get(u)) {
      const comp = [];
      while (true) {
        const w = stack.pop();
        inStack.delete(w);
        comp.push(w);
        if (w === u) break;
      }
      const color = colors[ci % colors.length];
      ci++;
      for (const w of comp) api.emit({ type: 'setNodeColor', node: w, color });
      api.log('Component ' + ci + ': ' + comp.map((w) => G.label(w)).join(', '));
      await api.step();
    }
  }
  for (const u of G.nodes()) {
    if (!dfn.has(u)) await dfs(u);
  }
  api.emit({ type: 'current', node: null });
  api.done('Tarjan done, ' + ci + ' components');
}

solve();
`,
    },
  },
  {
    id: 'edge-coloring',
    nameKey: 'tpl.edgeColoring',
    codes: {
      zh: `async function solve() {
  const colorOf = new Map();
  const used = new Set();
  for (const e of G.edges()) {
    const usedColors = new Set();
    for (const { node: v, edge } of G.neighbors(e.from)) {
      if (edge.id !== e.id && colorOf.has(edge.id)) usedColors.add(colorOf.get(edge.id));
    }
    for (const { node: v, edge } of G.neighbors(e.to)) {
      if (edge.id !== e.id && colorOf.has(edge.id)) usedColors.add(colorOf.get(edge.id));
    }
    let c = 0;
    while (usedColors.has(c)) c++;
    colorOf.set(e.id, c);
    used.add(c);
    api.emit({ type: 'setEdgeColor', edge: e.id, color: ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#ff7043'][c % 6] });
    api.log('边 ' + G.label(e.from) + '-' + G.label(e.to) + ' 着色 ' + c);
    await api.step();
  }
  api.done('边着色完成，使用 ' + used.size + ' 种颜色');
}

solve();
`,
      en: `async function solve() {
  const colorOf = new Map();
  const used = new Set();
  for (const e of G.edges()) {
    const usedColors = new Set();
    for (const { node: v, edge } of G.neighbors(e.from)) {
      if (edge.id !== e.id && colorOf.has(edge.id)) usedColors.add(colorOf.get(edge.id));
    }
    for (const { node: v, edge } of G.neighbors(e.to)) {
      if (edge.id !== e.id && colorOf.has(edge.id)) usedColors.add(colorOf.get(edge.id));
    }
    let c = 0;
    while (usedColors.has(c)) c++;
    colorOf.set(e.id, c);
    used.add(c);
    api.emit({ type: 'setEdgeColor', edge: e.id, color: ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#ff7043'][c % 6] });
    api.log('Edge ' + G.label(e.from) + '-' + G.label(e.to) + ' colored ' + c);
    await api.step();
  }
  api.done('Edge coloring done, using ' + used.size + ' colors');
}

solve();
`,
    },
  },
]