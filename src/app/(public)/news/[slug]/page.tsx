import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { NewsArticle } from '@/types'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('news').select('title, excerpt').eq('slug', params.slug).single<NewsArticle>()
  if (!data) return { title: 'Articolo non trovato' }
  return { title: data.title, description: data.excerpt ?? undefined }
}

export default async function NewsArticlePage({ params }: Props) {
  const supabase = createServerSupabaseClient()
  const { data: article } = await supabase
    .from('news')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single<NewsArticle>()

  if (!article) notFound()

  return (
    <article className="max-w-2xl mx-auto px-6 py-20">
      <Link href="/news" className="text-court-gray hover:text-court-white text-sm font-display uppercase tracking-wide transition-colors mb-8 inline-block">
        ← News
      </Link>

      {article.cover_url && (
        <div className="relative w-full h-64 mb-8 overflow-hidden">
          <Image src={article.cover_url} alt={article.title} fill className="object-cover" />
        </div>
      )}

      <p className="text-brand-orange text-xs font-display uppercase tracking-widest mb-3">
        {article.published_at
          ? new Date(article.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
          : ''}
      </p>
      <h1 className="font-display font-extrabold text-4xl text-court-white uppercase leading-tight mb-8">
        {article.title}
      </h1>

      <div
        className="prose prose-invert prose-sm max-w-none text-court-gray leading-relaxed"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />
    </article>
  )
}
