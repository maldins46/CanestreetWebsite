import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Target,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRightLeft,
  Timer,
  Users,
  Repeat,
  FileDown,
  ExternalLink,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Regolamento — Canestreet 3×3',
  description:
    'Tutto quello che devi sapere sul basket 3x3: regole FIBA, circuito FIP e le regole specifiche del torneo Canestreet.',
}

// ─── Local helper components ────────────────────────────────────────────────

function RuleCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Icon className="text-brand-orange shrink-0" size={20} />
        <h3 className="font-display font-bold uppercase tracking-wide text-court-white text-sm">
          {title}
        </h3>
      </div>
      <p className="text-court-gray text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="card p-6 flex flex-col gap-3">
      <div className="text-brand-orange font-display font-black text-4xl leading-none">
        {step < 10 ? `0${step}` : step}
      </div>
      <h3 className="font-display font-bold uppercase tracking-wide text-court-white">
        {title}
      </h3>
      <p className="text-court-gray text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function DocumentCard({
  title,
  description,
  href,
  download,
}: {
  title: string
  description: string
  href: string
  download?: boolean
}) {
  const Icon = download ? FileDown : ExternalLink
  return (
    <a
      href={href}
      {...(download ? { download: true } : { target: '_blank', rel: 'noopener noreferrer' })}
      className="card p-6 flex gap-4 items-start hover:border-brand-orange/50 transition-colors group"
    >
      <Icon
        className="text-brand-orange shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
        size={22}
      />
      <div>
        <p className="font-display font-bold uppercase tracking-wide text-court-white text-sm mb-1">
          {title}
        </p>
        <p className="text-court-gray text-sm leading-relaxed">{description}</p>
      </div>
    </a>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RegolamentoPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">

      {/* ── Header ── */}
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Tutto quello che devi sapere
        </p>
        <h1 className="heading-section text-5xl text-court-white mb-6">
          Regolamento
        </h1>
        <p className="text-court-gray leading-relaxed max-w-2xl">
          Che tu sia nuovo al 3×3 o un giocatore esperto, qui trovi le basi del gioco, le regole
          del circuito FIP e tutto quello che riguarda il torneo Canestreet. Per il testo integrale,
          consulta i link e i PDF in fondo alla pagina.
        </p>
      </div>

      {/* ── Quick Nav ── */}
      <nav className="mb-14 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { label: 'Il 3×3', id: 'il-3x3' },
            { label: 'Regole FIBA', id: 'regole' },
            { label: 'Circuito FIP', id: 'circuito-fip' },
            { label: 'Il torneo', id: 'il-torneo' },
            { label: 'Iscrizioni', id: 'iscrizioni' },
            { label: 'Documenti', id: 'documenti' },
          ].map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-4 py-1.5 border border-court-border text-court-gray hover:border-brand-orange hover:text-brand-orange font-display font-semibold uppercase tracking-wider text-xs transition-colors whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — COS'È IL BASKET 3×3?
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="il-3x3" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Nuovi al 3×3?
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-8">
          Cos&apos;è il basket 3×3
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Text */}
          <div className="flex flex-col gap-4 text-court-gray leading-relaxed">
            <p>
              Il basket 3×3 è una disciplina olimpica a tutti gli effetti, nata dagli streetball
              playground e oggi riconosciuta dalla FIBA. Si gioca su mezzo campo con un solo canestro:
              meno spazio, più intensità, ritmo altissimo.
            </p>
            <p>
              Le squadre sono composte da 4 giocatori — 3 in campo e 1 riserva. Niente allenatore
              sul campo, niente lunghi quarti: una partita dura 10 minuti di tempo effettivo, oppure
              si chiude prima se una squadra arriva a 21 punti. Il risultato è un formato spettacolare
              e adatto a qualsiasi spazio urbano.
            </p>
            <p>
              Il torneo Canestreet fa parte del <strong className="text-court-white">Circuito FIP 3×3 Italia</strong>,
              il sistema ufficiale federale che assegna punti ranking e qualificazioni alle finali nazionali.
            </p>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '3+1', label: 'Giocatori per squadra' },
              { value: '10\'', label: 'O primo a 21 punti' },
              { value: '12″', label: 'Shot clock' },
              { value: '1', label: 'Solo canestro' },
            ].map(({ value, label }) => (
              <div key={label} className="card p-6 text-center">
                <div className="font-display font-black text-4xl text-brand-orange leading-none mb-2">
                  {value}
                </div>
                <div className="text-court-gray text-xs font-display uppercase tracking-wide">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — REGOLE ESSENZIALI (FIBA)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="regole" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Regolamento FIBA
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-2">
          Le regole essenziali
        </h2>
        <p className="text-court-gray mb-8 leading-relaxed">
          Le principali differenze rispetto al basket 5 contro 5.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RuleCard icon={Target} title="Punteggio">
            1 punto dentro l&apos;arco, 2 punti fuori dall&apos;arco, 1 punto per tiro libero.
          </RuleCard>
          <RuleCard icon={Clock} title="Durata">
            10 minuti di tempo effettivo. Se una squadra segna 21 punti prima, vince subito
            (sudden death — solo nel tempo regolamentare).
          </RuleCard>
          <RuleCard icon={RefreshCw} title="Supplementare">
            Pareggio dopo 10 minuti: 1 minuto di pausa, poi la prima squadra che segna 2 punti
            vince.
          </RuleCard>
          <RuleCard icon={AlertTriangle} title="Falli">
            Bonus al 6° fallo di squadra. Nessuna espulsione per falli personali. Dal 7° al 9°:
            2 tiri liberi. Dal 10°: 2 tiri liberi + possesso.
          </RuleCard>
          <RuleCard icon={ArrowRightLeft} title="Possesso">
            Dopo canestro: palla da sotto, portare dietro l&apos;arco. Rimbalzo offensivo: tiro
            immediato. Rimbalzo difensivo, intercetto o stoppata: uscire dall&apos;arco prima di
            attaccare.
          </RuleCard>
          <RuleCard icon={Timer} title="Shot clock">
            12 secondi per tentare il tiro. Niente palleggio spalle a canestro per più di 5
            secondi dentro l&apos;arco.
          </RuleCard>
          <RuleCard icon={Users} title="Palla contesa">
            In caso di palla contesa (jump ball), il possesso va sempre alla difesa — niente
            salto a due.
          </RuleCard>
          <RuleCard icon={Repeat} title="Sost. e timeout">
            Sostituzioni solo su palla morta prima del check-ball. Ogni squadra ha 1 timeout
            da 30 secondi.
          </RuleCard>
        </div>

        <p className="text-court-muted text-xs mt-4 text-right">
          Questo è un riassunto. Per il testo ufficiale completo, consulta la sezione{' '}
          <a href="#documenti" className="text-brand-orange hover:underline">
            Documenti
          </a>{' '}
          in fondo alla pagina.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — CIRCUITO FIP
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="circuito-fip" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Federazione Italiana Pallacanestro
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-2">
          Il circuito FIP 3×3
        </h2>
        <p className="text-court-gray mb-8 leading-relaxed max-w-2xl">
          La FIP è l&apos;unico organismo riconosciuto dal CONI e dalla FIBA per il 3×3 in Italia.
          Il circuito nazionale si divide in due livelli. Il torneo Canestreet è riconosciuto
          come <strong className="text-court-white">torneo TOP del Circuito ELITE</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* ELITE */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand-orange text-white font-display font-black text-xs px-2 py-0.5 uppercase tracking-wider">
                Elite
              </span>
              <h3 className="font-display font-bold uppercase tracking-wide text-court-white">
                Circuito ELITE
              </h3>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                'Tornei Master (qualificazione diretta alle Finals) e tornei TOP (punti ranking) — Canestreet è un torneo TOP.',
                'Massimo 7 giocatori per roster nell\'intera stagione.',
                'Una volta iscritto a un torneo ELITE, l\'atleta è vincolato a quella squadra per tutti i tornei dello stesso circuito.',
                'Qualificazione alle Finals: vincita di un Master + almeno 4 partecipazioni, oppure tramite ranking (min. 5 tornei), oppure tramite il Challenger.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-court-gray text-sm leading-relaxed">
                  <span className="text-brand-orange shrink-0 font-bold">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CLASSIC */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-court-surface border border-court-border text-court-gray font-display font-black text-xs px-2 py-0.5 uppercase tracking-wider">
                Classic
              </span>
              <h3 className="font-display font-bold uppercase tracking-wide text-court-white">
                Circuito CLASSIC
              </h3>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                'Rete di tornei di livello più accessibile, aperti a tutti.',
                'Nessun vincolo di roster: i giocatori possono cambiare squadra da torneo a torneo.',
                'Punti ranking assegnati per piazzamento.',
                'Il vincitore del CLASSIC si qualifica al Challenger delle Finals ELITE.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-court-gray text-sm leading-relaxed">
                  <span className="text-brand-orange shrink-0 font-bold">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Requirements */}
        <div className="card p-6">
          <h3 className="font-display font-bold uppercase tracking-wide text-court-white text-sm mb-4">
            Requisiti per partecipare al circuito FIP
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              'Tesseramento FIP obbligatorio (può essere 3x3 o 5c5).',
              'Certificato medico di idoneità agonistica in corso di validità.',
              'Categorie: Open (adulti), Under 18, Under 16, Under 14.',
              'Atleti nati negli anni 2010–2013 non ammessi al Circuito.',
              'Il tesseramento si rinnova automaticamente al 30 settembre.',
              'Nessun vincolo sportivo con il tesseramento 3×3.',
            ].map((item, i) => (
              <div key={i} className="flex gap-2 text-court-gray text-sm leading-relaxed py-1 border-b border-court-border/50 last:border-0">
                <span className="text-brand-orange shrink-0 font-bold">—</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — IL TORNEO CANESTREET
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="il-torneo" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Specifiche del torneo
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-8">
          Il torneo Canestreet
        </h2>

        <div className="card p-8 flex flex-col gap-8">
          {/* Formato */}
          <div>
            <h3 className="font-display font-bold text-brand-orange uppercase tracking-wide mb-4">
              Formato e svolgimento
            </h3>
            <ul className="flex flex-col gap-2">
              {[
                'Fase a gironi seguita da eliminazione diretta.',
                'Classifica dei gironi: vittorie → differenza punti → punti segnati.',
                'Il ritardo all\'appello del proprio match comporta la sconfitta a tavolino.',
                'Tenuta sportiva idonea obbligatoria.',
                'Fair play obbligatorio verso avversari, arbitri e organizzatori.',
              ].map((rule, i) => (
                <li key={i} className="flex gap-3 text-court-gray text-sm leading-relaxed">
                  <span className="text-brand-orange font-bold shrink-0">—</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-court-border" />

          {/* Categorie */}
          <div>
            <h3 className="font-display font-bold text-brand-orange uppercase tracking-wide mb-4">
              Categorie
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { cat: 'Senior', detail: '18 anni e oltre' },
                { cat: 'Under 18', detail: 'limiti comunicati all\'apertura' },
                { cat: 'Under 16', detail: 'limiti comunicati all\'apertura' },
                { cat: 'Under 14', detail: 'limiti comunicati all\'apertura' },
              ].map(({ cat, detail }) => (
                <div key={cat} className="bg-court-dark border border-court-border p-4 text-center">
                  <div className="font-display font-bold text-court-white text-sm uppercase tracking-wide mb-1">
                    {cat}
                  </div>
                  <div className="text-court-muted text-xs leading-relaxed">{detail}</div>
                </div>
              ))}
            </div>
            <p className="text-court-muted text-xs mt-3">
              I limiti di età esatti vengono comunicati all&apos;apertura delle iscrizioni di ogni edizione.
            </p>
          </div>

          <div className="border-t border-court-border" />

          {/* Premi */}
          <div>
            <h3 className="font-display font-bold text-brand-orange uppercase tracking-wide mb-4">
              Premi
            </h3>
            <ul className="flex flex-col gap-2">
              {[
                'Premio in denaro per le squadre classificate ai primi posti nella categoria Senior.',
                'Premi materiali per tutte le altre categorie (U18, U16, U14).',
                'I vincitori Senior ricevono punti per il ranking FIP nazionale.',
                'I vincitori Senior si qualificano per le finali nazionali del circuito FIP.',
                'Possibili premi speciali a discrezione degli organizzatori (MVP, top scorer, ecc.).',
                'Dettagli e importi comunicati in prossimità del torneo.',
              ].map((rule, i) => (
                <li key={i} className="flex gap-3 text-court-gray text-sm leading-relaxed">
                  <span className="text-brand-orange font-bold shrink-0">—</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — COME ISCRIVERSI
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="iscrizioni" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Vuoi partecipare?
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-8">
          Come iscriversi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StepCard
            step={1}
            title="Componi la squadra"
            description="Raduna 3 o 4 giocatori. Scegliete un capitano che gestirà i contatti con gli organizzatori."
          />
          <StepCard
            step={2}
            title="Compila il modulo"
            description="Iscrivetevi tramite il modulo online su questo sito. Le iscrizioni sono esclusivamente online."
          />
          <StepCard
            step={3}
            title="Attendi la conferma"
            description="Gli organizzatori confermano l'iscrizione via email. Solo dopo la conferma siete ufficialmente iscritti."
          />
          <StepCard
            step={4}
            title="Scendi in campo!"
            description="Presentatevi in tenuta sportiva, rispettate gli orari del vostro girone e date tutto."
          />
        </div>

        {/* Notes */}
        <div className="border border-brand-orange/30 bg-brand-orange/5 p-6 mb-6">
          <p className="font-display font-bold text-court-white uppercase tracking-wide text-sm mb-3">
            Note importanti
          </p>
          <ul className="flex flex-col gap-2">
            {[
              'Ogni squadra deve indicare un capitano con recapito telefonico ed email.',
              "L'iscrizione è valida solo dopo la conferma esplicita degli organizzatori.",
              "I posti sono limitati: in caso di esaurimento, le squadre vengono inserite in lista d'attesa.",
              'Per partecipare al torneo come evento FIP è necessario il tesseramento FIP valido.',
            ].map((note, i) => (
              <li key={i} className="flex gap-2 text-court-gray text-sm leading-relaxed">
                <span className="text-brand-orange shrink-0 font-bold">!</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center">
          <Link href="/iscriviti" className="btn-primary px-10 py-3">
            Iscriviti ora →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — RISORSE E DOCUMENTI
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="documenti" className="mb-16 scroll-mt-8">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-2">
          Per approfondire
        </p>
        <h2 className="heading-section text-3xl text-court-white mb-8">
          Risorse e documenti
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocumentCard
            title="Regolamento FIBA 3×3 (ITA)"
            description="Il regolamento ufficiale FIBA 3×3 tradotto in italiano. Versione breve con interpretazioni."
            href="/docs/regolamento-fiba-3x3-ita.pdf"
            download
          />
          <DocumentCard
            title="Regolamento Circuito FIP 2026"
            description="Regolamento completo del circuito FIP 3×3 Italia 2026: categorie, ranking, tesseramento, sanzioni."
            href="/docs/regolamento-circuito-3x3-2026.pdf"
            download
          />
          <DocumentCard
            title="FIP 3×3 Italia — Regolamenti 2026"
            description="Sito ufficiale della Federazione Italiana Pallacanestro: regolamenti e modulistica aggiornati."
            href="https://3x3italia.fip.it/regolamenti-e-modulistica-2026"
          />
          <DocumentCard
            title="FIBA 3×3 Official Rules"
            description="Regole ufficiali FIBA 3×3 in inglese. Testo di riferimento per qualsiasi interpretazione ufficiale."
            href="https://fiba3x3.com/en/rules.html"
          />
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <div className="mt-4 p-8 border border-brand-orange/30 bg-brand-orange/5 text-center">
        <p className="text-court-white font-display font-bold text-xl uppercase tracking-wide mb-2">
          Hai altri dubbi?
        </p>
        <p className="text-court-gray text-sm mb-4">
          Contattaci direttamente per qualsiasi informazione sul torneo.
        </p>
        <a href="mailto:canestreet3vs3@gmail.com" className="btn-primary inline-block px-8 py-3">
          Scrivici →
        </a>
      </div>
    </div>
  )
}
