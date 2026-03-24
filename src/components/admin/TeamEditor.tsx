'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TeamWithPlayers, TeamCategory, TeamStatus, Edition, Player } from '@/types'
import { Save, Trash2, Plus } from 'lucide-react'

interface Props {
  team: TeamWithPlayers | null
  editionId: string
  editions: Pick<Edition, 'id' | 'year' | 'title'>[]
}

interface PlayerRow {
  id: string
  name: string
  birth_date: string
  codice_fiscale: string
  instagram: string
  club: string
  is_captain: boolean
  isNew: boolean // track whether this needs an insert vs update
}

const CATEGORY_OPTIONS: { value: TeamCategory; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'u14', label: 'Under 14' },
  { value: 'u16', label: 'Under 16' },
  { value: 'u18', label: 'Under 18' },
]

const STATUS_OPTIONS: { value: TeamStatus; label: string }[] = [
  { value: 'pending', label: 'In attesa' },
  { value: 'approved', label: 'Approvata' },
  { value: 'rejected', label: 'Rifiutata' },
  { value: 'waitlisted', label: 'Lista d\'attesa' },
]

function playerToRow(p: Player): PlayerRow {
  return {
    id: p.id,
    name: p.name,
    birth_date: p.birth_date,
    codice_fiscale: p.codice_fiscale,
    instagram: p.instagram ?? '',
    club: p.club ?? '',
    is_captain: p.is_captain,
    isNew: false,
  }
}

function emptyPlayer(): PlayerRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    birth_date: '',
    codice_fiscale: '',
    instagram: '',
    club: '',
    is_captain: false,
    isNew: true,
  }
}

export default function TeamEditor({ team, editionId, editions }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    edition_id:     team?.edition_id     ?? editionId,
    name:           team?.name           ?? '',
    category:       team?.category       ?? 'open' as TeamCategory,
    captain_email:  team?.captain_email  ?? '',
    captain_phone:  team?.captain_phone  ?? '',
    schedule_notes: team?.schedule_notes ?? '',
    notes:          team?.notes          ?? '',
    status:         team?.status         ?? 'pending' as TeamStatus,
  })

  const initialPlayers = team?.players
    ? [...team.players].sort((a, b) => a.sort_order - b.sort_order).map(playerToRow)
    : []
  const [players, setPlayers] = useState<PlayerRow[]>(initialPlayers)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updatePlayer(id: string, field: keyof PlayerRow, value: string | boolean) {
    setPlayers(prev => prev.map(p => {
      if (p.id === id) return { ...p, [field]: value }
      if (field === 'is_captain' && value === true) return { ...p, is_captain: false }
      return p
    }))
  }

  function addPlayer() {
    if (players.length >= 4) return
    setPlayers(prev => [...prev, emptyPlayer()])
  }

  function removePlayer(id: string) {
    setPlayers(prev => {
      const next = prev.filter(p => p.id !== id)
      if (next.length > 0 && !next.some(p => p.is_captain)) {
        next[0].is_captain = true
      }
      return next
    })
  }

  async function save() {
    if (!form.name.trim()) { setMsg('Il nome della squadra è obbligatorio.'); return }
    if (!form.captain_email.trim()) { setMsg('L\'email del capitano è obbligatoria.'); return }

    setSaving(true)
    setMsg(null)

    const teamPayload = {
      edition_id:     form.edition_id,
      name:           form.name.trim(),
      category:       form.category,
      captain_email:  form.captain_email.trim(),
      captain_phone:  form.captain_phone.trim() || null,
      schedule_notes: form.schedule_notes.trim() || null,
      notes:          form.notes.trim() || null,
      status:         form.status,
    }

    let teamId = team?.id
    let error

    if (team) {
      ;({ error } = await supabase.from('teams').update(teamPayload).eq('id', team.id))
    } else {
      const { data, error: insertError } = await supabase
        .from('teams')
        .insert(teamPayload)
        .select('id')
        .single()
      error = insertError
      teamId = data?.id
    }

    if (error) { setSaving(false); setMsg('Errore: ' + error.message); return }

    // Handle players
    if (teamId) {
      const originalIds = (team?.players ?? []).map(p => p.id)
      const currentIds = players.filter(p => !p.isNew).map(p => p.id)
      const removedIds = originalIds.filter(id => !currentIds.includes(id))

      // Delete removed players
      if (removedIds.length > 0) {
        const { error: delErr } = await supabase.from('players').delete().in('id', removedIds)
        if (delErr) { setSaving(false); setMsg('Errore eliminazione giocatori: ' + delErr.message); return }
      }

      // Upsert existing + insert new players
      const playersPayload = players.map((p, i) => ({
        id: p.isNew ? undefined : p.id,
        team_id: teamId!,
        name: p.name.trim(),
        birth_date: p.birth_date || null,
        codice_fiscale: p.codice_fiscale.toUpperCase().trim(),
        instagram: p.instagram.trim() || null,
        club: p.club.trim() || null,
        is_captain: p.is_captain,
        sort_order: i,
      })).filter(p => p.name) // skip empty player rows

      if (playersPayload.length > 0) {
        // Split into updates and inserts
        const toUpdate = playersPayload.filter(p => p.id)
        const toInsert = playersPayload.map(p => {
          if (p.id) return null
          const { id: _, ...rest } = p
          return rest
        }).filter(Boolean)

        for (const p of toUpdate) {
          const { id, ...rest } = p
          const { error: uErr } = await supabase.from('players').update(rest).eq('id', id!)
          if (uErr) { setSaving(false); setMsg('Errore aggiornamento giocatore: ' + uErr.message); return }
        }

        if (toInsert.length > 0) {
          const { error: iErr } = await supabase.from('players').insert(toInsert)
          if (iErr) { setSaving(false); setMsg('Errore inserimento giocatori: ' + iErr.message); return }
        }
      }
    }

    setSaving(false)
    setMsg('Salvato!')
    router.push('/admin/teams?t=' + Date.now())
  }

  async function deleteTeam() {
    if (!team || !confirm('Eliminare questa squadra? Verranno eliminati anche tutti i giocatori associati.')) return
    setDeleting(true)
    await supabase.from('teams').delete().eq('id', team.id)
    router.push('/admin/teams?t=' + Date.now())
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Edition selector (new teams only) */}
      {!team && editions.length > 1 && (
        <div>
          <label className="label">Edizione</label>
          <select className="input" value={form.edition_id} onChange={e => set('edition_id', e.target.value)}>
            {editions.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Team name + category */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nome squadra *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="es. Street Ballers" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Email capitano *</label>
          <input type="email" className="input" value={form.captain_email} onChange={e => set('captain_email', e.target.value)} placeholder="capitano@email.com" />
        </div>
        <div>
          <label className="label">Telefono capitano</label>
          <input type="tel" className="input" value={form.captain_phone} onChange={e => set('captain_phone', e.target.value)} placeholder="+39 333 0000000" />
        </div>
      </div>

      <div>
        <label className="label">Note orari</label>
        <input className="input" value={form.schedule_notes} onChange={e => set('schedule_notes', e.target.value)} placeholder="es. non disponibili sabato mattina" />
      </div>

      <div>
        <label className="label">Note interne</label>
        <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Visibile solo agli admin..." />
      </div>

      {/* Status (existing teams only) */}
      {team && (
        <div>
          <label className="label">Stato</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Players */}
      <div className="border-t border-court-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold uppercase text-court-white tracking-wide">Giocatori</h2>
          {players.length < 4 && (
            <button onClick={addPlayer} className="btn-ghost text-xs px-3 py-1.5">
              <Plus size={12} /> Aggiungi giocatore
            </button>
          )}
        </div>

        {players.length === 0 ? (
          <p className="text-court-muted text-sm">Nessun giocatore. Puoi aggiungerne fino a 4.</p>
        ) : (
          <div className="space-y-3">
            {players.map((player, idx) => (
              <div key={player.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display uppercase tracking-wide text-court-muted">
                    Giocatore {idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-court-gray cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={player.is_captain}
                        onChange={e => updatePlayer(player.id, 'is_captain', e.target.checked)}
                        className="accent-brand-orange"
                      />
                      Capitano
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayer(player.id)}
                      className="text-court-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Nome e cognome</label>
                    <input className="input py-2 text-sm" value={player.name} onChange={e => updatePlayer(player.id, 'name', e.target.value)} placeholder="Mario Rossi" />
                  </div>
                  <div>
                    <label className="label text-xs">Data di nascita</label>
                    <input type="date" className="input py-2 text-sm" value={player.birth_date} onChange={e => updatePlayer(player.id, 'birth_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Codice fiscale</label>
                    <input className="input py-2 text-sm font-mono uppercase" value={player.codice_fiscale} onChange={e => updatePlayer(player.id, 'codice_fiscale', e.target.value)} placeholder="RSSMRA85M01H501Z" maxLength={16} />
                  </div>
                  <div>
                    <label className="label text-xs">Instagram</label>
                    <input className="input py-2 text-sm" value={player.instagram} onChange={e => updatePlayer(player.id, 'instagram', e.target.value)} placeholder="@username" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Società</label>
                    <input className="input py-2 text-sm" value={player.club} onChange={e => updatePlayer(player.id, 'club', e.target.value)} placeholder="Pallacanestro Jesi, ..." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-court-border">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2 ml-auto">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {team && (
          <button
            onClick={deleteTeam}
            disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-display uppercase tracking-wide transition-colors"
          >
            <Trash2 size={14} /> Elimina
          </button>
        )}

        {msg && <p className={`text-sm ${msg.startsWith('Errore') ? 'text-red-400' : 'text-green-400'} animate-fade-in`}>{msg}</p>}
      </div>
    </div>
  )
}
