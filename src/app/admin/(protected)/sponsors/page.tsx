import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Sponsor, SponsorTier } from '@/types'
import Pagination from '@/components/admin/Pagination'
import TierFilter from '@/components/admin/TierFilter'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'

const PAGE_SIZE = 20

const TIER_LABELS: Record<SponsorTier, string> = {
  main:   'Main',
  gold:   'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
}

const TIER_BADGE: Record<SponsorTier, string> = {
  main:   'bg-brand-orange/20 text-brand-orange border border-brand-orange/30',
  gold:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  silver: 'bg-gray-400/20 text-gray-300 border border-gray-400/30',
  bronze: 'bg-amber-700/20 text-amber-500 border border-amber-700/30',
}

interface Props {
  searchParams: Promise<{ page?: string; tier?: string }>
}

export default async function AdminSponsorsPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE
  const activeTier = sp.tier as SponsorTier | undefined

  let query = supabase
    .from('sponsors')
    .select('*', { count: 'exact' })
    .order('tier', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (activeTier) query = query.eq('tier', activeTier)

  const result = await query.range(offset, offset + PAGE_SIZE - 1)

  const sponsors = (result.data ?? []) as Sponsor[]
  const total = result.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Backoffice</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Sponsor</h1>
        </div>
        <Link href="/admin/sponsors/new" className="btn-primary text-sm px-5 py-2 shrink-0">
          <Plus size={14} /> Nuovo sponsor
        </Link>
      </div>

      <div className="mb-6">
        <Suspense>
          <TierFilter />
        </Suspense>
      </div>

      {!sponsors.length && total === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray mb-4">Nessuno sponsor ancora.</p>
          <Link href="/admin/sponsors/new" className="btn-primary text-sm px-5 py-2 inline-flex">
            Aggiungi il primo →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sponsors.map(s => (
              <Link
                key={s.id}
                href={`/admin/sponsors/${s.id}`}
                className={`card p-4 flex items-center gap-4 hover:border-court-muted transition-colors group ${!s.is_active ? 'opacity-50' : ''}`}
              >
                {/* Logo thumbnail */}
                <div className="relative w-16 h-12 shrink-0 overflow-hidden border border-court-border bg-white flex items-center justify-center">
                  {s.logo_url ? (
                    <Image src={s.logo_url} alt={s.name} fill className="object-contain p-1" sizes="64px" />
                  ) : (
                    <span className="font-display font-bold text-lg text-brand-orange/60">{s.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold text-court-white uppercase group-hover:text-brand-orange transition-colors truncate">
                    {s.name}
                  </h2>
                  {s.website_url && (
                    <p className="text-court-gray text-xs truncate">{s.website_url}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-display uppercase tracking-wider px-2 py-0.5 ${TIER_BADGE[s.tier]}`}>
                    {TIER_LABELS[s.tier]}
                  </span>
                  {!s.is_active && (
                    <span className="text-xs font-display uppercase tracking-wider px-2 py-0.5 bg-court-muted/20 text-court-muted border border-court-muted/30">
                      Inattivo
                    </span>
                  )}
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
