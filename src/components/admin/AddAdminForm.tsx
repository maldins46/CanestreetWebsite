'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddAdminForm() {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const role  = fd.get('role')  as string

    // Look up the user by email using a custom function or just insert
    // (Requires the user to have signed up already in Supabase Auth)
    const { data: users } = await supabase.rpc('get_user_id_by_email', { email })
    const userId = users?.[0]?.id

    if (!userId) {
      setStatus('error')
      setMsg('Utente non trovato. Deve prima registrarsi con questa email.')
      return
    }

    const { error } = await supabase.from('admins').insert({ user_id: userId, email, role })
    if (error) { setStatus('error'); setMsg(error.message); return }
    setStatus('success')
    setMsg('Admin aggiunto!')
    router.refresh()
    ;(e.target as HTMLFormElement).reset()
    setTimeout(() => { setStatus('idle'); setMsg(null) }, 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required className="input" placeholder="admin@email.com" />
      </div>
      <div>
        <label className="label">Ruolo</label>
        <select name="role" className="input">
          <option value="editor">Editor</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      {msg && (
        <p className={`text-sm px-4 py-3 border ${status === 'error' ? 'text-red-400 bg-red-900/20 border-red-800' : 'text-green-400 bg-green-900/20 border-green-800'}`}>
          {msg}
        </p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary text-sm px-6 py-2 w-full justify-center">
        {status === 'loading' ? 'Aggiunta...' : 'Aggiungi admin'}
      </button>

      <p className="text-court-muted text-xs">
        Nota: è necessario aggiungere una funzione RPC <code className="text-brand-orange">get_user_id_by_email</code> in Supabase (vedi README).
      </p>
    </form>
  )
}
