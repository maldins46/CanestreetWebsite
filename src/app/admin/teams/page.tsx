import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Team, Edition } from '@/types'
import TeamStatusButton from '@/components/admin/TeamStatusButton'
import clsx from 'clsx'

export default async function AdminTeamsPage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions').select('id, title').eq('is_current', true).single<Edition>()

  const { data: teams } = await supabase
    .from('teams').select('*')
    .eq('edition_id', edition?.id ?? '')
    .order('created_at', { ascending: false })
    .returns<Team[]>()

  const statusLabel: Record<string, string> = {
    pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', waitlisted: 'Lista d\'attesa',
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Squadre</p>
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Gestione Iscrizioni</h1>
          {edition && <p className="text-court-gray text-sm mt-1">{edition.title}</p>}
        </div>
        <div className="text-right text-sm text-court-gray">
          <span className="font-display text-2xl text-court-white font-bold">{teams?.length ?? 0}</span>
          <br />iscrizioni totali
        </div>
      </div>

      {!teams?.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessuna squadra iscritta ancora.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <div key={team.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="font-display font-bold uppercase text-lg text-court-white">{team.name}</h2>
                    <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide',
                      team.status === 'approved'   && 'badge-approved',
                      team.status === 'pending'    && 'badge-pending',
                      team.status === 'rejected'   && 'badge-rejected',
                      team.status === 'waitlisted' && 'badge-waitlisted',
                    )}>
                      {statusLabel[team.status]}
                    </span>
                  </div>
                  <p className="text-court-gray text-sm">
                    Capitano: <span className="text-court-light">{team.captain_name}</span>
                    {' · '}
                    <a href={`mailto:${team.captain_email}`} className="hover:text-brand-orange transition-colors">
                      {team.captain_email}
                    </a>
                    {team.captain_phone && ` · ${team.captain_phone}`}
                  </p>
                  <p className="text-court-muted text-xs mt-1">
                    Giocatori: {[team.captain_name, team.player2_name, team.player3_name, team.player4_name].filter(Boolean).join(', ')}
                  </p>
                  {team.notes && (
                    <p className="text-court-muted text-xs mt-2 italic">"{team.notes}"</p>
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
          ))}
        </div>
      )}
    </div>
  )
}
