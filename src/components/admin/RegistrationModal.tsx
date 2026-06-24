'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LockOpen, Lock, Save, X } from 'lucide-react'
import type { EditionCategorySettings, TeamCategory } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'

const CATEGORIES: TeamCategory[] = ['open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m']

type CatState = {
  id?: string
  registration_open: boolean
  max_teams: number | null
}

interface Props {
  editionId: string
  registrationOpen: boolean
  categorySettings: Pick<EditionCategorySettings, 'id' | 'category' | 'registration_open' | 'max_teams'>[]
  teamCounts: Record<TeamCategory, number>
}

export default function RegistrationModal({ editionId, registrationOpen, categorySettings, teamCounts }: Props) {
  const [open, setOpen] = useState(false)
  const [globalOpen, setGlobalOpen] = useState(registrationOpen)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function initCatState(): Record<TeamCategory, CatState> {
    const defaults: Record<TeamCategory, CatState> = {
      open_m: { registration_open: true, max_teams: null },
      open_f: { registration_open: true, max_teams: null },
      u14_m:  { registration_open: true, max_teams: null },
      u16_m:  { registration_open: true, max_teams: null },
      u18_m:  { registration_open: true, max_teams: null },
    }
    for (const s of categorySettings) {
      defaults[s.category] = { id: s.id, registration_open: s.registration_open, max_teams: s.max_teams }
    }
    return defaults
  }

  const [catState, setCatState] = useState<Record<TeamCategory, CatState>>(initCatState)

  function openModal() {
    setGlobalOpen(registrationOpen)
    setCatState(initCatState())
    setOpen(true)
  }

  async function save() {
    setSaving(true)

    const { error: edErr } = await supabase
      .from('editions')
      .update({ registration_open: globalOpen })
      .eq('id', editionId)
    if (edErr) { setSaving(false); return }

    const originalIds = new Set(categorySettings.map(s => s.id))
    const catPayload = CATEGORIES.map(cat => ({
      ...(catState[cat].id ? { id: catState[cat].id } : { id: crypto.randomUUID() }),
      edition_id: editionId,
      category: cat,
      registration_open: catState[cat].registration_open,
      max_teams: catState[cat].max_teams,
    }))
    const existing = catPayload.filter(r => originalIds.has(r.id))
    const newRows  = catPayload.filter(r => !originalIds.has(r.id))

    if (existing.length > 0) {
      const { error } = await supabase.from('edition_category_settings').upsert(existing)
      if (error) { setSaving(false); return }
    }
    if (newRows.length > 0) {
      const { error } = await supabase.from('edition_category_settings').insert(newRows)
      if (error) { setSaving(false); return }
    }

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={openModal}
        className={`flex items-center gap-2 px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
          registrationOpen
            ? 'btn-registration-open'
            : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
        }`}
      >
        {registrationOpen ? <LockOpen size={12} /> : <Lock size={12} />}
        {registrationOpen ? 'Iscrizioni aperte' : 'Iscrizioni chiuse'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display font-bold uppercase text-xl text-court-white">Iscrizioni</h2>
                <p className="text-court-gray text-xs mt-0.5">
                  {globalOpen
                    ? 'Interruttore globale attivo — le categorie seguono le impostazioni sotto.'
                    : 'Interruttore globale disattivo — tutte le iscrizioni sono chiuse.'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-court-muted hover:text-court-white transition-colors p-1 shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Master switch */}
            <div className="flex items-center justify-between card p-3 mb-4">
              <span className="font-display uppercase tracking-wide text-sm text-court-light">Interruttore globale</span>
              <button
                type="button"
                onClick={() => setGlobalOpen(v => !v)}
                className={`flex items-center gap-2 px-4 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
                  globalOpen
                    ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                    : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
                }`}
              >
                {globalOpen ? <LockOpen size={12} /> : <Lock size={12} />}
                {globalOpen ? 'Aperte' : 'Chiuse'}
              </button>
            </div>

            {/* Per-category */}
            <div className="space-y-2 mb-5">
              {CATEGORIES.map(cat => {
                const s = catState[cat]
                const count = teamCounts[cat] ?? 0
                const isFull = s.max_teams != null && count >= s.max_teams
                return (
                  <div key={cat} className="card p-3 flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-display uppercase font-semibold rounded shrink-0 ${CATEGORY_COLORS[cat]}`}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCatState(prev => ({
                        ...prev,
                        [cat]: { ...prev[cat], registration_open: !prev[cat].registration_open },
                      }))}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-display uppercase tracking-wide border transition-colors ${
                        s.registration_open
                          ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                          : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
                      }`}
                    >
                      {s.registration_open ? <LockOpen size={11} /> : <Lock size={11} />}
                      {s.registration_open ? 'Aperte' : 'Chiuse'}
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-court-muted text-xs whitespace-nowrap">Max</label>
                      <input
                        type="number"
                        min={1}
                        className="input py-1 text-sm w-16 text-center"
                        placeholder="∞"
                        value={s.max_teams ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value) || null
                          setCatState(prev => ({ ...prev, [cat]: { ...prev[cat], max_teams: val } }))
                        }}
                      />
                      <span className={`text-xs font-mono w-14 text-right ${isFull ? 'text-red-400' : 'text-court-muted'}`}>
                        {count}{s.max_teams != null ? `/${s.max_teams}` : ''} iscr.
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2">
                <Save size={14} /> {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
