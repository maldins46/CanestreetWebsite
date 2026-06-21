'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Search } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import type { TpcCategory, TpcContestFull, TpcEntryWithPlayer, TpcRoundWithEntries } from '@/types'
import TpcCheckinView from '@/components/admin/TpcCheckinView'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  editionId: string
  contests: TpcContestFull[]
  initialCategory?: TpcCategory
}

const CATEGORIES: { key: TpcCategory; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'under', label: 'Under' },
]

export default function TpcAdmin({ editionId, contests, initialCategory = 'open' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = (searchParams.get('category') as TpcCategory) ?? initialCategory
  const isCheckin = searchParams.get('mode') === 'checkin'
  const contest = contests.find(c => c.category === activeCategory) ?? null
  const [search, setSearch] = useState('')

  const setActiveCategory = useCallback((cat: TpcCategory) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'open') {
      params.delete('category')
    } else {
      params.set('category', cat)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={clsx(
              'px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors',
              activeCategory === cat.key
                ? 'bg-brand-orange border-brand-orange text-court-dark'
                : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
            )}
          >
            {cat.label}
          </button>
        ))}
        {isCheckin && (
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-court-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca giocatore…"
              className="input pl-7 pr-3 py-1.5 text-xs w-52"
            />
          </div>
        )}
      </div>

      {isCheckin ? (
        <TpcCheckinView contest={contest} editionId={editionId} category={activeCategory} search={search} />
      ) : (
        <ContestManager contest={contest} editionId={editionId} category={activeCategory} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Contest manager: players + rounds
// ─────────────────────────────────────────────────────────────────
function ContestManager({ contest, editionId, category }: { contest: TpcContestFull | null; editionId: string; category: TpcCategory }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [newRoundName, setNewRoundName] = useState('')
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set())
  const prevContestIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (contest && prevContestIdRef.current !== contest.id) {
      prevContestIdRef.current = contest.id
      setExpandedRounds(new Set(contest.tpc_rounds.map(r => r.id)))
    }
  }, [contest])

  async function addRound() {
    const name = newRoundName.trim()
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
    if (!contestId) { setSaving(false); return }

    const nextNumber = contest ? Math.max(...contest.tpc_rounds.map(r => r.round_number), 0) + 1 : 1
    await supabase.from('tpc_rounds').insert({ contest_id: contestId, round_number: nextNumber, name })
    setNewRoundName('')
    router.refresh()
    setSaving(false)
  }

  async function deleteRound(roundId: string) {
    if (!window.confirm('Eliminare questo turno e tutti i risultati?')) return
    setSaving(true)
    await supabase.from('tpc_rounds').delete().eq('id', roundId)
    router.refresh()
    setSaving(false)
  }

  function toggleRound(roundId: string) {
    setExpandedRounds(prev => {
      const next = new Set(prev)
      next.has(roundId) ? next.delete(roundId) : next.add(roundId)
      return next
    })
  }

  const sortedRounds = [...(contest?.tpc_rounds ?? [])].sort((a, b) => a.round_number - b.round_number)

  return (
    <div className="space-y-3">
      {/* New round form */}
      <div className="card p-4">
        <p className="text-court-gray text-xs font-display uppercase tracking-wide mb-2">Nuovo turno</p>
        <div className="flex gap-2">
          <input
            className="input text-sm py-1.5 flex-1"
            placeholder="Nome turno (es. Qualificazioni, Finale)"
            value={newRoundName}
            onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRound()}
          />
          <button className="btn-primary text-sm px-4 py-1.5" onClick={addRound} disabled={saving || !newRoundName.trim()}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Rounds */}
      {sortedRounds.map((round, idx) => (
        <RoundCard
          key={round.id}
          round={round}
          contest={contest!}
          prevRound={idx > 0 ? sortedRounds[idx - 1] : null}
          expanded={expandedRounds.has(round.id)}
          onToggle={() => toggleRound(round.id)}
          onDelete={() => deleteRound(round.id)}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Round card with expandable entries table
// ─────────────────────────────────────────────────────────────────
interface RoundCardProps {
  round: TpcRoundWithEntries
  contest: TpcContestFull
  prevRound: TpcRoundWithEntries | null
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}

function RoundCard({ round, contest, prevRound, expanded, onToggle, onDelete }: RoundCardProps) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedEntries = [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order)
  const entryPlayerIds = new Set(round.tpc_entries.map(e => e.player_id))

  async function addAllPlayers() {
    const missing = contest.tpc_players.filter(p => !entryPlayerIds.has(p.id))
    if (missing.length === 0) return
    setSaving(true)
    await supabase.from('tpc_entries').insert(
      missing.map((p, i) => ({
        round_id: round.id,
        player_id: p.id,
        sort_order: round.tpc_entries.length + i,
      }))
    )
    router.refresh()
    setSaving(false)
  }

  async function deleteEntry(entryId: string) {
    setSaving(true)
    await supabase.from('tpc_entries').delete().eq('id', entryId)
    router.refresh()
    setSaving(false)
  }

  async function updateScore(entryId: string, value: string) {
    const score = value === '' ? null : parseInt(value, 10)
    if (value !== '' && isNaN(score!)) return
    await supabase.from('tpc_entries').update({ score }).eq('id', entryId)
    router.refresh()
  }

  async function toggleQualified(entry: TpcEntryWithPlayer) {
    await supabase.from('tpc_entries').update({ is_qualified: !entry.is_qualified }).eq('id', entry.id)
    router.refresh()
  }

  async function setLive(entryId: string, currentlyLive: boolean) {
    setSaving(true)
    // Clear all is_live in this contest across all rounds
    const roundIds = contest.tpc_rounds.map(r => r.id)
    if (roundIds.length > 0) {
      await supabase.from('tpc_entries').update({ is_live: false }).in('round_id', roundIds)
    }
    // Set the new live entry (toggle off if already live)
    if (!currentlyLive) {
      await supabase.from('tpc_entries').update({ is_live: true }).eq('id', entryId)
    }
    router.refresh()
    setSaving(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedEntries.findIndex(e => e.id === active.id)
    const newIndex = sortedEntries.findIndex(e => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(sortedEntries, oldIndex, newIndex)

    setSaving(true)
    await Promise.all(
      newOrder.map((entry, index) =>
        supabase.from('tpc_entries').update({ sort_order: index }).eq('id', entry.id)
      )
    )
    router.refresh()
    setSaving(false)
  }

  async function advanceQualified() {
    if (!prevRound) return
    const qualified = prevRound.tpc_entries.filter(e => e.is_qualified)
    if (qualified.length === 0) {
      alert('Nessun giocatore qualificato nel turno precedente.')
      return
    }
    setSaving(true)
    const toInsert = qualified
      .filter(e => !entryPlayerIds.has(e.player_id))
      .map((e, i) => ({
        round_id: round.id,
        player_id: e.player_id,
        sort_order: round.tpc_entries.length + i,
      }))
    if (toInsert.length > 0) {
      await supabase.from('tpc_entries').insert(toInsert)
    }
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Round header */}
      <div className="flex items-center px-4 py-3 gap-3 flex-wrap" onClick={onToggle}>
        <span className="text-xs font-display uppercase tracking-widest text-court-muted cursor-pointer select-none">#{round.round_number}</span>
        <span className="font-display font-bold uppercase text-court-white text-sm cursor-pointer select-none">{round.name}</span>
        <span className="text-xs text-court-gray cursor-pointer select-none">{round.tpc_entries.length} iscritti</span>
        <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
          {!prevRound && (
            <button
              className="btn-ghost text-sm px-3 py-1"
              onClick={addAllPlayers}
              disabled={saving || entryPlayerIds.size === contest.tpc_players.length}
              title="Aggiunge tutti i giocatori mancanti"
            >
              Aggiungi nuovi iscritti
            </button>
          )}
          {prevRound && (
            <button
              className="btn-ghost text-sm px-3 py-1"
              onClick={advanceQualified}
              disabled={saving}
              title="Copia qualificati dal turno precedente"
            >
              Avanza qualificati
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-court-muted hover:text-red-400 transition-colors p-1"
            title="Elimina turno"
          >
            <Trash2 size={13} />
          </button>
          <button className="text-court-gray p-1" onClick={onToggle}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-court-border overflow-x-auto">
          <table className="w-full text-sm">
            {sortedEntries.length > 0 && (
              <thead>
                <tr className="border-b border-court-border">
                  <th className="w-px px-3 py-2" />
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">#</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap">Giocatore</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Punti</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Live</th>
                  <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Qualif.</th>
                  <th className="w-px" />
                </tr>
              </thead>
            )}
            {sortedEntries.length === 0 ? (
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-court-muted text-sm">Nessun partecipante in questo turno.</td>
                </tr>
              </tbody>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {sortedEntries.map(entry => (
                      <SortableEntryRow
                        key={entry.id}
                        entry={entry}
                        onUpdateScore={updateScore}
                        onToggleQualified={toggleQualified}
                        onSetLive={setLive}
                        onDelete={deleteEntry}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Individual sortable entry row
// ─────────────────────────────────────────────────────────────────
interface EntryRowProps {
  entry: TpcEntryWithPlayer
  onUpdateScore: (id: string, value: string) => void
  onToggleQualified: (entry: TpcEntryWithPlayer) => void
  onSetLive: (id: string, currentlyLive: boolean) => void
  onDelete: (id: string) => void
}

function SortableEntryRow({ entry, onUpdateScore, onToggleQualified, onSetLive, onDelete }: EntryRowProps) {
  const [scoreVal, setScoreVal] = useState(entry.score !== null ? String(entry.score) : '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={clsx(
        'border-b border-court-border last:border-b-0 transition-colors',
        isDragging && 'opacity-50 bg-brand-orange/10',
        entry.is_live && 'bg-red-500/10',
        entry.is_qualified && !entry.is_live && 'bg-brand-orange/5',
      )}
    >
      <td className="px-3 py-2.5 w-px whitespace-nowrap">
        <button
          className="cursor-grab active:cursor-grabbing text-court-muted hover:text-court-white"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-3 py-2.5 w-px whitespace-nowrap text-center">
        <span className="text-xs text-court-muted">{entry.sort_order + 1}</span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-court-white font-medium">
          {entry.tpc_players.name}
          {entry.is_live && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-400 font-display uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-2.5 w-px whitespace-nowrap">
        <input
          className="w-16 bg-transparent border border-court-border rounded px-2 py-0.5 text-sm text-court-white focus:border-brand-orange focus:outline-none text-center"
          type="number"
          min="0"
          placeholder="—"
          value={scoreVal}
          onChange={e => setScoreVal(e.target.value)}
          onBlur={() => onUpdateScore(entry.id, scoreVal)}
        />
      </td>
      <td className="px-3 py-2.5 w-px whitespace-nowrap">
        <button
          onClick={() => onSetLive(entry.id, entry.is_live)}
          className={clsx(
            'btn-ghost py-1 px-2 text-xs',
            entry.is_live && 'border-red-500/40 text-red-400 hover:border-red-500/60',
          )}
        >
          Live
        </button>
      </td>
      <td className="px-3 py-2.5 w-px whitespace-nowrap">
        <button
          onClick={() => onToggleQualified(entry)}
          className={clsx(
            'btn-ghost py-1 px-2 text-xs',
            entry.is_qualified && 'border-brand-orange/40 text-brand-orange hover:border-brand-orange/60',
          )}
        >
          Qualif.
        </button>
      </td>
      <td className="px-3 py-2.5 w-px whitespace-nowrap">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-court-muted hover:text-red-400 transition-colors"
          title="Rimuovi dal turno"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}
