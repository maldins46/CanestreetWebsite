'use client'
import Image from 'next/image'
import type { Sponsor } from '@/types'

interface Props {
  sponsors: Pick<Sponsor, 'id' | 'name' | 'logo_url' | 'website_url'>[]
}

export default function SponsorCarousel({ sponsors }: Props) {
  if (!sponsors.length) return null

  // Duplicate list for seamless infinite scroll
  const items = [...sponsors, ...sponsors]

  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
    >
      <div
        className="flex gap-8 w-max"
        style={{
          animation: `sponsor-scroll ${Math.max(sponsors.length * 3, 20)}s linear infinite`,
        }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {items.map((sponsor, i) => {
          const Logo = (
            <div className="relative w-28 h-14 shrink-0 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
              {sponsor.logo_url ? (
                <Image
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  fill
                  className="object-contain"
                  sizes="112px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border border-court-border bg-court-surface">
                  <span className="font-display font-bold text-brand-orange/60 text-sm uppercase tracking-wide">
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
            >
              {Logo}
            </a>
          ) : (
            <div key={`${sponsor.id}-${i}`} title={sponsor.name}>
              {Logo}
            </div>
          )
        })}
      </div>
    </div>
  )
}
