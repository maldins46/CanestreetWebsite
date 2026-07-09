import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { TeamWithPlayers, Edition, TeamCategory, EditionCategorySettings } from '@/types'
import TeamStatusButton from '@/components/admin/TeamStatusButton'
import CategoryFilter from '@/components/admin/CategoryFilter'
import EditionSwitcher from '@/components/admin/EditionSwitcher'
import RegistrationModal from '@/components/admin/RegistrationModal'
import Pagination from '@/components/admin/Pagination'
import ModeToggle from '@/components/admin/ModeToggle'
import CheckinView from '@/components/admin/CheckinView'
import { Suspense } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import ExportCsvDialog from '@/components/admin/ExportCsvDialog'
import { Plus, Pencil } from 'lucide-react'

const PAGE_SIZE = 15

const statusLabel: Record<string, string> = {
  pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', waitlisted: 'Lista d\'attesa',
}

const categoryLabel: Record<TeamCategory, string> = {
  open_m: 'Open Maschile', open_f: 'Open Femminile',
  u14_m: 'U14 Maschile', u16_m: 'U16 Maschile', u18_m: 'U18 Maschile',
}

interface Props {
  searchParams: Promise<{ category?: string; edition?: string; page?: string; mode?: string; search?: string; unpaid?: string }>
}

export default async function AdminTeamsPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()

  const isCheckin = sp.mode === 'checkin'
  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  // Fetch all editions for the switcher
  const { data: allEditions } = await supabase
    .from('editions')
    .select('id, year, title, is_current, registration_open')
    .order('year', { ascending: false })
    .returns<Pick<Edition, 'id' | 'year' | 'title' | 'is_current' | 'registration_open'>[]>()

  const editions = allEditions ?? []
  let activeEdition = sp.edition
    ? editions.find(e => e.id === sp.edition)
    : editions.find(e => e.is_current)
  if (!activeEdition && editions.length > 0) activeEdition = editions[0]

  let teams: TeamWithPlayers[] = []
  let total = 0
  let totalPages = 1
  let categoryNonRejectedCount: number | null = null
  let activeCategoryMax: number | null = null

  // Fetch per-category settings (limits + open/closed) for the active edition
  const { data: catSettings } = activeEdition
    ? await supabase
        .from('edition_category_settings')
        .select('id, category, registration_open, max_teams')
        .eq('edition_id', activeEdition.id)
        .returns<Pick<EditionCategorySettings, 'id' | 'category' | 'registration_open' | 'max_teams'>[]>()
    : { data: null }

  // Per-category non-rejected team counts (for the registration modal)
  let teamCounts: Record<TeamCategory, number> = { open_m: 0, open_f: 0, u14_m: 0, u16_m: 0, u18_m: 0 }
  if (activeEdition) {
    const { data: countData } = await supabase
      .from('teams')
      .select('category')
      .eq('edition_id', activeEdition.id)
      .neq('status', 'rejected')
    countData?.forEach(t => {
      if (t.category in teamCounts) teamCounts[t.category as TeamCategory]++
    })
  }

  if (activeEdition) {
    const categoryFilter = sp.category as TeamCategory | undefined
    const search = sp.search?.trim()

    if (isCheckin) {
      // Check-in mode: all approved teams, no pagination, filter client-side by player name
      let query = supabase
        .from('teams')
        .select('*, players(*)')
        .eq('edition_id', activeEdition.id)
        .eq('status', 'approved')
        .order('name', { ascending: true })

      if (categoryFilter && ['open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'].includes(categoryFilter)) {
        query = query.eq('category', categoryFilter)
      }

      const { data } = await query
      teams = (data ?? []) as TeamWithPlayers[]
    } else {
      // Registration mode: paginated, search on team name
      let query = supabase
        .from('teams')
        .select('*, players(*)', { count: 'exact' })
        .eq('edition_id', activeEdition.id)
        .order('created_at', { ascending: false })

      if (categoryFilter && ['open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'].includes(categoryFilter)) {
        query = query.eq('category', categoryFilter)
      }

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
      teams = (data ?? []) as TeamWithPlayers[]
      total = count ?? 0
      totalPages = Math.ceil(total / PAGE_SIZE)
    }
  }

  const categoryFilter = sp.category as TeamCategory | undefined

  // Compute non-rejected count for limit display when a category filter is active
  if (activeEdition && categoryFilter) {
    const setting = (catSettings ?? []).find(s => s.category === categoryFilter)
    activeCategoryMax = setting?.max_teams ?? null
    if (activeCategoryMax != null) {
      const { count: nonRejCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', activeEdition.id)
        .eq('category', categoryFilter)
        .neq('status', 'rejected')
      categoryNonRejectedCount = nonRejCount ?? 0
    }
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Squadre</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Iscrizioni</h1>
      </div>

      {activeEdition && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Suspense>
            <EditionSwitcher
              editions={editions}
              currentEditionId={activeEdition.id}
            />
          </Suspense>
          <RegistrationModal
            editionId={activeEdition.id}
            registrationOpen={activeEdition.registration_open}
            categorySettings={catSettings ?? []}
            teamCounts={teamCounts}
          />
          <Suspense>
            <ModeToggle />
          </Suspense>
          {!isCheckin && (
            <div className="card flex items-center gap-2 px-3 py-1.5 text-xs font-display uppercase tracking-wide">
              {categoryNonRejectedCount != null && activeCategoryMax != null ? (
                <span className={`font-bold ${categoryNonRejectedCount >= activeCategoryMax ? 'text-red-400' : 'text-court-white'}`}>
                  {categoryNonRejectedCount}/{activeCategoryMax}
                </span>
              ) : (
                <span className="text-court-white font-bold">{total}</span>
              )}
              <span className="text-court-gray">{categoryFilter ? categoryLabel[categoryFilter] : 'iscrizioni'}</span>
            </div>
          )}
          {isCheckin && (
            <div className="card flex items-center gap-2 px-3 py-1.5 text-xs font-display uppercase tracking-wide">
              <span className="text-court-white font-bold">{teams.length}</span>
              <span className="text-court-gray">squadre approvate</span>
            </div>
          )}
        </div>
      )}

      {/* Filters: category pills + search */}
      <div className="mb-4">
        <Suspense>
          <CategoryFilter showSearch hideEvento />
        </Suspense>
      </div>

      {/* Action bar */}
      {activeEdition && !isCheckin && (
        <div className="card flex items-center gap-3 mb-6 flex-wrap px-4 py-3">
          <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
            <ExportCsvDialog editionId={activeEdition.id} categoryFilter={categoryFilter} />
            <Link
              href={`/admin/teams/new?edition=${activeEdition.id}`}
              className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
            >
              <Plus size={14} /> Nuova squadra
            </Link>
          </div>
        </div>
      )}

      {isCheckin ? (
        <CheckinView teams={teams} search={sp.search} unpaidOnly={sp.unpaid === '1'} />
      ) : (
        <>
          {!teams.length ? (
            <div className="card p-10 text-center">
              <p className="text-court-gray">Nessuna squadra iscritta{categoryFilter ? ` nella categoria ${categoryLabel[categoryFilter]}` : ' ancora'}.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {teams.map(team => {
                  const hasPlayers = team.players && team.players.length > 0
                  const sortedPlayers = hasPlayers
                    ? [...team.players].sort((a, b) => a.sort_order - b.sort_order)
                    : null

                  return (
                    <div key={team.id} className="card p-5">
                      {/* Header: name + badges */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
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

                      {/* Players */}
                      {sortedPlayers ? (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-court-border">
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Nome</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Nato/a il</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">C.F.</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Email</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Tel</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Città</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1 pr-3">Club</th>
                                <th className="text-left text-court-muted font-display uppercase tracking-wide py-1">Instagram</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedPlayers.map(p => (
                                <tr key={p.id} className="border-b border-court-border/40 last:border-0">
                                  <td className="py-1.5 pr-3 text-court-light whitespace-nowrap">
                                    {p.name}
                                    {p.is_captain && <span className="ml-1 text-brand-orange text-[10px]">cap</span>}
                                    {p.is_vice_captain && <span className="ml-1 text-court-gray text-[10px]">vice</span>}
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-court-muted whitespace-nowrap">{new Date(p.birth_date).toLocaleDateString('it-IT')}</td>
                                  <td className="py-1.5 pr-3 font-mono uppercase text-court-muted whitespace-nowrap">{p.codice_fiscale}</td>
                                  <td className="py-1.5 pr-3 text-court-muted whitespace-nowrap">{p.email ?? <span className="text-court-border">—</span>}</td>
                                  <td className="py-1.5 pr-3 font-mono text-court-muted whitespace-nowrap">{p.phone ?? <span className="text-court-border">—</span>}</td>
                                  <td className="py-1.5 pr-3 text-court-muted whitespace-nowrap">{p.city ?? <span className="text-court-border">—</span>}</td>
                                  <td className="py-1.5 pr-3 italic text-court-muted whitespace-nowrap">{p.club ?? <span className="not-italic text-court-border">—</span>}</td>
                                  <td className="py-1.5 italic text-court-muted whitespace-nowrap">{p.instagram ?? <span className="not-italic text-court-border">—</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-court-muted text-xs mt-1">
                          Giocatori: {[team.captain_name, team.player2_name, team.player3_name, team.player4_name].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {team.schedule_notes && (
                        <p className="text-court-muted text-xs mt-2 italic">Esigenze particolari: &quot;{team.schedule_notes}&quot;</p>
                      )}
                      {team.notes && (
                        <p className="text-court-muted text-xs mt-1 italic">Note: &quot;{team.notes}&quot;</p>
                      )}

                      {/* Footer: timestamp + action buttons */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-court-border flex-wrap gap-3">
                        <p className="text-court-muted text-xs font-mono">
                          {new Date(team.created_at).toLocaleString('it-IT')}
                          <span className="mx-1.5">·</span>
                          <span className={team.consent_new_beetle ? 'text-green-400' : 'text-red-400'}>
                            Consenso New Beetle {team.consent_new_beetle ? '✓' : '✗'}
                          </span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {(['approved', 'waitlisted', 'rejected'] as const).filter(s => s !== team.status).map(s => (
                            <TeamStatusButton key={s} teamId={team.id} status={s} label={statusLabel[s]} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <Suspense>
                  <Pagination page={page} totalPages={totalPages} total={total} />
                </Suspense>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
