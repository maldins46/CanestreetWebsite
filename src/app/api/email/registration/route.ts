import { sendRegistrationAdminNotification, sendRegistrationConfirmation } from '@/lib/email'
import type { TeamCategory } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { teamName, captainEmail, category, playerCount } = body

    if (!teamName || !captainEmail || !category || !playerCount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send both emails in parallel
    const [adminResult, captainResult] = await Promise.allSettled([
      sendRegistrationAdminNotification({
        teamName,
        category: category as TeamCategory,
        captainEmail,
        playerCount: parseInt(playerCount, 10),
      }),
      sendRegistrationConfirmation({
        teamName,
        category: category as TeamCategory,
        captainEmail,
      }),
    ])

    // Log outcomes for debugging
    if (adminResult.status === 'rejected') {
      console.error('[email/registration] Admin email failed:', adminResult.reason)
    }
    if (captainResult.status === 'rejected') {
      console.error('[email/registration] Captain email failed:', captainResult.reason)
    }

    // Success if at least one email sent successfully (prefer admin notification)
    const adminSuccess = adminResult.status === 'fulfilled' && adminResult.value.success
    const captainSuccess = captainResult.status === 'fulfilled' && captainResult.value.success

    return new Response(
      JSON.stringify({
        success: adminSuccess || captainSuccess,
        admin: adminSuccess,
        captain: captainSuccess,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email/registration] Route error:', msg)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
