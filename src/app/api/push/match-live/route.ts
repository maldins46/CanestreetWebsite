import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendPushToAll } from '@/lib/push'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ success: false }, { status: 401 })

    const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
    if (!admin) return Response.json({ success: false }, { status: 403 })

    const { matchId } = await request.json()
    if (!matchId) return Response.json({ success: false, error: 'Missing matchId' }, { status: 400 })

    const { data: match } = await supabase
      .from('matches')
      .select('edition_id, scheduled_at, editions(year)')
      .eq('id', matchId)
      .single()

    if (!match) return Response.json({ success: false, error: 'Match not found' }, { status: 404 })

    const today = new Date().toISOString().slice(0, 10)

    // Count matches for this edition today that are already active or completed (including this one)
    const { count } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('edition_id', match.edition_id)
      .in('status', ['in_progress', 'completed'])
      .gte('scheduled_at', `${today}T00:00:00.000Z`)
      .lt('scheduled_at', `${today}T23:59:59.999Z`)

    // Only notify if this is the first active match of the day
    if (count !== 1) return Response.json({ success: true, skipped: true })

    const editionsData = match.editions as { year: number } | { year: number }[] | null
    const year = Array.isArray(editionsData) ? editionsData[0]?.year : editionsData?.year
    const url = year ? `/editions/${year}` : '/'

    await sendPushToAll(
      {
        title: 'Inizia la giornata di Canestreet!',
        body: 'La prima partita di oggi è appena iniziata. Segui i risultati in diretta, o passaci a trovare in piazza!',
        url,
        tag: `matchday-start-${match.edition_id}-${today}`,
      },
      'matches',
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error('[push/match-live]', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
