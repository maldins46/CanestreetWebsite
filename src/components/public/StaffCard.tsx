'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { StaffMember } from '@/types'

export default function StaffCard({ member }: { member: StaffMember }) {
  const [open, setOpen] = useState(false)
  const isInteractive = member.bio !== ''

  function toggle() {
    setOpen((o) => !o)
  }

  const bioPanel = isInteractive ? (
    <div
      id={`bio-${member.id}`}
      className={`absolute bottom-0 left-0 right-0 bg-court-black/95 border-t-2 border-brand-orange p-4 max-h-[60%] overflow-y-auto transition-transform duration-300 ease-in-out ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <p className="text-sm text-court-gray leading-relaxed">{member.bio}</p>
      <span
        className="text-xs text-court-gray/50 uppercase tracking-widest mt-3 text-right block"
        aria-hidden="true"
      >
        ↓ chiudi
      </span>
    </div>
  ) : null

  const interactiveProps = isInteractive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-expanded': open,
        'aria-controls': `bio-${member.id}`,
        onClick: toggle,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') toggle()
          if (e.key === ' ') { e.preventDefault(); toggle() }
          if (e.key === 'Escape' && open) setOpen(false)
        },
      }
    : {
        'aria-label': `${member.name}, ${member.title}`,
      }

  /* ── No-photo variant ── */
  if (!member.photo_url) {
    return (
      <div
        className={`card relative overflow-hidden aspect-[3/4] bg-court-dark ${
          isInteractive ? 'cursor-pointer' : ''
        }`}
        {...interactiveProps}
      >
        {/* Initial-letter placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-extrabold text-8xl text-brand-orange/20 select-none">
            {member.name.charAt(0)}
          </span>
        </div>

        {/* Title + name */}
        <div className="absolute bottom-4 left-4">
          <span className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1 block">
            {member.title}
          </span>
          <h2 className="font-display font-extrabold text-xl text-court-white uppercase tracking-wide leading-tight">
            {member.name}
          </h2>
        </div>

        {bioPanel}
      </div>
    )
  }

  /* ── Photo variant ── */
  return (
    <div
      className={`card group relative overflow-hidden aspect-[3/4] ${
        isInteractive ? 'cursor-pointer' : ''
      }`}
      {...interactiveProps}
    >
      <Image
        src={member.photo_url}
        alt={member.name}
        fill
        className={`object-cover object-top transition-transform duration-500 ${
          !open ? 'group-hover:scale-105' : ''
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Title + name overlay */}
      <div className="absolute bottom-4 left-4">
        <span className="text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1 block">
          {member.title}
        </span>
        <h2 className="font-display font-extrabold text-xl text-court-white uppercase tracking-wide leading-tight">
          {member.name}
        </h2>
      </div>

      {bioPanel}
    </div>
  )
}
