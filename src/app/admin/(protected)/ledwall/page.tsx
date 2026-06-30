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
  const [state,    setState]    = useState<LedwallState | null>(null)
  const [groups,   setGroups]   = useState<GroupWithTeams[]>([])
  const [contests, setContests] = useState<TpcContestFull[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const supabase = createClient()

  // ── Fetch current state + option data ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: st }, { data: gr }, { data: tc }, { data: sp }] = await Promise.all([
        supabase.from('ledwall_state').select('*').eq('id', 'default').single(),
        supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('category').order('sort_order'),
        supabase.from('tpc_contests').select('*, tpc_rounds(id, name, round_number)').order('category'),
        supabase.from('sponsors').select('*').eq('is_active', true).order('sort_order'),
      ])
      if (st) setState(st as LedwallState)
      setGroups(gr ?? [])
      setContests(tc ?? [])
      setSponsors(sp ?? [])
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
              sponsors={sponsors}
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

      {/* ── Bacheca image library ── */}
      <div className="card p-6">
        <h2 className="font-display font-bold uppercase text-lg text-court-white mb-1">Bacheca</h2>
        <p className="text-court-muted text-sm mb-4">
          Prepara le immagini anche mentre è attiva un&apos;altra scena. Quando attivi la scena Bacheca verrà mostrata l&apos;immagine selezionata.
        </p>
        <BachecaConfig config={config} onChange={saveConfig} />
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
  scene, config, groups, sponsors, groupsForCategory, sortedRounds, saving, onChange,
}: {
  scene: LedwallScene
  config: LedwallSceneConfig
  groups: GroupWithTeams[]
  sponsors: Sponsor[]
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
                      'flex flex-col items-center gap-1 p-2 rounded border-2 transition-all',
                      config.sponsor_id === s.id
                        ? 'border-brand-orange bg-brand-orange/10'
                        : 'border-court-border hover:border-court-muted bg-white',
                    )}
                  >
                    <div className="w-full h-12 flex items-center justify-center bg-white rounded">
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-display font-bold text-xs text-gray-500 text-center uppercase leading-tight">
                          {s.name}
                        </span>
                      )}
                    </div>
                    <span className={clsx(
                      'text-xs font-display uppercase text-center leading-tight line-clamp-2',
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
    return <BachecaImagePicker config={config} onChange={onChange} />
  }

  return null
}

// ─── Bacheca image picker (scene config — select only) ────────────────────────

function BachecaImagePicker({
  config,
  onChange,
}: {
  config: LedwallSceneConfig
  onChange: (c: LedwallSceneConfig) => void
}) {
  const supabase = createClient()
  const [images, setImages] = useState<LedwallBachecaImage[]>([])

  useEffect(() => {
    supabase
      .from('ledwall_bacheca_images')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setImages((data as LedwallBachecaImage[]) ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (images.length === 0) {
    return (
      <p className="text-court-muted text-sm italic">
        Nessuna immagine in bacheca. Aggiungile dalla sezione Bacheca qui sotto.
      </p>
    )
  }

  return (
    <div className="overflow-y-auto max-h-52 border border-court-border rounded p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {images.map(img => (
        <button
          key={img.id}
          type="button"
          onClick={() => onChange({ ...config, bacheca_image_url: img.url })}
          className={clsx(
            'flex flex-col rounded border-2 transition-all overflow-hidden',
            config.bacheca_image_url === img.url
              ? 'border-brand-orange'
              : 'border-court-border hover:border-court-muted',
          )}
        >
          <div className="bg-white w-full aspect-[52/27] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.label} className="absolute inset-0 w-full h-full object-contain" />
          </div>
          <span className={clsx(
            'text-xs font-display uppercase text-center leading-tight px-1 py-1 line-clamp-1 bg-court-surface',
            config.bacheca_image_url === img.url ? 'text-brand-orange' : 'text-court-muted',
          )}>
            {img.label || '—'}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Bacheca library management (always-visible card) ─────────────────────────

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

function BachecaConfig({
  config,
  onChange,
}: {
  config: LedwallSceneConfig
  onChange: (c: LedwallSceneConfig) => void
}) {
  const supabase = createClient()
  const [images,    setImages]    = useState<LedwallBachecaImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadImages() {
    const { data } = await supabase
      .from('ledwall_bacheca_images')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setImages((data as LedwallBachecaImage[]) ?? [])
  }

  useEffect(() => { loadImages() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

    const { error: storageErr } = await supabase.storage.from('media').upload(path, compressed)
    if (storageErr) { setUploadErr(storageErr.message); setUploading(false); return }

    const url   = base + path
    const label = pendingLabel.trim() || file.name.replace(/\.[^.]+$/, '')
    const { data: row } = await supabase
      .from('ledwall_bacheca_images')
      .insert({ url, label })
      .select()
      .single()

    if (row) {
      await loadImages()
      onChange({ ...config, bacheca_image_url: url })
    }

    setPendingLabel('')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  async function handleDelete(img: LedwallBachecaImage) {
    const filename = img.url.split('/media/')[1]
    if (filename) await supabase.storage.from('media').remove([filename])
    await supabase.from('ledwall_bacheca_images').delete().eq('id', img.id)
    await loadImages()
    if (config.bacheca_image_url === img.url) {
      onChange({ ...config, bacheca_image_url: undefined })
    }
  }

  async function handleLabelChange(img: LedwallBachecaImage, label: string) {
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, label } : i))
    await supabase.from('ledwall_bacheca_images').update({ label }).eq('id', img.id)
  }

  return (
    <div className="space-y-4">
      {/* Upload row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex-1">
          <label className="label">Etichetta (opzionale)</label>
          <input
            className="input"
            placeholder="Nome immagine…"
            value={pendingLabel}
            onChange={e => setPendingLabel(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div className="shrink-0">
          <label className="label">Carica immagine</label>
          <label className={clsx(
            'btn-ghost text-sm px-4 py-2 cursor-pointer flex items-center gap-2 whitespace-nowrap',
            uploading && 'opacity-50 pointer-events-none',
          )}>
            {uploading ? 'Caricamento…' : '+ Carica'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploadErr && (
        <p className="text-red-400 text-sm">{uploadErr}</p>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <p className="text-court-muted text-sm italic">Nessuna immagine in bacheca. Caricane una.</p>
      ) : (
        <div className="overflow-y-auto max-h-72 border border-court-border rounded p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map(img => (
            <div
              key={img.id}
              className={clsx(
                'flex flex-col rounded border-2 transition-all overflow-hidden',
                config.bacheca_image_url === img.url
                  ? 'border-brand-orange'
                  : 'border-court-border hover:border-court-muted',
              )}
            >
              {/* Thumbnail — click to select */}
              <button
                type="button"
                onClick={() => onChange({ ...config, bacheca_image_url: img.url })}
                className="w-full bg-white aspect-[52/27] relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.label}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </button>

              {/* Label + delete */}
              <div className="bg-court-surface px-2 py-1.5 flex items-center gap-1">
                <input
                  className="flex-1 min-w-0 bg-transparent text-xs font-display uppercase text-court-muted focus:outline-none focus:text-court-white"
                  value={img.label}
                  onChange={e => handleLabelChange(img, e.target.value)}
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
          ))}
        </div>
      )}
    </div>
  )
}
