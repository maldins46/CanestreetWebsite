import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import NewsEditor from '@/components/admin/NewsEditor'
import type { NewsArticle } from '@/types'

interface Props { params: { id: string } }

export default async function AdminNewsEditorPage({ params }: Props) {
  const isNew = params.id === 'new'
  let article: NewsArticle | null = null

  if (!isNew) {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('news').select('*').eq('id', params.id).single<NewsArticle>()
    if (!data) notFound()
    article = data
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">News</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuovo articolo' : 'Modifica articolo'}
        </h1>
      </div>
      <NewsEditor article={article} />
    </div>
  )
}
