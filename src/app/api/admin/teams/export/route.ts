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
  open_m: 'Open Maschile', open_f: 'Open Femminile',
  u14_m: 'U14 Maschile', u16_m: 'U16 Maschile', u18_m: 'U18 Maschile',
}

const statusLabel: Record<string, string> = {
  pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', waitlisted: 'Lista d\'attesa',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const editionId = searchParams.get('edition')
  const category = searchParams.get('category') as TeamCategory | null
  const mode = searchParams.get('mode') ?? 'full'

  if (!editionId) {
    return new Response('edition param required', { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

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

  if (category && ['open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'].includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error } = await query.returns<TeamWithPlayers[]>()
  if (error) return new Response('Error fetching teams', { status: 500 })

  const teams = data ?? []
  const year = edition?.year ?? 'export'

  // ── mode: players ────────────────────────────────────────────────────────────
  if (mode === 'players') {
    const headers = [
      'Nome', 'Data di nascita', 'Codice fiscale', 'Email', 'Telefono',
      'Città', 'Instagram', 'Club', 'Capitano', 'Vice-capitano',
      'Nome squadra', 'Categoria',
    ]

    const rows: string[] = []
    for (const team of teams) {
      const sorted = team.players?.length
        ? [...team.players].sort((a, b) => a.sort_order - b.sort_order)
        : []
      for (const p of sorted) {
        rows.push([
          p.name,
          new Date(p.birth_date).toLocaleDateString('it-IT'),
          p.codice_fiscale,
          p.email,
          p.phone,
          p.city,
          p.instagram,
          p.club,
          p.is_captain ? 'Sì' : 'No',
          p.is_vice_captain ? 'Sì' : 'No',
          team.name,
          categoryLabel[team.category] ?? team.category,
        ].map(escapeCell).join(','))
      }
    }

    const csv = [headers.map(escapeCell).join(','), ...rows].join('\r\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="giocatori-${year}.csv"`,
      },
    })
  }

  // ── mode: teams ───────────────────────────────────────────────────────────────
  if (mode === 'teams') {
    const headers = [
      'Nome squadra', 'Categoria', 'Stato',
      'Nome capitano', 'Email capitano', 'Telefono capitano',
      'Note orari', 'Consenso New Beetle', 'Note', 'Iscritto il',
    ]

    const rows = teams.map(team => {
      const captain = team.players?.find(p => p.is_captain)
      const captainName = captain?.name ?? team.captain_name ?? null
      return [
        team.name,
        categoryLabel[team.category] ?? team.category,
        statusLabel[team.status] ?? team.status,
        captainName,
        team.captain_email,
        team.captain_phone,
        team.schedule_notes,
        team.consent_new_beetle ? 'Sì' : 'No',
        team.notes,
        new Date(team.created_at).toLocaleString('it-IT'),
      ].map(escapeCell).join(',')
    })

    const csv = [headers.map(escapeCell).join(','), ...rows].join('\r\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="squadre-${year}.csv"`,
      },
    })
  }

  // ── mode: full (default) ─────────────────────────────────────────────────────
  const maxPlayers = teams.reduce((max, team) => {
    const count = team.players?.length ?? 0
    return count > max ? count : max
  }, 0)

  const playerHeaders: string[] = []
  for (let i = 1; i <= maxPlayers; i++) {
    playerHeaders.push(
      `Giocatore ${i} Nome`,
      `Giocatore ${i} Data di nascita`,
      `Giocatore ${i} Codice fiscale`,
      `Giocatore ${i} Email`,
      `Giocatore ${i} Telefono`,
      `Giocatore ${i} Città`,
      `Giocatore ${i} Instagram`,
      `Giocatore ${i} Club`,
      `Giocatore ${i} Capitano`,
      `Giocatore ${i} Vice-capitano`,
    )
  }

  const headers = [
    'Nome squadra', 'Categoria', 'Stato',
    'Email capitano', 'Telefono capitano',
    ...playerHeaders,
    'Note orari', 'Consenso New Beetle', 'Note', 'Iscritto il',
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
        p?.email ?? null,
        p?.phone ?? null,
        p?.city ?? null,
        p?.instagram ?? null,
        p?.club ?? null,
        p ? (p.is_captain ? 'Sì' : 'No') : null,
        p ? (p.is_vice_captain ? 'Sì' : 'No') : null,
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
      team.consent_new_beetle ? 'Sì' : 'No',
      team.notes,
      new Date(team.created_at).toLocaleString('it-IT'),
    ].map(escapeCell).join(',')
  })

  const csv = [headers.map(escapeCell).join(','), ...rows].join('\r\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="squadre-${year}.csv"`,
    },
  })
}
