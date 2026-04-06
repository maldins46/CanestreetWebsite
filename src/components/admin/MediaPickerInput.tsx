'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ChevronDown, ChevronUp } from 'lucide-react'

type PreviewVariant = 'landscape' | 'portrait' | 'cover'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
  preview?: PreviewVariant
  inputClassName?: string
}

const PREVIEW_CONTAINER: Record<PreviewVariant, string> = {
  landscape: 'w-32 h-20',
  portrait:  'w-20 h-[107px]',
  cover:     'w-full h-48',
}

const PREVIEW_IMG: Record<PreviewVariant, string> = {
  landscape: 'object-contain p-2',
  portrait:  'object-cover object-top',
  cover:     'object-cover',
}

const PREVIEW_BG: Record<PreviewVariant, string> = {
  landscape: 'bg-white',
  portrait:  'bg-court-dark',
  cover:     'bg-court-dark',
}

export default function MediaPickerInput({
  label,
  value,
  onChange,
  placeholder = 'https://...',
  preview = 'landscape',
  inputClassName,
}: Props) {
  const supabase = createClient()
  const [mediaOpen,  setMediaOpen]  = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string }[]>([])

  async function loadMedia() {
    if (mediaFiles.length > 0) return
    const { data } = await supabase.storage.from('media').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (!data) return
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`
    setMediaFiles(
      data
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({ name: f.name, url: base + f.name }))
    )
  }

  function toggleMedia() {
    if (!mediaOpen) loadMedia()
    setMediaOpen(v => !v)
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input
          className={`input ${inputClassName ?? ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={toggleMedia}
          className="btn-ghost text-sm px-4 py-3 shrink-0 flex items-center gap-1.5 whitespace-nowrap"
        >
          {mediaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Media
        </button>
      </div>

      {mediaOpen && (
        <div className="mt-3 card p-3 max-h-64 overflow-y-auto">
          {mediaFiles.length === 0 ? (
            <p className="text-court-muted text-sm text-center py-4">Caricamento...</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {mediaFiles.map(f => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => { onChange(f.url); setMediaOpen(false) }}
                  className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                    value === f.url
                      ? 'border-brand-orange'
                      : 'border-court-border hover:border-court-muted'
                  }`}
                  title={f.name}
                >
                  <Image src={f.url} alt={f.name} fill className="object-contain p-1" sizes="80px" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value && (
        <div className={`mt-3 relative ${PREVIEW_CONTAINER[preview]} overflow-hidden border border-court-border ${PREVIEW_BG[preview]}`}>
          <Image src={value} alt="Anteprima" fill className={PREVIEW_IMG[preview]} sizes="512px" unoptimized />
        </div>
      )}
    </div>
  )
}
