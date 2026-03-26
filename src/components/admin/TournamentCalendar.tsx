'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MatchWithTeams, TeamCategory } from '@/types'
import clsx from 'clsx'

interface Props {
  editionId: string
  matches: MatchWithTeams[]
  category?: TeamCategory
}

const categoryColors: Record<string, string> = {
  open: 'bg-brand-orange text-court-dark',
  u18: 'bg-blue-500 text-white',
  u16: 'bg-purple-500 text-white',
  u14: 'bg-green-600 text-white',
}

const roundLabels: Record<string, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinale',
  final: 'Finale',
}

export default function TournamentCalendar({ editionId, matches, category }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null) // match id being saved
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})

  const filtered = category
    ? matches.filter(m => m.category === category)
    : matches

  function getScore(matchId: string, side: 'home' | 'away', fallback: number | null) {
    return scores[matchId]?.[side] ?? (fallback != null ? String(fallback) : '')
  }

  function setScore(matchId: string, side: 'home' | 'away', value: string) {
    setScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  async function saveSchedule(matchId: string, scheduledAt: string) {
    setSaving(matchId)
    await supabase.from('matches').update({ scheduled_at: scheduledAt || null }).eq('id', matchId)
    router.refresh()
    setSaving(null)
  }

  async function saveScore(match: MatchWithTeams) {
    const homeStr = scores[match.id]?.home ?? String(match.score_home ?? '')
    const awayStr = scores[match.id]?.away ?? String(match.score_away ?? '')
    const scoreHome = homeStr !== '' ? parseInt(homeStr, 10) : null
    const scoreAway = awayStr !== '' ? parseInt(awayStr, 10) : null

    setSaving(match.id)
    const updates: Record<string, unknown> = { score_home: scoreHome, score_away: scoreAway }

    if (scoreHome != null && scoreAway != null) {
      updates.status = 'completed'
      // Bracket advancement
      if (match.phase === 'bracket' && match.next_match_id && match.next_match_slot) {
        const winnerId = scoreHome > scoreAway ? match.team_home_id : match.team_away_id
        const advanceField = match.next_match_slot === 'home' ? 'team_home_id' : 'team_away_id'
        await supabase.from('matches').update({ [advanceField]: winnerId }).eq('id', match.next_match_id)
      }
    }

    await supabase.from('matches').update(updates).eq('id', match.id)
    router.refresh()
    setSaving(null)
  }

  async function setLive(matchId: string) {
    setSaving(matchId)
    // Clear any existing live match first
    await supabase.from('matches')
      .update({ status: 'scheduled' })
      .eq('edition_id', editionId)
      .eq('status', 'in_progress')
    // Set this match as live
    await supabase.from('matches').update({ status: 'in_progress' }).eq('id', matchId)
    router.refresh()
    setSaving(null)
  }

  async function stopLive(matchId: string) {
    setSaving(matchId)
    await supabase.from('matches').update({ status: 'scheduled' }).eq('id', matchId)
    router.refresh()
    setSaving(null)
  }

  function getPhaseLabel(match: MatchWithTeams) {
    if (match.phase === 'group' && match.group) return `Gir. ${match.group.name}`
    if (match.phase === 'bracket' && match.bracket_round) return roundLabels[match.bracket_round] ?? match.bracket_round
    return ''
  }

  function toDatetimeLocal(iso: string | null) {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 16)
  }

  if (filtered.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray">Nessuna partita ancora. Genera le partite dai gironi prima.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map(match => {
        const isSaving = saving === match.id
        const homeVal = getScore(match.id, 'home', match.score_home)
        const awayVal = getScore(match.id, 'away', match.score_away)

        return (
          <div
            key={match.id}
            className={clsx(
              'card p-3 flex flex-wrap items-center gap-3',
              match.status === 'in_progress' && 'border-l-4 border-red-500 bg-red-500/5',
              match.status === 'completed' && 'border-l-4 border-green-500/50 opacity-80',
            )}
          >
            {/* Time */}
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocal(match.scheduled_at)}
              onBlur={e => saveSchedule(match.id, e.target.value)}
              disabled={isSaving}
              className="input py-1 px-2 text-xs w-40"
            />

            {/* Category badge */}
            <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded', categoryColors[match.category])}>
              {match.category}
            </span>

            {/* Phase label */}
            <span className="text-court-muted text-xs w-20 shrink-0">{getPhaseLabel(match)}</span>

            {/* Home team */}
            <span className="text-court-light text-sm font-medium flex-1 text-right min-w-[80px]">
              {match.team_home?.name ?? <span className="opacity-40 italic">TBD</span>}
            </span>

            {/* Scores */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={homeVal}
                onChange={e => setScore(match.id, 'home', e.target.value.replace(/\D/g, ''))}
                disabled={isSaving}
                className="input py-1 px-1 w-12 text-center text-sm"
                placeholder="–"
              />
              <span className="text-court-muted">-</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={awayVal}
                onChange={e => setScore(match.id, 'away', e.target.value.replace(/\D/g, ''))}
                disabled={isSaving}
                className="input py-1 px-1 w-12 text-center text-sm"
                placeholder="–"
              />
              <button
                onClick={() => saveScore(match)}
                disabled={isSaving || (homeVal === '' && awayVal === '')}
                className="btn-ghost py-1 px-2 text-xs ml-1"
              >
                {isSaving ? '…' : 'Salva'}
              </button>
            </div>

            {/* Away team */}
            <span className="text-court-light text-sm font-medium flex-1 min-w-[80px]">
              {match.team_away?.name ?? <span className="opacity-40 italic">TBD</span>}
            </span>

            {/* Status / Live toggle */}
            <div className="shrink-0">
              {match.status === 'in_progress' ? (
                <button
                  onClick={() => stopLive(match.id)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-display uppercase tracking-wide px-3 py-1 rounded"
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </button>
              ) : match.status === 'scheduled' ? (
                <button
                  onClick={() => setLive(match.id)}
                  disabled={isSaving}
                  className="btn-ghost py-1 px-3 text-xs"
                >
                  Avvia
                </button>
              ) : (
                <span className="text-green-500 text-xs font-display uppercase">✓ Finita</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
