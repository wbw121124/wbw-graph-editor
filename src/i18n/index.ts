import { ref } from 'vue'
import { messages, type Locale } from './messages'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('wbw-lang') : null
export const locale = ref<Locale>(stored === 'en' ? 'en' : 'zh')

export function t(key: string, params?: Record<string, string | number>): string {
  let s = messages[locale.value][key] ?? messages.zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}

export function setLocale(l: Locale) {
  locale.value = l
  if (typeof localStorage !== 'undefined') localStorage.setItem('wbw-lang', l)
}