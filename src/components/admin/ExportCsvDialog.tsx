'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

type ExportMode = 'full' | 'players' | 'teams'

const modes: { value: ExportMode; label: string; description: string }[] = [
  {
    value: 'full',
    label: 'Per squadra (completo)',
    description: 'Una riga per squadra con tutti i dettagli di ogni giocatore.',
  },
  {
    value: 'players',
    label: 'Per giocatore',
    description: 'Una riga per giocatore. Le ultime colonne indicano nome squadra e categoria.',
  },
  {
    value: 'teams',
    label: 'Per squadra (ridotto)',
    description: 'Una riga per squadra. Include solo nome, email e telefono del capitano, senza i dettagli degli altri giocatori.',
  },
]

interface Props {
  editionId: string
  categoryFilter?: string
}

export default function ExportCsvDialog({ editionId, categoryFilter }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ExportMode>('full')

  function handleExport() {
    const params = new URLSearchParams({ edition: editionId, mode })
    if (categoryFilter) params.set('category', categoryFilter)
    window.location.href = `/api/admin/teams/export?${params.toString()}`
    setOpen(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm px-4 py-2">
        <Download size={14} /> Esporta CSV
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-display font-bold uppercase text-xl text-court-white mb-1">
              Esporta CSV
            </h2>
            <p className="text-court-gray text-sm mb-5">Scegli il formato di esportazione.</p>

            <div className="space-y-2 mb-6">
              {modes.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={[
                    'w-full text-left px-4 py-3 border transition-colors',
                    mode === m.value
                      ? 'border-brand-orange bg-brand-orange/10 text-court-white'
                      : 'border-court-border text-court-muted hover:border-court-gray hover:text-court-light',
                  ].join(' ')}
                >
                  <span className="font-display font-bold uppercase tracking-wide text-sm block">
                    {m.label}
                  </span>
                  <span className="text-xs mt-0.5 block">{m.description}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-ghost text-sm px-4 py-2">
                Annulla
              </button>
              <button onClick={handleExport} className="btn-primary text-sm px-4 py-2">
                <Download size={14} /> Esporta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
