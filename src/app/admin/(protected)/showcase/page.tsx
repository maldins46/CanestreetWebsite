'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ShowcaseMode } from '@/types'
import clsx from 'clsx'

const MODES: { key: ShowcaseMode; label: string; description: string }[] = [
  { key: 'open', label: 'Open', description: 'Calendario + Classifiche Open' },
  { key: 'under', label: 'Under', description: 'Carosello categorie U14/U16/U18' },
  { key: 'tpc_open', label: '3PT Open', description: 'Risultati 3-Point Contest Open' },
  { key: 'tpc_under', label: '3PT Under', description: 'Risultati 3-Point Contest Under' },
  { key: 'sponsors', label: 'Sponsor', description: 'Solo carosello sponsor' },
]

export default function ShowcaseAdminPage() {
  const [currentMode, setCurrentMode] = useState<ShowcaseMode | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function fetchMode() {
      const { data } = await supabase
        .from('showcase_modes')
        .select('mode')
        .eq('id', 'default')
        .single()
      if (data) setCurrentMode(data.mode)
      setLoading(false)
    }
    fetchMode()
  }, [supabase])

  async function switchMode(mode: ShowcaseMode) {
    setUpdating(true)
    const { error } = await supabase
      .from('showcase_modes')
      .update({ mode, updated_at: new Date().toISOString() })
      .eq('id', 'default')

    if (!error) setCurrentMode(mode)
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-court-gray">Caricamento...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-2">Showcase</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          Controllo Schermo
        </h1>
        <p className="text-court-gray mt-1">
          Seleziona la modalità da mostrare sullo schermo pubblico
        </p>
      </div>

      {/* Current mode indicator */}
      <div className="card p-4 mb-8 border-brand-orange/30 bg-brand-orange/5 flex items-center justify-between">
        <div>
          <p className="text-court-muted text-xs font-display uppercase tracking-wide">Modalità attiva</p>
          <p className="text-court-white font-display font-bold text-xl">
            {MODES.find(m => m.key === currentMode)?.label ?? '—'}
          </p>
        </div>
        {currentMode && (
          <a
            href="/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            Apri showcase →
          </a>
        )}
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {MODES.map(mode => (
          <button
            key={mode.key}
            onClick={() => switchMode(mode.key)}
            disabled={updating}
            className={clsx(
              'card p-6 text-left transition-all border-2',
              currentMode === mode.key
                ? 'border-brand-orange bg-brand-orange/10'
                : 'border-transparent hover:border-court-muted',
            )}
          >
            <p className={clsx(
              'font-display font-bold text-2xl mb-2',
              currentMode === mode.key ? 'text-brand-orange' : 'text-court-white',
            )}>
              {mode.label}
            </p>
            <p className="text-court-muted text-sm">{mode.description}</p>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-court-surface rounded border border-court-border">
        <p className="text-court-gray text-sm">
          <span className="text-brand-orange font-display uppercase tracking-wide">Nota:</span>{' '}
          Lo schermo showcase si aggiorna automaticamente ogni 15 secondi. 
          Per forzare l&apos;aggiornamento, ricarica la pagina.
        </p>
      </div>
    </div>
  )
}