import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { TeamWithPlayers, TeamCategory } from '@/types'

function escapeCell(value: string | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const categoryLabel: Record<TeamCategory, string> = {
  open: 'Open', u14: 'U14', u16: 'U16', u18: 'U18',
}

const statusLabel: Record<string, string> = {
  pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', waitlisted: 'Lista d\'attesa',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const editionId = searchParams.get('edition')
  const category = searchParams.get('category') as TeamCategory | null

  if (!editionId) {
    return new Response('edition param required', { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
  if (!admin) return new Response('Forbidden', { status: 403 })

  // Fetch edition for filename
  const { data: edition } = await supabase
    .from('editions')
    .select('year, title')
    .eq('id', editionId)
    .single()

  // Fetch teams
  let query = supabase
    .from('teams')
    .select('*, players(*)')
    .eq('edition_id', editionId)
    .order('created_at', { ascending: false })

  if (category && ['open', 'u14', 'u16', 'u18'].includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.returns<TeamWithPlayers[]>()
  if (error) return new Response('Error fetching teams', { status: 500 })

  const teams = data ?? []

  // Determine max player count across all teams (for consistent column count)
  const maxPlayers = teams.reduce((max, team) => {
    const count = team.players?.length ?? 0
    return count > max ? count : max
  }, 0)

  // Build player column headers: Giocatore 1 Nome, Giocatore 1 Data di nascita, ...
  const playerHeaders: string[] = []
  for (let i = 1; i <= maxPlayers; i++) {
    playerHeaders.push(
      `Giocatore ${i} Nome`,
      `Giocatore ${i} Data di nascita`,
      `Giocatore ${i} Codice fiscale`,
      `Giocatore ${i} Instagram`,
      `Giocatore ${i} Club`,
      `Giocatore ${i} Capitano`,
    )
  }

  const headers = [
    'Nome squadra', 'Categoria', 'Stato',
    'Email capitano', 'Telefono capitano',
    ...playerHeaders,
    'Note orari', 'Note', 'Iscritto il',
  ]

  const rows = teams.map(team => {
    const sorted = team.players?.length
      ? [...team.players].sort((a, b) => a.sort_order - b.sort_order)
      : []

    const playerCells: (string | null)[] = []
    for (let i = 0; i < maxPlayers; i++) {
      const p = sorted[i] ?? null
      playerCells.push(
        p?.name ?? null,
        p ? new Date(p.birth_date).toLocaleDateString('it-IT') : null,
        p?.codice_fiscale ?? null,
        p?.instagram ?? null,
        p?.club ?? null,
        p ? (p.is_captain ? 'Sì' : 'No') : null,
      )
    }

    return [
      team.name,
      categoryLabel[team.category] ?? team.category,
      statusLabel[team.status] ?? team.status,
      team.captain_email,
      team.captain_phone,
      ...playerCells,
      team.schedule_notes,
      team.notes,
      new Date(team.created_at).toLocaleString('it-IT'),
    ].map(escapeCell).join(',')
  })

  const csv = [headers.map(escapeCell).join(','), ...rows].join('\r\n')
  const year = edition?.year ?? 'export'
  const filename = `squadre-${year}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
