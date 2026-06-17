import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { StaffMember } from '@/types'
import Pagination from '@/components/admin/Pagination'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminStaffPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  const result = await supabase
    .from('staff')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  const members = (result.data ?? []) as StaffMember[]
  const total = result.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Staff</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Staff</h1>
        </div>
        <Link href="/admin/staff/new" className="btn-primary text-sm px-5 py-2 shrink-0">
          <Plus size={14} /> Nuovo membro
        </Link>
      </div>

      {!members.length && total === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray mb-4">Nessun membro dello staff ancora.</p>
          <Link href="/admin/staff/new" className="btn-primary text-sm px-5 py-2 inline-flex">
            Aggiungi il primo →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {members.map(m => (
              <Link
                key={m.id}
                href={`/admin/staff/${m.id}`}
                className="card p-4 flex items-center gap-4 hover:border-court-muted transition-colors group"
              >
                {/* Square thumbnail */}
                <div className="relative w-12 h-12 shrink-0 overflow-hidden border border-court-border bg-court-dark">
                  {m.photo_url ? (
                    <Image src={m.photo_url} alt={m.name} fill className="object-cover object-top" sizes="48px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display font-bold text-lg text-brand-orange/60">{m.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-brand-orange font-display uppercase tracking-widest text-xs">{m.title}</p>
                  <h2 className="font-display font-bold text-court-white uppercase group-hover:text-brand-orange transition-colors truncate">
                    {m.name}
                  </h2>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-court-muted text-xs font-mono">ordine: {m.sort_order}</span>
                  <span className="text-court-muted group-hover:text-brand-orange transition-colors">→</span>
                </div>
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
