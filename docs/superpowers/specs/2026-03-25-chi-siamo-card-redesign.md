# Chi Siamo Staff Card Redesign — Design Spec

## Goal

Redesign the staff cards on the `/chi-siamo` page so that the photo is the dominant element, the member's title and name are overlaid on the image, and the bio is revealed via a slide-up panel on click.

## Current State

The page renders a 3-column grid of cards. Each card has:
- A portrait photo (3:4 aspect ratio) with a shallow 96px gradient strip and a small title badge at the bottom-left
- A separate dark panel below the photo containing the name and bio

This creates a disconnected feel between image and text.

## Data model

`StaffMember` (from `src/types/index.ts`):
- `id: string` — UUID, unique per row, used as DOM ID suffix
- `name: string` — non-nullable
- `title: string` — non-nullable (e.g. "Il CEO")
- `bio: string` — non-nullable (`text NOT NULL` in DB); can be an empty string `""`
- `photo_url: string | null`
- `sort_order: number`

## New Design

### Card at rest — with photo

The card surface is **entirely image** — no panel below the photo. The outer div retains the global `.card` class (`bg-court-surface border border-court-border`) for the border; the background is hidden behind the full-bleed image.

Structure (photo variant):
```
<div class="card group relative overflow-hidden cursor-pointer aspect-[3/4]" role="button" ...>
  <Image fill ... class="object-cover object-top transition-transform duration-500 {open ? '' : 'group-hover:scale-105'}" />
  <div class="gradient overlay" />         ← absolute, inset-0
  <div class="name/title overlay" />       ← absolute, bottom-4 left-4
  <div class="bio panel" />               ← absolute, bottom-0, slide-up
</div>
```

The `group` class is always present on the outer div for the photo variant. Zoom suppression when the panel is open is achieved purely by conditionally removing `group-hover:scale-105` from the `<Image>` element — the `group` class itself stays.

**Gradient overlay**: `absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent` — replaces the existing fixed `h-24` strip. The change is intentional: a deeper gradient provides contrast for the text overlay without a pill background on the title.

**Bottom-left name/title overlay** (always visible):
- Title: `text-brand-orange font-display uppercase tracking-widest text-xs font-semibold mb-1 block` — **no pill background**. The existing `bg-court-black/60 backdrop-blur-sm` badge is intentionally removed; the gradient above provides sufficient contrast.
- Name: `font-display font-extrabold text-xl text-court-white uppercase tracking-wide leading-tight`

**`sizes` prop on `<Image>`**: `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` (unchanged from current).

### Bio panel (slide-up)

An `absolute bottom-0 left-0 right-0` div, clipped by the parent's `overflow-hidden`.

**Closed state**: `translate-y-full` (fully off-screen below)
**Open state**: `translate-y-0`
**Transition**: `transition-transform duration-300 ease-in-out`

Panel styles:
- `bg-court-black/95` (near-opaque, overlays the photo)
- `border-t-2 border-brand-orange`
- `p-4`
- `max-h-[60%] overflow-y-auto` — caps height at 60% of the card. The percentage resolves correctly because the outer grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) provides a definite column width, which in turn makes the `aspect-[3/4]` outer div produce a definite height. If the card is ever used outside a width-constrained grid context, this may not resolve correctly.
- Bio text: `text-sm text-court-gray leading-relaxed`
- Close hint (bottom-right): `↓ chiudi` — `text-xs text-court-gray/50 uppercase tracking-widest mt-3 text-right block` with `aria-hidden="true"` (the open/close state is already communicated via `aria-expanded`). The downward arrow is intentional — the panel slides down on close.

**Empty bio guard**: if `member.bio === ''`, do not render the bio panel and render the card as non-interactive (see "Non-interactive card" below).

### Card at rest — no photo

When `photo_url` is null:
- Outer div: same `aspect-[3/4]` as the photo variant (required — without a photo the card collapses without it)
- Background: `bg-court-dark` (`#111111`) — overrides `.card`'s `bg-court-surface`. White (`text-court-white`) and orange (`text-brand-orange`) text are readable on `#111111`.
- Large initial letter placeholder centred (unchanged): `font-display font-extrabold text-8xl text-brand-orange/20 select-none`
- **No gradient overlay** (nothing to darken)
- **No `group` class, no hover zoom** (no image to scale)
- Title and name are rendered in the bottom-left at the same Tailwind styles as the photo variant
- Bio panel behaviour: same as photo variant (slide-up, if `bio` is non-empty)

### Non-interactive card (bio === '' regardless of photo)

When `bio === ''`, the card is non-interactive: no `onClick`, no `onKeyDown`, no `role="button"`, no `tabIndex`. The outer div carries `aria-label="{member.name}, {member.title}"` for screen readers. No bio panel is rendered. The accessibility snippet below does **not** apply to this case.

## Interaction

**Multiple panels open simultaneously**: each `StaffCard` owns its own `useState(open)`. No global coordination. Multiple cards can be open at the same time. This keeps the page a Server Component and avoids prop-drilling state.

**Click outside / Tab away**: clicking outside a card does not close it; moving keyboard focus away does not close it. The user must click the card again or press Escape. This is a known v1 limitation, acceptable for a content page.

## Accessibility (interactive cards only)

Applies only when `bio !== ''` (i.e. the card is interactive):

```tsx
<div
  role="button"
  tabIndex={0}
  aria-expanded={open}
  aria-controls={`bio-${member.id}`}   // member.id is a UUID, page-unique
  onClick={toggle}
  onKeyDown={(e) => {
    if (e.key === 'Enter') toggle()
    if (e.key === ' ') { e.preventDefault(); toggle() }  // preventDefault stops page scroll
    if (e.key === 'Escape' && open) setOpen(false)
  }}
>
  ...
  <div id={`bio-${member.id}`}>  {/* bio panel */}  </div>
</div>
```

## Component Architecture

| File | Change |
|---|---|
| `src/app/(public)/chi-siamo/page.tsx` | Replace inline card JSX with `<StaffCard member={member} />` |
| `src/components/public/StaffCard.tsx` | **New** — default-exported Client Component. Directory already exists and contains `PublicNav.tsx`, `MobileBottomNav.tsx`, `RegisterForm.tsx`, `SponsorCarousel.tsx`. |

`StaffCard.tsx` must begin with `'use client'` — required because it uses `useState`. In Next.js App Router, omitting this directive causes a build error when hooks are used.

The page (`chi-siamo/page.tsx`) remains a Server Component. Data fetching is unchanged.

## Out of Scope

- Any changes to the contact/map section below the grid
- Admin UI changes
- DB or type changes
