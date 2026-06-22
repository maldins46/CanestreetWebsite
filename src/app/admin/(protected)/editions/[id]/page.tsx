import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditionEditor from '@/components/admin/EditionEditor'
import type { Edition, EditionWinner, EditionCategorySettings, TeamCategory } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function AdminEditionEditorPage({ params }: Props) {
  const { id } = await params
  const isNew = id === 'new'
  let edition: Edition | null = null
  let winners: EditionWinner[] = []
  let categorySettings: EditionCategorySettings[] = []
  let teamCounts: Record<TeamCategory, number> = { open_m: 0, open_f: 0, u14_m: 0, u16_m: 0, u18_m: 0 }

  if (!isNew) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.from('editions').select('*').eq('id', id).single<Edition>()
    if (!data) notFound()
    edition = data

    const [winnersRes, catSettingsRes, teamsRes] = await Promise.all([
      supabase.from('edition_winners').select('*').eq('edition_id', id).order('sort_order').returns<EditionWinner[]>(),
      supabase.from('edition_category_settings').select('*').eq('edition_id', id).returns<EditionCategorySettings[]>(),
      supabase.from('teams').select('category').eq('edition_id', id).neq('status', 'rejected'),
    ])

    winners = winnersRes.data ?? []
    categorySettings = catSettingsRes.data ?? []
    teamsRes.data?.forEach(t => {
      if (t.category in teamCounts) teamCounts[t.category as TeamCategory]++
    })
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Edizioni</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuova edizione' : `Modifica ${edition?.year} — ${edition?.title}`}
        </h1>
      </div>
      <EditionEditor edition={edition} winners={winners} categorySettings={categorySettings} teamCounts={teamCounts} />
    </div>
  )
}
