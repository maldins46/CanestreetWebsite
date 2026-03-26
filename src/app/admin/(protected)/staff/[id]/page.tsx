import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StaffEditor from '@/components/admin/StaffEditor'
import type { StaffMember } from '@/types'

interface Props { params: { id: string } }

export default async function AdminStaffEditorPage({ params }: Props) {
  const isNew = params.id === 'new'
  let member: StaffMember | null = null

  if (!isNew) {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('id', params.id)
      .single() as { data: StaffMember | null }
    if (!data) notFound()
    member = data
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Staff</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">
          {isNew ? 'Nuovo membro' : 'Modifica membro'}
        </h1>
      </div>
      <StaffEditor member={member} />
    </div>
  )
}
