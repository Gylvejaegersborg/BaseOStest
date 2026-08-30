// The Harness store — a small React Context, per
// AGENT-HARNESS-IMPLEMENTATION-PLAN.md §70 ("Ikke introduser Redux. Lag
// en liten Harness store."). Phase 5: seeded with fake data and no
// mutation beyond local UI state (view switching, rail collapse). Phase 6
// replaces the seed with a live useHarnessSocket()-driven reducer without
// changing this context's shape.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { HarnessState, HarnessView, RailState } from '../types'
import type { ConversationItem } from '../protocol'
import { buildFakeHarnessState } from '../fakeData'

interface HarnessContextValue {
  state: HarnessState
  setActiveView: (view: HarnessView) => void
  setRightRail: (state: RailState) => void
  setBottomRail: (state: RailState) => void
  /** Phase 5: appends a ConversationItem directly to local state — this
   *  is what lets the Composer be demonstrably interactive against fake
   *  data. Phase 6 replaces the CALLER of this (Composer's handleSend)
   *  with a real send.message command over useHarnessSocket(); this
   *  action itself can stay as the local-echo path for the user's own
   *  message even once real streaming exists. */
  addMessage: (item: ConversationItem) => void
}

const HarnessContext = createContext<HarnessContextValue | null>(null)

const LAYOUT_STORAGE_KEY = 'os:harness:layout'

function loadRailPrefs(): { rightRail: RailState; bottomRail: RailState } {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return { rightRail: 'expanded', bottomRail: 'expanded' }
    const parsed = JSON.parse(raw)
    return {
      rightRail: parsed.rightRail ?? 'expanded',
      bottomRail: parsed.bottomRail ?? 'expanded',
    }
  } catch {
    return { rightRail: 'expanded', bottomRail: 'expanded' }
  }
}

function saveRailPrefs(rightRail: RailState, bottomRail: RailState): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ version: 1, rightRail, bottomRail }))
  } catch {
    // localStorage unavailable (private browsing, quota) — layout prefs
    // just won't persist across reload; not worth surfacing an error for.
  }
}

export function HarnessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HarnessState>(() => {
    const fake = buildFakeHarnessState()
    const prefs = loadRailPrefs()
    return { ...fake, ...prefs }
  })

  const value = useMemo<HarnessContextValue>(
    () => ({
      state,
      setActiveView: (view) => setState((s) => ({ ...s, activeView: view })),
      setRightRail: (rail) =>
        setState((s) => {
          saveRailPrefs(rail, s.bottomRail)
          return { ...s, rightRail: rail }
        }),
      setBottomRail: (rail) =>
        setState((s) => {
          saveRailPrefs(s.rightRail, rail)
          return { ...s, bottomRail: rail }
        }),
      addMessage: (item) => setState((s) => ({ ...s, messages: [...s.messages, item] })),
    }),
    [state],
  )

  return <HarnessContext.Provider value={value}>{children}</HarnessContext.Provider>
}

export function useHarness(): HarnessContextValue {
  const ctx = useContext(HarnessContext)
  if (!ctx) throw new Error('useHarness() must be called inside a <HarnessProvider>')
  return ctx
}
