'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CalendarioEvent } from '@/types'
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react'

interface Props {
  editionId: string
  events: CalendarioEvent[]
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16).replace(' ', 'T')
}

function fromRomeLocal(localStr: string): string | null {
  if (!localStr) return null
  const asIfUtc = new Date(localStr + ':00Z')
  const romeEquiv = asIfUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16)
  const offsetMs = new Date(romeEquiv + ':00Z').getTime() - asIfUtc.getTime()
  return new Date(asIfUtc.getTime() - offsetMs).toISOString()
}

function formatDisplay(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome',
  })
}

export default function TournamentEvents({ editionId, events }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addDate, setAddDate] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function addEvent() {
    if (!addName.trim()) return
    setSaving(true)
    await supabase.from('events').insert({
      edition_id: editionId,
      name: addName.trim(),
      scheduled_at: fromRomeLocal(addDate),
      description: addDesc.trim() || null,
    })
    setAddName('')
    setAddDate('')
    setAddDesc('')
    setAddModalOpen(false)
    setSaving(false)
    router.refresh()
  }

  function startEdit(event: CalendarioEvent) {
    setEditingId(event.id)
    setEditName(event.name)
    setEditDate(toDatetimeLocal(event.scheduled_at))
    setEditDesc(event.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    setSavingId(id)
    await supabase.from('events').update({
      name: editName.trim() || undefined,
      scheduled_at: fromRomeLocal(editDate),
      description: editDesc.trim() || null,
    }).eq('id', id)
    setEditingId(null)
    setSavingId(null)
    router.refresh()
  }

  async function deleteEvent(id: string) {
    setDeletingId(id)
    await supabase.from('events').delete().eq('id', id)
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div>
      {/* Action box */}
      <div className="card flex items-center gap-3 mb-6 flex-wrap px-4 py-3">
        <p className="text-court-muted text-sm">
          {events.length} {events.length === 1 ? 'evento' : 'eventi'}
        </p>
        <div className="ml-auto">
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            Aggiungi evento
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessun evento. Aggiungine uno con il pulsante qui sopra.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-court-border">
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-4 py-2">Nome</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-4 py-2 whitespace-nowrap w-40">Data</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-4 py-2">Descrizione</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted px-4 py-2 w-px whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => {
                  const isEditing = editingId === event.id
                  return (
                    <tr key={event.id} className="border-b border-court-border last:border-b-0">
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="input py-1 px-2 text-sm w-full"
                            autoFocus
                          />
                        ) : (
                          <span className="text-court-white">{event.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="input py-1 px-2 text-sm w-full"
                          />
                        ) : (
                          <span className="text-court-muted text-xs">{formatDisplay(event.scheduled_at)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            rows={2}
                            placeholder="Descrizione opzionale…"
                            className="input py-1 px-2 text-sm w-full resize-none"
                          />
                        ) : (
                          <span className="text-court-muted text-xs line-clamp-2">
                            {event.description || <span className="italic opacity-50">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(event.id)}
                                disabled={savingId === event.id || !editName.trim()}
                                className="text-green-400 hover:text-green-300 transition-colors p-1"
                                title="Salva"
                              >
                                {savingId === event.id ? '…' : <Check size={14} />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-court-muted hover:text-court-white transition-colors p-1"
                                title="Annulla"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(event)}
                                className="text-court-muted hover:text-court-white transition-colors p-1"
                                title="Modifica"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => deleteEvent(event.id)}
                                disabled={deletingId === event.id}
                                className="text-court-muted hover:text-red-400 transition-colors p-1"
                                title="Elimina"
                              >
                                {deletingId === event.id ? '…' : <Trash2 size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="card w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-4">
              Aggiungi evento
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Nome evento"
                  className="input py-2 px-3 text-sm w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Data e ora</label>
                <input
                  type="datetime-local"
                  value={addDate}
                  onChange={e => setAddDate(e.target.value)}
                  className="input py-2 px-3 text-sm w-full"
                />
              </div>
              <div>
                <label className="label">Descrizione</label>
                <textarea
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  rows={3}
                  placeholder="Descrizione opzionale…"
                  className="input py-2 px-3 text-sm w-full resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setAddModalOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button
                onClick={addEvent}
                disabled={saving || !addName.trim()}
                className="btn-primary text-sm px-4 py-2"
              >
                {saving ? '…' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
