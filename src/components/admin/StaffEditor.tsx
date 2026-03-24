'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { StaffMember } from '@/types'
import { Save, Trash2 } from 'lucide-react'
import MediaPickerInput from './MediaPickerInput'

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
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg,      setMsg]      = useState<string | null>(null)

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
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
    router.push('/admin/staff?t=' + Date.now())
  }

  async function deleteMember() {
    if (!member || !confirm(`Eliminare ${member.name} dallo staff?`)) return
    setDeleting(true)
    await supabase.from('staff').delete().eq('id', member.id)
    router.push('/admin/staff?t=' + Date.now())
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

      <MediaPickerInput
        label="URL Foto"
        value={form.photo_url}
        onChange={url => set('photo_url', url)}
        preview="portrait"
      />

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
