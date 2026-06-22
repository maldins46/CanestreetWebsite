import type { Metadata } from 'next'
import RegisterForm from '@/components/public/RegisterForm'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"
import type { EditionCategorySettings, TeamCategory } from '@/types'

export const metadata: Metadata = { title: 'Registra la squadra' }

export const revalidate = 60

export default async function RegisterPage() {
  const supabase = createPublicServerSupabaseClient()
  const { data: edition, error } = await supabase
    .from('editions')
    .select('id, title, year, registration_open')
    .eq('is_current', true)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[register] edition query failed:', error)

  const isOpen = edition?.registration_open === true

  let categorySettings: EditionCategorySettings[] = []
  let teamCounts: Record<TeamCategory, number> = { open_m: 0, open_f: 0, u14_m: 0, u16_m: 0, u18_m: 0 }

  if (isOpen && edition) {
    const [catRes, countRes] = await Promise.all([
      supabase.from('edition_category_settings').select('*').eq('edition_id', edition.id).returns<EditionCategorySettings[]>(),
      supabase.rpc('get_category_team_counts', { p_edition_id: edition.id }),
    ])
    categorySettings = catRes.data ?? []
    countRes.data?.forEach((r: { category: string; count: number }) => {
      if (r.category in teamCounts) teamCounts[r.category as TeamCategory] = Number(r.count)
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <p className="text-brand-orange font-display uppercase tracking-[0.3em] text-xs font-semibold mb-3">
        {edition?.title ?? 'Iscrizioni'}
      </p>
      <h1 className="heading-section text-4xl md:text-5xl text-court-white mb-2">Iscriviti</h1>
      <p className="text-court-gray mb-12">
        Compila il modulo per registrare la tua squadra. Ti contatteremo per conferma.
      </p>

      {isOpen ? (
        <RegisterForm editionId={edition.id} categorySettings={categorySettings} teamCounts={teamCounts} />
      ) : (
        <div className="card p-8 text-center">
          <p className="font-display uppercase text-court-muted text-sm tracking-wide">
            Le iscrizioni non sono ancora aperte.
          </p>
          <p className="text-court-muted text-xs mt-2">
            Segui i nostri canali per ricevere aggiornamenti sull&apos;apertura delle iscrizioni.
          </p>
        </div>
      )}
    </div>
  )
}
