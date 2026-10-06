'use client'
import { useSyncExternalStore } from 'react'
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false)
}
export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* Storage may be disabled. */ }
}
