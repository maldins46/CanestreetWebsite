'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeStandings } from '@/lib/standings'
import type { GroupWithTeams, MatchWithTeams, Match, BracketRound, TeamCategory, StandingsRow } from '@/types'
import clsx from 'clsx'
import { Trophy, ListOrdered } from 'lucide-react'

// ─── Layout constants (must match BracketView.tsx) ────────────────────────────

const CARD_W  = 192
const CARD_H  = 74
const SLOT    = 90
const COL_GAP = 48
const LINE_COLOR = '#3a3a3a'

function matchTop(r: number, i: number): number {
  const step = Math.pow(2, r)
  return i * step * SLOT + (step - 1) * SLOT / 2
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  editionId: string
  category: TeamCategory
  bracketMatches: MatchWithTeams[]
  groupMatches: Match[]
  groups: GroupWithTeams[]
  approvedTeams: { id: string; name: string; category: string }[]
}

const roundLabels: Record<BracketRound, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinali',
  final: 'Finale',
}

const roundOrder: BracketRound[] = ['round_of_16', 'quarterfinal', 'semifinal', 'final']

// ─── Admin bracket card ───────────────────────────────────────────────────────

interface AdminCardProps {
  match: MatchWithTeams
  categoryTeams: { id: string; name: string }[]
  editingSlot: { matchId: string; slot: 'home' | 'away' } | null
  setEditingSlot: (s: { matchId: string; slot: 'home' | 'away' } | null) => void
  onOverrideTeam: (matchId: string, slot: 'home' | 'away', teamId: string) => void
}

function AdminBracketCard({ match, categoryTeams, editingSlot, setEditingSlot, onOverrideTeam }: AdminCardProps) {
  const isDone  = match.status === 'completed'
  const hasScore = isDone && match.score_home != null && match.score_away != null
  const homeWon = hasScore && match.score_home! > match.score_away!
  const awayWon = hasScore && match.score_away! > match.score_home!

  return (
    <div className="card overflow-hidden text-sm">
      {/* Home row */}
      <div className={clsx('flex items-center justify-between px-3 py-2 border-b border-court-border', homeWon && 'bg-brand-orange/10')}>
        {editingSlot?.matchId === match.id && editingSlot.slot === 'home' ? (
          <select
            className="input py-0.5 px-1 text-xs flex-1 min-w-0"
            autoFocus
            onChange={e => onOverrideTeam(match.id, 'home', e.target.value)}
            onBlur={() => setEditingSlot(null)}
            defaultValue=""
          >
            <option value="">— Seleziona —</option>
            <option value="__clear__">— Rimuovi squadra —</option>
            {categoryTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <button
            className={clsx('truncate mr-2 flex-1 min-w-0 text-left hover:text-brand-orange transition-colors font-body', homeWon ? 'font-bold text-court-white' : 'text-court-muted')}
            onClick={() => setEditingSlot({ matchId: match.id, slot: 'home' })}
          >
            {match.team_home?.name ?? <span className="italic opacity-50 text-xs">TBD</span>}
          </button>
        )}
        {hasScore && (
          <span className={clsx('font-display font-bold shrink-0 tabular-nums', homeWon ? 'text-court-white' : 'text-court-muted')}>
            {match.score_home}
          </span>
        )}
      </div>

      {/* Away row */}
      <div className={clsx('flex items-center justify-between px-3 py-2', awayWon && 'bg-brand-orange/10')}>
        {editingSlot?.matchId === match.id && editingSlot.slot === 'away' ? (
          <select
            className="input py-0.5 px-1 text-xs flex-1 min-w-0"
            autoFocus
            onChange={e => onOverrideTeam(match.id, 'away', e.target.value)}
            onBlur={() => setEditingSlot(null)}
            defaultValue=""
          >
            <option value="">— Seleziona —</option>
            <option value="__clear__">— Rimuovi squadra —</option>
            {categoryTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <button
            className={clsx('truncate mr-2 flex-1 min-w-0 text-left hover:text-brand-orange transition-colors font-body', awayWon ? 'font-bold text-court-white' : 'text-court-muted')}
            onClick={() => setEditingSlot({ matchId: match.id, slot: 'away' })}
          >
            {match.team_away?.name ?? <span className="italic opacity-50 text-xs">TBD</span>}
          </button>
        )}
        {hasScore && (
          <span className={clsx('font-display font-bold shrink-0 tabular-nums', awayWon ? 'text-court-white' : 'text-court-muted')}>
            {match.score_away}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Desktop bracket (absolute positioning + SVG connectors) ──────────────────

interface DesktopBracketProps {
  rounds: BracketRound[]
  byRound: Map<BracketRound, MatchWithTeams[]>
  categoryTeams: { id: string; name: string }[]
  editingSlot: { matchId: string; slot: 'home' | 'away' } | null
  setEditingSlot: (s: { matchId: string; slot: 'home' | 'away' } | null) => void
  onOverrideTeam: (matchId: string, slot: 'home' | 'away', teamId: string) => void
}

function DesktopBracket({ rounds, byRound, categoryTeams, editingSlot, setEditingSlot, onOverrideTeam }: DesktopBracketProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvailableWidth(el.getBoundingClientRect().width))
    ro.observe(el)
    setAvailableWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const numRounds = rounds.length
  const firstRoundCount = Math.pow(2, numRounds - 1)

  const minW  = numRounds * CARD_W + (numRounds - 1) * COL_GAP
  const totalW = availableWidth > minW ? availableWidth : minW
  const gap   = numRounds > 1 ? (totalW - numRounds * CARD_W) / (numRounds - 1) : COL_GAP
  const totalH = firstRoundCount * SLOT - (SLOT - CARD_H)

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Round headers */}
      <div className="flex mb-3" style={{ gap, width: totalW }}>
        {rounds.map(round => (
          <h3
            key={round}
            className="font-display font-bold uppercase tracking-wide text-xs text-brand-orange whitespace-nowrap"
            style={{ width: CARD_W, flexShrink: 0 }}
          >
            {roundLabels[round]}
          </h3>
        ))}
      </div>

      {/* Cards + SVG connectors */}
      <div style={{ position: 'relative', width: totalW, height: totalH }}>
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width={totalW}
          height={totalH}
        >
          {rounds.slice(0, -1).map((round, rIdx) => {
            const matches     = byRound.get(round) ?? []
            const nextMatches = byRound.get(rounds[rIdx + 1]) ?? []
            const x1   = rIdx * (CARD_W + gap) + CARD_W
            const x2   = (rIdx + 1) * (CARD_W + gap)
            const xMid = (x1 + x2) / 2
            const pairs = Math.ceil(matches.length / 2)

            return Array.from({ length: pairs }, (_, k) => {
              const topMatch    = matches[2 * k]
              const bottomMatch = matches[2 * k + 1]
              const nextMatch   = nextMatches[k]
              if (!topMatch || !nextMatch) return null

              const yTop = matchTop(rIdx, 2 * k) + CARD_H / 2
              const yMid = matchTop(rIdx + 1, k) + CARD_H / 2

              if (!bottomMatch) {
                return <line key={k} x1={x1} y1={yTop} x2={x2} y2={yTop} stroke={LINE_COLOR} strokeWidth={1.5} />
              }

              const yBottom = matchTop(rIdx, 2 * k + 1) + CARD_H / 2
              return (
                <g key={k}>
                  <line x1={x1}   y1={yTop}    x2={xMid} y2={yTop}    stroke={LINE_COLOR} strokeWidth={1.5} />
                  <line x1={xMid} y1={yTop}    x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                  <line x1={x1}   y1={yBottom} x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                  <line x1={xMid} y1={yMid}    x2={x2}   y2={yMid}    stroke={LINE_COLOR} strokeWidth={1.5} />
                </g>
              )
            })
          })}
        </svg>

        {rounds.map((round, rIdx) => {
          const matches = byRound.get(round) ?? []
          const x = rIdx * (CARD_W + gap)
          return matches.map((match, mIdx) => (
            <div
              key={match.id}
              style={{ position: 'absolute', top: matchTop(rIdx, mIdx), left: x, width: CARD_W }}
            >
              <AdminBracketCard
                match={match}
                categoryTeams={categoryTeams}
                editingSlot={editingSlot}
                setEditingSlot={setEditingSlot}
                onOverrideTeam={onOverrideTeam}
              />
            </div>
          ))
        })}
      </div>
    </div>
  )
}

// ─── Preview modal slot (editable team + "why" reason) ────────────────────────

interface PreviewSlotProps {
  matchId: string
  slot: 'home' | 'away'
  teamId: string | null
  categoryTeams: { id: string; name: string }[]
  teamInfo: Map<string, { groupName: string; groupPosition: number; stats: StandingsRow }>
  editingSlot: { matchId: string; slot: 'home' | 'away' } | null
  setEditingSlot: (s: { matchId: string; slot: 'home' | 'away' } | null) => void
  onChange: (matchId: string, slot: 'home' | 'away', teamId: string) => void
}

function PreviewSlot({ matchId, slot, teamId, categoryTeams, teamInfo, editingSlot, setEditingSlot, onChange }: PreviewSlotProps) {
  const team = teamId ? categoryTeams.find(t => t.id === teamId) : null
  const info = teamId ? teamInfo.get(teamId) : undefined
  const isEditing = editingSlot?.matchId === matchId && editingSlot.slot === slot

  return (
    <div className="px-3 py-2 border border-court-border">
      {isEditing ? (
        <select
          className="input py-0.5 px-1 text-xs w-full"
          autoFocus
          defaultValue=""
          onChange={e => onChange(matchId, slot, e.target.value)}
          onBlur={() => setEditingSlot(null)}
        >
          <option value="">— Seleziona —</option>
          <option value="__clear__">— Rimuovi squadra —</option>
          {categoryTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      ) : (
        <button
          className="text-left w-full hover:text-brand-orange transition-colors font-body text-sm"
          onClick={() => setEditingSlot({ matchId, slot })}
        >
          {team ? team.name : <span className="italic opacity-50 text-court-muted">TBD</span>}
        </button>
      )}
      {info && (
        <ul className="text-xs text-court-muted mt-1 list-disc list-inside space-y-0.5">
          <li>{info.groupPosition}° classificato, Girone {info.groupName}</li>
          <li>{info.stats.wins} Vinte, {info.stats.losses} Perse</li>
          <li>Differenza canestri {info.stats.point_differential > 0 ? '+' : ''}{info.stats.point_differential}</li>
          <li>Punti Fatti {info.stats.points_for}</li>
        </ul>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TournamentBracket({
  editionId, category, bracketMatches, groupMatches, groups, approvedTeams
}: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [saving, setSaving]               = useState(false)
  const [editingSlot, setEditingSlot]     = useState<{ matchId: string; slot: 'home' | 'away' } | null>(null)
  const [bracketSize, setBracketSize]     = useState<4 | 8 | 16>(4)
  const [formatModalOpen, setFormatModalOpen] = useState(false)
  const [preview, setPreview] = useState<{ matchId: string; homeTeamId: string | null; awayTeamId: string | null }[] | null>(null)
  const [previewEditingSlot, setPreviewEditingSlot] = useState<{ matchId: string; slot: 'home' | 'away' } | null>(null)

  const categoryTeams = approvedTeams.filter(t => t.category === category)

  // Group bracket matches by round
  const byRound = new Map<BracketRound, MatchWithTeams[]>()
  for (const m of bracketMatches) {
    if (!m.bracket_round) continue
    if (!byRound.has(m.bracket_round)) byRound.set(m.bracket_round, [])
    byRound.get(m.bracket_round)!.push(m)
  }
  for (const arr of Array.from(byRound.values())) {
    arr.sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
  }
  const rounds = roundOrder.filter(r => byRound.has(r))

  // Standings per group + a lookup of every team's group/position/stats, used both to
  // compute the "populate from standings" proposal and to explain it in the preview modal.
  const groupStandings = groups.map(g => {
    const gMatches = groupMatches.filter(m => m.group_id === g.id)
    const gTeams   = g.group_teams.flatMap(gt => gt.teams ? [{ id: gt.teams.id, name: gt.teams.name }] : [])
    return { group: g, standings: computeStandings(gMatches, gTeams) }
  })
  const teamInfo = new Map<string, { groupName: string; groupPosition: number; stats: StandingsRow }>()
  for (const gs of groupStandings) {
    gs.standings.forEach((row, i) => {
      teamInfo.set(row.team_id, { groupName: gs.group.name, groupPosition: i + 1, stats: row })
    })
  }

  async function overrideTeam(matchId: string, slot: 'home' | 'away', teamId: string) {
    if (!teamId) { setEditingSlot(null); return }
    setSaving(true)
    const field = slot === 'home' ? 'team_home_id' : 'team_away_id'
    const value = teamId === '__clear__' ? null : teamId
    await supabase.from('matches').update({ [field]: value }).eq('id', matchId)
    setEditingSlot(null)
    router.refresh()
    setSaving(false)
  }

  function computePreview() {
    if (bracketMatches.length === 0) {
      alert('Genera prima un tabellone vuoto.')
      return
    }

    // Derive bracket size from the existing bracket structure
    const firstRound        = rounds[0]
    const firstRoundMatches = byRound.get(firstRound) ?? []
    const derivedSize       = firstRoundMatches.length * 2

    const teamsPerGroup = Math.ceil(derivedSize / Math.max(groups.length, 1))
    const qualifiers: string[] = []

    for (let pos = 0; pos < teamsPerGroup; pos++) {
      const atPosition = groupStandings
        .map(gs => gs.standings[pos])
        .filter(Boolean)
        .sort((a, b) =>
          b.wins - a.wins ||
          b.point_differential - a.point_differential ||
          b.points_for - a.points_for
        )
      for (const row of atPosition) {
        if (qualifiers.length < derivedSize) qualifiers.push(row.team_id)
      }
    }
    while (qualifiers.length < derivedSize) qualifiers.push('')

    setPreview(firstRoundMatches.map((match, pos) => {
      const seedA = pos
      const seedB = firstRoundMatches.length * 2 - 1 - pos
      return {
        matchId: match.id,
        homeTeamId: qualifiers[seedA] || null,
        awayTeamId: qualifiers[seedB] || null,
      }
    }))
  }

  function setPreviewSlot(matchId: string, slot: 'home' | 'away', teamId: string) {
    setPreview(prev => {
      if (!prev) return prev
      const value = teamId === '__clear__' || !teamId ? null : teamId
      return prev.map(entry => {
        if (entry.matchId === matchId) return { ...entry, [slot === 'home' ? 'homeTeamId' : 'awayTeamId']: value }
        // Swap out of whichever other slot currently holds the picked team
        if (value) {
          if (entry.homeTeamId === value) return { ...entry, homeTeamId: null }
          if (entry.awayTeamId === value) return { ...entry, awayTeamId: null }
        }
        return entry
      })
    })
    setPreviewEditingSlot(null)
  }

  async function confirmPreview() {
    if (!preview) return
    setSaving(true)
    for (const entry of preview) {
      await supabase.from('matches').update({
        team_home_id: entry.homeTeamId,
        team_away_id: entry.awayTeamId,
      }).eq('id', entry.matchId)
    }
    setSaving(false)
    setPreview(null)
    router.refresh()
  }

  async function generateEmptyBracket() {
    if (bracketMatches.length > 0) {
      if (!window.confirm('Tabellone già esistente per questa categoria. Rigenerare vuoto?')) return
      await supabase.from('matches').delete()
        .eq('edition_id', editionId)
        .eq('category', category)
        .eq('phase', 'bracket')
    }

    const bracketRounds: BracketRound[] = []
    if (bracketSize >= 16) bracketRounds.push('round_of_16')
    if (bracketSize >= 8)  bracketRounds.push('quarterfinal')
    bracketRounds.push('semifinal')
    bracketRounds.push('final')

    type MatchInsert = {
      id: string; edition_id: string; category: string; phase: 'bracket'
      bracket_round: BracketRound; bracket_position: number
      next_match_id: string | null; next_match_slot: 'home' | 'away' | null
      team_home_id: null; team_away_id: null; status: 'scheduled'; sort_order: number
    }

    const allMatches: MatchInsert[] = []
    let sortOrder = 0
    const roundsReversed = [...bracketRounds].reverse()
    let previousRoundMatches: MatchInsert[] = []

    for (let ri = 0; ri < roundsReversed.length; ri++) {
      const round      = roundsReversed[ri]
      const matchCount = Math.pow(2, ri)
      const current: MatchInsert[] = []

      for (let pos = 0; pos < matchCount; pos++) {
        const matchId   = crypto.randomUUID()
        const nextMatch = previousRoundMatches[Math.floor(pos / 2)] ?? null
        const nextSlot: 'home' | 'away' = pos % 2 === 0 ? 'home' : 'away'
        const m: MatchInsert = {
          id: matchId, edition_id: editionId, category, phase: 'bracket',
          bracket_round: round, bracket_position: pos,
          next_match_id: nextMatch?.id ?? null,
          next_match_slot: nextMatch ? nextSlot : null,
          team_home_id: null, team_away_id: null,
          status: 'scheduled', sort_order: sortOrder++,
        }
        current.push(m)
        allMatches.push(m)
      }
      previousRoundMatches = current
    }

    setSaving(true)
    for (const m of allMatches) await supabase.from('matches').insert(m)
    setSaving(false)
    router.refresh()
  }

  return (
    <div>
      {/* Generation controls */}
      <div className="card flex items-center gap-3 mb-6 flex-wrap px-4 py-3">
        <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
          <button
            onClick={computePreview}
            disabled={saving || groups.length === 0 || bracketMatches.length === 0}
            className="btn-ghost text-sm px-4 py-2 whitespace-nowrap"
          >
            <ListOrdered size={14} /> Popola con le classifiche
          </button>
          <button
            onClick={() => setFormatModalOpen(true)}
            disabled={saving}
            className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
          >
            <Trophy size={14} /> Genera tabellone vuoto
          </button>
        </div>
      </div>

      {/* Format picker modal */}
      {formatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setFormatModalOpen(false)}
        >
          <div
            className="card w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-1">
              Formato tabellone
            </h2>
            <p className="text-court-gray text-sm mb-5">Scegli il numero di squadre nel tabellone finale.</p>

            <div className="space-y-2 mb-6">
              {([
                { size: 4  as const, label: '4 squadre',  description: 'Semifinali + Finale. Adatto a gironi con 2 gruppi da 2.' },
                { size: 8  as const, label: '8 squadre',  description: 'Quarti + Semifinali + Finale. Il formato più comune.' },
                { size: 16 as const, label: '16 squadre', description: 'Ottavi + Quarti + Semifinali + Finale. Per tornei grandi.' },
              ]).map(({ size, label, description }) => (
                <button
                  key={size}
                  onClick={() => setBracketSize(size)}
                  className={[
                    'w-full text-left px-4 py-3 border transition-colors',
                    bracketSize === size
                      ? 'border-brand-orange bg-brand-orange/10 text-court-white'
                      : 'border-court-border text-court-muted hover:border-court-gray hover:text-court-light',
                  ].join(' ')}
                >
                  <span className="font-display font-bold uppercase tracking-wide text-sm block">{label}</span>
                  <span className="text-xs mt-0.5 block">{description}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setFormatModalOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button
                onClick={() => { setFormatModalOpen(false); generateEmptyBracket() }}
                disabled={saving}
                className="btn-primary text-sm px-4 py-2"
              >
                Genera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal: proposed seeding from standings, editable before approval */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="card w-full max-w-2xl mx-4 p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-1">
              Anteprima tabellone
            </h2>
            <p className="text-court-gray text-sm mb-5">
              Squadre proposte in base alle classifiche dei gironi. Clicca su una squadra per cambiarla prima di confermare.
            </p>

            <div className="space-y-3 mb-6">
              {preview.map((entry, i) => (
                <div key={entry.matchId} className="border border-court-border p-3">
                  <p className="text-xs text-court-muted uppercase tracking-wide mb-2">Match {i + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PreviewSlot
                      matchId={entry.matchId}
                      slot="home"
                      teamId={entry.homeTeamId}
                      categoryTeams={categoryTeams}
                      teamInfo={teamInfo}
                      editingSlot={previewEditingSlot}
                      setEditingSlot={setPreviewEditingSlot}
                      onChange={setPreviewSlot}
                    />
                    <PreviewSlot
                      matchId={entry.matchId}
                      slot="away"
                      teamId={entry.awayTeamId}
                      categoryTeams={categoryTeams}
                      teamInfo={teamInfo}
                      editingSlot={previewEditingSlot}
                      setEditingSlot={setPreviewEditingSlot}
                      onChange={setPreviewSlot}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setPreview(null)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button
                onClick={confirmPreview}
                disabled={saving}
                className="btn-primary text-sm px-4 py-2"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessun tabellone ancora. Completa i gironi e genera il tabellone.</p>
        </div>
      ) : (
        <>
          {/* Desktop: visual bracket with SVG connectors */}
          <div className="hidden md:block overflow-x-auto pb-4">
            <DesktopBracket
              rounds={rounds}
              byRound={byRound}
              categoryTeams={categoryTeams}
              editingSlot={editingSlot}
              setEditingSlot={setEditingSlot}
              onOverrideTeam={overrideTeam}
            />
          </div>

          {/* Mobile: vertical stacked rounds */}
          <div className="flex flex-col gap-8 md:hidden">
            {rounds.map(round => (
              <div key={round}>
                <h3 className="font-display font-bold uppercase tracking-wide text-xs text-brand-orange mb-3">
                  {roundLabels[round]}
                </h3>
                <div className="flex flex-col gap-3">
                  {(byRound.get(round) ?? []).map(match => (
                    <AdminBracketCard
                      key={match.id}
                      match={match}
                      categoryTeams={categoryTeams}
                      editingSlot={editingSlot}
                      setEditingSlot={setEditingSlot}
                      onOverrideTeam={overrideTeam}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
