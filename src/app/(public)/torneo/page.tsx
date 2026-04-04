import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, GroupWithTeams, MatchWithTeams, TpcContestFull } from '@/types'
import TorneoPageClient from '@/components/public/TorneoPageClient'

export const revalidate = 15

export const metadata: Metadata = { title: 'Torneo' }

export default async function TorneoPage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('id, year, title')
    .eq('is_current', true)
    .maybeSingle()
    .returns<Pick<Edition, 'id' | 'year' | 'title'>>()

  if (!edition) {
    return (
      <div>
        <section className="py-16 border-b border-court-border">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-2">
              Torneo
            </p>
            <h1 className="font-display font-extrabold uppercase text-4xl md:text-6xl text-court-white leading-none mb-4">
              Calendario &amp; Classifiche
            </h1>
            <p className="text-court-gray font-body">Torneo non ancora disponibile.</p>
          </div>
        </section>
        <Suspense fallback={null}>
          <TorneoPageClient matches={[]} groups={[]} tpcContests={[]} />
        </Suspense>
      </div>
    )
  }

  const [{ data: matchData }, { data: groupData }, { data: tpcData }] = await Promise.all([
    supabase
      .from('matches')
      .select(
        '*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)',
      )
      .eq('edition_id', edition.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('sort_order')
      .returns<MatchWithTeams[]>(),

    supabase
      .from('groups')
      .select('*, group_teams(*, teams(id, name))')
      .eq('edition_id', edition.id)
      .order('sort_order')
      .returns<GroupWithTeams[]>(),

    supabase
      .from('tpc_contests')
      .select('*, tpc_players(*), tpc_rounds(*, tpc_entries(*, tpc_players(id, name)))')
      .eq('edition_id', edition.id)
      .returns<TpcContestFull[]>(),
  ])

  const matches = matchData ?? []
  const groups = groupData ?? []
  const tpcContests = tpcData ?? []

  return (
    <div>
      {/* Hero */}
      <section className="py-16 border-b border-court-border">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-2">
            Torneo {edition.year}
          </p>
          <h1 className="font-display font-extrabold uppercase text-4xl md:text-6xl text-court-white leading-none mb-4">
            Calendario &amp; Classifiche
          </h1>
          <p className="text-court-gray font-body">{edition.title}</p>
        </div>
      </section>

      {/* Tabs + Content */}
      <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-12"><div className="card p-10 text-center"><p className="text-court-gray">Caricamento...</p></div></div>}>
        <TorneoPageClient
          matches={matches}
          groups={groups}
          tpcContests={tpcContests}
        />
      </Suspense>
    </div>
  )
}
