import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Asset } from '@/data/library'
import { AUDIO_ACCEPT, IMAGE_ACCEPT, createSong, libraryConfigured, probeDuration, updateSong, uploadFile } from './libraryClient'
import { useRefreshOverlay } from '@/features/overlay/osOverlay'

const input = 'w-full border border-line bg-bg/60 px-2 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none'

interface SongModalProps {
  open: boolean
  onClose: () => void
  /** Present = edit this uploaded song; absent = add a new one. */
  editing?: Asset
  onSaved?: (id: string) => void
}

/** Add a song (upload the audio, name it) or edit an uploaded one. Only what the
 *  operator types is stored: BPM and key stay blank unless they're given. */
export function SongModal({ open, onClose, editing, onSaved }: SongModalProps) {
  const refresh = useRefreshOverlay()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'beat' | 'song'>('beat')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')
  const [tags, setTags] = useState('')
  const [note, setNote] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [audio, setAudio] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(editing?.title ?? '')
    setKind(editing?.category === 'song' ? 'song' : 'beat')
    setBpm(editing?.bpm ? String(editing.bpm) : '')
    setKey(editing?.musicalKey ?? '')
    setTags(editing?.tags.join(', ') ?? '')
    setNote(editing?.note ?? '')
    setLyrics(editing?.lyrics ?? '')
    setAudio(null)
    setCover(null)
    setError(null)
    setProgress(null)
    setBusy(false)
  }, [open, editing])

  const pickAudio = (f: File | null) => {
    setAudio(f)
    // Suggest a title from the file name, only when none is typed yet.
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim())
  }

  const submit = async () => {
    if (busy) return
    if (!title.trim()) return setError('Give it a title.')
    if (!editing && !audio) return setError('Choose the audio file to upload.')
    if (bpm.trim() && !(Number(bpm) >= 20 && Number(bpm) <= 400)) return setError('BPM should be a number between 20 and 400.')
    setBusy(true)
    setError(null)
    try {
      const fields = {
        title: title.trim(),
        category: kind,
        bpm: bpm.trim() ? Number(bpm) : null,
        musicalKey: key.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        note: note.trim(),
        lyrics: lyrics.trim(),
      }
      const coverId = cover ? (await uploadFile(cover)).id : undefined
      let id: string
      if (editing) {
        const audioId = audio ? (await uploadFile(audio, setProgress)).id : undefined
        const dur = audio ? await probeDuration(audio) : undefined
        id = (await updateSong(editing.id, { ...fields, ...(audioId ? { audioFileId: audioId } : {}), ...(dur ? { durationSec: dur } : {}), ...(coverId ? { coverFileId: coverId } : {}) })).id
      } else {
        const stored = await uploadFile(audio!, setProgress)
        const dur = await probeDuration(audio!)
        id = (await createSong({ ...fields, audioFileId: stored.id, ...(dur ? { durationSec: dur } : {}), ...(coverId ? { coverFileId: coverId } : {}) })).id
      }
      await refresh()
      onSaved?.(id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={editing ? 'Edit song' : 'Add song'} code="BEAT DB" width={520} zIndex={70}>
      {!libraryConfigured() ? (
        <p className="text-xs text-dim">The OS server isn't connected, so there is nowhere to upload to yet.</p>
      ) : (
        <div className="flex flex-col gap-3 text-xs">
          <div>
            <label className="label mb-1 block">{editing ? 'Replace audio (optional)' : 'Audio file'}</label>
            <input ref={audioRef} type="file" accept={AUDIO_ACCEPT} onChange={(e) => pickAudio(e.target.files?.[0] ?? null)} className="block w-full text-xs text-dim file:mr-3 file:border file:border-line file:bg-panel file:px-2 file:py-1.5 file:text-text" />
            <p className="mt-1 text-[10px] text-dim">MP3, WAV, FLAC, M4A, AAC, OGG or AIFF. Stored on your own OS server.</p>
          </div>
          <div>
            <label className="label mb-1 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={input} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label mb-1 block">Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as 'beat' | 'song')} className={input}>
                <option value="beat">Beat (instrumental)</option>
                <option value="song">Song</option>
              </select>
            </div>
            <div>
              <label className="label mb-1 block">BPM</label>
              <input value={bpm} onChange={(e) => setBpm(e.target.value)} inputMode="decimal" placeholder="optional" className={input} />
            </div>
            <div>
              <label className="label mb-1 block">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="optional" maxLength={24} className={input} />
            </div>
          </div>
          <div>
            <label className="label mb-1 block">Tags (comma separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={input} />
          </div>
          <div>
            <label className="label mb-1 block">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} className={`${input} resize-none`} />
          </div>
          <div>
            <label className="label mb-1 block">Lyrics (optional)</label>
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={4} maxLength={20000} className={`${input} resize-y`} />
          </div>
          <div>
            <label className="label mb-1 block">Cover image (optional)</label>
            <input type="file" accept={IMAGE_ACCEPT} onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="block w-full text-xs text-dim file:mr-3 file:border file:border-line file:bg-panel file:px-2 file:py-1.5 file:text-text" />
          </div>
          {progress !== null && busy && (
            <div className="h-1.5 w-full overflow-hidden bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {error && <p role="alert" className="text-[11px] text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 text-dim">
            <button onClick={onClose} disabled={busy} className="px-3 py-1.5 hover:text-text disabled:opacity-40">Cancel</button>
            <button onClick={submit} disabled={busy} className="border border-accent/60 px-3 py-1.5 text-accent hover:bg-accent/10 disabled:opacity-50">
              {busy ? (progress !== null && progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Saving…') : editing ? 'Save' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
