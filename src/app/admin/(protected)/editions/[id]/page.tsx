import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditionEditor from '@/components/admin/EditionEditor'
import type { Edition, EditionWinner } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function AdminEditionEditorPage({ params }: Props) {
  const { id } = await params
  const isNew = id === 'new'
  let edition: Edition | null = null
  let winners: EditionWinner[] = []

  if (!isNew) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.from('editions').select('*').eq('id', id).single<Edition>()
    if (!data) notFound()
    edition = data

    const { data: winnersData } = await supabase
      .from('edition_winners')
      .select('*')
      .eq('edition_id', id)
      .order('sort_order')
      .returns<EditionWinner[]>()
    winners = winnersData ?? []
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Edizioni</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuova edizione' : `Modifica ${edition?.year} — ${edition?.title}`}
        </h1>
      </div>
      <EditionEditor edition={edition} winners={winners} />
    </div>
  )
}
