import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Newspaper, ArrowRight, Clock, User } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('id, title, year, registration_open')
    .eq('is_current', true)
    .single()

  const editionId = edition?.id ?? ''

  const [
    { count: totalTeams },
    { count: pendingTeams },
    { count: approvedTeams },
    { count: waitlistedTeams },
    { count: rejectedTeams },
    { count: teamsOpenM },
    { count: teamsOpenF },
    { count: teamsU14 },
    { count: teamsU16 },
    { count: teamsU18 },
    { count: totalPlayers },
    { count: totalNews },
    { count: publishedNews },
    { data: recentTeams },
    { data: recentNews },
  ] = await Promise.all([
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('status', 'pending'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('status', 'approved'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('status', 'waitlisted'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('status', 'rejected'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('category', 'open_m'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('category', 'open_f'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('category', 'u14_m'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('category', 'u16_m'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', editionId).eq('category', 'u18_m'),
    supabase.from('players').select('id, teams!inner(edition_id)', { count: 'exact', head: true }).eq('teams.edition_id', editionId),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('news').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('teams').select('id, name, category, status, created_at').eq('edition_id', editionId).order('created_at', { ascending: false }).limit(5),
    supabase.from('news').select('id, title, published, published_at, created_at').order('created_at', { ascending: false }).limit(3),
  ])

  const draftNews = (totalNews ?? 0) - (publishedNews ?? 0)

  const topStats = [
    {
      label: 'Squadre iscritte',
      value: totalTeams ?? 0,
      sub: `${approvedTeams ?? 0} approvate`,
      href: '/admin/teams',
      icon: Users,
      accent: false,
    },
    {
      label: 'In attesa',
      value: pendingTeams ?? 0,
      sub: 'da approvare',
      href: '/admin/teams',
      icon: Clock,
      accent: (pendingTeams ?? 0) > 0,
    },
    {
      label: 'Articoli pubblicati',
      value: publishedNews ?? 0,
      sub: `${draftNews} bozz${draftNews === 1 ? 'a' : 'e'}`,
      href: '/admin/news',
      icon: Newspaper,
      accent: false,
    },
    {
      label: 'Giocatori',
      value: totalPlayers ?? 0,
      sub: 'edizione corrente',
      href: '/admin/teams',
      icon: User,
      accent: false,
    },
  ]

  const statusBreakdown = [
    { label: 'Approvate',    count: approvedTeams ?? 0,   color: 'bg-green-500' },
    { label: 'In attesa',    count: pendingTeams ?? 0,    color: 'bg-brand-orange' },
    { label: 'Lista attesa', count: waitlistedTeams ?? 0, color: 'bg-yellow-500' },
    { label: 'Rifiutate',    count: rejectedTeams ?? 0,   color: 'bg-red-500' },
  ]

  const categoryBreakdown = [
    { label: 'Open M', count: teamsOpenM ?? 0 },
    { label: 'Open F', count: teamsOpenF ?? 0 },
    { label: 'U18 M',  count: teamsU18 ?? 0 },
    { label: 'U16 M',  count: teamsU16 ?? 0 },
    { label: 'U14 M',  count: teamsU14 ?? 0 },
  ]

  const categoryLabel: Record<string, string> = {
    open_m: 'Open M',
    open_f: 'Open F',
    u14_m: 'U14 M',
    u16_m: 'U16 M',
    u18_m: 'U18 M',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Backoffice</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold uppercase text-3xl text-court-white">Dashboard</h1>
          {edition && (
            <span className={`text-xs font-display uppercase tracking-wide px-2 py-0.5 rounded border ${
              edition.registration_open
                ? 'text-green-400 border-green-400/30 bg-green-400/10'
                : 'text-court-gray border-court-border bg-court-surface'
            }`}>
              Iscrizioni {edition.registration_open ? 'aperte' : 'chiuse'}
            </span>
          )}
        </div>
        {edition && (
          <p className="text-court-gray mt-1 text-sm">{edition.title} · {edition.year}</p>
        )}
      </div>

      {/* Top stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {topStats.map(({ label, value, sub, href, icon: Icon, accent }) => (
          <Link
            key={href + label}
            href={href}
            className={`card p-6 hover:border-court-muted transition-colors group ${
              accent ? 'border-brand-orange/40 bg-brand-orange/5' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <Icon size={18} className={accent ? 'text-brand-orange' : 'text-court-muted'} />
              <ArrowRight size={14} className="text-court-muted group-hover:text-brand-orange transition-colors" />
            </div>
            <p className={`font-display font-extrabold text-4xl ${accent ? 'text-brand-orange' : 'text-court-white'}`}>
              {value}
            </p>
            <p className="font-display uppercase tracking-wide text-xs text-court-gray mt-1">{label}</p>
            <p className="text-court-muted text-xs mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Pending alert */}
      {(pendingTeams ?? 0) > 0 && (
        <div className="card p-5 border-brand-orange/30 bg-brand-orange/5 mb-8">
          <p className="font-display font-bold uppercase text-court-white mb-1">
            {pendingTeams} squadr{pendingTeams === 1 ? 'a' : 'e'} in attesa di approvazione
          </p>
          <p className="text-court-gray text-sm mb-4">Rivedi e approva le iscrizioni prima dell&apos;inizio del torneo.</p>
          <Link href="/admin/teams" className="btn-primary text-sm px-5 py-2">
            Gestisci squadre →
          </Link>
        </div>
      )}

      {/* Breakdowns */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {/* Status breakdown */}
        <div className="card p-6">
          <p className="font-display uppercase tracking-widest text-xs text-court-gray mb-5">Stato squadre</p>
          <div className="space-y-3">
            {statusBreakdown.map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm text-court-light font-display uppercase tracking-wide">{label}</span>
                </div>
                <span className="font-display font-bold text-court-white text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card p-6">
          <p className="font-display uppercase tracking-widest text-xs text-court-gray mb-5">Categorie</p>
          <div className="space-y-3">
            {categoryBreakdown.map(({ label, count }) => {
              const pct = (totalTeams ?? 0) > 0 ? Math.round((count / (totalTeams ?? 1)) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-court-light font-display uppercase tracking-wide">{label}</span>
                    <span className="font-display font-bold text-court-white text-sm">{count}</span>
                  </div>
                  <div className="h-1 bg-court-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Recent registrations */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-display uppercase tracking-widest text-xs text-court-gray">Ultime iscrizioni</p>
            <Link href="/admin/teams" className="text-xs text-brand-orange hover:text-brand-light transition-colors font-display uppercase tracking-wide">
              Tutte →
            </Link>
          </div>
          {recentTeams && recentTeams.length > 0 ? (
            <div className="space-y-3">
              {recentTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-court-light truncate">{team.name}</p>
                    <p className="text-xs text-court-muted font-display uppercase tracking-wide">
                      {categoryLabel[team.category] ?? team.category}
                      {' · '}
                      {new Date(team.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <span className={`badge-${team.status} flex-shrink-0 text-xs`}>{team.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-court-muted text-sm">Nessuna iscrizione ancora.</p>
          )}
        </div>

        {/* Recent news */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-display uppercase tracking-widest text-xs text-court-gray">Ultimi articoli</p>
            <Link href="/admin/news" className="text-xs text-brand-orange hover:text-brand-light transition-colors font-display uppercase tracking-wide">
              Tutti →
            </Link>
          </div>
          {recentNews && recentNews.length > 0 ? (
            <div className="space-y-3">
              {recentNews.map((article) => (
                <div key={article.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-court-light truncate">{article.title}</p>
                    <p className="text-xs text-court-muted font-display uppercase tracking-wide">
                      {new Date(article.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 ${article.published ? 'badge-approved' : 'badge-pending'}`}>
                    {article.published ? 'Pubblicato' : 'Bozza'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-court-muted text-sm">Nessun articolo ancora.</p>
          )}
        </div>
      </div>
    </div>
  )
}
