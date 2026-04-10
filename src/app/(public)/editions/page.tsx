import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"
import type { Edition } from '@/types'

export const revalidate = 60

export const metadata: Metadata = { title: 'Edizioni' }

export default async function EditionsPage() {
  const supabase = createPublicServerSupabaseClient()
  const { data: editions } = await supabase
    .from('editions')
    .select('*')
    .order('year', { ascending: false })
    .returns<Edition[]>()

  const past = editions?.filter(e => !e.is_current) ?? []

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          La nostra storia
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white">Edizioni precedenti</h1>
        <p className="text-court-gray leading-relaxed max-w-2xl mt-4">
          Torna indietro nel tempo e scopri tutte le edizioni passate del torneo: vincitori, squadre e i momenti che hanno fatto la storia del Canestreet.
        </p>
      </div>

      {!past.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Questa è la prima edizione. Stay tuned!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {past.map(edition => (
            <Link
              key={edition.id}
              href={`/editions/${edition.year}`}
              className="card overflow-hidden group block"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-court-dark">
                {edition.cover_url && (
                  <Image
                    src={edition.cover_url}
                    alt={edition.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-court-black via-court-dark/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-brand-orange font-display text-5xl font-extrabold leading-none mb-1">
                    {edition.year}
                  </p>
                  <h2 className="font-display font-bold text-lg text-court-white group-hover:text-brand-orange transition-colors line-clamp-2">
                    {edition.title}
                  </h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
