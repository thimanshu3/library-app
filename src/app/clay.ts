import type { CSSProperties } from 'react'

// Shadow tint for neutral (non-status) surfaces
export const NEUTRAL_RGB = '112,104,168'

// raised: soft puffy object  |  pressed: carved-in well
export const raised = (rgb: string, dark: boolean, d = 10, b = 26) => {
  const h = d / 2
  return dark
    ? `${d}px ${d}px ${b}px rgba(0,0,0,.5), -${h}px -${h}px ${b}px rgba(255,255,255,.035), inset ${h}px ${h}px ${b / 2}px rgba(255,255,255,.08), inset -${h}px -${h}px ${b / 2}px rgba(0,0,0,.4)`
    : `${d}px ${d}px ${b}px rgba(${rgb},.26), -${h}px -${h}px ${b}px rgba(255,255,255,.95), inset ${h}px ${h}px ${b / 2}px rgba(255,255,255,.95), inset -${h}px -${h}px ${b / 2}px rgba(${rgb},.18)`
}

export const pressed = (rgb: string, dark: boolean, d = 4, b = 10) =>
  dark
    ? `inset ${d}px ${d}px ${b}px rgba(0,0,0,.5), inset -${d}px -${d}px ${b}px rgba(255,255,255,.05)`
    : `inset ${d}px ${d}px ${b}px rgba(${rgb},.24), inset -${d}px -${d}px ${b}px rgba(255,255,255,.95)`

export const chipShadow = (dark: boolean) =>
  dark
    ? '0 3px 8px rgba(0,0,0,.45), inset 1px 1px 2px rgba(255,255,255,.12)'
    : '0 3px 8px rgba(30,35,55,.16), inset 1px 1px 2px rgba(255,255,255,.9), inset -1px -1px 2px rgba(30,35,55,.08)'

export const palette = (dark: boolean) => ({
  canvas: dark ? '#141726' : '#e7e3f4',
  panel: dark ? '#1e2235' : '#f3f0fb',
  well: dark ? 'rgba(0,0,0,.24)' : 'rgba(112,104,168,.09)',
  title: dark ? '#f5f6fb' : '#1c2133',
  body: dark ? 'rgba(255,255,255,.64)' : '#59627a',
  faint: dark ? 'rgba(255,255,255,.4)' : '#8b93a8',
  accent: dark ? '#e38a71' : '#c46a4f'
})

// Solid, glossy clay button / badge
export const clayFill = (
  rgb: string,
  from: string,
  to: string,
  d = 4
): CSSProperties => ({
  background: `linear-gradient(145deg, ${from}, ${to})`,
  color: '#fff',
  boxShadow: `${d}px ${d + 2}px ${d * 3.5}px rgba(${rgb},.42), inset 2px 2px 4px rgba(255,255,255,.4), inset -2px -3px 5px rgba(0,0,0,.18)`
})

export const statusTheme: Record<
  string,
  { rgb: string; from: string; to: string }
> = {
  All: { rgb: '59,66,102', from: '#5b6491', to: '#343b63' },
  Unread: { rgb: '100,116,139', from: '#94a3b8', to: '#64748b' },
  Reading: { rgb: '196,106,79', from: '#e38a71', to: '#c46a4f' },
  Read: { rgb: '16,185,129', from: '#4fe0b0', to: '#10b981' },
  Wishlist: { rgb: '59,130,246', from: '#7ab4ff', to: '#3b82f6' }
}
