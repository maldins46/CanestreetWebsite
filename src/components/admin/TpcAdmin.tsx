'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp, Radio, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import type { TpcCategory, TpcContestFull, TpcEntryWithPlayer, TpcRoundWithEntries } from '@/types'
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
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)

  const activeCategory = (searchParams.get('category') as TpcCategory) ?? initialCategory
  const contest = contests.find(c => c.category === activeCategory) ?? null

  const setActiveCategory = useCallback((cat: TpcCategory) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'open') {
      params.delete('category')
    } else {
      params.set('category', cat)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  async function createContest() {
    setSaving(true)
    await supabase.from('tpc_contests').insert({ edition_id: editionId, category: activeCategory })
    router.refresh()
    setSaving(false)
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
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
      </div>

      {!contest ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray mb-4">Nessuna gara creata per questa categoria.</p>
          <button className="btn-primary text-sm px-6 py-2" onClick={createContest} disabled={saving}>
            <Plus size={14} className="inline mr-1" />
            Crea Gara
          </button>
        </div>
      ) : (
        <ContestManager contest={contest} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Contest manager: players + rounds
// ─────────────────────────────────────────────────────────────────
function ContestManager({ contest }: { contest: TpcContestFull }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newRoundName, setNewRoundName] = useState('')
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set())
  const prevContestIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevContestIdRef.current !== contest.id) {
      prevContestIdRef.current = contest.id
      setExpandedRounds(new Set(contest.tpc_rounds.map(r => r.id)))
    }
  }, [contest])

  async function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    setSaving(true)
    await supabase.from('tpc_players').insert({ contest_id: contest.id, name })
    setNewPlayerName('')
    router.refresh()
    setSaving(false)
  }

  async function deletePlayer(playerId: string) {
    if (!window.confirm('Eliminare questo giocatore? Verrà rimosso da tutti i turni.')) return
    setSaving(true)
    await supabase.from('tpc_players').delete().eq('id', playerId)
    router.refresh()
    setSaving(false)
  }

  async function addRound() {
    const name = newRoundName.trim()
    if (!name) return
    setSaving(true)
    const nextNumber = (contest.tpc_rounds.length > 0
      ? Math.max(...contest.tpc_rounds.map(r => r.round_number)) + 1
      : 1)
    await supabase.from('tpc_rounds').insert({ contest_id: contest.id, round_number: nextNumber, name })
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

  const sortedRounds = [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number)

  return (
    <div className="space-y-8">
      {/* Players */}
      <section>
        <h3 className="font-display uppercase tracking-wide text-sm text-court-gray mb-3">Giocatori</h3>
        <div className="card p-4 space-y-3">
          {contest.tpc_players.length === 0 && (
            <p className="text-court-muted text-sm">Nessun giocatore aggiunto.</p>
          )}
          {contest.tpc_players.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="text-court-white text-sm">{p.name}</span>
              <button
                onClick={() => deletePlayer(p.id)}
                className="text-court-muted hover:text-red-400 transition-colors"
                title="Elimina"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1 border-t border-court-border">
            <input
              className="input text-sm py-1.5 flex-1"
              placeholder="Nome giocatore"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <button className="btn-primary text-sm px-4 py-1.5" onClick={addPlayer} disabled={saving || !newPlayerName.trim()}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Rounds */}
      <section>
        <h3 className="font-display uppercase tracking-wide text-sm text-court-gray mb-3">Turni</h3>
        <div className="space-y-3">
          {sortedRounds.map((round, idx) => (
            <RoundCard
              key={round.id}
              round={round}
              contest={contest}
              prevRound={idx > 0 ? sortedRounds[idx - 1] : null}
              expanded={expandedRounds.has(round.id)}
              onToggle={() => toggleRound(round.id)}
              onDelete={() => deleteRound(round.id)}
            />
          ))}

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
        </div>
      </section>
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
  const [selectedPlayerId, setSelectedPlayerId] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedEntries = [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order)
  const entryPlayerIds = new Set(round.tpc_entries.map(e => e.player_id))

  async function addEntry() {
    if (!selectedPlayerId) return
    setSaving(true)
    const nextOrder = round.tpc_entries.length
    await supabase.from('tpc_entries').insert({
      round_id: round.id,
      player_id: selectedPlayerId,
      sort_order: nextOrder,
    })
    setSelectedPlayerId('')
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

  async function updateSortOrder(entryId: string, value: string) {
    const order = parseInt(value, 10)
    if (isNaN(order)) return
    await supabase.from('tpc_entries').update({ sort_order: order }).eq('id', entryId)
    router.refresh()
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
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-display uppercase tracking-widest text-court-muted">#{round.round_number}</span>
          <span className="font-display font-bold uppercase text-court-white text-sm">{round.name}</span>
          <span className="text-xs text-court-gray">{round.tpc_entries.length} iscritti</span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="text-court-muted hover:text-red-400 transition-colors p-1"
            title="Elimina turno"
          >
            <Trash2 size={13} />
          </button>
          <button className="text-court-gray p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-court-border px-4 pb-4 pt-3 space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="input text-sm py-1.5 w-48"
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
            >
              <option value="">— Aggiungi giocatore —</option>
              {contest.tpc_players.map(p => (
                <option key={p.id} value={p.id} disabled={entryPlayerIds.has(p.id)}>
                  {p.name}{entryPlayerIds.has(p.id) ? ' ✓' : ''}
                </option>
              ))}
            </select>
            <button
              className="btn-primary text-sm px-3 py-1.5"
              onClick={addEntry}
              disabled={saving || !selectedPlayerId}
            >
              <Plus size={13} className="inline mr-1" />
              Aggiungi
            </button>
            {prevRound && (
              <button
                className="btn-ghost text-sm px-3 py-1.5"
                onClick={advanceQualified}
                disabled={saving}
                title="Copia qualificati dal turno precedente"
              >
                Avanza qualificati
              </button>
            )}
          </div>

          {/* Entries table */}
          {sortedEntries.length === 0 ? (
            <p className="text-court-muted text-sm">Nessun partecipante in questo turno.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedEntries.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
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
                </div>
              </SortableContext>
            </DndContext>
          )}
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
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded bg-court-dark border border-court-border',
        'transition-colors',
        isDragging && 'opacity-50 border-brand-orange',
        entry.is_live && 'bg-red-500/10',
        entry.is_qualified && !entry.is_live && 'bg-brand-orange/5',
      )}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-court-muted hover:text-court-white"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      {/* Position number */}
      <span className="text-xs text-court-muted w-6 text-center">{entry.sort_order + 1}</span>

      {/* Name */}
      <span className="flex-1 text-court-white font-medium">
        {entry.tpc_players.name}
        {entry.is_live && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-400 font-display uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            LIVE
          </span>
        )}
      </span>

      {/* Score */}
      <input
        className="w-16 bg-transparent border border-court-border rounded px-2 py-0.5 text-sm text-court-white focus:border-brand-orange focus:outline-none text-center"
        type="number"
        min="0"
        placeholder="—"
        value={scoreVal}
        onChange={e => setScoreVal(e.target.value)}
        onBlur={() => onUpdateScore(entry.id, scoreVal)}
      />

      {/* Qualified */}
      <input
        type="checkbox"
        checked={entry.is_qualified}
        onChange={() => onToggleQualified(entry)}
        className="w-4 h-4 accent-brand-orange cursor-pointer"
      />

      {/* Live */}
      <button
        onClick={() => onSetLive(entry.id, entry.is_live)}
        title={entry.is_live ? 'Rimuovi live' : 'Imposta live'}
        className={clsx(
          'transition-colors',
          entry.is_live ? 'text-red-400' : 'text-court-border hover:text-red-400'
        )}
      >
        <Radio size={16} />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(entry.id)}
        className="text-court-muted hover:text-red-400 transition-colors"
        title="Rimuovi dal turno"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
