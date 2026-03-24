'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import type { Sponsor, SponsorTier } from '@/types'
import { Save, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

interface Props { sponsor: Sponsor | null }

const TIER_OPTIONS: { value: SponsorTier; label: string }[] = [
  { value: 'main',   label: 'Main' },
  { value: 'gold',   label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]

export default function SponsorEditor({ sponsor }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    name:        sponsor?.name        ?? '',
    tier:        sponsor?.tier        ?? 'bronze' as SponsorTier,
    logo_url:    sponsor?.logo_url    ?? '',
    website_url: sponsor?.website_url ?? '',
    description: sponsor?.description ?? '',
    sort_order:  sponsor?.sort_order  ?? 0,
    is_active:   sponsor?.is_active   ?? true,
  })
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [msg,        setMsg]        = useState<string | null>(null)
  const [mediaOpen,  setMediaOpen]  = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string }[]>([])

  function set(field: string, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

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

  async function save() {
    setSaving(true)
    setMsg(null)
    const payload = {
      ...form,
      logo_url:    form.logo_url.trim()    || null,
      website_url: form.website_url.trim() || null,
      description: form.description.trim() || null,
    }
    let error
    if (sponsor) {
      ({ error } = await supabase.from('sponsors').update(payload).eq('id', sponsor.id))
    } else {
      ({ error } = await supabase.from('sponsors').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('Errore: ' + error.message); return }
    router.push('/admin/sponsors?t=' + Date.now())
  }

  async function deleteSponsor() {
    if (!sponsor || !confirm(`Eliminare lo sponsor "${sponsor.name}"?`)) return
    setDeleting(true)
    await supabase.from('sponsors').delete().eq('id', sponsor.id)
    router.push('/admin/sponsors?t=' + Date.now())
  }

  return (
    <div className="max-w-2xl space-y-6">

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Nome dello sponsor" />
        </div>
        <div>
          <label className="label">Tier *</label>
          <select
            className="input"
            value={form.tier}
            onChange={e => set('tier', e.target.value as SponsorTier)}
          >
            {TIER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Descrizione</label>
        <textarea className="input resize-none" rows={3} value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Breve descrizione dello sponsor..." />
      </div>

      <div>
        <label className="label">Sito Web</label>
        <input className="input" value={form.website_url}
          onChange={e => set('website_url', e.target.value)}
          placeholder="https://www.example.com" />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label">Ordine di visualizzazione</label>
          <input className="input" type="number" min={0} value={form.sort_order}
            onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
          <p className="text-court-muted text-xs mt-1">Numeri più bassi appaiono per primi.</p>
        </div>
        <div>
          <label className="label">Stato</label>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className={`w-full input flex items-center gap-2 cursor-pointer ${
              form.is_active ? 'text-green-400' : 'text-court-muted'
            }`}
          >
            {form.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
            {form.is_active ? 'Attivo — visibile sul sito' : 'Inattivo — nascosto sul sito'}
          </button>
        </div>
      </div>

      {/* Logo URL + media picker */}
      <div>
        <label className="label">URL Logo</label>
        <div className="flex gap-2">
          <input
            className="input"
            value={form.logo_url}
            onChange={e => set('logo_url', e.target.value)}
            placeholder="https://..."
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

        {/* Inline media picker */}
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
                    onClick={() => { set('logo_url', f.url); setMediaOpen(false) }}
                    className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                      form.logo_url === f.url
                        ? 'border-brand-orange'
                        : 'border-court-border hover:border-court-muted'
                    }`}
                    title={f.name}
                  >
                    <Image src={f.url} alt={f.name} fill className="object-contain p-1" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live logo preview */}
        {form.logo_url && (
          <div className="mt-3 relative w-32 h-20 overflow-hidden border border-court-border bg-court-dark">
            <Image src={form.logo_url} alt="Anteprima logo" fill className="object-contain p-2" sizes="128px" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-court-border">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {sponsor && (
          <button
            onClick={deleteSponsor}
            disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-display uppercase tracking-wide transition-colors"
          >
            <Trash2 size={14} /> Elimina
          </button>
        )}

        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </div>

    </div>
  )
}
