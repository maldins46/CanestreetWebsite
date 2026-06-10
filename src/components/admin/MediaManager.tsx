'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Upload, Copy, Check, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface MediaFile { name: string; url: string }

const PAGE_SIZE = 24

async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  // GIF: keep original (would lose animation). WebP: already optimal.
  if (file.type === 'image/gif' || file.type === 'image/webp') return file
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  return new Promise(resolve =>
    canvas.toBlob(
      blob => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })),
      'image/webp',
      quality,
    )
  )
}

export default function MediaManager() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [usageDialog, setUsageDialog] = useState<{ name: string; refs: string[] } | null>(null)

  const loadFiles = useCallback(async (targetPage: number) => {
    setLoading(true)
    const { data } = await supabase.storage.from('media').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
      limit: PAGE_SIZE,
      offset: targetPage * PAGE_SIZE,
    })
    if (!data) { setLoading(false); return }
    const filtered = data.filter(f => f.name !== '.emptyFolderPlaceholder')
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
    setFiles(filtered.map(f => ({ name: f.name, url: base + f.name })))
    setHasMore(filtered.length === PAGE_SIZE)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadFiles(page) }, [page, loadFiles])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    setUploadError(null)

    const invalid = selected.find(f => !f.type.startsWith('image/'))
    if (invalid) {
      setUploadError('Solo file immagine sono consentiti (JPG, PNG, WebP, GIF).')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const tooBig = selected.find(f => f.size > 5 * 1024 * 1024)
    if (tooBig) {
      setUploadError(`"${tooBig.name}" supera il limite di 5MB.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    for (let i = 0; i < selected.length; i++) {
      setUploadProgress(`${i + 1}/${selected.length}`)
      const file = selected[i]
      const webp = await convertToWebP(file)
      const compressed = await imageCompression(webp, { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true })
      const ext = compressed.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      await supabase.storage.from('media').upload(path, compressed)
    }

    setUploading(false)
    setUploadProgress(null)
    if (inputRef.current) inputRef.current.value = ''
    setPage(0)
    await loadFiles(0)
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDeleteClick(file: MediaFile) {
    setConfirmDelete(null)
    const url = file.url
    const [editions, news, winners, staff, sponsors] = await Promise.all([
      supabase.from('editions').select('year').eq('cover_url', url),
      supabase.from('news').select('title').eq('cover_url', url),
      supabase.from('edition_winners').select('category').eq('photo_url', url),
      supabase.from('staff').select('name').eq('photo_url', url),
      supabase.from('sponsors').select('name').eq('logo_url', url),
    ])
    const refs: string[] = [
      ...(editions.data ?? []).map((r: { year: number }) => `Edizione ${r.year}`),
      ...(news.data ?? []).map((r: { title: string }) => `Articolo: "${r.title}"`),
      ...(winners.data ?? []).map((r: { category: string }) => `Vincitore categoria: ${r.category}`),
      ...(staff.data ?? []).map((r: { name: string }) => `Staff: ${r.name}`),
      ...(sponsors.data ?? []).map((r: { name: string }) => `Sponsor: ${r.name}`),
    ]
    if (refs.length > 0) {
      setUsageDialog({ name: file.name, refs })
    } else {
      setConfirmDelete(file.name)
    }
  }

  async function confirmDeleteFile(name: string) {
    setDeleting(name)
    setConfirmDelete(null)
    await supabase.storage.from('media').remove([name])
    setDeleting(null)
    await loadFiles(page)
  }

  function changePage(next: number) {
    setPage(next)
    setConfirmDelete(null)
  }

  return (
    <div>
      {/* Upload */}
      <div
        className="card p-8 border-dashed text-center cursor-pointer hover:border-court-muted transition-colors mb-8"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto text-court-muted mb-3" />
        <p className="font-display uppercase text-sm text-court-gray tracking-wide">
          {uploading
            ? uploadProgress ? `Caricamento ${uploadProgress}...` : 'Caricamento...'
            : 'Clicca per caricare uno o più file'}
        </p>
        <p className="text-court-muted text-xs mt-1">JPG, PNG, WebP, GIF — max 5MB per file</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {uploadError && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-3 mb-4">
          {uploadError}
        </p>
      )}

      {/* Gallery */}
      {loading ? (
        <p className="text-court-gray text-sm">Caricamento...</p>
      ) : !files.length ? (
        <p className="text-court-gray text-sm">Nessun file su questa pagina.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map(f => (
              <div key={f.name} className="group relative card overflow-hidden">
                <div className="relative aspect-square">
                  <Image src={f.url} alt={f.name} fill className="object-cover" unoptimized />
                </div>

                {confirmDelete === f.name ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-court-black/85 gap-2 p-2">
                    <p className="text-xs text-court-white font-display uppercase text-center">Sicuro?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmDeleteFile(f.name)}
                        className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white font-display uppercase"
                      >
                        Sì
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1 text-xs bg-court-700 hover:bg-court-600 text-court-white font-display uppercase"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : deleting === f.name ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-court-black/70">
                    <p className="text-xs text-court-muted font-display uppercase">Eliminazione...</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-court-black/70 opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                    <button onClick={() => copyUrl(f.url)} className="flex items-center gap-1">
                      {copied === f.url
                        ? <><Check size={14} className="text-green-400" /><span className="text-xs text-green-400 font-display uppercase">Copiato!</span></>
                        : <><Copy size={14} className="text-court-white" /><span className="text-xs text-court-white font-display uppercase">Copia</span></>
                      }
                    </button>
                    <button onClick={() => handleDeleteClick(f)} className="flex items-center gap-1">
                      <Trash2 size={14} className="text-red-400" />
                      <span className="text-xs text-red-400 font-display uppercase">Elimina</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-court-muted p-2 truncate">{f.name}</p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page === 0}
                className="flex items-center gap-1 text-sm font-display uppercase text-court-gray hover:text-court-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} /> Precedente
              </button>
              <span className="text-sm text-court-muted font-display uppercase">Pagina {page + 1}</span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 text-sm font-display uppercase text-court-gray hover:text-court-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Successiva <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Usage dialog */}
      {usageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card p-6 max-w-md w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-display uppercase text-sm tracking-wide text-court-white">Immagine in uso</h3>
              <button onClick={() => setUsageDialog(null)} className="text-court-muted hover:text-court-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-court-muted mb-3 truncate">{usageDialog.name}</p>
            <p className="text-sm text-court-gray mb-3">Questa immagine è utilizzata in:</p>
            <ul className="space-y-1 mb-5">
              {usageDialog.refs.map((ref, i) => (
                <li key={i} className="text-sm text-brand-orange font-display">— {ref}</li>
              ))}
            </ul>
            <p className="text-xs text-court-muted mb-4">Rimuovi prima i riferimenti per poter eliminare questa immagine.</p>
            <button onClick={() => setUsageDialog(null)} className="btn-ghost text-sm w-full">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
