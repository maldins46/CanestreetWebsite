import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { endpoint, p256dh, auth, notify_news, notify_matches, notify_results, notify_winners } = body

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ success: false, error: 'Missing subscription fields' }, { status: 400 })
    }

    // Service role bypasses RLS — appropriate here since push subscriptions are intentionally public-write
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
        notify_news: notify_news ?? true,
        notify_matches: notify_matches ?? true,
        notify_results: notify_results ?? true,
        notify_winners: notify_winners ?? true,
      },
      { onConflict: 'endpoint' },
    )

    if (error) throw error
    return Response.json({ success: true })
  } catch (error) {
    console.error('[push/subscribe]', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
