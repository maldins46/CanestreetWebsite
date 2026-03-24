'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LockOpen, Lock } from 'lucide-react'

interface Props {
  editionId: string
  registrationOpen: boolean
}

export default function RegistrationToggle({ editionId, registrationOpen }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    await supabase.from('editions').update({ registration_open: !registrationOpen }).eq('id', editionId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors disabled:opacity-50 ${
        registrationOpen
          ? 'border-green-600 text-green-400 hover:bg-green-900/20'
          : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
      }`}
    >
      {registrationOpen ? <LockOpen size={12} /> : <Lock size={12} />}
      {loading ? '...' : registrationOpen ? 'Iscrizioni aperte' : 'Iscrizioni chiuse'}
    </button>
  )
}
