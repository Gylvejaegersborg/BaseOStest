import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SECTION_SHORTCUTS } from '@/data/sectionShortcuts'
import { sectionById } from '@/data/sections'

/**
 * Global Shift+[1-7] section jump (navigation model, Phase 2/3) — the
 * first system-wide keyboard shortcut in BaseOS. Reveals the rail (via
 * onJump) and navigates in one action. Ignored while typing in a text
 * field so it doesn't fight normal editing.
 */
export function useSectionShortcuts(onJump: () => void) {
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
      // e.key reflects the shifted character (Shift+1 → "!" on most layouts,
      // not "1"), so it can't be used to detect a digit while Shift is held.
      // e.code reports the physical key regardless of modifiers.
      const match = /^Digit([0-9])$/.exec(e.code)
      if (!match) return
      const index = Number(match[1]) - 1
      if (!(index >= 0 && index < SECTION_SHORTCUTS.length)) return

      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      e.preventDefault()
      onJump()
      navigate(sectionById(SECTION_SHORTCUTS[index]).route)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, onJump])
}
