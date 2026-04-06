import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { TeamWithPlayers, Edition, TeamCategory } from '@/types'
import TeamStatusButton from '@/components/admin/TeamStatusButton'
import CategoryFilter from '@/components/admin/CategoryFilter'
import EditionSwitcher from '@/components/admin/EditionSwitcher'
import RegistrationToggle from '@/components/admin/RegistrationToggle'
import { Suspense } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Plus, Pencil, Download } from 'lucide-react'

const statusLabel: Record<string, string> = {
  pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', waitlisted: 'Lista d\'attesa',
}

const categoryLabel: Record<TeamCategory, string> = {
  open_m: 'Open Maschile', open_f: 'Open Femminile',
  u14_m: 'U14 Maschile', u16_m: 'U16 Maschile', u18_m: 'U18 Maschile',
}

interface Props {
  searchParams: { category?: string; edition?: string }
}

export default async function AdminTeamsPage({ searchParams }: Props) {
  const supabase = createServerSupabaseClient()

  // Fetch all editions for the switcher
  const { data: allEditions } = await supabase
    .from('editions')
    .select('id, year, title, is_current, registration_open')
    .order('year', { ascending: false })
    .returns<Pick<Edition, 'id' | 'year' | 'title' | 'is_current' | 'registration_open'>[]>()

  // Determine active edition: from URL param or fallback to is_current
  const editions = allEditions ?? []
  let activeEdition = searchParams.edition
    ? editions.find(e => e.id === searchParams.edition)
    : editions.find(e => e.is_current)
  if (!activeEdition && editions.length > 0) activeEdition = editions[0]

  let teams: TeamWithPlayers[] = []
  if (activeEdition) {
    let query = supabase
      .from('teams')
      .select('*, players(*)')
      .eq('edition_id', activeEdition.id)
      .order('created_at', { ascending: false })

    const categoryFilter = searchParams.category as TeamCategory | undefined
    if (categoryFilter && ['open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'].includes(categoryFilter)) {
      query = query.eq('category', categoryFilter)
    }

    const { data } = await query.returns<TeamWithPlayers[]>()
    teams = data ?? []
  }

  const categoryFilter = searchParams.category as TeamCategory | undefined

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Squadre</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Iscrizioni</h1>
          {activeEdition && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Suspense>
                <EditionSwitcher
                  editions={editions}
                  currentEditionId={activeEdition.id}
                />
              </Suspense>
              <RegistrationToggle
                editionId={activeEdition.id}
                registrationOpen={activeEdition.registration_open}
              />
              <div className="card flex items-center gap-2 px-3 py-1.5 text-xs font-display uppercase tracking-wide">
                <span className="text-court-white font-bold">{teams.length}</span>
                <span className="text-court-gray">{categoryFilter ? categoryLabel[categoryFilter] : 'iscrizioni'}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-start gap-4 shrink-0">
          {activeEdition && (
            <a
              href={`/api/admin/teams/export?edition=${activeEdition.id}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
              className="btn-ghost text-sm px-4 py-2"
            >
              <Download size={14} /> Esporta CSV
            </a>
          )}
          {activeEdition && (
            <Link
              href={`/admin/teams/new?edition=${activeEdition.id}`}
              className="btn-primary text-sm px-4 py-2"
            >
              <Plus size={14} /> Nuova squadra
            </Link>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-6">
        <Suspense>
          <CategoryFilter />
        </Suspense>
      </div>

      {!teams.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessuna squadra iscritta{categoryFilter ? ` nella categoria ${categoryLabel[categoryFilter]}` : ' ancora'}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => {
            const hasPlayers = team.players && team.players.length > 0
            const captain = hasPlayers
              ? team.players.find(p => p.is_captain)
              : null
            const sortedPlayers = hasPlayers
              ? [...team.players].sort((a, b) => a.sort_order - b.sort_order)
              : null

            return (
              <div key={team.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <Link href={`/admin/teams/${team.id}`} className="flex items-center gap-2 group">
                        <h2 className="font-display font-bold uppercase text-lg text-court-white group-hover:text-brand-orange transition-colors">{team.name}</h2>
                        <Pencil size={13} className="text-court-muted group-hover:text-brand-orange transition-colors" />
                      </Link>
                      <span className="text-xs px-2 py-0.5 font-display uppercase tracking-wide border border-court-border text-court-muted">
                        {categoryLabel[team.category]}
                      </span>
                      <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide',
                        team.status === 'approved'   && 'badge-approved',
                        team.status === 'pending'    && 'badge-pending',
                        team.status === 'rejected'   && 'badge-rejected',
                        team.status === 'waitlisted' && 'badge-waitlisted',
                      )}>
                        {statusLabel[team.status]}
                      </span>
                    </div>

                    {/* Captain / contact info */}
                    <p className="text-court-gray text-sm">
                      {hasPlayers && captain ? (
                        <>Capitano: <span className="text-court-light">{captain.name}</span>{' · '}</>
                      ) : team.captain_name ? (
                        <>Capitano: <span className="text-court-light">{team.captain_name}</span>{' · '}</>
                      ) : null}
                      <a href={`mailto:${team.captain_email}`} className="hover:text-brand-orange transition-colors">
                        {team.captain_email}
                      </a>
                      {team.captain_phone && ` · ${team.captain_phone}`}
                    </p>

                    {/* Players */}
                    {sortedPlayers ? (
                      <div className="mt-2 space-y-1">
                        {sortedPlayers.map(p => (
                          <div key={p.id} className="text-xs text-court-muted flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="text-court-light">
                              {p.name}
                              {p.is_captain && <span className="ml-1 text-brand-orange text-[10px]">cap</span>}
                              {p.is_vice_captain && <span className="ml-1 text-court-gray text-[10px]">vice</span>}
                            </span>
                            <span className="font-mono">{new Date(p.birth_date).toLocaleDateString('it-IT')}</span>
                            <span className="font-mono uppercase">{p.codice_fiscale}</span>
                            {p.email && <span className="text-court-muted">{p.email}</span>}
                            {p.phone && <span className="text-court-muted">{p.phone}</span>}
                            {p.city && <span className="text-court-muted">{p.city}</span>}
                            {p.instagram && <span className="text-court-muted">{p.instagram}</span>}
                            {p.club && <span className="text-court-muted italic">{p.club}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Legacy flat players
                      <p className="text-court-muted text-xs mt-1">
                        Giocatori: {[team.captain_name, team.player2_name, team.player3_name, team.player4_name].filter(Boolean).join(', ')}
                      </p>
                    )}

                    {team.schedule_notes && (
                      <p className="text-court-muted text-xs mt-2 italic">Orari: &quot;{team.schedule_notes}&quot;</p>
                    )}
                    {team.notes && (
                      <p className="text-court-muted text-xs mt-1 italic">Note: &quot;{team.notes}&quot;</p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {(['approved', 'waitlisted', 'rejected'] as const).filter(s => s !== team.status).map(s => (
                      <TeamStatusButton key={s} teamId={team.id} status={s} label={statusLabel[s]} />
                    ))}
                  </div>
                </div>

                <p className="text-court-muted text-xs mt-3 font-mono">
                  {new Date(team.created_at).toLocaleString('it-IT')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
