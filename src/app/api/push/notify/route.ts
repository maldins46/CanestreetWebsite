import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendPushToAll } from '@/lib/push'
import type { PushPayload } from '@/lib/push'
import type { PushNotificationType } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ success: false }, { status: 401 })

    const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
    if (!admin) return Response.json({ success: false }, { status: 403 })

    const body = await request.json()
    const { type, payload }: { type: PushNotificationType; payload: PushPayload } = body

    if (!type || !payload) {
      return Response.json({ success: false, error: 'Missing type or payload' }, { status: 400 })
    }

    await sendPushToAll(payload, type)
    return Response.json({ success: true })
  } catch (error) {
    console.error('[push/notify]', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
