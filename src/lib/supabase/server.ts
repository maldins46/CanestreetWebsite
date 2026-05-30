// lib/supabase/server.ts — server client (use in Server Components & Route Handlers)
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// For public Server Components: reads only public data via the anon key,
// without touching any auth cookies. This makes public pages immune to
// expired/corrupted Supabase session cookies on the browser — an expired JWT
// causes PostgREST to reject all queries (401 JWT expired) regardless of RLS
// policies, making the page appear empty. By skipping cookies here we ensure
// the anon key is always used and public RLS policies always apply.
export function createPublicServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
