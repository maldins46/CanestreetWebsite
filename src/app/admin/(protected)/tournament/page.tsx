import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Edition, GroupWithTeams, MatchWithTeams, TeamCategory } from '@/types'
import EditionSwitcher from '@/components/admin/EditionSwitcher'
import ModeToggle from '@/components/admin/ModeToggle'
import CategoryFilter from '@/components/admin/CategoryFilter'
import TournamentGroups from '@/components/admin/TournamentGroups'
import TournamentCalendar from '@/components/admin/TournamentCalendar'
import TournamentBracket from '@/components/admin/TournamentBracket'
import { Suspense } from 'react'

const categoryLabel: Record<TeamCategory, string> = {
  open_m: 'Open Maschile', open_f: 'Open Femminile',
  u14_m: 'U14 Maschile', u16_m: 'U16 Maschile', u18_m: 'U18 Maschile',
}

const TOURNAMENT_MODES = [
  { value: 'calendario', label: 'Calendario' },
  { value: 'gironi',     label: 'Gironi' },
  { value: 'tabellone',  label: 'Tabellone Finals' },
]

interface Props {
  searchParams: Promise<{ category?: string; edition?: string; mode?: string; search?: string }>
}

export default async function AdminTorneoPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  // Fetch all editions for the switcher
  const { data: allEditions } = await supabase
    .from('editions')
    .select('id, year, title, is_current, registration_open')
    .order('year', { ascending: false })
    .returns<Pick<Edition, 'id' | 'year' | 'title' | 'is_current' | 'registration_open'>[]>()

  const editions = allEditions ?? []
  let activeEdition = sp.edition
    ? editions.find(e => e.id === sp.edition)
    : editions.find(e => e.is_current)
  if (!activeEdition && editions.length > 0) activeEdition = editions[0]

  const tab = sp.mode ?? 'gironi'
  const category = (sp.category as TeamCategory) ?? 'open_m'

  let groups: GroupWithTeams[] = []
  let approvedTeams: { id: string; name: string; category: string }[] = []
  let groupsWithMatches: string[] = []
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

    const { data: groupMatchRows } = await supabase
      .from('matches')
      .select('group_id')
      .eq('edition_id', activeEdition.id)
      .eq('category', category)
      .eq('phase', 'group')
    groupsWithMatches = [...new Set((groupMatchRows ?? []).map(r => r.group_id).filter(Boolean))]

    const { data: matchData } = await supabase
      .from('matches')
      .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
      .eq('edition_id', activeEdition.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('sort_order')
      .returns<MatchWithTeams[]>()
    matches = matchData ?? []
  }

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
              <Suspense>
                <ModeToggle modes={TOURNAMENT_MODES} defaultMode="gironi" />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <Suspense>
          <CategoryFilter
            showSearch={tab === 'calendario'}
            searchPlaceholder="Cerca squadra, girone o turno…"
            hideAll={tab !== 'calendario'}
          />
        </Suspense>
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
          groupsWithMatches={groupsWithMatches}
        />
      ) : tab === 'calendario' ? (
        <TournamentCalendar
          editionId={activeEdition.id}
          matches={matches}
          category={sp.category as TeamCategory | undefined}
          search={sp.search}
        />
      ) : (
        <TournamentBracket
          editionId={activeEdition.id}
          category={category}
          bracketMatches={matches.filter(m => m.category === category && m.phase === 'bracket')}
          groupMatches={matches.filter(m => m.category === category && m.phase === 'group')}
          groups={groups}
          approvedTeams={approvedTeams}
        />
      )}
    </div>
  )
}
