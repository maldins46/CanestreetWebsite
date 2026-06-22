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

    // Fire-and-forget: notify captain of status change
    fetch('/api/email/status-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, newStatus: status }),
    }).catch(() => {}) // silently ignore email failures

    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={update}
      disabled={loading}
      className={clsx(
        'text-xs px-3 py-1.5 font-display uppercase tracking-wide border transition-colors disabled:opacity-50',
        status === 'approved'   && 'btn-status-approved',
        status === 'rejected'   && 'btn-status-rejected',
        status === 'waitlisted' && 'btn-status-waitlisted',
        status === 'pending'    && 'btn-status-pending',
      )}
    >
      {loading ? '...' : label}
    </button>
  )
}
