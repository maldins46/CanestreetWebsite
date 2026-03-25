import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import sanitizeHtml from 'sanitize-html'
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

  const safeBody = sanitizeHtml(article.body, {
    allowedTags: ['p', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'blockquote'],
    allowedAttributes: { 'a': ['href', 'target', 'rel'] },
  })

  return (
    <>
      {/* Full-bleed hero */}
      <div className="relative h-80 md:h-[28rem] overflow-hidden bg-court-dark">
        {article.cover_url && (
          <Image
            src={article.cover_url}
            alt={article.title}
            fill
            className="object-cover opacity-60"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-court-dark via-court-dark/60 to-transparent" />

        <div className="absolute bottom-0 left-0 p-8 md:p-12">
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-2">
            {article.published_at
              ? new Date(article.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
              : ''}
          </p>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl text-court-white uppercase leading-tight">
            {article.title}
          </h1>
        </div>
      </div>

      {/* Body */}
      <article className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/news" className="text-court-gray hover:text-court-white text-sm font-display uppercase tracking-wide transition-colors mb-8 inline-block">
          ← News
        </Link>

        <div
          className="prose prose-invert prose-sm max-w-none text-court-gray leading-relaxed"
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
      </article>
    </>
  )
}
