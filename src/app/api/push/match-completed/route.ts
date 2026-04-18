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
      .select(`
        id, edition_id, category, bracket_round, scheduled_at,
        score_home, score_away,
        home:teams!matches_team_home_id_fkey(name),
        away:teams!matches_team_away_id_fkey(name),
        editions(year)
      `)
      .eq('id', matchId)
      .single()

    if (!match) return Response.json({ success: false, error: 'Match not found' }, { status: 404 })

    const editionsData = match.editions as { year: number } | { year: number }[] | null
    const year = Array.isArray(editionsData) ? editionsData[0]?.year : editionsData?.year
    const standingsUrl = year ? `/editions/${year}` : '/'

    const notifications: Promise<void>[] = []

    // Category winner: bracket final completed
    if (match.bracket_round === 'final') {
      const homeScore = match.score_home ?? 0
      const awayScore = match.score_away ?? 0
      const resolveTeam = (t: unknown) => Array.isArray(t) ? (t[0] as { name: string })?.name : (t as { name: string } | null)?.name
      const homeTeam = resolveTeam(match.home) ?? 'Casa'
      const awayTeam = resolveTeam(match.away) ?? 'Ospiti'
      const winnerName = homeScore >= awayScore ? homeTeam : awayTeam

      const categoryLabel: Record<string, string> = {
        open_m: 'Open Maschile',
        open_f: 'Open Femminile',
        u14_m: 'U14 Maschile',
        u16_m: 'U16 Maschile',
        u18_m: 'U18 Maschile',
      }
      const catName = categoryLabel[match.category as string] ?? match.category

      notifications.push(
        sendPushToAll(
          {
            title: 'La categoria ${catName} termina qua 🏆',
            body: `Complimenti a ${winnerName} per la vittoria!`,
            url: standingsUrl,
            tag: `winner-${match.edition_id}-${match.category}`,
          },
          'winners',
        ).then(() => undefined),
      )
    }

    // Matchday finished: all matches for this edition today are completed
    const matchDay = match.scheduled_at
      ? new Date(match.scheduled_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    const { data: todayMatches } = await supabase
      .from('matches')
      .select('status')
      .eq('edition_id', match.edition_id)
      .gte('scheduled_at', `${matchDay}T00:00:00.000Z`)
      .lt('scheduled_at', `${matchDay}T23:59:59.999Z`)

    if (todayMatches?.length && todayMatches.every(m => m.status === 'completed')) {
      notifications.push(
        sendPushToAll(
          {
            title: 'Match day finished. Bravi tutti!',
            body: 'Tutte le partite di oggi sono finite. Accedi qui per i risultati parziali!',
            url: standingsUrl,
            tag: `matchday-done-${match.edition_id}-${matchDay}`,
          },
          'results',
        ).then(() => undefined),
      )
    }

    await Promise.allSettled(notifications)
    return Response.json({ success: true })
  } catch (error) {
    console.error('[push/match-completed]', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
