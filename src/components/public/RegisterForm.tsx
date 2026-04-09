'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import type { TeamCategory } from '@/types'

interface Props {
  editionId: string
}

interface PlayerRow {
  name: string
  birth_date: string
  codice_fiscale: string
  instagram: string
  club: string
  email: string
  phone: string
  city: string
  is_captain: boolean
  is_vice_captain: boolean
}

const GDPR_TEXT = `Ai sensi del D.Lgs. n. 196 del 30 giugno 2003 ("Codice in materia di protezione dei dati personali") e del Regolamento (UE) 2016/679 (GDPR), si informa che:

1. FINALITÀ E MODALITÀ DEL TRATTAMENTO: I dati da Lei forniti vengono trattati mediante strumenti manuali, informatici e telematici ai fini di gestione, comunicazione e controllo della manifestazione a cui è iscritto. Le informazioni di contatto saranno utilizzate per informarla di manifestazioni simili per l'anno corrente e per invitarla all'edizione successiva.

2. PERIODO DI CONSERVAZIONE: I dati personali verranno conservati per 12 mesi dalla data di iscrizione, dopodiché a fini di esclusiva archiviazione.

3. OBBLIGATORIETÀ: I dati forniti sono necessari per effettuare le operazioni del torneo. La mancata accettazione comporta l'impossibilità di partecipare.

4. COMUNICAZIONE E DIFFUSIONE: I dati possono essere comunicati al personale incaricato per finalità funzionali all'attività.

5. DIRITTI DELL'INTERESSATO: Ai sensi degli artt. 15-22 del GDPR, Lei ha diritto di ottenere l'accesso, la rettifica, la cancellazione, la limitazione del trattamento e la portabilità dei propri dati personali, nonché di opporsi al loro trattamento. Per esercitare tali diritti può contattarci a: canestreet3vs3@gmail.com.

6. TITOLARE DEL TRATTAMENTO: Canestreet — canestreet3vs3@gmail.com.`

const CF_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i

function emptyPlayer(isCaptain = false): PlayerRow {
  return {
    name: '',
    birth_date: '',
    codice_fiscale: '',
    instagram: '',
    club: '',
    email: '',
    phone: '',
    city: '',
    is_captain: isCaptain,
    is_vice_captain: false,
  }
}

export default function RegisterForm({ editionId }: Props) {
  const supabase = createClient()

  const [formType, setFormType] = useState<'open' | 'under'>('open')
  const [category, setCategory] = useState<TeamCategory>('open_m')
  const [teamName, setTeamName] = useState('')
  const [players, setPlayers] = useState<PlayerRow[]>([
    emptyPlayer(true),
    { ...emptyPlayer(), is_vice_captain: true },
    emptyPlayer(),
    emptyPlayer(),
  ])

  const [clauseRules, setClauseRules] = useState(false)
  const [clauseMedical, setClauseMedical] = useState(false)
  const [clauseMyFIP, setClauseMyFIP] = useState(false)
  const [clauseParent, setClauseParent] = useState(false)
  const [consentData, setConsentData] = useState(false)
  const [consentImage, setConsentImage] = useState(false)
  const [consentNewBeetle, setConsentNewBeetle] = useState(false)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isUnder = category.startsWith('u')

  function handleFormTypeChange(type: 'open' | 'under') {
    setFormType(type)
    setCategory(type === 'open' ? 'open_m' : 'u14_m')
  }

  function updatePlayer(idx: number, field: keyof PlayerRow, value: string | boolean) {
    setPlayers(prev => prev.map((p, i) => {
      if (i === idx) return { ...p, [field]: value }
      if (field === 'is_captain' && value === true) return { ...p, is_captain: false }
      if (field === 'is_vice_captain' && value === true) return { ...p, is_vice_captain: false }
      return p
    }))
  }

  function setPlayerRole(idx: number, role: 'none' | 'captain' | 'vice') {
    setPlayers(prev => prev.map((p, i) => {
      if (i === idx) return { ...p, is_captain: role === 'captain', is_vice_captain: role === 'vice' }
      if (role === 'captain') return { ...p, is_captain: false }
      if (role === 'vice') return { ...p, is_vice_captain: false }
      return p
    }))
  }

  function removePlayer(idx: number) {
    const activePlayers = players.filter(p => p.name.trim())
    if (activePlayers.length <= 3) return
    setPlayers(prev => {
      const next = [...prev]
      next[idx] = emptyPlayer()
      // if we cleared the captain, make first active player captain
      if (prev[idx].is_captain) {
        const firstActive = next.findIndex(p => p.name.trim())
        if (firstActive !== -1) next[firstActive] = { ...next[firstActive], is_captain: true }
        else next[0] = { ...next[0], is_captain: true }
      }
      return next
    })
  }

  function validate(): string | null {
    if (!teamName.trim()) return 'Inserisci il nome della squadra.'
    const active = players.filter(p => p.name.trim())
    if (active.length < 3) return 'Servono almeno 3 giocatori.'
    if (!active.some(p => p.is_captain)) return 'Seleziona il capitano.'
    if (active.filter(p => p.is_vice_captain).length > 1) return 'Può esserci solo un vice-capitano.'
    for (let i = 0; i < active.length; i++) {
      const p = active[i]
      if (!p.birth_date) return `Inserisci la data di nascita del giocatore ${i + 1}.`
      if (!CF_REGEX.test(p.codice_fiscale)) return `Codice fiscale non valido per il giocatore ${i + 1}.`
      if (!p.email.trim()) return `Inserisci l'email del giocatore ${i + 1}.`
      if (!p.city.trim()) return `Inserisci la città di residenza del giocatore ${i + 1}.`
      if ((p.is_captain || p.is_vice_captain) && !p.phone.trim()) {
        return `Inserisci il numero di telefono del ${p.is_captain ? 'capitano' : 'vice-capitano'} (giocatore ${i + 1}).`
      }
    }
    if (!clauseRules) return 'Devi accettare il rispetto del regolamento.'
    if (!clauseMedical) return 'Devi dichiarare il possesso del certificato medico per tutti i giocatori.'
    if (!clauseMyFIP) return 'Devi confermare l\'iscrizione MyFIP di tutti i giocatori.'
    if (isUnder && !clauseParent) return 'Devi dichiarare l\'autorizzazione del genitore/tutore.'
    if (!consentData) return 'Devi accettare il trattamento dei dati personali.'
    if (!consentImage) return 'Devi autorizzare l\'utilizzo di immagini e video.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setErrorMsg(err); return }

    setStatus('loading')
    setErrorMsg(null)

    const activePlayers = players.filter(p => p.name.trim())
    const playersPayload = activePlayers.map(p => ({
      name: p.name.trim(),
      birth_date: p.birth_date,
      codice_fiscale: p.codice_fiscale.toUpperCase(),
      instagram: p.instagram.trim() || null,
      club: isUnder ? (p.club.trim() || null) : null,
      email: p.email.trim(),
      phone: p.phone.trim() || null,
      city: p.city.trim(),
      is_captain: p.is_captain,
      is_vice_captain: p.is_vice_captain,
    }))

    const { error } = await supabase.rpc('register_team', {
      p_edition_id:          editionId,
      p_name:                teamName.trim(),
      p_category:            category,
      p_players:             playersPayload,
      p_consent_new_beetle:  consentNewBeetle,
    })

    if (error) {
      const msg = error.message.includes('closed')
        ? 'Le iscrizioni sono attualmente chiuse.'
        : error.message
      setErrorMsg(msg)
      setStatus('error')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="card p-10 text-center">
        <div className="text-5xl mb-4">🏀</div>
        <h2 className="font-display font-bold uppercase text-2xl text-court-white mb-2">Iscrizione inviata!</h2>
        <p className="text-court-gray">Abbiamo ricevuto la vostra iscrizione. Vi contatteremo presto per conferma.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>

      {/* Category selector */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-5">
          Categoria
        </h3>
        <div className="flex gap-3 mb-4">
          {(['open', 'under'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleFormTypeChange(t)}
              className={`px-5 py-2 font-display uppercase tracking-wide text-sm border transition-colors ${
                formType === t
                  ? 'bg-brand-orange border-brand-orange text-court-dark'
                  : 'border-court-border text-court-gray hover:border-court-muted hover:text-court-white'
              }`}
            >
              {t === 'open' ? 'Open' : 'Under'}
            </button>
          ))}
        </div>

        {formType === 'open' && (
          <div className="flex gap-3 flex-wrap">
            {([
              ['open_m', 'Open Maschile'],
              ['open_f', 'Open Femminile'],
            ] as [TeamCategory, string][]).map(([cat, label]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
                  category === cat
                    ? 'bg-court-surface border-court-muted text-court-white'
                    : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-gray'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {formType === 'under' && (
          <div className="flex gap-3 flex-wrap">
            {([
              ['u14_m', 'U14 Maschile', 'nati 2011/12'],
              ['u16_m', 'U16 Maschile', 'nati 2009/10/11'],
              ['u18_m', 'U18 Maschile', 'nati 2007/08/09/10'],
            ] as [TeamCategory, string, string][]).map(([cat, label, years]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
                  category === cat
                    ? 'bg-court-surface border-court-muted text-court-white'
                    : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-gray'
                }`}
              >
                {label}
                <span className="ml-2 text-court-muted normal-case font-body">{years}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Team name */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-5">
          Squadra
        </h3>
        <div>
          <label className="label">Nome della squadra *</label>
          <input
            className="input"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="es. Street Ballers"
          />
        </div>
      </section>

      {/* Players */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-5">
          Giocatori
        </h3>

        {isUnder && (
          <p className="text-court-muted text-xs mb-4">
            Nessuna deroga alle annate. N.B.: non sono ammesse deroghe alle annate.
          </p>
        )}

        <div className="space-y-4">
          {players.map((player, idx) => {
            const isActive = !!player.name.trim()
            return (
              <div key={idx} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display uppercase tracking-wide text-court-muted">
                    Giocatore {idx + 1}
                    {idx === 3 && <span className="ml-2 text-court-muted normal-case font-body">(riserva, opzionale)</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    {idx === 0 && (
                      <span className="text-xs font-display uppercase tracking-wide text-brand-orange">Capitano</span>
                    )}
                    {idx === 1 && (
                      <span className="text-xs font-display uppercase tracking-wide text-court-gray">Vice-capitano</span>
                    )}
                    {isActive && idx === 3 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(idx)}
                        className="text-court-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Nome e cognome {idx < 3 && '*'}</label>
                    <input
                      className="input py-2 text-sm"
                      value={player.name}
                      onChange={e => updatePlayer(idx, 'name', e.target.value)}
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Data di nascita {idx < 3 && '*'}</label>
                    <input
                      type="date"
                      className="input py-2 text-sm"
                      value={player.birth_date}
                      onChange={e => updatePlayer(idx, 'birth_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Codice fiscale {idx < 3 && '*'}</label>
                    <input
                      className="input py-2 text-sm font-mono uppercase"
                      value={player.codice_fiscale}
                      onChange={e => updatePlayer(idx, 'codice_fiscale', e.target.value)}
                      placeholder="RSSMRA85M01H501Z"
                      maxLength={16}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Email {idx < 3 && '*'}</label>
                    <input
                      type="email"
                      className="input py-2 text-sm"
                      value={player.email}
                      onChange={e => updatePlayer(idx, 'email', e.target.value)}
                      placeholder="giocatore@email.com"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Città di residenza {idx < 3 && '*'}</label>
                    <input
                      className="input py-2 text-sm"
                      value={player.city}
                      onChange={e => updatePlayer(idx, 'city', e.target.value)}
                      placeholder="Jesi"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Instagram <span className="text-court-muted">(opzionale)</span></label>
                    <input
                      className="input py-2 text-sm"
                      value={player.instagram}
                      onChange={e => updatePlayer(idx, 'instagram', e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">
                      Telefono{' '}
                      {player.is_captain || player.is_vice_captain
                        ? '*'
                        : <span className="text-court-muted">(opzionale)</span>
                      }
                    </label>
                    <input
                      type="tel"
                      className="input py-2 text-sm"
                      value={player.phone}
                      onChange={e => updatePlayer(idx, 'phone', e.target.value)}
                      placeholder="+39 333 0000000"
                    />
                  </div>
                  {isUnder && (
                    <div className="sm:col-span-2">
                      <label className="label text-xs">Società <span className="text-court-muted">(squadra presso cui si è giocato quest'anno)</span></label>
                      <input
                        className="input py-2 text-sm"
                        value={player.club}
                        onChange={e => updatePlayer(idx, 'club', e.target.value)}
                        placeholder="Pallacanestro Jesi, ..."
                      />
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </section>

      {/* Hardcoded clauses */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-5">
          Dichiarazioni
        </h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={clauseRules}
              onChange={e => setClauseRules(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Dichiaro che tutti i giocatori della squadra partecipano al torneo rispettando le regole durante tutto lo svolgimento della manifestazione. *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={clauseMedical}
              onChange={e => setClauseMedical(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Dichiaro che tutti i giocatori della squadra sono in possesso del certificato medico agonistico valido necessario per partecipare a questa attività sportiva. *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={clauseMyFIP}
              onChange={e => setClauseMyFIP(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Dichiaro che tutti i giocatori della squadra sono iscritti sull&apos;app <strong>MyFIP</strong>, come richiesto per la copertura assicurativa federale. *
            </span>
          </label>

          {isUnder && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={clauseParent}
                onChange={e => setClauseParent(e.target.checked)}
                className="mt-0.5 accent-brand-orange shrink-0"
              />
              <span className="text-sm text-court-gray">
                Dichiaro che i genitori o tutori di tutti i giocatori minorenni della squadra autorizzano la loro partecipazione al torneo. *
                {' '}<span className="text-court-muted">(Per i giocatori U18 maggiorenni è sufficiente la firma dell&apos;interessato.)</span>
              </span>
            </label>
          )}
        </div>
      </section>

      {/* GDPR & image consent */}
      <section>
        <h3 className="font-display font-bold uppercase tracking-widest text-court-white border-b border-court-border pb-3 mb-5">
          Privacy e consenso
        </h3>

        <div className="bg-court-surface border border-court-border p-4 rounded text-xs text-court-muted leading-relaxed max-h-48 overflow-y-auto mb-5 whitespace-pre-wrap font-body">
          {GDPR_TEXT}
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentData}
              onChange={e => setConsentData(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Acconsento al trattamento dei miei dati personali ai sensi del D.Lgs. 196/2003 e del Regolamento (UE) 2016/679 per le finalità di gestione della manifestazione. *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentImage}
              onChange={e => setConsentImage(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Autorizzo la pubblicazione di materiale fotografico e video ripreso durante la manifestazione a fini promozionali e/o artistici, su cartaceo e web. *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentNewBeetle}
              onChange={e => setConsentNewBeetle(e.target.checked)}
              className="mt-0.5 accent-brand-orange shrink-0"
            />
            <span className="text-sm text-court-gray">
              Acconsento all&apos;agenzia viaggi New Beetle di accedere ai dati personali forniti in fase di iscrizione per una ricerca statistica e invio pacchetto promozionale per gli iscritti al torneo.{' '}
              <span className="text-court-muted">(opzionale)</span>
            </span>
          </label>
        </div>
      </section>

      {errorMsg && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary w-full justify-center text-base py-4"
      >
        {status === 'loading' ? 'Invio in corso...' : 'Invia iscrizione →'}
      </button>

      <p className="text-court-muted text-xs text-center">
        I campi contrassegnati con * sono obbligatori.
      </p>
    </form>
  )
}
