import type { MenuItem } from './ContextMenu'

// Lets non-React code (editor widgets, the canvas) open the Notes page's
// context menu: the page listens for this event and renders the menu.

export const MENU_EVENT = 'notes:context-menu'

export interface MenuRequest {
  x: number
  y: number
  items: MenuItem[]
}

export function openContextMenu(x: number, y: number, items: MenuItem[]) {
  window.dispatchEvent(new CustomEvent<MenuRequest>(MENU_EVENT, { detail: { x, y, items } }))
}
