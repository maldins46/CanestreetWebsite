'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Upload, Copy, Check } from 'lucide-react'

interface MediaFile { name: string; url: string }

export default function MediaManager() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadFiles() {
    const { data } = await supabase.storage.from('media').list('', { sortBy: { column: 'created_at', order: 'desc' } })
    if (!data) return
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
    setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({ name: f.name, url: base + f.name })))
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file)
    setUploading(false)
    if (!error) loadFiles()
    if (inputRef.current) inputRef.current.value = ''
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      {/* Upload */}
      <div
        className="card p-8 border-dashed text-center cursor-pointer hover:border-court-muted transition-colors mb-8"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto text-court-muted mb-3" />
        <p className="font-display uppercase text-sm text-court-gray tracking-wide">
          {uploading ? 'Caricamento...' : 'Clicca per caricare un file'}
        </p>
        <p className="text-court-muted text-xs mt-1">JPG, PNG, WebP, GIF — max 5MB</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* Gallery */}
      {loading ? (
        <p className="text-court-gray text-sm">Caricamento...</p>
      ) : !files.length ? (
        <p className="text-court-gray text-sm">Nessun file caricato ancora.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map(f => (
            <div key={f.name} className="group relative card overflow-hidden">
              <div className="relative aspect-square">
                <Image src={f.url} alt={f.name} fill className="object-cover" />
              </div>
              <button
                onClick={() => copyUrl(f.url)}
                className="absolute inset-0 flex items-center justify-center bg-court-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === f.url
                  ? <><Check size={16} className="text-green-400 mr-1" /><span className="text-xs text-green-400 font-display uppercase">Copiato!</span></>
                  : <><Copy size={16} className="text-court-white mr-1" /><span className="text-xs text-court-white font-display uppercase">Copia URL</span></>
                }
              </button>
              <p className="text-xs text-court-muted p-2 truncate">{f.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
