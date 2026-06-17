import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Edition } from '@/types'
import Pagination from '@/components/admin/Pagination'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminEditionsPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  const { data: editions, count } = await supabase
    .from('editions')
    .select('*', { count: 'exact' })
    .order('year', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    .returns<Edition[]>()

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Edizioni</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Edizioni</h1>
        </div>
        <Link href="/admin/editions/new" className="btn-primary text-sm px-5 py-2 shrink-0">
          <Plus size={14} /> Nuova edizione
        </Link>
      </div>

      {!editions?.length && total === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray mb-4">Nessuna edizione ancora.</p>
          <Link href="/admin/editions/new" className="btn-primary text-sm px-5 py-2 inline-flex">
            Crea la prima edizione →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {editions?.map(ed => (
              <Link
                key={ed.id}
                href={`/admin/editions/${ed.id}`}
                className="card p-5 flex items-center justify-between gap-4 hover:border-court-muted transition-colors group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-extrabold text-2xl text-white/30 shrink-0">
                      {ed.year}
                    </span>
                    {ed.is_current && (
                      <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide border shrink-0 badge-approved')}>
                        Corrente
                      </span>
                    )}
                    <h2 className="font-display font-bold text-court-white uppercase group-hover:text-brand-orange transition-colors truncate">
                      {ed.title}
                    </h2>
                  </div>
                  {ed.subtitle && (
                    <p className="text-court-muted text-xs font-display uppercase tracking-wide">{ed.subtitle}</p>
                  )}
                </div>
                <span className="text-court-muted group-hover:text-brand-orange transition-colors shrink-0">→</span>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <Suspense>
              <Pagination page={page} totalPages={totalPages} total={total} />
            </Suspense>
          )}
        </>
      )}
    </div>
  )
}
