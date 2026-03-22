import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Chi siamo — Cane Street 3×3',
}

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media`

const staff = [
  {
    name: 'Michele Mosca',
    role: 'Il CEO',
    photo: `${MEDIA}/michi.jpeg`,
    bio: 'Signore e signori, il CEO, er capoccia, niente popodimeno che Michele Mosca: è lui il primo firmatario del torneo, colui che tiene insieme la baracca e che ogni anno si fa il culo giù in pieno inverno per la buona riuscita del torneo. Se esistiamo è grazie e soprattutto a questo ragazzo.',
  },
  {
    name: 'Lorenzo Fava',
    role: 'Lo ZIO',
    photo: `${MEDIA}/lori.jpeg`,
    bio: 'Lorenzo Fava: lo speaker ufficiale del torneo. Expat con furore dalla Lituania, è anche grazie a lui se il torneo è sempre così pieno di vita. Questo ragazzo abita a Vilnius, e tutti gli anni si prende una settimana di permesso per venir giù, solo per noi. Se non è questo amore, non sappiamo davvero cosa potrebbe esserlo.',
  },
  {
    name: 'Giacomo Mosca',
    role: 'Il BRO',
    photo: null,
    bio: 'Dietro ad ogni grande CEO di successo, c\'è sempre un grande fratello del CEO di successo. Giacomo Mosca, fratello minore der Capoccia, è entrato nel circuito Canestreet da ormai diversi anni. Assieme al nostro C-level preferito, si occupa della buona riuscita del torneo, dagli aspetti burocratici fino a quelli schifosamente pratici.',
  },
  {
    name: 'Marco Rossetti',
    role: 'Il Senior',
    photo: `${MEDIA}/marcone.jpeg`,
    bio: 'Marco Rossetti è uno degli acquisti più recenti del CaneStaff. Assume il ruolo di tuttofare: Michi indica, e lui esegue, da bravo Canestreeter.',
  },
  {
    name: 'Federico Rossetti',
    role: 'Il Salame',
    photo: `${MEDIA}/fede.jpeg`,
    bio: 'Federico Rossetti, classe \'97, nasce a Jesi. Conosce il CEO in tenera età nei campi da basket jesini. I due frequentano lo stesso istituto tecnico, e cuciono un saldo legame che arriva fino ai giorni nostri. Assieme a loro, è uno dei padri fondatori del torneo. Comunemente detto il Salame, perché dai è un Salame, palese.',
  },
  {
    name: 'Riccardo Maldini',
    role: 'Lo Hacker',
    photo: `${MEDIA}/ricco.jpeg`,
    bio: 'Vivo a Milano, ma son nato nella ridente Jesi. Sono la persona che sta dietro al sito, ai social, mente creativa, quello che attacca gli amplificatori. Non ho ancora imparato le regole del 3×3, ma nonostante tutto sono qua, chi l\'averebbe mai detto. Se mi vedi a segnare i punti, in genere non è un buon segno.',
  },
]

export default function ChiSiamoPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-16">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Il CaneStaff
        </p>
        <h1 className="heading-section text-5xl text-court-white mb-6">
          Chi siamo
        </h1>
        <p className="text-court-gray max-w-2xl leading-relaxed">
          Il Canestreet è un torneo estivo di basket 3×3, parte del circuito FIP, nato su iniziativa
          di alcuni amici appassionati di basket. Da piccolo torneo parrocchiale, siamo cresciuti sempre
          di più, fino all&apos;approdo nel circuito nazionale 3×3. La nostra ambizione è quella di dare
          un torneo estivo di basket alla nostra piccola città, con l&apos;obiettivo di fare sempre meglio,
          ogni anno che passa!
        </p>
      </div>

      {/* Staff grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
        {staff.map(({ name, role, bio, photo }) => (
          <div key={name} className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              {photo ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-brand-orange/40">
                  <Image src={photo} alt={name} fill className="object-cover" sizes="64px" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full shrink-0 border-2 border-court-border bg-court-surface flex items-center justify-center">
                  <span className="font-display font-extrabold text-xl text-brand-orange">
                    {name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-0.5">
                  {role}
                </p>
                <h2 className="font-display font-extrabold text-lg text-court-white uppercase tracking-wide leading-tight">
                  {name}
                </h2>
              </div>
            </div>
            <p className="text-court-gray text-sm leading-relaxed">{bio}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="border-t border-court-border pt-12">
        <h2 className="heading-section text-2xl text-court-white mb-6">Ci trovi in zona</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Location</p>
            <p className="text-court-light text-sm">Playground Piazza della Repubblica</p>
            <p className="text-court-gray text-sm">Jesi (AN) 60035</p>
          </div>
          <div className="card p-6">
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Telefono</p>
            <a href="tel:+393291581724" className="text-court-light text-sm hover:text-brand-orange transition-colors">
              329 158 1724
            </a>
            <p className="text-court-gray text-xs mt-1">(Michele)</p>
          </div>
          <div className="card p-6">
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">Email</p>
            <a href="mailto:canestreet3vs3@gmail.com" className="text-court-light text-sm hover:text-brand-orange transition-colors break-all">
              canestreet3vs3@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
