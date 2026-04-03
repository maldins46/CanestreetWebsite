'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import TournamentCalendarSection from './TournamentCalendarSection'
import StandingsSection from './StandingsTable'
import BracketSection from './BracketView'
import ThreePointContestSection from './ThreePointContestSection'
import type { GroupWithTeams, MatchWithTeams, TpcContestFull } from '@/types'

const TABS = [
  { key: 'calendario', label: 'Calendario' },
  { key: 'classifiche', label: 'Gironi' },
  { key: 'tabellone', label: 'Finals' },
  { key: '3p-contest', label: '3-Point Contest' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  matches: MatchWithTeams[]
  groups: GroupWithTeams[]
  tpcContests: TpcContestFull[]
}

export default function TorneoPageClient({ matches, groups, tpcContests }: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const router = useRouter()

  const [scrolled, setScrolled] = useState(false)

  const activeTab: TabKey = TABS.some(t => t.key === tabParam) ? tabParam! : 'calendario'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div>
      <div
        className={clsx(
          'sticky top-16 z-40 border-b border-court-border backdrop-blur-sm transition-shadow duration-200',
          scrolled
            ? 'bg-court-black/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
            : 'bg-court-dark/90',
        )}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => router.push(`/torneo?tab=${tab.key}`)}
                className={clsx(
                  'shrink-0 px-5 py-3 font-display uppercase tracking-wide text-sm border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-brand-orange text-brand-orange'
                    : 'border-transparent text-court-gray hover:text-court-white',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'calendario' && (
          <TournamentCalendarSection matches={matches} />
        )}
        {activeTab === 'classifiche' && (
          <StandingsSection groups={groups} matches={matches} />
        )}
        {activeTab === 'tabellone' && (
          <BracketSection matches={matches} />
        )}
        {activeTab === '3p-contest' && (
          <ThreePointContestSection contests={tpcContests} />
        )}
      </div>
    </div>
  )
}
