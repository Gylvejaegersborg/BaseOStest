import type { SectionId } from './sections'

/**
 * Shift+[number] section-jump order (navigation model, Phase 2/3) — usage
 * priority, matching mobile's bottom-nav priority, not IA list order.
 * Ctrl+[number] was rejected: it collides with native browser tab-switching.
 */
export const SECTION_SHORTCUTS: SectionId[] = [
  'workbench',
  'notes',
  'calendar',
  'projects',
  'home',
  'ops',
  'lab',
]
