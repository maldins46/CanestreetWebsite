import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TeamEditor from '@/components/admin/TeamEditor'
import type { TeamWithPlayers, Edition } from '@/types'

interface Props {
  params: { id: string }
  searchParams: { edition?: string }
}

export default async function AdminTeamEditorPage({ params, searchParams }: Props) {
  const supabase = createServerSupabaseClient()
  const isNew = params.id === 'new'

  // Fetch editions for the selector
  const { data: editions } = await supabase
    .from('editions')
    .select('id, year, title, is_current')
    .order('year', { ascending: false })
    .returns<Pick<Edition, 'id' | 'year' | 'title' | 'is_current'>[]>()

  let team: TeamWithPlayers | null = null
  let editionId = searchParams.edition ?? ''

  if (!isNew) {
    const { data } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('id', params.id)
      .single<TeamWithPlayers>()
    if (!data) notFound()
    team = data
    editionId = data.edition_id
  }

  // Fallback: if no edition specified for new team, use the current one
  if (!editionId && editions?.length) {
    const current = editions.find(e => e.is_current)
    editionId = current?.id ?? editions[0].id
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Squadre</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuova squadra' : `Modifica — ${team?.name}`}
        </h1>
      </div>
      <TeamEditor team={team} editionId={editionId} editions={editions ?? []} />
    </div>
  )
}
