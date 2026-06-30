'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import MediaPickerInput from '@/components/admin/MediaPickerInput'
import clsx from 'clsx'
import type {
  LedwallState, LedwallMode, LedwallScene, LedwallTransition, LedwallSceneConfig,
  GroupWithTeams, TpcContestFull, TeamCategory,
} from '@/types'

// ─── Category / scene labels ──────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: TeamCategory; label: string }[] = [
  { value: 'open_m', label: 'Open M' },
  { value: 'open_f', label: 'Open F' },
  { value: 'u14_m',  label: 'U14 M'  },
  { value: 'u16_m',  label: 'U16 M'  },
  { value: 'u18_m',  label: 'U18 M'  },
]

const SCENES: { key: LedwallScene; label: string; description: string }[] = [
  { key: 'matches',  label: 'Partite',   description: 'Ultime 3 / live / prossime 3' },
  { key: 'standings',label: 'Classifica',description: 'Classifica girone per categoria' },
  { key: 'finals',   label: 'Tabellone', description: 'Bracket eliminazione per categoria' },
  { key: 'sponsors', label: 'Sponsor',   description: 'Griglia 4 sponsor' },
  { key: 'tpc',      label: '3-Point',   description: '3-Point Contest per turno' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LedwallAdminPage() {
  const [state,    setState]    = useState<LedwallState | null>(null)
  const [groups,   setGroups]   = useState<GroupWithTeams[]>([])
  const [contests, setContests] = useState<TpcContestFull[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const supabase = createClient()

  // ── Fetch current state + option data ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: st }, { data: gr }, { data: tc }] = await Promise.all([
        supabase.from('ledwall_state').select('*').eq('id', 'default').single(),
        supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('category').order('sort_order'),
        supabase.from('tpc_contests').select('*, tpc_rounds(id, name, round_number)').order('category'),
      ])
      if (st) setState(st as LedwallState)
      setGroups(gr ?? [])
      setContests(tc ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save helpers ──────────────────────────────────────────────────────────
  async function save(patch: Partial<LedwallState>) {
    setSaving(true)
    const { error } = await supabase
      .from('ledwall_state')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 'default')
    if (!error) setState(prev => prev ? { ...prev, ...patch } : prev)
    setSaving(false)
  }

  async function saveConfig(config: LedwallSceneConfig) {
    await save({ scene_config: config })
  }

  function setMode(mode: LedwallMode)             { save({ mode }) }
  function setScene(fixed_scene: LedwallScene)     { save({ fixed_scene }) }
  function setTransition(transition: LedwallTransition) { save({ transition }) }
  function setFrame(frame_url: string)             { save({ frame_url }) }

  // ── Derived options ──────────────────────────────────────────────────────
  const groupsForCategory = (cat: TeamCategory) =>
    groups.filter(g => g.category === cat)

  const contestForCategory = (cat: 'open' | 'under') =>
    contests.find(c => c.category === cat)

  const sortedRounds = (cat: 'open' | 'under') => {
    const contest = contestForCategory(cat)
    if (!contest) return []
    return [...(contest as TpcContestFull & { tpc_rounds: { id: string; name: string; round_number: number }[] }).tpc_rounds]
      .sort((a, b) => a.round_number - b.round_number)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-court-gray">Caricamento...</p>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Errore: ledwall_state non trovato.</p>
      </div>
    )
  }

  const config = state.scene_config ?? {}

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Ledwall</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          Controllo Ledwall
        </h1>
        <p className="text-court-gray mt-1">
          Gestisci la visualizzazione sul ledwall 896×512 px
        </p>
      </div>

      {/* ── Status bar ── */}
      <div className="card p-4 border-brand-orange/30 bg-brand-orange/5 flex items-center justify-between">
        <div>
          <p className="text-court-muted text-xs font-display uppercase tracking-wide">Stato attivo</p>
          <p className="text-court-white font-display font-bold text-xl">
            {state.mode === 'contextual' ? 'Contestuale' : `Fisso — ${SCENES.find(s => s.key === state.fixed_scene)?.label}`}
          </p>
        </div>
        <a
          href="/ledwall"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm px-4 py-2"
        >
          Apri ledwall →
        </a>
      </div>

      {/* ── Mode selector ── */}
      <div className="card p-6">
        <h2 className="font-display font-bold uppercase text-lg text-court-white mb-4">Modalità</h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            { key: 'contextual' as LedwallMode, label: 'Contestuale', desc: 'Rotazione automatica: partite → sponsor → scena live' },
            { key: 'fixed'      as LedwallMode, label: 'Fisso',       desc: 'Mostra sempre la scena selezionata' },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              disabled={saving}
              className={clsx(
                'p-5 text-left rounded border-2 transition-all',
                state.mode === m.key
                  ? 'border-brand-orange bg-brand-orange/10'
                  : 'border-court-border bg-court-surface hover:border-court-muted',
              )}
            >
              <p className={clsx('font-display font-bold text-xl mb-1', state.mode === m.key ? 'text-brand-orange' : 'text-court-white')}>
                {m.label}
              </p>
              <p className="text-court-muted text-sm">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Fixed scene picker ── */}
      {state.mode === 'fixed' && (
        <div className="card p-6 space-y-6">
          <h2 className="font-display font-bold uppercase text-lg text-court-white">Scena</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {SCENES.map(s => (
              <button
                key={s.key}
                onClick={() => setScene(s.key)}
                disabled={saving}
                className={clsx(
                  'p-4 text-left rounded border-2 transition-all',
                  state.fixed_scene === s.key
                    ? 'border-brand-orange bg-brand-orange/10'
                    : 'border-court-border bg-court-surface hover:border-court-muted',
                )}
              >
                <p className={clsx('font-display font-bold text-lg mb-1', state.fixed_scene === s.key ? 'text-brand-orange' : 'text-court-white')}>
                  {s.label}
                </p>
                <p className="text-court-muted text-xs">{s.description}</p>
              </button>
            ))}
          </div>

          {/* ── Scene config ── */}
          <div className="pt-4 border-t border-court-border">
            <SceneConfig
              scene={state.fixed_scene}
              config={config}
              groups={groups}
              groupsForCategory={groupsForCategory}
              sortedRounds={sortedRounds}
              saving={saving}
              onChange={saveConfig}
            />
          </div>
        </div>
      )}

      {/* ── Transition selector ── */}
      <div className="card p-6">
        <h2 className="font-display font-bold uppercase text-lg text-court-white mb-4">Transizione</h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            { key: 'fade'  as LedwallTransition, label: 'Fade',  desc: 'Dissolvenza semplice (300ms)' },
            { key: 'sting' as LedwallTransition, label: 'Sting', desc: 'Il leone attraversa lo schermo' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTransition(t.key)}
              disabled={saving}
              className={clsx(
                'p-5 text-left rounded border-2 transition-all',
                state.transition === t.key
                  ? 'border-brand-orange bg-brand-orange/10'
                  : 'border-court-border bg-court-surface hover:border-court-muted',
              )}
            >
              <p className={clsx('font-display font-bold text-xl mb-1', state.transition === t.key ? 'text-brand-orange' : 'text-court-white')}>
                {t.label}
              </p>
              <p className="text-court-muted text-sm">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Frame image ── */}
      <div className="card p-6">
        <h2 className="font-display font-bold uppercase text-lg text-court-white mb-2">Cornice</h2>
        <p className="text-court-muted text-sm mb-4">
          Immagine decorativa visibile attorno al riquadro bianco (896×512).
          Carica un&apos;immagine con sfondo trasparente per ottenere l&apos;effetto cornice.
        </p>
        <MediaPickerInput
          label="Immagine cornice"
          value={state.frame_url ?? ''}
          onChange={setFrame}
          preview="landscape"
        />
        {state.frame_url && (
          <button
            onClick={() => save({ frame_url: null })}
            className="mt-3 text-xs text-court-muted hover:text-red-400 transition-colors"
            disabled={saving}
          >
            Rimuovi cornice
          </button>
        )}
      </div>

      {/* ── Info note ── */}
      <div className="p-4 bg-court-surface rounded border border-court-border">
        <p className="text-court-gray text-sm">
          <span className="text-brand-orange font-display uppercase tracking-wide">Nota:</span>{' '}
          Il ledwall si aggiorna ogni ~20 secondi. I dati delle scene si aggiornano ogni ~25 secondi.
        </p>
      </div>
    </div>
  )
}

// ─── Scene-specific config form ───────────────────────────────────────────────

function SceneConfig({
  scene, config, groups, groupsForCategory, sortedRounds, saving, onChange,
}: {
  scene: LedwallScene
  config: LedwallSceneConfig
  groups: GroupWithTeams[]
  groupsForCategory: (cat: TeamCategory) => GroupWithTeams[]
  sortedRounds: (cat: 'open' | 'under') => { id: string; name: string; round_number: number }[]
  saving: boolean
  onChange: (c: LedwallSceneConfig) => void
}) {
  if (scene === 'matches') {
    return (
      <p className="text-court-muted text-sm italic">Nessuna configurazione necessaria per questa scena.</p>
    )
  }

  if (scene === 'standings') {
    const cat     = config.category ?? 'open_m'
    const catGroups = groupsForCategory(cat as TeamCategory)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={cat}
            onChange={e => onChange({ ...config, category: e.target.value as TeamCategory, group_id: undefined })}
            disabled={saving}
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Girone</label>
          <select
            className="input"
            value={config.group_id ?? ''}
            onChange={e => onChange({ ...config, group_id: e.target.value || undefined })}
            disabled={saving}
          >
            <option value="">Tutti i gironi</option>
            {catGroups.map(g => (
              <option key={g.id} value={g.id}>Girone {g.name}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  if (scene === 'finals') {
    return (
      <div className="max-w-xs">
        <label className="label">Categoria</label>
        <select
          className="input"
          value={config.category ?? 'open_m'}
          onChange={e => onChange({ ...config, category: e.target.value as TeamCategory })}
          disabled={saving}
        >
          {CATEGORY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (scene === 'sponsors') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Visualizzazione</label>
          <select
            className="input"
            value={config.variant ?? 'rotation'}
            onChange={e => onChange({ ...config, variant: e.target.value as 'rotation' | 'all' | 'gold' })}
            disabled={saving}
          >
            <option value="rotation">Rotazione fissa (4 sponsor fissi)</option>
            <option value="all">Tutti gli sponsor (4 alla volta, auto)</option>
            <option value="gold">Solo Gold/Main (4 alla volta, auto)</option>
          </select>
        </div>
        {(config.variant ?? 'rotation') === 'rotation' && (
          <div>
            <label className="label">Gruppo di 4 (0 = primi 4, 1 = dal 5° all&apos;8°…)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={config.rotation_index ?? 0}
              onChange={e => onChange({ ...config, rotation_index: Math.max(0, parseInt(e.target.value) || 0) })}
              disabled={saving}
            />
          </div>
        )}
      </div>
    )
  }

  if (scene === 'tpc') {
    const cat   = (config.contest_category as 'open' | 'under') ?? 'open'
    const rounds = sortedRounds(cat)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Categoria gara</label>
          <select
            className="input"
            value={cat}
            onChange={e => onChange({ ...config, contest_category: e.target.value as 'open' | 'under', round_id: undefined })}
            disabled={saving}
          >
            <option value="open">Open</option>
            <option value="under">Under</option>
          </select>
        </div>
        <div>
          <label className="label">Turno</label>
          <select
            className="input"
            value={config.round_id ?? ''}
            onChange={e => onChange({ ...config, round_id: e.target.value || undefined })}
            disabled={saving}
          >
            <option value="">Ultimo turno disponibile</option>
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return null
}
