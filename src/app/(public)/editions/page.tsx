import type { Metadata } from 'next'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition } from '@/types'

export const metadata: Metadata = { title: 'Edizioni' }

export default async function EditionsPage() {
  const supabase = createServerSupabaseClient()
  const { data: editions } = await supabase
    .from('editions')
    .select('*')
    .order('year', { ascending: false })
    .returns<Edition[]>()

  const past = editions?.filter(e => !e.is_current) ?? []

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="heading-section text-4xl text-court-white mb-12">Edizioni precedenti</h1>

      {!past.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Questa è la prima edizione. Stay tuned!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {past.map(edition => (
            <div key={edition.id} className="card overflow-hidden group">
              {edition.cover_url ? (
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={edition.cover_url}
                    alt={edition.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
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
                <h2 className="font-display font-bold text-xl text-court-white uppercase">{edition.title}</h2>
                {edition.winner_name && (
                  <p className="text-brand-orange text-sm font-display uppercase tracking-wide mt-2">
                    🏆 {edition.winner_name}
                  </p>
                )}
                {edition.description && (
                  <p className="text-court-gray text-sm mt-3 line-clamp-3">{edition.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
