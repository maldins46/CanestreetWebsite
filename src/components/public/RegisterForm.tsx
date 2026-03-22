'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { editionId: string }

export default function RegisterForm({ editionId }: Props) {
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    const fd = new FormData(e.currentTarget)
    const payload = {
      edition_id:    editionId,
      name:          fd.get('name')          as string,
      captain_name:  fd.get('captain_name')  as string,
      captain_email: fd.get('captain_email') as string,
      captain_phone: fd.get('captain_phone') as string || null,
      player2_name:  fd.get('player2_name')  as string,
      player3_name:  fd.get('player3_name')  as string,
      player4_name:  fd.get('player4_name')  as string || null,
      notes:         fd.get('notes')         as string || null,
    }

    const { error: err } = await supabase.from('teams').insert(payload)
    if (err) { setStatus('error'); setError(err.message); return }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="card p-10 text-center animate-fade-in">
        <div className="text-5xl mb-4">🏀</div>
        <h2 className="font-display font-bold uppercase text-2xl text-court-white mb-2">Iscrizione inviata!</h2>
        <p className="text-court-gray">Riceverai una conferma via email. Ci vediamo in campo.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Team */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-6">
          La squadra
        </h3>
        <div>
          <label className="label">Nome della squadra *</label>
          <input name="name" required className="input" placeholder="es. Street Ballers" />
        </div>
      </section>

      {/* Captain */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-6">
          Capitano
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome e cognome *</label>
            <input name="captain_name" required className="input" placeholder="Mario Rossi" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="captain_email" type="email" required className="input" placeholder="mario@email.com" />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input name="captain_phone" type="tel" className="input" placeholder="+39 333 0000000" />
          </div>
        </div>
      </section>

      {/* Players */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-6">
          Giocatori
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Giocatore 2 *</label>
            <input name="player2_name" required className="input" placeholder="Nome e cognome" />
          </div>
          <div>
            <label className="label">Giocatore 3 *</label>
            <input name="player3_name" required className="input" placeholder="Nome e cognome" />
          </div>
          <div>
            <label className="label">Giocatore 4 (riserva)</label>
            <input name="player4_name" className="input" placeholder="Nome e cognome — opzionale" />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section>
        <label className="label">Note aggiuntive</label>
        <textarea name="notes" rows={3} className="input resize-none" placeholder="Eventuali informazioni utili..." />
      </section>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-3">{error}</p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full justify-center text-base py-4">
        {status === 'loading' ? 'Invio in corso...' : 'Invia iscrizione →'}
      </button>

      <p className="text-court-muted text-xs text-center">
        I dati saranno trattati ai sensi del GDPR. Non condivideremo le tue informazioni con terzi.
      </p>
    </form>
  )
}
