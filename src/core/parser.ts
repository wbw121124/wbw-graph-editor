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
}

export interface ParsedGraph {
  nodes: ParsedNode[]
  edges: ParsedEdge[]
}

function parseNum(t: string): number | null {
  return NUM_RE.test(t) ? parseFloat(t) : null
}

export function parseGraphText(text: string, customLabels: boolean): ParsedGraph {
  const nodeMap = new Map<string, ParsedNode>()
  const edges: ParsedEdge[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const tokens = line.split(/\s+/)
    const first = tokens[0]
    const second = tokens[1]

    if (customLabels) {
      nodeMap.set(first, { label: first })
      if (!second) continue
      nodeMap.set(second, { label: second })
      const nums = tokens.slice(2).map(parseNum)
      edges.push({
        from: first,
        to: second,
        weight: nums[0] ?? null,
        capacity: nums[1] ?? null,
        cost: nums[2] ?? null,
      })
      continue
    }

    if (!NUM_RE.test(first)) continue
    nodeMap.set(first, { label: first })
    if (!second || !NUM_RE.test(second)) continue
    nodeMap.set(second, { label: second })
    const nums = tokens.slice(2).map(parseNum)
    edges.push({
      from: first,
      to: second,
      weight: nums[0] ?? null,
      capacity: nums[1] ?? null,
      cost: nums[2] ?? null,
    })
  }

  return { nodes: [...nodeMap.values()], edges }
}
