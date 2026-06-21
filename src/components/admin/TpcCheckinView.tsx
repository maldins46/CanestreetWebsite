'use client'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import type { TpcCategory, TpcContestFull } from '@/types'

interface Props {
  contest: TpcContestFull | null
  editionId: string
  category: TpcCategory
  search?: string
}

export default function TpcCheckinView({ contest, editionId, category, search = '' }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [paymentState, setPaymentState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((contest?.tpc_players ?? []).map(p => [p.id, p.checkin_payment]))
  )

  const players = contest?.tpc_players ?? []
  const filtered = useMemo(() =>
    players.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
  [players, search])

  const togglePayment = useCallback(async (playerId: string) => {
    const next = !paymentState[playerId]
    setPaymentState(prev => ({ ...prev, [playerId]: next }))
    const { error } = await supabase
      .from('tpc_players')
      .update({ checkin_payment: next })
      .eq('id', playerId)
    if (error) {
      setPaymentState(prev => ({ ...prev, [playerId]: !next }))
    }
  }, [paymentState, supabase])

  async function deletePlayer(playerId: string) {
    if (!window.confirm('Eliminare questo giocatore? Verrà rimosso da tutti i turni.')) return
    setSaving(true)
    await supabase.from('tpc_players').delete().eq('id', playerId)
    router.refresh()
    setSaving(false)
  }

  async function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    setSaving(true)

    let contestId = contest?.id ?? null
    if (!contestId) {
      const { data } = await supabase
        .from('tpc_contests')
        .insert({ edition_id: editionId, category })
        .select('id')
        .single()
      contestId = data?.id ?? null
    }

    if (contestId) {
      await supabase.from('tpc_players').insert({ contest_id: contestId, name })
    }

    setNewPlayerName('')
    router.refresh()
    setSaving(false)
  }

  return (
    <div>
      {/* Player list */}
      <div className="card overflow-hidden">
        {/* Add player */}
        <div className="flex gap-2 px-4 py-3 border-b border-court-border">
          <input
            className="input text-sm py-1.5 flex-1"
            placeholder="Nome giocatore"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
          />
          <button
            className="btn-primary text-sm px-4 py-1.5"
            onClick={addPlayer}
            disabled={saving || !newPlayerName.trim()}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {filtered.length > 0 && (
              <thead>
                <tr className="border-b border-court-border">
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap">Giocatore</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Pagamento</th>
                  <th className="w-px" />
                </tr>
              </thead>
            )}
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-court-muted text-sm">
                    {search ? 'Nessun giocatore trovato.' : 'Nessun giocatore aggiunto.'}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={clsx('border-b border-court-border last:border-b-0', paymentState[p.id] && 'opacity-60')}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-court-white text-sm">{p.name}</span>
                  </td>
                  <td className="px-3 py-2.5 w-px text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paymentState[p.id] ?? false}
                      onChange={() => togglePayment(p.id)}
                      className="accent-brand-orange w-3.5 h-3.5 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 w-px whitespace-nowrap">
                    <button
                      onClick={() => deletePlayer(p.id)}
                      disabled={saving}
                      className="text-court-muted hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Elimina"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
