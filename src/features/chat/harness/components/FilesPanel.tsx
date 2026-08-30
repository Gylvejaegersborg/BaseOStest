import { FolderOpen } from 'lucide-react'

/** Placeholder — real Files panel backed by agent-os's Agent FS (per
 *  plan §40) lands once the Gateway exposes a filesystem-projection
 *  command; not part of the current wire protocol yet. */
export function FilesPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-dim">
      <FolderOpen size={28} className="opacity-40" />
      <div className="text-xs italic">Files panel — backed by agent-os's Agent FS, not wired yet.</div>
    </div>
  )
}
