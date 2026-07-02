'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import MediaPickerInput from '@/components/admin/MediaPickerInput'
import clsx from 'clsx'
import imageCompression from 'browser-image-compression'
import type {
  LedwallState, LedwallMode, LedwallScene, LedwallTransition, LedwallSceneConfig,
  GroupWithTeams, TpcContestFull, TeamCategory, Sponsor, LedwallBachecaImage,
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
  { key: 'sponsors', label: 'Sponsor',   description: 'Ruota tutti, solo gold, o sponsor fisso' },
  { key: 'tpc',      label: '3-Point',   description: '3-Point Contest per turno' },
  { key: 'bacheca',  label: 'Bacheca',   description: 'Immagine fissa da libreria' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LedwallAdminPage() {
  const [state,         setState]        = useState<LedwallState | null>(null)
  const [draft,         setDraft]        = useState<{
    mode: LedwallMode
    fixed_scene: LedwallScene
    scene_config: LedwallSceneConfig
  } | null>(null)
  const [groups,        setGroups]       = useState<GroupWithTeams[]>([])
  const [contests,      setContests]     = useState<TpcContestFull[]>([])
  const [sponsors,      setSponsors]     = useState<Sponsor[]>([])
  const [bachecaImages, setBachecaImages]= useState<LedwallBachecaImage[]>([])
  const [loading,       setLoading]      = useState(true)
  const [saving,        setSaving]       = useState(false)

  const [customText, setCustomText] = useState('')
  const [firing, setFiring] = useState(false)

  const supabase = createClient()

  async function loadBachecaImages() {
    const { data } = await supabase
      .from('ledwall_bacheca_images')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setBachecaImages((data as LedwallBachecaImage[]) ?? [])
  }

  // ── Fetch current state + option data ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: st }, { data: gr }, { data: tc }, { data: sp }] = await Promise.all([
        supabase.from('ledwall_state').select('*').eq('id', 'default').single(),
        supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('category').order('sort_order'),
        supabase.from('tpc_contests').select('*, tpc_rounds(id, name, round_number)').order('category'),
        supabase.from('sponsors').select('*').eq('is_active', true).order('sort_order'),
      ])
      if (st) {
        const ledwallSt = st as LedwallState
        setState(ledwallSt)
        setDraft({ mode: ledwallSt.mode, fixed_scene: ledwallSt.fixed_scene, scene_config: ledwallSt.scene_config ?? {} })
      }
      setGroups(gr ?? [])
      setContests(tc ?? [])
      setSponsors(sp ?? [])
      setLoading(false)
    }
    Promise.all([load(), loadBachecaImages()])
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

  async function applyDraft() {
    if (!draft) return
    await save({ mode: draft.mode, fixed_scene: draft.fixed_scene, scene_config: draft.scene_config })
  }

  function setTransition(transition: LedwallTransition) { save({ transition }) }
  function setFrame(frame_url: string)                  { save({ frame_url }) }

  const CUSTOM_TEXT_MAX = 36

  async function launchPulse(text: string) {
    if (firing || !text) return
    setFiring(true)
    await save({
      launchpad_text: text,
      launchpad_count: (state?.launchpad_count ?? 0) + 1,
    })
    if (text === customText) setCustomText('')
    setTimeout(() => setFiring(false), 1500)
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const isDirty = draft && state && (
    draft.mode !== state.mode ||
    draft.fixed_scene !== state.fixed_scene ||
    JSON.stringify(draft.scene_config) !== JSON.stringify(state.scene_config ?? {})
  )

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

  if (!state || !draft) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Errore: ledwall_state non trovato.</p>
      </div>
    )
  }

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

      {/* ── Scene / mode picker ── */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold uppercase text-lg text-court-white">Scena</h2>
          {isDirty && (
            <button
              onClick={applyDraft}
              disabled={saving}
              className="btn-primary text-sm px-5 py-2"
            >
              {saving ? 'Applicazione…' : 'Applica →'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Contestuale tile */}
          <button
            onClick={() => setDraft(d => ({ ...d!, mode: 'contextual' }))}
            className={clsx(
              'p-4 text-left rounded border-2 transition-all',
              draft.mode === 'contextual'
                ? 'border-brand-orange bg-brand-orange/10'
                : 'border-court-border bg-court-surface hover:border-court-muted',
            )}
          >
            <p className={clsx('font-display font-bold text-lg mb-1', draft.mode === 'contextual' ? 'text-brand-orange' : 'text-court-white')}>
              Contestuale
            </p>
            <p className="text-court-muted text-xs">Rotazione automatica: partite → sponsor → scena live</p>
          </button>

          {SCENES.map(s => {
            const selected = draft.mode === 'fixed' && draft.fixed_scene === s.key
            return (
              <button
                key={s.key}
                onClick={() => setDraft(d => ({ ...d!, mode: 'fixed', fixed_scene: s.key }))}
                className={clsx(
                  'p-4 text-left rounded border-2 transition-all',
                  selected
                    ? 'border-brand-orange bg-brand-orange/10'
                    : 'border-court-border bg-court-surface hover:border-court-muted',
                )}
              >
                <p className={clsx('font-display font-bold text-lg mb-1', selected ? 'text-brand-orange' : 'text-court-white')}>
                  {s.label}
                </p>
                <p className="text-court-muted text-xs">{s.description}</p>
              </button>
            )
          })}
        </div>

        {/* ── Scene config ── */}
        <div className="pt-4 border-t border-court-border">
          {draft.mode === 'contextual' ? (
            <p className="text-court-muted text-sm italic">Nessuna configurazione necessaria per questa scena.</p>
          ) : (
            <SceneConfig
              scene={draft.fixed_scene}
              config={draft.scene_config}
              groups={groups}
              sponsors={sponsors}
              bachecaImages={bachecaImages}
              groupsForCategory={groupsForCategory}
              sortedRounds={sortedRounds}
              saving={saving}
              onChange={c => setDraft(d => ({ ...d!, scene_config: c }))}
              onRefreshBacheca={loadBachecaImages}
            />
          )}
        </div>
      </div>

      {/* ── Launchpad ── */}
      <div className="card p-6">
        <h2 className="font-display font-bold uppercase text-lg text-court-white mb-2">Launchpad</h2>
        <p className="text-court-muted text-sm mb-4">
          Mostra un&apos;animazione a schermo intero sul ledwall per ~2 secondi, sopra qualsiasi scena attiva.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <button
            onClick={() => launchPulse('TRIPLA!')}
            disabled={firing}
            className={clsx('btn-primary px-6 py-3 text-lg', firing && 'opacity-60')}
          >
            {firing ? 'Inviato ✓' : 'Tripla!'}
          </button>
          <button
            onClick={() => launchPulse('DAJE!')}
            disabled={firing}
            className={clsx('btn-primary px-6 py-3 text-lg', firing && 'opacity-60')}
          >
            {firing ? 'Inviato ✓' : 'Daje!'}
          </button>
          <div className="w-px bg-court-border self-stretch" />
          <div className="flex gap-3 items-center min-w-0 md:flex-1">
            <input
              type="text"
              className="input min-w-40 uppercase flex-1 min-w-0"
              value={customText.toUpperCase()}
              onChange={e => setCustomText(e.target.value)}
              maxLength={CUSTOM_TEXT_MAX}
              placeholder="Es. FORZA CANESTREET"
              disabled={firing}
            />
            <button
              onClick={() => launchPulse(customText)}
              disabled={firing || customText.trim().length === 0}
              className={clsx('btn-primary px-6 py-3 whitespace-nowrap', firing && 'opacity-60')}
            >
              {firing ? 'Inviato ✓' : 'Mostra'}
            </button>
          </div>
        </div>
      </div>

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
          Sfondo del ledwall (896×512 px) visibile nella fascia attorno al riquadro bianco dei contenuti.
        </p>
        <MediaPickerInput
          label="Immagine cornice"
          value={state.frame_url ?? ''}
          onChange={setFrame}
          preview="none"
        />

        {/* Ledwall mockup preview */}
        <div
          className="mt-3 relative w-full aspect-[896/512] overflow-hidden bg-black border border-court-border rounded"
          style={{ containerType: 'inline-size' }}
        >
          {state.frame_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.frame_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* White content box — matches actual ledwall insets */}
          <div
            className="absolute bg-white"
            style={{
              top:    `${28 / 512 * 100}%`,
              left:   `${32 / 896 * 100}%`,
              right:  `${32 / 896 * 100}%`,
              bottom: `${52 / 512 * 100}%`,
            }}
          />
          {/* Bottom bar — mirrors real ledwall footer */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-end"
            style={{
              height:       `${52 / 512 * 100}%`,
              paddingRight: `${32 / 896 * 100}%`,
              gap:          `${20 / 896 * 100}%`,
            }}
          >
            <span
              className="font-display font-bold uppercase tracking-wide text-white leading-none whitespace-nowrap"
              style={{ fontSize: '1.6cqw' }}
            >
              canestreet.it
            </span>
            <div className="bg-white/60 w-px" style={{ height: '55%' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/estathe-3x3-italia-logo.png" alt="" style={{ height: '58%', width: 'auto' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fip-logo-white.png" alt="" style={{ height: '46%', width: 'auto' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lb3-logo-white.png" alt="" style={{ height: '46%', width: 'auto' }} />
          </div>
        </div>

        {state.frame_url && (
          <button
            onClick={() => save({ frame_url: null })}
            className="mt-2 text-xs text-court-muted hover:text-red-400 transition-colors"
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
          Il ledwall si aggiorna ogni ~20 secondi (ogni 2 secondi in modalità bacheca o sponsor fisso). I dati delle scene si aggiornano ogni ~25 secondi.
        </p>
      </div>
    </div>
  )
}

// ─── Scene-specific config form ───────────────────────────────────────────────

function SceneConfig({
  scene, config, groups, sponsors, bachecaImages, groupsForCategory, sortedRounds, saving, onChange, onRefreshBacheca,
}: {
  scene: LedwallScene
  config: LedwallSceneConfig
  groups: GroupWithTeams[]
  sponsors: Sponsor[]
  bachecaImages: LedwallBachecaImage[]
  groupsForCategory: (cat: TeamCategory) => GroupWithTeams[]
  sortedRounds: (cat: 'open' | 'under') => { id: string; name: string; round_number: number }[]
  saving: boolean
  onChange: (c: LedwallSceneConfig) => void
  onRefreshBacheca: () => Promise<void>
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
    const variant = config.variant ?? 'all'
    return (
      <div className="space-y-4">
        <div className="max-w-xs">
          <label className="label">Visualizzazione</label>
          <select
            className="input"
            value={variant}
            onChange={e => onChange({ ...config, variant: e.target.value as LedwallSceneConfig['variant'], sponsor_id: undefined })}
            disabled={saving}
          >
            <option value="all">Ruota tutti gli sponsor</option>
            <option value="gold">Ruota solo Gold/Main</option>
            <option value="fixed_single">Sponsor fisso</option>
          </select>
        </div>
        {variant === 'fixed_single' && (
          <div>
            <label className="label">Sponsor da mostrare</label>
            <div className="overflow-y-auto max-h-52 border border-court-border rounded p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {[...sponsors]
                .sort((a, b) => {
                  const TIER_ORDER: Record<string, number> = { main: 0, gold: 1, silver: 2, bronze: 3 }
                  const tierDiff = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)
                  return tierDiff !== 0 ? tierDiff : a.name.localeCompare(b.name)
                })
                .map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChange({ ...config, sponsor_id: s.id })}
                    disabled={saving}
                    className={clsx(
                      'flex flex-col rounded border-2 transition-all overflow-hidden',
                      config.sponsor_id === s.id
                        ? 'border-brand-orange'
                        : 'border-court-border hover:border-court-muted',
                    )}
                  >
                    <div className="bg-white w-full aspect-[52/27] relative">
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="absolute inset-0 w-full h-full object-contain" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-xs text-gray-400 text-center uppercase leading-tight p-1">
                          {s.name}
                        </span>
                      )}
                    </div>
                    <span className={clsx(
                      'text-xs font-display uppercase text-center leading-tight line-clamp-1 px-1 py-1 bg-court-surface',
                      config.sponsor_id === s.id ? 'text-brand-orange' : 'text-court-muted',
                    )}>
                      {s.name}
                    </span>
                  </button>
                ))}
            </div>
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

  if (scene === 'bacheca') {
    return <BachecaSceneConfig images={bachecaImages} config={config} onChange={onChange} onRefresh={onRefreshBacheca} />
  }

  return null
}

// ─── Bacheca unified component (upload + select + rename + delete) ────────────

async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/webp') return file
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  return new Promise(resolve =>
    canvas.toBlob(
      blob => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })),
      'image/webp',
      quality,
    )
  )
}

function BachecaSceneConfig({
  images,
  config,
  onRefresh,
  onChange,
}: {
  images: LedwallBachecaImage[]
  config: LedwallSceneConfig
  onRefresh: () => Promise<void>
  onChange: (c: LedwallSceneConfig) => void
}) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr(null)

    if (!file.type.startsWith('image/')) {
      setUploadErr('Solo file immagine consentiti.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErr('Dimensione massima 5 MB.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    const webp = await convertToWebP(file)
    const compressed = await imageCompression(webp, { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true })
    const ext  = compressed.name.split('.').pop()
    const path = `bacheca/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`

    const { error: storageErr } = await supabase.storage.from('media').upload(path, compressed, { cacheControl: '31536000', upsert: false })
    if (storageErr) { setUploadErr(storageErr.message); setUploading(false); return }

    const url   = base + path
    const label = file.name.replace(/\.[^.]+$/, '')
    await supabase.from('ledwall_bacheca_images').insert({ url, label })
    await onRefresh()
    onChange({ ...config, bacheca_image_url: url })

    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  async function handleDelete(img: LedwallBachecaImage) {
    const filename = img.url.split('/media/')[1]
    if (filename) await supabase.storage.from('media').remove([filename])
    await supabase.from('ledwall_bacheca_images').delete().eq('id', img.id)
    await onRefresh()
    if (config.bacheca_image_url === img.url) {
      onChange({ ...config, bacheca_image_url: undefined })
    }
  }

  async function handleLabelBlur(img: LedwallBachecaImage, label: string) {
    await supabase.from('ledwall_bacheca_images').update({ label }).eq('id', img.id)
    await onRefresh()
  }

  return (
    <div className="space-y-3">
      {/* Upload */}
      <div className="flex items-center gap-3">
        <label className={clsx(
          'btn-ghost text-sm px-4 py-2 cursor-pointer flex items-center gap-2 whitespace-nowrap',
          uploading && 'opacity-50 pointer-events-none',
        )}>
          {uploading ? 'Caricamento…' : '+ Carica immagine'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        {uploadErr && <p className="text-red-400 text-sm">{uploadErr}</p>}
      </div>

      {/* Image grid */}
      {images.length === 0 ? (
        <p className="text-court-muted text-sm italic">Nessuna immagine in bacheca. Caricane una.</p>
      ) : (
        <div className="overflow-y-auto max-h-72 border border-court-border rounded p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map(img => {
            const selected = config.bacheca_image_url === img.url
            return (
              <div
                key={img.id}
                className={clsx(
                  'flex flex-col rounded border-2 overflow-hidden transition-all',
                  selected ? 'border-brand-orange' : 'border-court-border hover:border-court-muted',
                )}
              >
                {/* Click thumbnail to select */}
                <button
                  type="button"
                  onClick={() => onChange({ ...config, bacheca_image_url: img.url })}
                  className="block w-full bg-white aspect-[52/27] relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="absolute inset-0 w-full h-full object-contain" />
                </button>
                {/* Label + delete */}
                <div className="bg-court-surface px-2 py-1.5 flex items-center gap-1">
                  <input
                    key={img.label}
                    className={clsx(
                      'flex-1 min-w-0 bg-transparent text-xs font-display uppercase focus:outline-none focus:text-court-white',
                      selected ? 'text-brand-orange' : 'text-court-muted',
                    )}
                    defaultValue={img.label}
                    onBlur={e => handleLabelBlur(img, e.target.value)}
                    title="Modifica etichetta"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    className="shrink-0 text-court-muted hover:text-red-400 transition-colors ml-1"
                    title="Elimina"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
