import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, GroupWithTeams, MatchWithTeams, TeamCategory } from '@/types'
import EditionSwitcher from '@/components/admin/EditionSwitcher'
import CategoryFilter from '@/components/admin/CategoryFilter'
import TournamentGroups from '@/components/admin/TournamentGroups'
import TournamentCalendar from '@/components/admin/TournamentCalendar'
import { Suspense } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

const categoryLabel: Record<TeamCategory, string> = {
  open: 'Open', u14: 'U14', u16: 'U16', u18: 'U18',
}

interface Props {
  searchParams: { category?: string; edition?: string; tab?: string }
}

export default async function AdminTorneoPage({ searchParams }: Props) {
  const supabase = createServerSupabaseClient()

  // Fetch all editions for the switcher
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

  const tab = searchParams.tab ?? 'gironi'
  const category = (searchParams.category as TeamCategory) ?? 'open'

  let groups: GroupWithTeams[] = []
  let approvedTeams: { id: string; name: string; category: string }[] = []
  let hasGroupMatches = false
  let matches: MatchWithTeams[] = []

  if (activeEdition) {
    const { data: g } = await supabase
      .from('groups')
      .select('*, group_teams(*, teams(id, name))')
      .eq('edition_id', activeEdition.id)
      .eq('category', category)
      .order('sort_order')
      .returns<GroupWithTeams[]>()
    groups = g ?? []

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, category')
      .eq('edition_id', activeEdition.id)
      .eq('status', 'approved')
      .order('name')
    approvedTeams = teams ?? []

    const { count } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('edition_id', activeEdition.id)
      .eq('category', category)
      .eq('phase', 'group')
    hasGroupMatches = (count ?? 0) > 0

    const { data: matchData } = await supabase
      .from('matches')
      .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
      .eq('edition_id', activeEdition.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('sort_order')
      .returns<MatchWithTeams[]>()
    matches = matchData ?? []
  }

  const tabs = [
    { key: 'gironi', label: 'Gironi' },
    { key: 'calendario', label: 'Calendario' },
    { key: 'tabellone', label: 'Tabellone' },
  ]

  // Suppress unused variable warning — categoryLabel is available for future use
  void categoryLabel

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Torneo</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Torneo</h1>
          {activeEdition && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Suspense>
                <EditionSwitcher editions={editions} currentEditionId={activeEdition.id} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <Suspense>
          <CategoryFilter />
        </Suspense>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-court-border mb-6">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin/torneo?${new URLSearchParams({
              ...(searchParams.edition ? { edition: searchParams.edition } : {}),
              ...(searchParams.category ? { category: searchParams.category } : {}),
              tab: t.key,
            }).toString()}`}
            className={clsx(
              'px-5 py-2.5 font-display uppercase tracking-wide text-sm border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-court-gray hover:text-court-white'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {!activeEdition ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessuna edizione disponibile.</p>
        </div>
      ) : tab === 'gironi' ? (
        <TournamentGroups
          editionId={activeEdition.id}
          category={category}
          groups={groups}
          approvedTeams={approvedTeams}
          hasGroupMatches={hasGroupMatches}
        />
      ) : tab === 'calendario' ? (
        <TournamentCalendar
          editionId={activeEdition.id}
          matches={matches}
          category={searchParams.category as TeamCategory | undefined}
        />
      ) : (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Questa sezione sarà disponibile a breve.</p>
        </div>
      )}
    </div>
  )
}
