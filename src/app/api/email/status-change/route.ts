import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendStatusChangeNotification } from '@/lib/email'
import type { Team, TeamStatus } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { teamId, newStatus } = body

    if (!teamId || !newStatus) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing teamId or newStatus' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify valid status
    if (!['approved', 'rejected', 'waitlisted', 'pending'].includes(newStatus)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Auth: verify caller is admin
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name, captain_email, status')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ success: false, error: 'Team not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Only send email for meaningful status changes (not pending)
    if (newStatus === 'pending') {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send status change email
    const result = await sendStatusChangeNotification({
      teamName: team.name,
      captainEmail: team.captain_email,
      newStatus: newStatus as TeamStatus,
    })

    return new Response(
      JSON.stringify({ success: result.success, error: result.error || undefined }),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email/status-change] Route error:', msg)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
