'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MatchWithTeams, TeamCategory } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import clsx from 'clsx'

interface Props {
  editionId: string
  matches: MatchWithTeams[]
  category?: TeamCategory
  search?: string
}

const roundLabels: Record<string, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinale',
  final: 'Finale',
}

export default function TournamentCalendar({ editionId, matches, category, search }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})

  const q = search?.trim().toLowerCase() ?? ''

  const filtered = matches.filter(m => {
    if (category && m.category !== category) return false
    if (!q) return true
    const phase = getPhaseLabel(m).toLowerCase()
    return (
      m.team_home?.name.toLowerCase().includes(q) ||
      m.team_away?.name.toLowerCase().includes(q) ||
      m.group?.name.toLowerCase().includes(q) ||
      phase.includes(q)
    )
  })

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
    await supabase.from('matches').update({ score_home: scoreHome, score_away: scoreAway }).eq('id', match.id)
    router.refresh()
    setSaving(null)
  }

  async function cycleStatus(match: MatchWithTeams) {
    setSaving(match.id)
    if (match.status === 'scheduled') {
      // Clear any other live match first, then go live
      await supabase.from('matches')
        .update({ status: 'scheduled' })
        .eq('edition_id', editionId)
        .eq('status', 'in_progress')
      await supabase.from('matches').update({ status: 'in_progress' }).eq('id', match.id)
    } else if (match.status === 'in_progress') {
      // Mark completed + bracket advancement if scores exist
      await supabase.from('matches').update({ status: 'completed' }).eq('id', match.id)
      if (
        match.phase === 'bracket' &&
        match.next_match_id &&
        match.next_match_slot &&
        match.score_home != null &&
        match.score_away != null
      ) {
        const winnerId = match.score_home > match.score_away ? match.team_home_id : match.team_away_id
        const advanceField = match.next_match_slot === 'home' ? 'team_home_id' : 'team_away_id'
        await supabase.from('matches').update({ [advanceField]: winnerId }).eq('id', match.next_match_id)
      }
    } else {
      // completed → reset to scheduled
      await supabase.from('matches').update({ status: 'scheduled' }).eq('id', match.id)
    }
    router.refresh()
    setSaving(null)
  }

  function getPhaseLabel(match: MatchWithTeams) {
    if (match.phase === 'group' && match.group) return `Girone ${match.group.name}`
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
    <div className="card overflow-hidden">
      {filtered.map(match => {
        const isSaving = saving === match.id
        const homeVal = getScore(match.id, 'home', match.score_home)
        const awayVal = getScore(match.id, 'away', match.score_away)

        const actionLabel = match.status === 'scheduled' ? 'Avvia'
          : match.status === 'in_progress' ? 'Termina'
          : 'Resetta'

        return (
          <div
            key={match.id}
            className={clsx(
              'flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-3 border-b border-court-border last:border-b-0',
              match.status === 'in_progress' && 'bg-red-500/10',
              match.status === 'completed' && 'opacity-70',
            )}
          >
            {/* Row 1 (mobile) / left section (desktop): meta info */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <input
                type="datetime-local"
                defaultValue={toDatetimeLocal(match.scheduled_at)}
                onBlur={e => saveSchedule(match.id, e.target.value)}
                disabled={isSaving}
                className="input py-1 px-2 text-xs w-40"
              />
              <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded', CATEGORY_COLORS[match.category])}>
                {CATEGORY_LABELS[match.category]}
              </span>
              <span className="text-court-muted text-xs w-20 shrink-0">{getPhaseLabel(match)}</span>
            </div>

            {/* Row 2 (mobile) / center section (desktop): teams + scores */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-court-light text-sm font-medium flex-1 text-right truncate min-w-0">
                {match.team_home?.name ?? <span className="opacity-40 italic">TBD</span>}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={homeVal}
                  onChange={e => setScore(match.id, 'home', e.target.value.replace(/\D/g, ''))}
                  onBlur={() => saveScore(match)}
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
                  onBlur={() => saveScore(match)}
                  disabled={isSaving}
                  className="input py-1 px-1 w-12 text-center text-sm"
                  placeholder="–"
                />
              </div>
              <span className="text-court-light text-sm font-medium flex-1 truncate min-w-0">
                {match.team_away?.name ?? <span className="opacity-40 italic">TBD</span>}
              </span>
            </div>

            {/* Row 3 (mobile) / right section (desktop): action button + status badge */}
            <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
              <button
                onClick={() => cycleStatus(match)}
                disabled={isSaving}
                className="btn-ghost py-1 px-3 text-xs w-20 justify-center"
              >
                {isSaving ? '…' : actionLabel}
              </button>
              {match.status === 'scheduled' && (
                <span className="w-24 text-center text-xs px-2 py-0.5 font-display uppercase tracking-wide border border-court-border text-court-muted">
                  Da giocare
                </span>
              )}
              {match.status === 'in_progress' && (
                <span className="w-24 text-center text-xs px-2 py-0.5 font-display uppercase tracking-wide border border-red-500/40 bg-red-500/10 text-red-400 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block shrink-0" />
                  Live
                </span>
              )}
              {match.status === 'completed' && (
                <span className="w-24 text-center text-xs px-2 py-0.5 font-display uppercase tracking-wide border border-green-500/40 bg-green-500/10 text-green-400">
                  Terminata
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
