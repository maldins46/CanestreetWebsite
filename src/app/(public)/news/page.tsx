import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { NewsArticle } from '@/types'

export const metadata: Metadata = { title: 'News' }

export default async function NewsPage() {
  const supabase = createServerSupabaseClient()
  const { data: articles } = await supabase
    .from('news')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .returns<NewsArticle[]>()

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="heading-section text-4xl text-court-white mb-12">News</h1>

      {!articles?.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessun articolo pubblicato.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map(article => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="group card flex gap-6 p-6 hover:border-court-muted transition-colors"
            >
              {article.cover_url && (
                <div className="relative w-32 h-24 shrink-0 overflow-hidden">
                  <Image src={article.cover_url} alt={article.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-court-muted text-xs font-display uppercase tracking-wide mb-2">
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                    : ''}
                </p>
                <h2 className="font-display font-bold text-xl text-court-white group-hover:text-brand-orange transition-colors truncate">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="text-court-gray text-sm mt-2 line-clamp-2">{article.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
