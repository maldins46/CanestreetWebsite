import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { EditionWithWinners } from '@/types'

interface Props { params: { year: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('editions')
    .select('title, year')
    .eq('year', parseInt(params.year))
    .single<{ title: string; year: number }>()
  if (!data) return { title: 'Edizione non trovata' }
  return { title: `${data.year} · ${data.title}` }
}

export default async function EditionDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient()
  const { data: edition } = await supabase
    .from('editions')
    .select('*, edition_winners(*)')
    .eq('year', parseInt(params.year))
    .single<EditionWithWinners>()

  if (!edition) notFound()

  const winners = [...(edition.edition_winners ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div>
      {/* Hero */}
      <div className="relative h-80 md:h-[28rem] overflow-hidden bg-court-dark">
        {edition.cover_url ? (
          <Image
            src={edition.cover_url}
            alt={edition.title}
            fill
            className="object-cover opacity-60"
            priority
            sizes="100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-court-dark via-court-dark/60 to-transparent" />

        {/* Year watermark */}
        <span className="absolute bottom-0 right-6 font-display font-extrabold text-[8rem] md:text-[12rem] leading-none text-white/10 select-none">
          {edition.year}
        </span>

        <div className="absolute bottom-0 left-0 p-8 md:p-12">
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">
            Canestreet 3x3 · {edition.year}
          </p>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl text-court-white uppercase leading-tight">
            {edition.title}
          </h1>
          {edition.subtitle && (
            <p className="text-court-gray font-display uppercase tracking-wide text-lg mt-2">
              {edition.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        <Link
          href="/editions"
          className="text-court-gray hover:text-court-white text-sm font-display uppercase tracking-wide transition-colors inline-block"
        >
          ← Tutte le edizioni
        </Link>

        {/* Description */}
        {edition.description && (
          <div>
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-4">
              L&apos;edizione
            </p>
            <p className="text-court-gray leading-relaxed text-lg whitespace-pre-line">
              {edition.description}
            </p>
          </div>
        )}

        {/* Winners */}
        {winners.length > 0 && (
          <div>
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-6">
              Albo d&apos;oro
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {winners.map(w => (
                <div key={w.id} className="card overflow-hidden">
                  {w.photo_url && (
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={w.photo_url}
                        alt={w.winner_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-court-dark/80 to-transparent" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1">
                      {w.category}
                    </p>
                    <p className="font-display font-bold text-court-white uppercase text-lg leading-tight">
                      {w.winner_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
