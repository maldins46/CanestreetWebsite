import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, GroupWithTeams, MatchWithTeams, TpcContestFull } from '@/types'
import TournamentCalendarSection from '@/components/public/TournamentCalendarSection'
import StandingsSection from '@/components/public/StandingsTable'
import BracketSection from '@/components/public/BracketView'
import ThreePointContestSection from '@/components/public/ThreePointContestSection'

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
      <div className="max-w-6xl mx-auto px-6 py-24 text-center">
        <p className="text-court-gray">Torneo non ancora disponibile.</p>
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

      {/* Calendar section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display font-bold uppercase text-xl text-court-white mb-6">
            Calendario
          </h2>
          <TournamentCalendarSection matches={matches} />
        </div>
      </section>

      {/* Standings section */}
      <section className="py-12 border-t border-court-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display font-bold uppercase text-xl text-court-white mb-6">
            Classifiche
          </h2>
          <StandingsSection groups={groups} matches={matches} />
        </div>
      </section>

      {/* Bracket section */}
      <section className="py-12 border-t border-court-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display font-bold uppercase text-xl text-court-white mb-6">
            Tabellone
          </h2>
          <BracketSection matches={matches} />
        </div>
      </section>

      {/* 3-Point Contest section */}
      <section className="py-12 border-t border-court-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display font-bold uppercase text-xl text-court-white mb-6">
            3-Point Contest
          </h2>
          <ThreePointContestSection contests={tpcContests} />
        </div>
      </section>
    </div>
  )
}
