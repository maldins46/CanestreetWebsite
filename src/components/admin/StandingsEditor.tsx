'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Standing } from '@/types'
import { Save, Plus, Trash2 } from 'lucide-react'

interface Props {
  editionId: string
  standings: Standing[]
  approvedTeams: { id: string; name: string }[]
}

type Row = Omit<Standing, 'created_at' | 'updated_at'>

export default function StandingsEditor({ editionId, standings, approvedTeams }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(standings)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function addRow() {
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      edition_id: editionId,
      team_id: null,
      team_name: '',
      played: 0, won: 0, lost: 0, points_for: 0, points_against: 0, rank: prev.length + 1,
    }])
  }

  function update(id: string, field: keyof Row, value: string | number | null) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function remove(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  async function save() {
    setSaving(true)
    setMsg(null)

    // Upsert all rows
    const payload = rows.map((r, i) => ({ ...r, rank: i + 1, updated_at: new Date().toISOString() }))
    const { error } = await supabase.from('standings').upsert(payload)

    // Delete rows that were removed
    const removedIds = standings.map(s => s.id).filter(id => !rows.find(r => r.id === id))
    if (removedIds.length) await supabase.from('standings').delete().in('id', removedIds)

    setSaving(false)
    if (error) { setMsg('Errore: ' + error.message); return }
    setMsg('Salvato!')
    router.refresh()
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-court-border">
              {['#', 'Squadra', 'G', 'V', 'P', 'PF', 'PS', ''].map(h => (
                <th key={h} className="text-left py-2 px-3 font-display uppercase tracking-wider text-court-gray text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="border-b border-court-border/50">
                <td className="py-2 px-3 text-court-muted font-display text-xs">{i + 1}</td>
                <td className="py-2 px-3">
                  {approvedTeams.length > 0 ? (
                    <select
                      className="input py-1 text-sm"
                      value={row.team_id ?? ''}
                      onChange={e => {
                        const t = approvedTeams.find(t => t.id === e.target.value)
                        update(row.id, 'team_id', e.target.value || null)
                        if (t) update(row.id, 'team_name', t.name)
                      }}
                    >
                      <option value="">— Squadra —</option>
                      {approvedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input py-1 text-sm"
                      value={row.team_name}
                      placeholder="Nome squadra"
                      onChange={e => update(row.id, 'team_name', e.target.value)}
                    />
                  )}
                </td>
                {(['played', 'won', 'lost', 'points_for', 'points_against'] as const).map(f => (
                  <td key={f} className="py-2 px-3">
                    <input
                      type="number" min={0}
                      className="input py-1 text-sm w-16 text-center"
                      value={row[f]}
                      onChange={e => update(row.id, f, parseInt(e.target.value) || 0)}
                    />
                  </td>
                ))}
                <td className="py-2 px-3">
                  <button onClick={() => remove(row.id)} className="text-court-muted hover:text-red-400 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={addRow} className="btn-ghost text-sm px-4 py-2">
          <Plus size={14} /> Aggiungi squadra
        </button>
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6 py-2">
          <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva classifica'}
        </button>
        {msg && <p className="text-sm text-green-400 animate-fade-in">{msg}</p>}
      </div>
    </div>
  )
}
