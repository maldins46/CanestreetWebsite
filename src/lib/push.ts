import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import type { PushNotificationType } from '@/types'

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

const notificationColumn: Record<PushNotificationType, string> = {
  news: 'notify_news',
  matches: 'notify_matches',
  results: 'notify_results',
  winners: 'notify_winners',
}

export async function sendPushToAll(payload: PushPayload, type: PushNotificationType) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq(notificationColumn[type], true)

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map(sub =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        )
        .catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }),
    ),
  )
}
