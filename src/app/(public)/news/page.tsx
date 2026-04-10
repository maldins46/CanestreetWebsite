import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"
import type { NewsArticle } from '@/types'

export const revalidate = 60

export const metadata: Metadata = { title: 'News' }

export default async function NewsPage() {
  const supabase = createPublicServerSupabaseClient()
  const { data: articles } = await supabase
    .from('news')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .returns<NewsArticle[]>()

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
          Aggiornamenti
        </p>
        <h1 className="heading-section text-4xl md:text-5xl text-court-white">News</h1>
        <p className="text-court-gray leading-relaxed max-w-2xl mt-4">
          Aggiornamenti, annunci e tutto quello che succede intorno al Canestreet.
        </p>
      </div>

      {!articles?.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessun articolo pubblicato.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {articles.map(article => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="card overflow-hidden group block"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-court-dark">
                {article.cover_url && (
                  <Image
                    src={article.cover_url}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-court-black via-court-dark/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {article.published_at && (
                    <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1">
                      {new Date(article.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <h2 className="font-display font-bold text-lg text-court-white group-hover:text-brand-orange transition-colors line-clamp-2">
                    {article.title}
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
