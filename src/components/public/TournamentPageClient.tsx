'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function TournamentPageClient({ matches, groups, tpcContests }: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const router = useRouter()

  const [scrolled, setScrolled] = useState(false)
  const [canScrollLeft, setCanScrollLeft]   = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const activeTab: TabKey = TABS.some(t => t.key === tabParam) ? tabParam! : 'calendario'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track whether the tabs row can scroll left/right
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return

    const check = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    check()
    el.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
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
          <div className="relative">
            <div ref={tabsRef} className="flex gap-0 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => router.push(`/tournament?tab=${tab.key}`)}
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

            {/* Left fade + chevron */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 flex items-center justify-start bg-gradient-to-r from-court-black to-transparent">
                <ChevronLeft size={14} className="text-court-gray ml-0.5" />
              </div>
            )}

            {/* Right fade + chevron */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end bg-gradient-to-l from-court-black to-transparent">
                <ChevronRight size={14} className="text-court-gray mr-0.5" />
              </div>
            )}
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
