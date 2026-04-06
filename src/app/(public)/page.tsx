import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, NewsArticle, Sponsor } from '@/types'
import SponsorCarousel from '@/components/public/SponsorCarousel'

const MEDIA = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media`
const AFTERMOVIE_URL = 'https://youtu.be/diOnX3Am1Yg'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function HomePage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('is_current', true)
    .single<Edition>()

  const year = edition?.year ?? new Date().getFullYear() - 1

  const [{ data: news }, { data: allEditions }, { data: sponsors }] =
    await Promise.all([
      supabase
        .from('news')
        .select<'*', NewsArticle>('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3),
      supabase
        .from('editions')
        .select<'*', Edition>('*')
        .order('year', { ascending: false }),
      supabase
        .from('sponsors')
        .select<'id, name, logo_url, website_url', Pick<Sponsor, 'id' | 'name' | 'logo_url' | 'website_url'>>('id, name, logo_url, website_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

  const pastEditions = allEditions?.filter((e) => !e.is_current) ?? []

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: 'calc(100svh - 4rem)' }}>
        <Image
          src={`${MEDIA}/cover-image-2025-3.jpg`}
          alt="Canestreet 3×3 — Piazza della Repubblica, Jesi"
          fill
          className="object-cover object-center"
          priority
          quality={60}
          sizes="100vw"
        />
        {/* Gradient — heavy at bottom so title always sits on dark */}
        <div className="absolute inset-0 bg-gradient-to-t from-court-black via-court-black/80 to-transparent" />

        {/* Ghost watermark */}
        <span className="hero-watermark">Jesi</span>

        {/* Social icons — vertical strip, right edge (desktop only) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-5 z-10 animate-fade-in">
          <a href="https://www.instagram.com/canestreet3x3" target="_blank" rel="noopener noreferrer"
             className="text-court-gray hover:text-court-white transition-colors" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="https://www.facebook.com/thecanestreet" target="_blank" rel="noopener noreferrer"
             className="text-court-gray hover:text-court-white transition-colors" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a href="https://www.youtube.com/channel/UCtluwkHf-ghko6Ut-Y6PvRg" target="_blank" rel="noopener noreferrer"
             className="text-court-gray hover:text-court-white transition-colors" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-28 md:pb-20">

            <h1
              className="mb-3 md:mb-4 animate-slide-up"
              style={{ animationDelay: '0.05s', animationFillMode: 'both' }}
            >
              <Image
                src="/canestreet-vector.svg"
                alt="Canestreet"
                width={1999}
                height={317}
                className="w-3/4 sm:w-full max-w-4xl h-auto brightness-0 invert"
                priority
              />
            </h1>
            <p
              className="font-display uppercase tracking-[0.25em] text-court-light text-sm mb-6 md:mb-8 animate-slide-up"
              style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
            >
              A FIP 3×3 summer tournament. In the heart of Jesi.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 animate-slide-up"
              style={{ animationDelay: '0.28s', animationFillMode: 'both' }}
            >
              <Link href="/register" className="btn-primary text-base px-8 py-4 justify-center w-full sm:w-auto">
                Iscriviti ora
              </Link>
              <a
                href={AFTERMOVIE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-base px-8 py-4 inline-flex items-center justify-center gap-2 bg-court-black/60 backdrop-blur-sm w-full sm:w-auto"
              >
                <Play className="w-4 h-4" />
                Aftermovie 2025
              </a>
            </div>

            {/* Social icons — horizontal row below buttons (mobile only) */}
            <div className="flex sm:hidden gap-5 mt-6 animate-fade-in">
              <a href="https://www.instagram.com/canestreet3x3" target="_blank" rel="noopener noreferrer"
                 className="text-court-gray hover:text-court-white transition-colors" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="https://www.facebook.com/thecanestreet" target="_blank" rel="noopener noreferrer"
                 className="text-court-gray hover:text-court-white transition-colors" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/channel/UCtluwkHf-ghko6Ut-Y6PvRg" target="_blank" rel="noopener noreferrer"
                 className="text-court-gray hover:text-court-white transition-colors" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── ABOUT / FORMAT ───────────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-center">
          <div className="md:col-span-3">
            <h2
              className="font-display font-extrabold italic uppercase text-court-white leading-[0.9] mb-6"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              Dal playground della parrocchia<br />
              <span className="text-brand-orange">al circuito nazionale.</span>
            </h2>
            <p className="text-court-gray leading-relaxed mb-4">
              Il Canestreet è un torneo estivo di basket 3×3, parte del circuito
              FIP, su iniziativa di alcuni amici appassionati di basket. Da
              piccolo torneo parrocchiale, siamo cresciuti sempre di più, fino
              all&apos;approdo nel circuito nazionale 3×3.
            </p>
            <p className="text-court-gray leading-relaxed">
              La nostra ambizione è quella di dare un torneo estivo di basket alla
              nostra piccola città, con l&apos;obiettivo di fare sempre meglio,
              ogni anno che passa!
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[
              { value: '200+', label: 'Atleti' },
              { value: String(allEditions?.length ?? 0), label: 'Edizioni' },
              { value: '3×3',  label: 'Formato FIBA' },
              { value: 'Jesi', label: 'Piazza della Repubblica' },
            ].map(({ value, label }) => (
              <div key={label} className="card p-6 flex flex-col items-center justify-center text-center aspect-square">
                <p className="font-display font-extrabold text-4xl text-brand-orange leading-none">
                  {value}
                </p>
                <p className="text-court-gray text-sm mt-2 uppercase tracking-wide font-display">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST NEWS ──────────────────────────────────── */}
      {news && news.length > 0 && (
        <section className="border-t border-court-border">
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="flex items-start justify-between mb-12">
              <div>
                <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-3">
                  Ultime Notizie
                </p>
                <h2 className="heading-section text-4xl md:text-5xl text-court-white">
                  News
                </h2>
                <p className="text-court-gray max-w-2xl leading-relaxed mt-3">
                  Aggiornamenti, annunci e tutto quello che succede intorno al Canestreet.
                </p>
              </div>
              <Link
                href="/news"
                className="btn-ghost text-sm px-4 py-2 hidden sm:inline-flex"
              >
                Tutte le news &rarr;
              </Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="card group overflow-hidden shrink-0 w-72 md:w-auto snap-start"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-court-dark">
                    {article.cover_url && (
                      <Image
                        src={article.cover_url}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 288px, 33vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-court-black via-court-dark/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {article.published_at && (
                        <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1">
                          {formatDate(article.published_at)}
                        </p>
                      )}
                      <h3 className="font-display font-bold text-base text-court-white group-hover:text-brand-orange transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/news"
              className="btn-ghost text-sm px-4 py-2 mt-8 sm:hidden inline-flex"
            >
              Tutte le news &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── PAST EDITIONS ────────────────────────────────── */}
      {pastEditions.length > 0 && (
        <section className="border-t border-court-border">
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="flex items-start justify-between mb-12">
              <div>
                <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-3">
                  La nostra storia
                </p>
                <h2 className="heading-section text-4xl md:text-5xl text-court-white">
                  Edizioni precedenti
                </h2>
                <p className="text-court-gray max-w-2xl leading-relaxed mt-3">
                  Torna indietro nel tempo e scopri le edizioni passate del torneo.
                </p>
              </div>
              <Link
                href="/editions"
                className="btn-ghost text-sm px-4 py-2 hidden sm:inline-flex"
              >
                Tutte le edizioni &rarr;
              </Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none">
              {pastEditions.slice(0, 3).map((ed) => (
                <Link
                  key={ed.id}
                  href={`/editions/${ed.year}`}
                  className="card overflow-hidden shrink-0 w-72 md:w-auto snap-start group block"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-court-dark">
                    {ed.cover_url && (
                      <Image
                        src={ed.cover_url}
                        alt={ed.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 288px, 33vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-court-black via-court-dark/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-brand-orange font-display text-5xl font-extrabold leading-none mb-1">
                        {ed.year}
                      </p>
                      <h3 className="font-display font-bold text-base text-court-white group-hover:text-brand-orange transition-colors line-clamp-2">
                        {ed.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/editions"
              className="btn-ghost text-sm px-4 py-2 mt-8 sm:hidden inline-flex"
            >
              Tutte le edizioni &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── SPONSOR CAROUSEL ─────────────────────────────── */}
      {sponsors && sponsors.length > 0 && (
        <section className="border-t border-court-border py-14">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-8">
              I Nostri Partner
            </p>
          </div>
          <SponsorCarousel sponsors={sponsors} />
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mt-8">
              <Link href="/sponsor" className="btn-ghost text-sm px-5 py-2">
                Tutti gli sponsor &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-t border-court-border relative overflow-hidden">
        <Image
          src={`${MEDIA}/basket-banner.jpg`}
          alt=""
          fill
          className="object-cover opacity-40"
          quality={50}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-court-black/60" />
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10 text-center">
          <h2 className="heading-section text-3xl md:text-4xl text-court-white mb-4">
            Pronto a scendere in campo?
          </h2>
          <p className="text-court-gray text-lg mb-8 max-w-md mx-auto">
            Registra la tua squadra per l&apos;edizione {year}. I posti sono
            limitati!
          </p>
          <Link href="/register" className="btn-primary text-base px-10 py-4">
            Registra la squadra
          </Link>
        </div>
      </section>
    </>
  )
}
