# Chi Siamo Staff Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current photo+panel staff cards with full-bleed portrait cards where the title and name are overlaid on the image and the bio slides up on click.

**Architecture:** A new `StaffCard` Client Component owns the open/close toggle state via `useState`. The page (`chi-siamo/page.tsx`) stays a Server Component and simply maps over the fetched staff array, rendering `<StaffCard>` for each member. No DB or type changes required.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · `next/image`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/public/StaffCard.tsx` | **Create** | Client Component — renders the card in all three states: photo+interactive, no-photo+interactive, non-interactive |
| `src/app/(public)/chi-siamo/page.tsx` | **Modify** (lines 37–75) | Remove inline card JSX, import and use `<StaffCard>` |

---

### Task 1: Create `StaffCard` — full implementation

**Files:**
- Create: `src/components/public/StaffCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/public/StaffCard.tsx
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
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. If it fails with "Module not found" or type errors, fix before continuing. Common causes: wrong import path for `@/types`, missing `React` import (not needed in Next.js 13+, but check).

- [ ] **Step 3: Commit**

```bash
git add src/components/public/StaffCard.tsx
git commit -m "feat: add StaffCard client component with slide-up bio panel"
```

---

### Task 2: Wire `page.tsx` to use `StaffCard`

**Files:**
- Modify: `src/app/(public)/chi-siamo/page.tsx`

- [ ] **Step 1: Replace the inline card JSX**

The current file has a `{(staff ?? []).map((member) => ( <div key={member.id} ...>...</div> ))}` block spanning lines 38–76. Replace it entirely with the snippet below. The imports at the top of the file also need one addition.

Add the import after line 4:
```tsx
import StaffCard from '@/components/public/StaffCard'
```

Replace the entire staff grid block (currently `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">` through its closing `</div>`) with:

```tsx
      {/* Staff grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        {(staff ?? []).map((member) => (
          <StaffCard key={member.id} member={member} />
        ))}
      </div>
```

The `Image` import on line 2 (`import Image from 'next/image'`) is no longer used in this file — remove it to avoid a lint warning.

After editing, the top of the file should look like:

```tsx
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { StaffMember } from '@/types'
import StaffCard from '@/components/public/StaffCard'
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds. If you see "Image is defined but never used", the `Image` import was not removed — remove it.

- [ ] **Step 3: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000/chi-siamo`. Verify:
- Cards are full-bleed portrait images with no panel below
- Title (orange, small) and name (white, large) are visible at the bottom-left of each photo
- Clicking a card slides the bio panel up from the bottom with an orange top border
- Clicking again slides it back down
- Pressing Escape while the panel is open closes it

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/chi-siamo/page.tsx
git commit -m "feat: use StaffCard component in chi-siamo page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Full-bleed portrait photo (3:4) | Task 1 — `aspect-[3/4]` on outer div |
| Gradient `from-black via-black/50 to-transparent` | Task 1 — gradient overlay div |
| No pill background on title | Task 1 — title uses only text classes |
| Conditional zoom (`group-hover:scale-105` only when `!open`) | Task 1 — conditional class on `<Image>` |
| `group` always present on photo variant outer div | Task 1 — always in className |
| Bio panel: `translate-y-full` → `translate-y-0`, `duration-300` | Task 1 — `bioPanel` JSX |
| `bg-court-black/95`, `border-t-2 border-brand-orange`, `p-4` | Task 1 — `bioPanel` JSX |
| `max-h-[60%] overflow-y-auto` | Task 1 — `bioPanel` JSX |
| `↓ chiudi` with `aria-hidden="true"` | Task 1 — `bioPanel` JSX |
| Empty bio guard → non-interactive | Task 1 — `isInteractive` flag |
| No-photo fallback: `bg-court-dark`, `aspect-[3/4]`, initial letter | Task 1 — no-photo branch |
| No `group`/zoom on no-photo | Task 1 — no-photo branch lacks `group` |
| Multiple panels open simultaneously (per-card state) | Task 1 — `useState` inside component |
| Accessibility: `role="button"`, `tabIndex`, `aria-expanded`, `aria-controls` | Task 1 — `interactiveProps` |
| Keyboard: Enter, Space (with `preventDefault`), Escape | Task 1 — `onKeyDown` |
| Non-interactive card: `aria-label`, no role | Task 1 — `interactiveProps` else branch |
| `sizes` prop unchanged | Task 1 — `sizes="(max-width: 640px) 100vw, ..."` |
| Page stays Server Component | Task 2 — no `'use client'` added to page |
| `Image` import removed from page | Task 2 — Step 1 instructions |
| `alt={member.name}` on photo | Task 1 — `<Image alt={member.name}>` |

No gaps found. No placeholders. Types are consistent across both tasks (`StaffMember` used identically in component and page).
