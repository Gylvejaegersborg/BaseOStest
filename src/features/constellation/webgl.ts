/** Cheap WebGL support probe. Some devices/browsers (old mobile Safari, locked-down
 *  corporate Chrome, software-only fallback renderers) can't or won't give us a
 *  usable WebGL context — detect it once and let callers fall back gracefully
 *  instead of crashing deep inside three.js. */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}
