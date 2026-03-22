import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition } from '@/types'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('is_current', true)
    .single<Edition>()

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Orange accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-orange" />

        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <p className="font-display text-brand-orange uppercase tracking-[0.3em] text-sm font-semibold mb-6 animate-fade-in">
            {edition?.year ?? new Date().getFullYear()} — Estate
          </p>
          <h1
            className="heading-hero text-[clamp(4rem,12vw,10rem)] text-court-white orange-glow mb-6 animate-slide-up"
            style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}
          >
            Cane<br />
            <span className="text-brand-orange">Street</span>
            <br />3×3
          </h1>
          <p
            className="text-court-gray text-lg max-w-md mb-10 text-balance animate-slide-up"
            style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}
          >
            {edition?.subtitle ?? 'Il torneo estivo di basket 3x3. Squadre, sfide, strada.'}
          </p>
          <div
            className="flex flex-wrap gap-4 animate-slide-up"
            style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
          >
            <Link href="/register" className="btn-primary text-base px-8 py-4">
              Iscriviti ora
            </Link>
            <Link href="/standings" className="btn-ghost text-base px-8 py-4">
              Classifica
            </Link>
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-3">
              Il Torneo
            </p>
            <h2 className="heading-section text-4xl text-court-white mb-6">
              Basket di strada,<br />regole vere
            </h2>
            <p className="text-court-gray leading-relaxed mb-4">
              Il Canestreet è un torneo estivo di basket 3×3, parte del circuito FIP, nato su iniziativa
              di alcuni amici appassionati di basket. Da piccolo torneo parrocchiale, siamo cresciuti sempre
              di più, fino all&apos;approdo nel circuito nazionale 3×3.
            </p>
            <p className="text-court-gray leading-relaxed">
              La nostra ambizione è quella di dare un torneo estivo di basket alla nostra piccola città,
              con l&apos;obiettivo di fare sempre meglio, ogni anno che passa!
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '3×3', label: 'Formato FIBA' },
              { value: '10\'', label: 'Durata partita' },
              { value: '21', label: 'Punti per vincere' },
              { value: '4', label: 'Giocatori max' },
            ].map(({ value, label }) => (
              <div key={label} className="card p-6">
                <p className="font-display font-extrabold text-4xl text-brand-orange">{value}</p>
                <p className="text-court-gray text-sm mt-1 uppercase tracking-wide font-display">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="border-t border-court-border">
        <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="heading-section text-3xl text-court-white">
              Pronto a scendere in campo?
            </h2>
            <p className="text-court-gray mt-2">Registra la tua squadra prima che i posti finiscano.</p>
          </div>
          <Link href="/register" className="btn-primary text-base px-8 py-4 shrink-0">
            Registra la squadra →
          </Link>
        </div>
      </section>
    </>
  )
}
