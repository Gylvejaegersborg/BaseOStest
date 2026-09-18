import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows the built-in radius scale (rounded-sm, -lg, …)
// out of the box — our custom control/panel/docked radius tokens (design
// tokens, Phase 0) aren't registered as conflicting with e.g. rounded-none,
// so without this a call site's own override (Ops's rounded-none, meant to
// win over Panel's default rounded-panel) silently applied alongside it
// instead of replacing it, since CSS class order doesn't decide the winner.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: ['rounded-control', 'rounded-panel', 'rounded-docked'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
