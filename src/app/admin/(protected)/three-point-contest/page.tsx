import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, TpcContestFull } from '@/types'
import EditionSwitcher from '@/components/admin/EditionSwitcher'
import TpcAdmin from '@/components/admin/TpcAdmin'
import { Suspense } from 'react'

interface Props {
  searchParams: { category?: string; edition?: string }
}

export default async function ThreePointContestPage({ searchParams }: Props) {
  const supabase = createServerSupabaseClient()

  const { data: allEditions } = await supabase
    .from('editions')
    .select('id, year, title, is_current, registration_open')
    .order('year', { ascending: false })
    .returns<Pick<Edition, 'id' | 'year' | 'title' | 'is_current' | 'registration_open'>[]>()

  const editions = allEditions ?? []
  let activeEdition = searchParams.edition
    ? editions.find(e => e.id === searchParams.edition)
    : editions.find(e => e.is_current)
  if (!activeEdition && editions.length > 0) activeEdition = editions[0]

  let tpcContests: TpcContestFull[] = []

  if (activeEdition) {
    const { data: tpcData } = await supabase
      .from('tpc_contests')
      .select('*, tpc_players(*), tpc_rounds(*, tpc_entries(*, tpc_players(id, name)))')
      .eq('edition_id', activeEdition.id)
      .order('category')
      .returns<TpcContestFull[]>()
    tpcContests = tpcData ?? []
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">3-Point Contest</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione 3-Point Contest</h1>
          {activeEdition && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Suspense>
                <EditionSwitcher editions={editions} currentEditionId={activeEdition.id} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {!activeEdition ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessuna edizione disponibile.</p>
        </div>
      ) : (
        <Suspense>
          <TpcAdmin
            editionId={activeEdition.id}
            contests={tpcContests}
            initialCategory={(searchParams.category as 'open' | 'under') ?? 'open'}
          />
        </Suspense>
      )}
    </div>
  )
}
