import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Standing } from '@/types'
import StandingsEditor from '@/components/admin/StandingsEditor'

export default async function AdminStandingsPage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions').select('id, title').eq('is_current', true).single()

  const { data: standings } = await supabase
    .from('standings').select('*')
    .eq('edition_id', edition?.id ?? '')
    .order('rank', { ascending: true, nullsFirst: false })
    .returns<Standing[]>()

  const { data: approvedTeams } = await supabase
    .from('teams').select('id, name')
    .eq('edition_id', edition?.id ?? '')
    .eq('status', 'approved')

  return (
    <div>
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Classifica</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Classifica</h1>
        {edition && <p className="text-court-gray text-sm mt-1">{edition.title}</p>}
      </div>
      <StandingsEditor
        editionId={edition?.id ?? ''}
        standings={standings ?? []}
        approvedTeams={approvedTeams ?? []}
      />
    </div>
  )
}
