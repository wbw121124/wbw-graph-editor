import './test-polyfill.ts'
import { parseGraphText } from './src/core/parser.ts'
import type { GraphData } from './src/types/graph.ts'
import { AlgorithmRunner } from './src/algorithms/runner.ts'
import { bfsTraversal, dijkstra, floydWarshall } from './src/algorithms/basic.ts'
import { dinic, sspMinCostFlow } from './src/algorithms/flow.ts'

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`)
  if (!ok) failed++
}

const p1 = parseGraphText('0\n1\n2\n0 1 5\n1 2 3 10 7\n0 2', false)
check('parser nodes', p1.nodes.length === 3, `nodes=${p1.nodes.length}`)
check('parser edges', p1.edges.length === 3)
check('parser weight', p1.edges[0].weight === 5)
check('parser capacity', p1.edges[1].capacity === 10)
check('parser cost', p1.edges[1].cost === 7)
check('parser no-weight edge', p1.edges[2].weight === null)

const p2 = parseGraphText('A\nB\nA B 2', true)
check('custom labels', p2.nodes.length === 2 && p2.edges[0].weight === 2)

const g: GraphData = {
  directed: false,
  nodes: [
    { id: 'n0', label: '0', x: 0, y: 0, fixed: false },
    { id: 'n1', label: '1', x: 100, y: 0, fixed: false },
    { id: 'n2', label: '2', x: 200, y: 0, fixed: false },
  ],
  edges: [
    { id: 'e0', from: 'n0', to: 'n1', weight: 2, capacity: 5, cost: 1 },
    { id: 'e1', from: 'n1', to: 'n2', weight: 3, capacity: 4, cost: 2 },
  ],
}

function runToDone(gen: Generator<any>, name: string) {
  const runner = new AlgorithmRunner()
  runner.start(gen)
  let guard = 0
  while (runner.status !== 'done' && guard++ < 200000) {
    if (runner.status === 'paused') runner.step()
    else if (runner.status === 'running') runner.step()
    else break
  }
  check(`${name} reaches done`, runner.status === 'done', `status=${runner.status} steps=${guard}`)
  check(`${name} has logs`, runner.logs.value.length > 0, `logs=${runner.logs.value.length}`)
  return runner
}

runToDone(bfsTraversal({ graph: g, sourceId: null, targetId: null }), 'BFS')
const dijk = runToDone(dijkstra({ graph: g, sourceId: 'n0', targetId: 'n2' }), 'Dijkstra')
check('Dijkstra path length', dijk.logs.value.some((l) => l.includes('最短路径长度 5')), dijk.logs.value[dijk.logs.value.length - 1])
runToDone(floydWarshall({ graph: g, sourceId: null, targetId: null }), 'Floyd')

const dg: GraphData = {
  directed: true,
  nodes: g.nodes,
  edges: [
    { id: 'e0', from: 'n0', to: 'n1', weight: null, capacity: 3, cost: 1 },
    { id: 'e1', from: 'n0', to: 'n2', weight: null, capacity: 2, cost: 2 },
    { id: 'e2', from: 'n1', to: 'n2', weight: null, capacity: 2, cost: 3 },
    { id: 'e3', from: 'n1', to: 'n0', weight: null, capacity: 1, cost: 1 },
  ],
}
const flow = runToDone(dinic({ graph: dg, sourceId: 'n0', targetId: 'n2' }), 'Dinic')
check('Dinic maxflow = 4', flow.logs.value.some((l) => l.includes('最大流 = 4')), flow.logs.value.filter((l) => l.includes('最大流')).join(' | '))
runToDone(sspMinCostFlow({ graph: dg, sourceId: 'n0', targetId: 'n2' }), 'SSP cost flow')

console.log(failed === 0 ? 'ALL TESTS PASSED' : `${failed} TESTS FAILED`)
process.exit(failed === 0 ? 0 : 1)
