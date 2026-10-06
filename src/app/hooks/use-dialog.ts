'use client'
import { useEffect, useEffectEvent, useRef } from 'react'
const stack: HTMLElement[] = []
let originalOverflow = ''
export function useDialog(onClose: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const dialog = ref.current
    if (!enabled || !dialog) return
    const previous = document.activeElement as HTMLElement | null
    if (!stack.length) originalOverflow = document.body.style.overflow
    stack.push(dialog)
    document.body.style.overflow = 'hidden'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) dialog.setAttribute('aria-label', dialog.querySelector('h2,h3')?.textContent || 'Library dialog')
    dialog.tabIndex = -1
    const selectable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')).filter(element => element.getClientRects().length > 0)
    ;(selectable()[0] || dialog).focus()
    const keydown = (event: KeyboardEvent) => {
      if (stack.at(-1) !== dialog) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close() }
      if (event.key === 'Tab') {
        const items = selectable(), first = items[0] || dialog, last = items.at(-1) || dialog
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
      }
    }
    const contain = (event: FocusEvent) => { if (stack.at(-1) === dialog && !dialog.contains(event.target as Node)) (selectable()[0] || dialog).focus() }
    document.addEventListener('focusin', contain)
    document.addEventListener('keydown', keydown, true)
    return () => {
      stack.splice(stack.indexOf(dialog), 1)
      document.removeEventListener('focusin', contain)
      document.removeEventListener('keydown', keydown, true)
      document.body.style.overflow = stack.length ? 'hidden' : originalOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [enabled])
  return ref
}
