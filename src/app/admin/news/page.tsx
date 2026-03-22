import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { NewsArticle } from '@/types'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

export default async function AdminNewsPage() {
  const supabase = createServerSupabaseClient()
  const { data: articles } = await supabase
    .from('news').select('*')
    .order('created_at', { ascending: false })
    .returns<NewsArticle[]>()

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">News</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Articoli</h1>
        </div>
        <Link href="/admin/news/new" className="btn-primary text-sm px-5 py-2">
          <Plus size={14} /> Nuovo articolo
        </Link>
      </div>

      {!articles?.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray mb-4">Nessun articolo ancora.</p>
          <Link href="/admin/news/new" className="btn-primary text-sm px-5 py-2 inline-flex">
            Scrivi il primo articolo →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(a => (
            <Link
              key={a.id}
              href={`/admin/news/${a.id}`}
              className="card p-5 flex items-center justify-between gap-4 hover:border-court-muted transition-colors group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={clsx(
                    'text-xs px-2 py-0.5 font-display uppercase tracking-wide border shrink-0',
                    a.published ? 'badge-approved' : 'badge-pending'
                  )}>
                    {a.published ? 'Pubblicato' : 'Bozza'}
                  </span>
                  <h2 className="font-display font-bold text-court-white uppercase group-hover:text-brand-orange transition-colors truncate">
                    {a.title}
                  </h2>
                </div>
                <p className="text-court-muted text-xs font-mono">
                  {new Date(a.created_at).toLocaleString('it-IT')}
                  {a.published_at && ` · Pubblicato: ${new Date(a.published_at).toLocaleDateString('it-IT')}`}
                </p>
              </div>
              <span className="text-court-muted group-hover:text-brand-orange transition-colors shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
