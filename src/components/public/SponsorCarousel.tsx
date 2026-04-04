'use client'
import Image from 'next/image'
import type { Sponsor } from '@/types'

interface Props {
  sponsors: Pick<Sponsor, 'id' | 'name' | 'logo_url' | 'website_url'>[]
}

export default function SponsorCarousel({ sponsors }: Props) {
  if (!sponsors.length) return null

  // Duplicate enough copies so the track is always wider than any viewport.
  // Using mr-8 on each item (instead of gap-8 on the container) makes the
  // per-item footprint exact, so translateX(-50%) lands perfectly at the
  // boundary between the two halves for a seamless loop.
  const copies = Math.max(2, Math.ceil(12 / sponsors.length))
  const set = Array.from({ length: copies }, () => sponsors).flat()
  const items = [...set, ...set]

  return (
    <div className="overflow-hidden">
      <div
        className="flex w-max"
        style={{
          animation: `sponsor-scroll ${Math.max(set.length * 3, 20)}s linear infinite`,
        }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {items.map((sponsor, i) => {
          const Logo = (
            <div className="relative w-32 aspect-[3/2] bg-white overflow-hidden ring-1 ring-brand-orange/20 hover:ring-brand-orange/70 transition-all duration-200">
              {sponsor.logo_url ? (
                <Image
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  fill
                  className="object-contain p-2"
                  sizes="128px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display font-bold text-gray-400 text-sm uppercase tracking-wide">
                    {sponsor.name}
                  </span>
                </div>
              )}
            </div>
          )

          return sponsor.website_url ? (
            <a
              key={`${sponsor.id}-${i}`}
              href={sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              title={sponsor.name}
              className="mr-8 shrink-0"
            >
              {Logo}
            </a>
          ) : (
            <div key={`${sponsor.id}-${i}`} title={sponsor.name} className="mr-8 shrink-0">
              {Logo}
            </div>
          )
        })}
      </div>
    </div>
  )
}
