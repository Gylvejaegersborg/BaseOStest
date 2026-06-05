// Thin wrapper around the Web Notifications API so the rest of the calendar
// code never has to feature-detect or touch the global `Notification` object.

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported'

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotifyPermission {
  if (!supported()) return 'unsupported'
  return Notification.permission as NotifyPermission
}

export async function requestPermission(): Promise<NotifyPermission> {
  if (!supported()) return 'unsupported'
  try {
    return (await Notification.requestPermission()) as NotifyPermission
  } catch {
    return getPermission()
  }
}

/** Fire an OS-level push notification. No-op unless permission is granted. */
export function pushNotification(title: string, body: string, tag?: string): void {
  if (!supported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.svg' })
    // Auto-dismiss so the tray doesn't pile up during a demo session.
    window.setTimeout(() => n.close(), 9000)
  } catch {
    /* some browsers throw when constructing Notification off a user gesture */
  }
}
