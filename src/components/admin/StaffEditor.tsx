'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import type { StaffMember } from '@/types'
import { Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { member: StaffMember | null }

export default function StaffEditor({ member }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    name:       member?.name       ?? '',
    title:      member?.title      ?? '',
    bio:        member?.bio        ?? '',
    photo_url:  member?.photo_url  ?? '',
    sort_order: member?.sort_order ?? 0,
  })
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [msg,       setMsg]       = useState<string | null>(null)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string }[]>([])

  function set(field: string, value: string | number) {
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
      photo_url: form.photo_url.trim() || null,
    }
    let error
    if (member) {
      ({ error } = await supabase.from('staff').update(payload).eq('id', member.id))
    } else {
      ({ error } = await supabase.from('staff').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('Errore: ' + error.message); return }
    router.push('/admin/staff')
  }

  async function deleteMember() {
    if (!member || !confirm(`Eliminare ${member.name} dallo staff?`)) return
    setDeleting(true)
    await supabase.from('staff').delete().eq('id', member.id)
    router.push('/admin/staff')
  }

  return (
    <div className="max-w-2xl space-y-6">

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Michele Mosca" />
        </div>
        <div>
          <label className="label">Titolo / Nickname *</label>
          <input className="input" value={form.title}
            onChange={e => set('title', e.target.value)} placeholder="Il CEO" />
        </div>
      </div>

      <div>
        <label className="label">Bio</label>
        <textarea className="input resize-none" rows={5} value={form.bio}
          onChange={e => set('bio', e.target.value)}
          placeholder="Descrizione del membro..." />
      </div>

      <div>
        <label className="label">Ordine di visualizzazione</label>
        <input className="input" type="number" min={0} value={form.sort_order}
          onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
        <p className="text-court-muted text-xs mt-1">I numeri più bassi appaiono per primi.</p>
      </div>

      {/* Photo URL + media picker */}
      <div>
        <label className="label">URL Foto</label>
        <div className="flex gap-2">
          <input
            className="input"
            value={form.photo_url}
            onChange={e => set('photo_url', e.target.value)}
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
                    onClick={() => { set('photo_url', f.url); setMediaOpen(false) }}
                    className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                      form.photo_url === f.url
                        ? 'border-brand-orange'
                        : 'border-court-border hover:border-court-muted'
                    }`}
                    title={f.name}
                  >
                    <Image src={f.url} alt={f.name} fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live portrait preview */}
        {form.photo_url && (
          <div className="mt-3 relative w-20 h-[107px] overflow-hidden border border-court-border bg-court-dark">
            <Image src={form.photo_url} alt="Anteprima" fill className="object-cover object-top" sizes="80px" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-court-border">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {member && (
          <button
            onClick={deleteMember}
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
