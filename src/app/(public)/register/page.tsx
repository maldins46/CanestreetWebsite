import type { Metadata } from 'next'
import RegisterForm from '@/components/public/RegisterForm'
import { createPublicServerSupabaseClient } from "@/lib/supabase/server"

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
        <RegisterForm editionId={edition.id} />
      ) : (
        <div className="card p-8 text-center">
          <p className="font-display uppercase text-court-muted text-sm tracking-wide">
            Le iscrizioni non sono ancora aperte.
          </p>
          <p className="text-court-muted text-xs mt-2">
            Segui i nostri canali per ricevere aggiornamenti sull'apertura delle iscrizioni.
          </p>
        </div>
      )}
    </div>
  )
}
