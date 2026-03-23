import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { EditionWithWinners } from '@/types'

export const metadata: Metadata = { title: 'Edizioni' }

export default async function EditionsPage() {
  const supabase = createServerSupabaseClient()
  const { data: editions } = await supabase
    .from('editions')
    .select('*, edition_winners(*)')
    .order('year', { ascending: false })
    .returns<EditionWithWinners[]>()

  const past = editions?.filter(e => !e.is_current) ?? []

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          La nostra storia
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white">Edizioni precedenti</h1>
      </div>

      {!past.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Questa è la prima edizione. Stay tuned!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {past.map(edition => {
            const winners = [...(edition.edition_winners ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            return (
              <Link
                key={edition.id}
                href={`/editions/${edition.year}`}
                className="card overflow-hidden group block"
              >
                {edition.cover_url ? (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={edition.cover_url}
                      alt={edition.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-court-dark to-transparent" />
                    <span className="absolute bottom-4 left-4 font-display font-extrabold text-5xl text-white/20">
                      {edition.year}
                    </span>
                  </div>
                ) : (
                  <div className="h-24 bg-court-dark flex items-end p-4">
                    <span className="font-display font-extrabold text-5xl text-court-border">
                      {edition.year}
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <h2 className="font-display font-bold text-xl text-court-white uppercase group-hover:text-brand-orange transition-colors">
                    {edition.title}
                  </h2>
                  {winners.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {winners.map(w => (
                        <li key={w.id} className="text-sm font-display uppercase tracking-wide">
                          <span className="text-brand-orange inline-flex items-center gap-1"><Trophy size={12} />{w.category}:</span>{' '}
                          <span className="text-court-gray">{w.winner_name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {edition.description && (
                    <p className="text-court-gray text-sm mt-3 line-clamp-3">{edition.description}</p>
                  )}
                  <span className="mt-4 inline-block text-xs text-court-muted font-display uppercase tracking-wide group-hover:text-brand-orange transition-colors">
                    Scopri di più →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
