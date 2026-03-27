import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <p className="font-display font-semibold uppercase tracking-[0.25em] text-brand-orange text-xs mb-3">
        {label}
      </p>
      <div className="text-court-gray leading-relaxed space-y-3 text-sm">
        {children}
      </div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Informativa ai sensi del Reg. UE 2016/679
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-court-muted text-xs">Ultimo aggiornamento: marzo 2026</p>
      </div>

      <Section label="Titolare del trattamento">
        <p>
          Il titolare del trattamento dei dati personali raccolti tramite questo sito è{' '}
          <strong className="text-court-light">Michele Mosca</strong>, domiciliato a Jesi (AN).
        </p>
        <p>
          Per qualsiasi questione relativa al trattamento dei tuoi dati, puoi scrivere a{' '}
          <a href="mailto:canestreet3vs3@gmail.com" className="text-brand-orange hover:text-brand-orange/80 transition-colors">
            canestreet3vs3@gmail.com
          </a>.
        </p>
      </Section>

      <Section label="Dati raccolti e finalità">
        <p>
          Il sito raccoglie dati personali esclusivamente tramite il modulo di iscrizione al torneo.
          I dati richiesti sono: nome della squadra, nome del capitano, indirizzo email, numero di telefono e categoria di gioco.
        </p>
        <p>
          Tali dati sono trattati al solo scopo di gestire le iscrizioni al torneo Canestreet 3×3,
          comunicare con i partecipanti e organizzare le competizioni. Non vengono ceduti a terzi
          per finalità commerciali né utilizzati per attività di marketing.
        </p>
        <p>
          <strong className="text-court-light">Base giuridica:</strong> Art. 6(1)(b) del Reg. UE 2016/679 —
          trattamento necessario all&apos;esecuzione di misure precontrattuali adottate su richiesta dell&apos;interessato
          (partecipazione al torneo).
        </p>
      </Section>

      <Section label="Cookie e tecnologie di tracciamento">
        <p>
          Il sito utilizza esclusivamente cookie tecnici strettamente necessari al funzionamento
          dell&apos;area riservata agli amministratori. Tali cookie non richiedono consenso ai sensi
          della Direttiva ePrivacy.
        </p>
        <p>
          Non vengono installati cookie di profilazione, cookie analitici di terze parti
          (es. Google Analytics) né pixel di tracciamento pubblicitario.
        </p>
      </Section>

      <Section label="Responsabili del trattamento (sub-processor)">
        <p>
          I dati raccolti tramite il modulo di iscrizione sono conservati su infrastrutture gestite da:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong className="text-court-light">Supabase Inc.</strong> — hosting, database e autenticazione.
            Supabase agisce come responsabile del trattamento ai sensi dell&apos;Art. 28 GDPR.
            Il Data Processing Agreement è disponibile su{' '}
            <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer"
               className="text-brand-orange hover:text-brand-orange/80 transition-colors">
              supabase.com/legal/dpa
            </a>.
          </li>
        </ul>
      </Section>

      <Section label="Conservazione dei dati">
        <p>
          I dati di iscrizione vengono conservati per la durata dell&apos;edizione del torneo a cui si riferiscono
          e per un periodo massimo di 12 mesi successivi alla sua conclusione, dopodiché vengono cancellati.
        </p>
      </Section>

      <Section label="Diritti dell'interessato">
        <p>
          Ai sensi degli articoli 15–21 del Reg. UE 2016/679, hai il diritto di:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>accedere ai tuoi dati personali (Art. 15)</li>
          <li>richiederne la rettifica se inesatti (Art. 16)</li>
          <li>richiederne la cancellazione (Art. 17)</li>
          <li>richiedere la limitazione del trattamento (Art. 18)</li>
          <li>ricevere i dati in formato strutturato (portabilità, Art. 20)</li>
          <li>opporti al trattamento (Art. 21)</li>
        </ul>
        <p>
          Per esercitare questi diritti, scrivi a{' '}
          <a href="mailto:canestreet3vs3@gmail.com" className="text-brand-orange hover:text-brand-orange/80 transition-colors">
            canestreet3vs3@gmail.com
          </a>.
          Risponderemo entro 30 giorni dalla ricezione della richiesta.
        </p>
      </Section>

      <Section label="Autorità di controllo">
        <p>
          Se ritieni che il trattamento dei tuoi dati violi il Regolamento, hai il diritto di proporre
          reclamo al <strong className="text-court-light">Garante per la protezione dei dati personali</strong>:
        </p>
        <p>
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer"
             className="text-brand-orange hover:text-brand-orange/80 transition-colors">
            www.garanteprivacy.it
          </a>
        </p>
      </Section>
    </div>
  )
}
