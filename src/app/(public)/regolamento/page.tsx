import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regolamento — Canestreet 3×3',
}

const sections = [
  {
    title: 'Il formato',
    rules: [
      'Il torneo segue il regolamento ufficiale FIP/FIBA 3×3.',
      'Ogni squadra è composta da 4 giocatori: 3 in campo + 1 riserva.',
      'Le partite si giocano su mezzo campo, con un solo canestro.',
      'La durata regolamentare è di 10 minuti (tempo effettivo) o fino a 21 punti.',
      "I tiri da oltre l'arco valgono 2 punti, quelli da dentro l'arco valgono 1 punto.",
      'I tiri liberi valgono 1 punto.',
    ],
  },
  {
    title: 'Iscrizioni',
    rules: [
      'Le iscrizioni avvengono esclusivamente tramite il modulo online sul sito.',
      'Ogni squadra deve indicare un capitano di riferimento con recapito telefonico ed email.',
      "L'iscrizione è da considerarsi valida solo dopo la conferma da parte degli organizzatori.",
      "In caso di posti esauriti, le squadre vengono inserite in lista d'attesa.",
    ],
  },
  {
    title: 'Svolgimento',
    rules: [
      'Il torneo si svolge con gironi iniziali seguiti da fase a eliminazione diretta.',
      'Le classifiche dei gironi sono determinate da vittorie, poi differenza punti, poi punti fatti.',
      "Il ritardo all'appello del proprio match comporta la sconfitta a tavolino.",
      'Le squadre devono presentarsi in tenuta sportiva idonea.',
      'È obbligatorio il rispetto del fair play verso avversari, arbitri e organizzatori.',
    ],
  },
  {
    title: 'Categorie',
    rules: [
      'Senior: aperta a giocatori dai 18 anni in su.',
      'Under 18: riservata ai nati dal 2007 in poi (età variabile per edizione).',
      'Under 16: riservata ai nati dal 2009 in poi (età variabile per edizione).',
      'Under 14: riservata ai nati dal 2011 in poi (età variabile per edizione).',
      "I limiti di età esatti vengono comunicati al momento dell'apertura delle iscrizioni.",
    ],
  },
  {
    title: 'Premi',
    rules: [
      'Le squadre classificate ai primi posti ricevono trofei e premi.',
      'I vincitori della categoria Senior ricevono punti per il ranking FIP nazionale.',
      "L'accesso alle finali nazionali è riservato ai vincitori del torneo Senior, secondo quanto previsto dal circuito FIP.",
      'Possono essere previsti premi speciali (miglior giocatore, top scorer, ecc.) a discrezione degli organizzatori.',
    ],
  },
]

export default function RegolamentoPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Regole del torneo
        </p>
        <h1 className="heading-section text-5xl text-court-white mb-6">
          Regolamento
        </h1>
        <p className="text-court-gray leading-relaxed">
          In questa pagina trovi le regole del torneo Canestreet 3×3, parte del circuito FIP/FIBA 3×3,
          nonché le informazioni utili per la partecipazione. Per il regolamento ufficiale completo,
          fai riferimento al sito della{' '}
          <a
            href="https://www.federbasket.it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-orange hover:underline"
          >
            Federazione Italiana Pallacanestro (FIP)
          </a>.
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-10">
        {sections.map(({ title, rules }) => (
          <div key={title} className="card p-8">
            <h2 className="font-display font-extrabold text-2xl text-brand-orange uppercase tracking-wide mb-6">
              {title}
            </h2>
            <ul className="flex flex-col gap-3">
              {rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-court-gray leading-relaxed">
                  <span className="text-brand-orange font-display font-bold shrink-0 mt-0.5">—</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 p-8 border border-brand-orange/30 bg-brand-orange/5 text-center">
        <p className="text-court-white font-display font-bold text-xl uppercase tracking-wide mb-2">
          Hai altri dubbi?
        </p>
        <p className="text-court-gray text-sm mb-4">
          Contattaci direttamente per qualsiasi informazione sul torneo.
        </p>
        <a
          href="mailto:canestreet3vs3@gmail.com"
          className="btn-primary inline-block px-8 py-3"
        >
          Scrivici →
        </a>
      </div>
    </div>
  )
}
