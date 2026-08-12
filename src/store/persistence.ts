import { watch } from 'vue'
import { graphStore } from './graphStore'

const AUTO_KEY = 'wbw-graph-auto'
let suppressUntil = 0
let autoTimer: ReturnType<typeof setTimeout> | undefined

function snapshot() {
  return { text: graphStore.serializeText(), directed: graphStore.graph.directed }
}

export function encodeShare(): string {
  const s = snapshot()
  return `#g=${s.directed ? '1' : '0'}|${encodeURIComponent(s.text)}`
}

export function parseShare(hash: string): { text: string; directed: boolean } | null {
  if (!hash.startsWith('#g=')) return null
  const body = hash.slice(3)
  const sep = body.indexOf('|')
  if (sep < 0) return null
  const directed = body.slice(0, sep) === '1'
  try {
    const text = decodeURIComponent(body.slice(sep + 1))
    return text ? { text, directed } : null
  } catch {
    return null
  }
}

export function applyShare(hash: string): boolean {
  const s = parseShare(hash)
  if (!s) return false
  graphStore.loadText(s.text)
  graphStore.setDirected(s.directed)
  suppressUntil = Date.now() + 2000
  return true
}

export function saveAuto() {
  if (typeof localStorage === 'undefined') return
  if (Date.now() < suppressUntil) return
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify({ ...snapshot(), t: Date.now() }))
  } catch {
    // 配额不足时静默跳过
  }
}

export function restoreAuto(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(AUTO_KEY)
    if (!raw) return false
    const s = JSON.parse(raw) as { text: string; directed: boolean }
    if (!s.text) return false
    graphStore.loadText(s.text)
    graphStore.setDirected(s.directed)
    suppressUntil = Date.now() + 2000
    return true
  } catch {
    return false
  }
}

export function clearAuto() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(AUTO_KEY)
  } catch {
    // ignore
  }
}

export function setupAutoSave() {
  watch(
    () => graphStore.graph,
    () => {
      clearTimeout(autoTimer)
      autoTimer = setTimeout(saveAuto, 800)
    },
    { deep: true },
  )
}
