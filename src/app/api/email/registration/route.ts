import { sendRegistrationAdminNotification, sendRegistrationConfirmation } from '@/lib/email'
import type { TeamCategory } from '@/types'

// Simple in-memory rate limiter: max 5 requests per IP per 10 minutes.
// Resets on cold start (acceptable for serverless — prevents bulk spam, not sophisticated attacks).
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 5
const hits = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= MAX_REQUESTS) return true
  entry.count++
  return false
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Too many requests. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await request.json()
    const { teamName, captainEmail, captainPhone, category, playerCount } = body

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
        captainPhone: captainPhone || null,
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
