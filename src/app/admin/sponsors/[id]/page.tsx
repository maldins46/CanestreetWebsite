import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SponsorEditor from '@/components/admin/SponsorEditor'
import type { Sponsor } from '@/types'

interface Props { params: { id: string } }

export default async function AdminSponsorEditorPage({ params }: Props) {
  const isNew = params.id === 'new'
  let sponsor: Sponsor | null = null

  if (!isNew) {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', params.id)
      .single() as { data: Sponsor | null }
    if (!data) notFound()
    sponsor = data
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Sponsor</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuovo sponsor' : 'Modifica sponsor'}
        </h1>
      </div>
      <SponsorEditor sponsor={sponsor} />
    </div>
  )
}
