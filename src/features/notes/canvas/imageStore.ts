// Canvas images live in IndexedDB (localStorage is far too small for
// pictures); canvas nodes reference them as `idb:<key>`.

const DB = 'os-notes'
const STORE = 'images'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putImage(blob: Blob): Promise<string> {
  const key = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const d = await db()
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return `idb:${key}`
}

const urls = new Map<string, Promise<string | null>>()

/** Resolves a node `src` to something an <img> can show. */
export function imageUrl(src: string): Promise<string | null> {
  if (!src.startsWith('idb:')) return Promise.resolve(src)
  const hit = urls.get(src)
  if (hit) return hit
  const p = db()
    .then(
      (d) =>
        new Promise<string | null>((resolve) => {
          const req = d.transaction(STORE).objectStore(STORE).get(src.slice(4))
          req.onsuccess = () => resolve(req.result ? URL.createObjectURL(req.result as Blob) : null)
          req.onerror = () => resolve(null)
        }),
    )
    .catch(() => null)
  urls.set(src, p)
  return p
}

/** Natural size of an image blob, for sizing the node. */
export function imageSize(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => resolve({ w: 320, h: 240 })
    img.src = url
  })
}
