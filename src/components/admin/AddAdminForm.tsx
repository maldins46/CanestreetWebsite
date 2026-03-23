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
    const uuid  = fd.get('uuid')  as string
    const role  = fd.get('role')  as string

    const { error } = await supabase.from('admins').insert({ user_id: uuid, email, role })
    if (error) {
      setStatus('error')
      setMsg(error.code === '23503' ? 'UUID non trovato. Verifica che l\'utente esista in Supabase Auth.' : error.message)
      return
    }
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
        <label className="label">UUID Utente</label>
        <input
          name="uuid"
          type="text"
          required
          className="input font-mono text-sm"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          title="UUID nel formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
        <p className="text-court-muted text-xs mt-1">
          Trovalo in Supabase Dashboard → Authentication → Users → copia il campo &quot;User UID&quot;.
        </p>
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
        L&apos;utente deve aver già effettuato almeno un accesso prima di poter essere promosso ad admin.
      </p>
    </form>
  )
}
