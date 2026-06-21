'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamWithPlayers, TeamCategory } from '@/types'
import clsx from 'clsx'

const categoryLabel: Record<TeamCategory, string> = {
  open_m: 'Open Maschile', open_f: 'Open Femminile',
  u14_m: 'U14 Maschile', u16_m: 'U16 Maschile', u18_m: 'U18 Maschile',
}

type CheckinField = 'checkin_payment' | 'checkin_kit' | 'checkin_buono_pasto'
type PlayerCheckin = { checkin_payment: boolean; checkin_kit: boolean; checkin_buono_pasto: boolean }
type CheckinState = Record<string, PlayerCheckin>

const FIELDS: CheckinField[] = ['checkin_payment', 'checkin_kit', 'checkin_buono_pasto']

const checkboxes: { field: CheckinField; label: string }[] = [
  { field: 'checkin_payment',     label: 'Pagamento' },
  { field: 'checkin_kit',         label: 'Kit' },
  { field: 'checkin_buono_pasto', label: 'Buono pasto' },
]

function isFullyChecked(s: PlayerCheckin) {
  return s.checkin_payment && s.checkin_kit && s.checkin_buono_pasto
}

function IndeterminateCheckbox({ checked, indeterminate, onChange, className }: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={clsx('accent-brand-orange cursor-pointer', className)}
    />
  )
}

interface Props {
  teams: TeamWithPlayers[]
  search?: string
  unpaidOnly?: boolean
}

export default function CheckinView({ teams, search, unpaidOnly = false }: Props) {
  const supabase = createClient()

  const [checkinState, setCheckinState] = useState<CheckinState>(() => {
    const map: CheckinState = {}
    for (const team of teams) {
      for (const p of team.players) {
        map[p.id] = {
          checkin_payment:     p.checkin_payment,
          checkin_kit:         p.checkin_kit,
          checkin_buono_pasto: p.checkin_buono_pasto,
        }
      }
    }
    return map
  })

  const patch = useCallback(async (updates: Record<string, Partial<PlayerCheckin>>) => {
    setCheckinState(prev => {
      const next = { ...prev }
      for (const [id, fields] of Object.entries(updates)) {
        next[id] = { ...prev[id], ...fields }
      }
      return next
    })
    // Fire individual updates (players table has no bulk endpoint)
    const results = await Promise.all(
      Object.entries(updates).map(([id, fields]) =>
        supabase.from('players').update(fields).eq('id', id).then(r => ({ id, fields, error: r.error }))
      )
    )
    // Revert failed ones
    const failed = results.filter(r => r.error)
    if (failed.length > 0) {
      setCheckinState(prev => {
        const next = { ...prev }
        for (const { id, fields } of failed) {
          const revert: Partial<PlayerCheckin> = {}
          for (const key of Object.keys(fields) as CheckinField[]) {
            revert[key] = !fields[key] as boolean
          }
          next[id] = { ...prev[id], ...revert }
        }
        return next
      })
    }
  }, [supabase])

  // Toggle a single field on a single player
  const toggleField = useCallback((playerId: string, field: CheckinField) => {
    const next = !checkinState[playerId][field]
    patch({ [playerId]: { [field]: next } })
  }, [checkinState, patch])

  // Toggle all fields on a single player
  const togglePlayer = useCallback((playerId: string) => {
    const all = isFullyChecked(checkinState[playerId])
    const fields = Object.fromEntries(FIELDS.map(f => [f, !all])) as PlayerCheckin
    patch({ [playerId]: fields })
  }, [checkinState, patch])

  // Toggle all fields on all players in a team
  const toggleTeam = useCallback((playerIds: string[]) => {
    const allDone = playerIds.every(id => isFullyChecked(checkinState[id]))
    const updates: Record<string, PlayerCheckin> = {}
    for (const id of playerIds) {
      updates[id] = Object.fromEntries(FIELDS.map(f => [f, !allDone])) as PlayerCheckin
    }
    patch(updates)
  }, [checkinState, patch])

  const q = search?.trim().toLowerCase() ?? ''

  const filtered = useMemo(() => teams
    .map(team => {
      let players = team.players

      if (unpaidOnly) {
        players = players.filter(p => !checkinState[p.id]?.checkin_payment)
      }

      if (q) {
        const teamMatch = team.name.toLowerCase().includes(q)
        const matchedPlayers = players.filter(p => p.name.toLowerCase().includes(q))
        if (!teamMatch && matchedPlayers.length === 0) return null
        players = teamMatch ? players : matchedPlayers
      }

      if (players.length === 0) return null
      return { ...team, players }
    })
    .filter((t): t is TeamWithPlayers => t !== null),
  [teams, q, unpaidOnly, checkinState])

  if (filtered.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray">Nessuna squadra approvata trovata.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map(team => {
        const sorted = [...team.players].sort((a, b) => a.sort_order - b.sort_order)
        const playerIds = sorted.map(p => p.id)
        const checkedIn = playerIds.filter(id => isFullyChecked(checkinState[id] ?? { checkin_payment: false, checkin_kit: false, checkin_buono_pasto: false })).length
        const teamAllDone = checkedIn === playerIds.length
        const teamIndeterminate = checkedIn > 0 && checkedIn < playerIds.length

        return (
          <div key={team.id} className="card overflow-hidden">
            {/* Team header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-4 py-3 border-b border-court-border">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <IndeterminateCheckbox
                  checked={teamAllDone}
                  indeterminate={teamIndeterminate}
                  onChange={() => toggleTeam(playerIds)}
                  className="w-4 h-4 shrink-0"
                />
                <h2 className="font-display font-bold uppercase text-base text-court-white min-w-0 truncate">
                  {team.name}
                </h2>
              </div>
              <div className="flex items-center gap-3 sm:ml-auto shrink-0">
                <span className="text-xs px-2 py-0.5 font-display uppercase tracking-wide border border-court-border text-court-muted">
                  {categoryLabel[team.category]}
                </span>
                <span className="text-xs font-mono text-court-muted">
                  {checkedIn}/{sorted.length}
                </span>
              </div>
            </div>

            {/* Player rows */}
            <div>
              {sorted.map(p => {
                const state = checkinState[p.id] ?? { checkin_payment: false, checkin_kit: false, checkin_buono_pasto: false }
                const allDone = isFullyChecked(state)
                const someChecked = !allDone && (state.checkin_payment || state.checkin_kit || state.checkin_buono_pasto)
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      'flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-4 py-2.5 border-b border-court-border last:border-b-0',
                      allDone && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Per-player shortcut */}
                      <IndeterminateCheckbox
                        checked={allDone}
                        indeterminate={someChecked}
                        onChange={() => togglePlayer(p.id)}
                        className="w-3.5 h-3.5 shrink-0"
                      />
                      <span className="min-w-0 text-sm text-court-light truncate">
                        {p.name}
                        {p.is_captain && <span className="ml-1.5 text-brand-orange text-[10px] font-display uppercase">cap</span>}
                        {p.is_vice_captain && <span className="ml-1.5 text-court-gray text-[10px] font-display uppercase">vice</span>}
                      </span>
                    </div>
                    <div className="flex gap-4 shrink-0 sm:ml-auto">
                      {checkboxes.map(({ field, label }) => (
                        <label key={field} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={state[field]}
                            onChange={() => toggleField(p.id, field)}
                            className="accent-brand-orange w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs text-court-muted font-display uppercase tracking-wide">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
