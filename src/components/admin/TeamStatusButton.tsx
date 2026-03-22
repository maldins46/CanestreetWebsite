'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TeamStatus } from '@/types'
import clsx from 'clsx'

interface Props { teamId: string; status: TeamStatus; label: string }

export default function TeamStatusButton({ teamId, status, label }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function update() {
    setLoading(true)
    await supabase.from('teams').update({ status }).eq('id', teamId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={update}
      disabled={loading}
      className={clsx(
        'text-xs px-3 py-1.5 font-display uppercase tracking-wide border transition-colors disabled:opacity-50',
        status === 'approved'   && 'border-green-800 text-green-400 hover:bg-green-900/30',
        status === 'rejected'   && 'border-red-800 text-red-400 hover:bg-red-900/30',
        status === 'waitlisted' && 'border-blue-800 text-blue-400 hover:bg-blue-900/30',
      )}
    >
      {loading ? '...' : label}
    </button>
  )
}
