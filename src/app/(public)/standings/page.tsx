import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Standing, Edition } from '@/types'

export const metadata: Metadata = { title: 'Classifica' }

export default async function StandingsPage() {
  const supabase = createServerSupabaseClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('is_current', true)
    .single<Edition>()

  const { data: standings } = await supabase
    .from('standings')
    .select('*')
    .eq('edition_id', edition?.id ?? '')
    .order('rank', { ascending: true })
    .returns<Standing[]>()

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <p className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-3">
        {edition?.title ?? 'Edizione corrente'}
      </p>
      <h1 className="heading-section text-4xl text-court-white mb-12">Classifica</h1>

      {!standings?.length ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">La classifica verrà pubblicata a inizio torneo.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-court-border">
                {['#', 'Squadra', 'G', 'V', 'P', 'PF', 'PS', '+/-'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-display uppercase tracking-wider text-court-gray text-xs first:pl-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-b border-court-border/50 hover:bg-court-surface transition-colors"
                >
                  <td className="py-4 pr-4 font-display font-bold text-brand-orange pl-0">
                    {s.rank ?? i + 1}
                  </td>
                  <td className="py-4 px-4 font-semibold text-court-white">{s.team_name}</td>
                  <td className="py-4 px-4 text-court-gray">{s.played}</td>
                  <td className="py-4 px-4 text-green-400 font-semibold">{s.won}</td>
                  <td className="py-4 px-4 text-red-400">{s.lost}</td>
                  <td className="py-4 px-4 text-court-gray">{s.points_for}</td>
                  <td className="py-4 px-4 text-court-gray">{s.points_against}</td>
                  <td className="py-4 px-4 font-semibold"
                    style={{ color: s.points_for - s.points_against >= 0 ? '#4ade80' : '#f87171' }}>
                    {s.points_for - s.points_against > 0 ? '+' : ''}{s.points_for - s.points_against}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
