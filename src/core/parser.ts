const NUM_RE = /^-?\d+(\.\d+)?$/

export interface ParsedNode {
  label: string
}

export interface ParsedEdge {
  from: string
  to: string
  weight: number | null
  capacity: number | null
  cost: number | null
  comment: string | null
}

export interface ParsedGraph {
  nodes: ParsedNode[]
  edges: ParsedEdge[]
}

function parseNum(t: string): number | null {
  return NUM_RE.test(t) ? parseFloat(t) : null
}

export function parseGraphText(text: string): ParsedGraph {
  const nodeMap = new Map<string, ParsedNode>()
  const edges: ParsedEdge[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const tokens = line.split(/\s+/)
    const first = tokens[0]
    const second = tokens[1]

    nodeMap.set(first, { label: first })
    if (!second) continue
    nodeMap.set(second, { label: second })

    let weight: number | null = null
    let capacity: number | null = null
    let cost: number | null = null
    let comment: string | null = null
    const commentParts: string[] = []
    let fieldIdx = 0
    for (const t of tokens.slice(2)) {
      if (commentParts.length > 0) {
        commentParts.push(t)
        continue
      }
      if (t === '_') {
        fieldIdx++
        continue
      }
      const num = parseNum(t)
      if (num === null) {
        commentParts.push(t)
        continue
      }
      if (fieldIdx === 0) weight = num
      else if (fieldIdx === 1) capacity = num
      else if (fieldIdx === 2) cost = num
      else {
        commentParts.push(t)
        continue
      }
      fieldIdx++
    }
    if (commentParts.length > 0) comment = commentParts.join(' ')

    edges.push({ from: first, to: second, weight, capacity, cost, comment })
  }

  return { nodes: [...nodeMap.values()], edges }
}
