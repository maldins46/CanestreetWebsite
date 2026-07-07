'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MatchWithTeams, TeamCategory, CalendarioEvent } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import clsx from 'clsx'
import { Trash2, CalendarClock, Info } from 'lucide-react'

interface Props {
  editionId: string
  matches: MatchWithTeams[]
  category?: TeamCategory | 'evento'
  search?: string
  events?: CalendarioEvent[]
}

const STATUS_ORDER: Record<string, number> = { completed: 0, in_progress: 1, scheduled: 2 }

const roundLabels: Record<string, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinale',
  final: 'Finale',
}

type AdminRow =
  | { type: 'match'; data: MatchWithTeams }
  | { type: 'event'; data: CalendarioEvent }

export default function TournamentCalendar({ editionId, matches, category, search, events }: Props) {
  // evento: events-only table; specific category: matches only; undefined (Tutte): merge both
  const isEventMode = category === 'evento'
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDate, setBulkDate] = useState('')
  const [settingDate, setSettingDate] = useState(false)
  const [dateModalOpen, setDateModalOpen] = useState(false)

  const q = search?.trim().toLowerCase() ?? ''

  const categoryMatches = matches.filter(m => !category || m.category === category)

  const filteredMatches = categoryMatches.filter(m => {
    if (!q) return true
    const phase = getPhaseLabel(m).toLowerCase()
    return (
      m.team_home?.name.toLowerCase().includes(q) ||
      m.team_away?.name.toLowerCase().includes(q) ||
      m.group?.name.toLowerCase().includes(q) ||
      phase.includes(q)
    )
  })

  // In Tutte mode (no category), blend events with matches
  const blendEvents = !category && !isEventMode && events && events.length > 0
  const filteredEvents = blendEvents
    ? events!.filter(e => !q || e.name.toLowerCase().includes(q))
    : []

  const allRows: AdminRow[] = [
    ...filteredMatches.map(m => ({ type: 'match' as const, data: m })),
    ...filteredEvents.map(e => ({ type: 'event' as const, data: e })),
  ].sort((a, b) => {
    const da = a.data.scheduled_at ? new Date(a.data.scheduled_at).getTime() : Infinity
    const db = b.data.scheduled_at ? new Date(b.data.scheduled_at).getTime() : Infinity
    if (da !== db) return da - db
    const sa = STATUS_ORDER[a.data.status] ?? 99
    const sb = STATUS_ORDER[b.data.status] ?? 99
    if (sa !== sb) return sa - sb
    if (a.type === 'match' && b.type === 'match') {
      return getPhaseLabel(a.data).localeCompare(getPhaseLabel(b.data))
    }
    return 0
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
    await supabase.from('matches').update({ scheduled_at: fromRomeLocal(scheduledAt) }).eq('id', matchId)
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
      // Global rule: complete any live match or event before going live
      await supabase.from('matches')
        .update({ status: 'completed' })
        .eq('edition_id', editionId)
        .eq('status', 'in_progress')
      await supabase.from('events')
        .update({ status: 'completed' })
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

  async function setAllDates() {
    if (!bulkDate) return
    setSettingDate(true)
    setDateModalOpen(false)
    let q = supabase.from('matches').update({ scheduled_at: fromRomeLocal(bulkDate) }).eq('edition_id', editionId)
    if (category) q = q.eq('category', category)
    await q
    router.refresh()
    setSettingDate(false)
  }

  async function deleteMatch(matchId: string) {
    setDeletingId(matchId)
    await supabase.from('matches').delete().eq('id', matchId)
    router.refresh()
    setDeletingId(null)
  }

  async function deleteAllMatches() {
    setDeletingAll(true)
    setConfirmDeleteModalOpen(false)
    let q = supabase.from('matches').delete().eq('edition_id', editionId)
    if (category) q = q.eq('category', category)
    await q
    router.refresh()
    setDeletingAll(false)
  }

  async function cycleEventStatus(event: CalendarioEvent) {
    setSaving(event.id)
    if (event.status === 'scheduled') {
      await supabase.from('matches').update({ status: 'completed' }).eq('edition_id', editionId).eq('status', 'in_progress')
      await supabase.from('events').update({ status: 'completed' }).eq('edition_id', editionId).eq('status', 'in_progress')
      await supabase.from('events').update({ status: 'in_progress' }).eq('id', event.id)
    } else if (event.status === 'in_progress') {
      await supabase.from('events').update({ status: 'completed' }).eq('id', event.id)
    } else {
      await supabase.from('events').update({ status: 'scheduled' }).eq('id', event.id)
    }
    router.refresh()
    setSaving(null)
  }

  async function saveEventSchedule(eventId: string, scheduledAt: string) {
    setSaving(eventId)
    await supabase.from('events').update({ scheduled_at: fromRomeLocal(scheduledAt) }).eq('id', eventId)
    router.refresh()
    setSaving(null)
  }

  async function deleteEvent(eventId: string) {
    setDeletingId(eventId)
    await supabase.from('events').delete().eq('id', eventId)
    router.refresh()
    setDeletingId(null)
  }

  async function deleteAllEvents() {
    setDeletingAll(true)
    setConfirmDeleteModalOpen(false)
    await supabase.from('events').delete().eq('edition_id', editionId)
    router.refresh()
    setDeletingAll(false)
  }

  async function setAllEventDates() {
    if (!bulkDate) return
    setSettingDate(true)
    setDateModalOpen(false)
    await supabase.from('events').update({ scheduled_at: fromRomeLocal(bulkDate) }).eq('edition_id', editionId)
    router.refresh()
    setSettingDate(false)
  }

  function getPhaseLabel(match: MatchWithTeams) {
    if (match.phase === 'group' && match.group) return `Girone ${match.group.name}`
    if (match.phase === 'bracket' && match.bracket_round) return roundLabels[match.bracket_round] ?? match.bracket_round
    return ''
  }

  function toDatetimeLocal(iso: string | null): string {
    if (!iso) return ''
    // Show Rome local time in the datetime-local input
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16).replace(' ', 'T')
  }

  function fromRomeLocal(localStr: string): string | null {
    if (!localStr) return null
    // "YYYY-MM-DDTHH:mm" entered as Rome time → UTC ISO string
    const asIfUtc = new Date(localStr + ':00Z')
    const romeEquiv = asIfUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 16)
    const offsetMs = new Date(romeEquiv + ':00Z').getTime() - asIfUtc.getTime()
    return new Date(asIfUtc.getTime() - offsetMs).toISOString()
  }

  const eventCount = events?.length ?? 0

  return (
    <div>
      {/* Action box */}
      <div className="card flex items-center gap-3 mb-6 flex-wrap px-4 py-3">
        <p className="text-court-muted text-sm">
          {isEventMode
            ? `${eventCount} ${eventCount === 1 ? 'evento' : 'eventi'}`
            : `${categoryMatches.length} ${categoryMatches.length === 1 ? 'partita' : 'partite'}${category ? ` — ${CATEGORY_LABELS[category]}` : ''}`
          }
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setDateModalOpen(true)}
            disabled={settingDate || (isEventMode ? eventCount === 0 : categoryMatches.length === 0)}
            className="btn-ghost text-sm px-4 py-2 whitespace-nowrap"
          >
            {settingDate ? '…' : <><CalendarClock size={14} /> Imposta data a tutte</>}
          </button>
          <button
            onClick={() => setConfirmDeleteModalOpen(true)}
            disabled={deletingAll || (isEventMode ? eventCount === 0 : categoryMatches.length === 0)}
            className="btn-ghost text-sm px-4 py-2 whitespace-nowrap"
          >
            {deletingAll ? '…' : <><Trash2 size={14} /> {isEventMode ? 'Elimina tutti gli eventi' : 'Elimina tutte le partite'}</>}
          </button>
        </div>
      </div>

      {dateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDateModalOpen(false)}
        >
          <div
            className="card w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-1">
              Imposta data e ora
            </h2>
            <p className="text-court-gray text-sm mb-5">
              Verrà applicata a tutte le partite{category && category !== 'evento' ? ` di ${CATEGORY_LABELS[category as TeamCategory]}` : ''}.
            </p>
            <input
              type="datetime-local"
              value={bulkDate}
              onChange={e => setBulkDate(e.target.value)}
              className="input py-2 px-3 text-sm w-full mb-6"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setDateModalOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button
                onClick={isEventMode ? setAllEventDates : setAllDates}
                disabled={!bulkDate}
                className="btn-primary text-sm px-4 py-2"
              >
                Imposta
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDeleteModalOpen(false)}
        >
          <div
            className="card w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-1">
              {isEventMode ? 'Elimina eventi' : 'Elimina partite'}
            </h2>
            <p className="text-court-gray text-sm mb-6">
              {isEventMode
                ? `Verranno eliminati tutti i ${eventCount} eventi. Questa azione non è reversibile.`
                : `Verranno eliminate tutte le ${categoryMatches.length} partite${category ? ` di ${CATEGORY_LABELS[category]}` : ''}. Questa azione non è reversibile.`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteModalOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button
                onClick={isEventMode ? deleteAllEvents : deleteAllMatches}
                className="btn-primary text-sm px-4 py-2 bg-red-600 border-red-600 hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {isEventMode ? (
        events!.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-court-gray">Nessun evento. Aggiungili dalla scheda <strong>Eventi</strong>.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-court-border">
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Data/Ora</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Tipo</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">Nome</th>
                    <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Stato</th>
                    <th className="w-px" />
                  </tr>
                </thead>
                <tbody>
                  {events!.map(event => {
                    const isSaving = saving === event.id
                    return (
                      <tr
                        key={event.id}
                        className={clsx(
                          'border-b border-court-border last:border-b-0',
                          event.status === 'in_progress' && 'bg-red-500/10',
                          event.status === 'completed' && 'opacity-70',
                        )}
                      >
                        <td className="px-3 py-2 w-px whitespace-nowrap">
                          <input
                            type="datetime-local"
                            defaultValue={toDatetimeLocal(event.scheduled_at)}
                            onBlur={e => saveEventSchedule(event.id, e.target.value)}
                            disabled={isSaving}
                            className="input py-1 px-2 text-xs w-40"
                          />
                        </td>
                        <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                          <span className="text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded bg-teal-500 text-white">
                            Eventi
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-court-white text-sm">{event.name}</span>
                            {event.description && (
                              <span title={event.description} className="text-court-muted hover:text-court-white transition-colors cursor-help shrink-0">
                                <Info size={13} />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                          {event.status === 'scheduled' && (
                            <button
                              onClick={() => cycleEventStatus(event)}
                              disabled={isSaving}
                              className="badge-programma text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                            >
                              {isSaving ? '…' : 'In programma'}
                            </button>
                          )}
                          {event.status === 'in_progress' && (
                            <button
                              onClick={() => cycleEventStatus(event)}
                              disabled={isSaving}
                              className="badge-live text-xs px-2 py-0.5 font-display uppercase tracking-wide border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                            >
                              {isSaving ? '…' : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                                  Live
                                </>
                              )}
                            </button>
                          )}
                          {event.status === 'completed' && (
                            <button
                              onClick={() => cycleEventStatus(event)}
                              disabled={isSaving}
                              className="badge-terminata text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                            >
                              {isSaving ? '…' : 'Terminato'}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 w-px whitespace-nowrap">
                          <button
                            onClick={() => deleteEvent(event.id)}
                            disabled={deletingId === event.id || isSaving}
                            className="text-court-muted hover:text-red-400 transition-colors p-1"
                            title="Elimina evento"
                          >
                            {deletingId === event.id ? '…' : <Trash2 size={14} />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : allRows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessuna partita ancora. Genera le partite dai gironi prima.</p>
        </div>
      ) : (
      <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-court-border">
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Data/Ora</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Categoria</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Turno</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-right px-3 py-2 whitespace-nowrap">Squadra casa</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Pts</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Pts</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap">Squadra ospite</th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Stato</th>
              <th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {allRows.map(row => {
              if (row.type === 'event') {
                const event = row.data
                const isSaving = saving === event.id
                return (
                  <tr
                    key={`event-${event.id}`}
                    className={clsx(
                      'border-b border-court-border last:border-b-0',
                      event.status === 'in_progress' && 'bg-red-500/10',
                      event.status === 'completed' && 'opacity-70',
                    )}
                  >
                    <td className="px-3 py-2 w-px whitespace-nowrap">
                      <input
                        type="datetime-local"
                        defaultValue={toDatetimeLocal(event.scheduled_at)}
                        onBlur={e => saveEventSchedule(event.id, e.target.value)}
                        disabled={isSaving}
                        className="input py-1 px-2 text-xs w-40"
                      />
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      <span className="text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded bg-teal-500 text-white">
                        Eventi
                      </span>
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap" />
                    <td colSpan={4} className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-court-white text-sm font-medium">{event.name}</span>
                        {event.description && (
                          <span title={event.description} className="text-court-muted hover:text-court-white transition-colors cursor-help shrink-0">
                            <Info size={13} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      {event.status === 'scheduled' && (
                        <button onClick={() => cycleEventStatus(event)} disabled={isSaving}
                          className="badge-programma text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed">
                          {isSaving ? '…' : 'In programma'}
                        </button>
                      )}
                      {event.status === 'in_progress' && (
                        <button onClick={() => cycleEventStatus(event)} disabled={isSaving}
                          className="badge-live text-xs px-2 py-0.5 font-display uppercase tracking-wide border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed">
                          {isSaving ? '…' : <><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />Live</>}
                        </button>
                      )}
                      {event.status === 'completed' && (
                        <button onClick={() => cycleEventStatus(event)} disabled={isSaving}
                          className="badge-terminata text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed">
                          {isSaving ? '…' : 'Terminato'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap">
                      <button onClick={() => deleteEvent(event.id)} disabled={deletingId === event.id || isSaving}
                        className="text-court-muted hover:text-red-400 transition-colors p-1" title="Elimina evento">
                        {deletingId === event.id ? '…' : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                )
              }

              const match = row.data as MatchWithTeams
              const isSaving = saving === match.id
              const homeVal = getScore(match.id, 'home', match.score_home)
              const awayVal = getScore(match.id, 'away', match.score_away)

              return (
                <tr
                  key={`match-${match.id}`}
                  className={clsx(
                    'border-b border-court-border last:border-b-0',
                    match.status === 'in_progress' && 'bg-red-500/10',
                    match.status === 'completed' && 'opacity-70',
                  )}
                >
                  <td className="px-3 py-2 w-px whitespace-nowrap">
                    <input
                      type="datetime-local"
                      defaultValue={toDatetimeLocal(match.scheduled_at)}
                      onBlur={e => saveSchedule(match.id, e.target.value)}
                      disabled={isSaving}
                      className="input py-1 px-2 text-xs w-40"
                    />
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                    <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded', CATEGORY_COLORS[match.category])}>
                      {CATEGORY_LABELS[match.category]}
                    </span>
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap">
                    <span className="text-court-muted text-xs">{getPhaseLabel(match) || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="text-court-light text-sm font-medium">
                      {match.team_home?.name ?? <span className="opacity-40 italic">TBD</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap">
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
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap">
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
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-court-light text-sm font-medium">
                      {match.team_away?.name ?? <span className="opacity-40 italic">TBD</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                    {match.status === 'scheduled' && (
                      <button
                        onClick={() => cycleStatus(match)}
                        disabled={isSaving}
                        className="badge-programma text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      >
                        {isSaving ? '…' : 'Da giocare'}
                      </button>
                    )}
                    {match.status === 'in_progress' && (
                      <button
                        onClick={() => cycleStatus(match)}
                        disabled={isSaving}
                        className="badge-live text-xs px-2 py-0.5 font-display uppercase tracking-wide border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      >
                        {isSaving ? '…' : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                            Live
                          </>
                        )}
                      </button>
                    )}
                    {match.status === 'completed' && (
                      <button
                        onClick={() => cycleStatus(match)}
                        disabled={isSaving}
                        className="badge-terminata text-xs px-2 py-0.5 font-display uppercase tracking-wide border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                      >
                        {isSaving ? '…' : 'Terminata'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 w-px whitespace-nowrap">
                    <button
                      onClick={() => deleteMatch(match.id)}
                      disabled={deletingId === match.id || isSaving}
                      className="text-court-muted hover:text-red-400 transition-colors p-1"
                      title="Elimina partita"
                    >
                      {deletingId === match.id ? '…' : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
      )}
    </div>
  )
}
