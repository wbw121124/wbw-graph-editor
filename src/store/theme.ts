import { computed, reactive, ref } from 'vue'
import type { GraphStyle } from '../types/graph'

export type ThemeName = 'dark' | 'light'

export interface CanvasTheme {
  bg: string
  grid: string
  nodeFill: string
  nodeStroke: string
  labelColor: string
  edgeColor: string
  hover: string
  selected: string
  fixedMarker: string
  tempEdge: string
}

const THEMES: Record<ThemeName, CanvasTheme> = {
  dark: {
    bg: '#1b1e24',
    grid: 'rgba(255,255,255,0.05)',
    nodeFill: '#34455c',
    nodeStroke: '#8aa2c0',
    labelColor: '#e8edf5',
    edgeColor: '#7c8ba1',
    hover: '#ffd166',
    selected: '#4fc3f7',
    fixedMarker: '#ffd166',
    tempEdge: '#9ecbff',
  },
  light: {
    bg: '#f5f7fa',
    grid: 'rgba(0,0,0,0.06)',
    nodeFill: '#dbe7f5',
    nodeStroke: '#5c7ba0',
    labelColor: '#1f2d3d',
    edgeColor: '#5a6a7d',
    hover: '#e6a817',
    selected: '#0288d1',
    fixedMarker: '#c77700',
    tempEdge: '#1565c0',
  },
}

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('wbw-theme') : null
export const themeName = ref<ThemeName>(stored === 'light' ? 'light' : 'dark')

export function toggleTheme() {
  themeName.value = themeName.value === 'dark' ? 'light' : 'dark'
  if (typeof localStorage !== 'undefined') localStorage.setItem('wbw-theme', themeName.value)
}

export const canvasTheme = computed(() => THEMES[themeName.value])

export const ALGO_COLORS = {
  visited: '#66bb6a',
  current: '#ffa726',
  path: '#42a5f5',
  tree: '#ba68c8',
  bad: '#ef5350',
  info: '#26c6da',
  fixed: '#ffd166',
  scc: [
    '#ef5350',
    '#ab47bc',
    '#5c6bc0',
    '#26c6da',
    '#66bb6a',
    '#ffca28',
    '#ff7043',
    '#ec407a',
    '#9ccc65',
    '#29b6f6',
    '#d4e157',
    '#8d6e63',
  ],
}

export const graphStyle = reactive<GraphStyle>({
  nodeRadius: 22,
  edgeIdealLength: 120,
  repulsionK: 1728000,
  nodeFill: '',
  nodeStroke: '',
  labelColor: '',
  edgeColor: '',
  showGrid: true,
})
