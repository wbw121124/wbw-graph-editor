import type { GraphData } from '../types/graph'

export function generateTikZ(graph: GraphData): string {
  const idx = new Map(graph.nodes.map((n, i) => [n.id, i]))
  const lines: string[] = []
  lines.push('\\begin{tikzpicture}[>=stealth, scale=1.0]')
  for (const n of graph.nodes) {
    const i = idx.get(n.id)!
    lines.push(
      `  \\node[circle, draw=black, fill=blue!10, inner sep=1pt, font=\\small] (v${i}) at (${(n.x / 100).toFixed(2)}, ${(-n.y / 100).toFixed(2)}) {${n.label}};`,
    )
  }
  const arrow = graph.directed ? '->' : '-'
  for (const e of graph.edges) {
    const a = idx.get(e.from)
    const b = idx.get(e.to)
    if (a === undefined || b === undefined) continue
    const label = e.weight !== null ? ` node[midway, above, font=\\tiny] {${e.weight}}` : ''
    lines.push(`  \\draw[${arrow}] (v${a}) -- (v${b})${label};`)
  }
  lines.push('\\end{tikzpicture}')
  return lines.join('\n')
}
