import type { Metadata } from 'next'
import RegisterForm from '@/components/public/RegisterForm'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Registra la squadra' }

export default async function RegisterPage() {
  const supabase = createServerSupabaseClient()
  const { data: edition } = await supabase
    .from('editions')
    .select('id, title, year')
    .eq('is_current', true)
    .single()

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-3">
        {edition?.title ?? 'Edizione corrente'}
      </p>
      <h1 className="heading-section text-4xl text-court-white mb-2">Iscriviti</h1>
      <p className="text-court-gray mb-12">
        Compila il modulo per registrare la tua squadra. Ti contatteremo per conferma.
      </p>

      {edition ? (
        <RegisterForm editionId={edition.id} />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-court-gray">Le iscrizioni non sono ancora aperte.</p>
        </div>
      )}
    </div>
  )
}
