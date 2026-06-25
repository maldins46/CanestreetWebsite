'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import type { Sponsor } from '@/types'

interface Props {
  sponsors: Sponsor[]
  variant: 'rotation' | 'all' | 'gold'
  rotationIndex: number
}

const TIER_LABEL: Record<string, string> = {
  main:   'Main Sponsor',
  gold:   'Gold Sponsor',
  silver: 'Silver Sponsor',
  bronze: 'Bronze Sponsor',
}

const TIER_CLASS: Record<string, string> = {
  main:   'bg-brand-orange text-white',
  gold:   'bg-yellow-400 text-yellow-900',
  silver: 'bg-gray-300 text-gray-700',
  bronze: 'bg-amber-700 text-white',
}

export default function LedwallSponsors({ sponsors, variant, rotationIndex }: Props) {
  const [index, setIndex] = useState(0)

  // Build the pool based on variant
  const pool: Sponsor[] = variant === 'gold'
    ? sponsors.filter(s => s.tier === 'gold' || s.tier === 'main')
    : variant === 'rotation'
      ? sponsors.slice(rotationIndex * 4, rotationIndex * 4 + 4)
      : sponsors

  // Reset index when pool changes
  useEffect(() => { setIndex(0) }, [variant, rotationIndex, pool.length])

  // Rotate every 5s
  useEffect(() => {
    if (pool.length <= 1) return
    const interval = setInterval(() => setIndex(i => (i + 1) % pool.length), 5000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, variant, rotationIndex])

  if (pool.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Nessuno sponsor disponibile</p>
      </div>
    )
  }

  const sponsor = pool[index] ?? pool[0]

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0 text-center">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          I Nostri Sponsor
        </h2>
      </div>

      <div className="flex-1 relative">
        {pool.map((s, i) => (
          <div
            key={s.id}
            className={clsx(
              'absolute inset-0 flex flex-col items-center p-6 gap-4 transition-opacity duration-1000',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-display font-bold text-gray-400 text-4xl uppercase text-center">
                  {s.name}
                </span>
              )}
            </div>
            <span className={clsx(
              'shrink-0 px-3 py-1 rounded font-display font-bold uppercase text-xs tracking-wide',
              TIER_CLASS[s.tier],
            )}>
              {TIER_LABEL[s.tier]}
            </span>
          </div>
        ))}
      </div>

      {pool.length > 1 && (
        <div className="flex justify-center gap-2 pb-3 shrink-0">
          {pool.map((_, i) => (
            <span
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all',
                i === index ? 'bg-brand-orange' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
