'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const supabase = createClient()
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(
    params.get('error') === 'unauthorized' ? 'Account non autorizzato come admin.' : null
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    const fd = new FormData(e.currentTarget)
    const { error: err } = await supabase.auth.signInWithPassword({
      email:    fd.get('email')    as string,
      password: fd.get('password') as string,
    })
    if (err) { setStatus('error'); setError(err.message); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-3">{error}</p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full justify-center py-3 mt-2">
        {status === 'loading' ? 'Accesso...' : 'Accedi →'}
      </button>
    </form>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-court-black px-6">
      <div className="w-full max-w-sm">
        <p className="font-display font-extrabold uppercase tracking-widest text-brand-orange text-sm mb-1">
          Cane Street 3×3
        </p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white mb-8">Backoffice</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
