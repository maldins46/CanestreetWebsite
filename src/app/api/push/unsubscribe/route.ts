import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return Response.json({ success: false, error: 'Missing endpoint' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

    if (error) throw error
    return Response.json({ success: true })
  } catch (error) {
    console.error('[push/unsubscribe]', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
