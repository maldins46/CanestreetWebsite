import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, BarChart2, Newspaper, ArrowRight } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions').select('id, title').eq('is_current', true).single()

  const [{ count: totalTeams }, { count: pendingTeams }, { count: totalNews }] = await Promise.all([
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edition?.id ?? ''),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edition?.id ?? '').eq('status', 'pending'),
    supabase.from('news').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Squadre iscritte', value: totalTeams ?? 0, sub: `${pendingTeams ?? 0} in attesa`, href: '/admin/teams',     icon: Users },
    { label: 'Classifica',       value: '—',             sub: 'Aggiorna i risultati',           href: '/admin/standings', icon: BarChart2 },
    { label: 'Articoli',         value: totalNews ?? 0,  sub: 'Pubblica aggiornamenti',         href: '/admin/news',      icon: Newspaper },
  ]

  return (
    <div>
      <div className="mb-10">
        <p className="text-brand-orange font-display uppercase tracking-widest text-xs mb-1">Backoffice</p>
        <h1 className="font-display font-bold uppercase text-3xl text-court-white">Dashboard</h1>
        {edition && <p className="text-court-gray mt-1 text-sm">{edition.title}</p>}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {stats.map(({ label, value, sub, href, icon: Icon }) => (
          <Link key={href} href={href} className="card p-6 hover:border-court-muted transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <Icon size={18} className="text-court-muted" />
              <ArrowRight size={14} className="text-court-muted group-hover:text-brand-orange transition-colors" />
            </div>
            <p className="font-display font-extrabold text-4xl text-court-white">{value}</p>
            <p className="font-display uppercase tracking-wide text-xs text-court-gray mt-1">{label}</p>
            <p className="text-court-muted text-xs mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {(pendingTeams ?? 0) > 0 && (
        <div className="card p-6 border-brand-orange/30 bg-brand-orange/5">
          <p className="font-display font-bold uppercase text-court-white mb-1">
            {pendingTeams} squadr{pendingTeams === 1 ? 'a' : 'e'} in attesa di approvazione
          </p>
          <p className="text-court-gray text-sm mb-4">Rivedi e approva le iscrizioni prima dell&apos;inizio del torneo.</p>
          <Link href="/admin/teams" className="btn-primary text-sm px-5 py-2">
            Gestisci squadre →
          </Link>
        </div>
      )}
    </div>
  )
}
