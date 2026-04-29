import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"
import type { NewsArticle } from '@/types'
import MarkdownContent from '@/components/MarkdownContent'

export const revalidate = 60

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createPublicServerSupabaseClient()
  const { data } = await supabase.from('news').select('title, excerpt, cover_url, slug').eq('slug', params.slug).single<NewsArticle>()
  if (!data) return { title: 'Articolo non trovato' }
  return {
    title: data.title,
    description: data.excerpt ?? undefined,
    openGraph: {
      title: data.title,
      description: data.excerpt ?? undefined,
      type: 'article',
      url: `/news/${data.slug}`,
      ...(data.cover_url ? { images: [{ url: data.cover_url }] } : {}),
    },
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const supabase = createPublicServerSupabaseClient()
  const { data: article, error } = await supabase
    .from('news')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single<NewsArticle>()
  if (error && error.code !== 'PGRST116') console.error('[news/slug] article query failed:', error)

  if (!article) notFound()

  return (
    <>
      {/* Full-bleed hero */}
      <div className="relative h-80 md:h-[40rem] overflow-hidden bg-court-dark">
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

        <MarkdownContent>{article.body}</MarkdownContent>
      </article>
    </>
  )
}
