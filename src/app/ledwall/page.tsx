'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveContextualScene } from '@/lib/ledwall'
import { fetchTournamentSnapshot, type TournamentSnapshot } from '@/lib/tournamentData'
import { patchMatches, patchTpcEntries, patchEvents } from '@/lib/tournamentRealtimePatchers'
import LedwallMatches   from '@/components/ledwall/LedwallMatches'
import LedwallStandings from '@/components/ledwall/LedwallStandings'
import LedwallFinals    from '@/components/ledwall/LedwallFinals'
import LedwallSponsors  from '@/components/ledwall/LedwallSponsors'
import LedwallTpc       from '@/components/ledwall/LedwallTpc'
import LedwallEvent     from '@/components/ledwall/LedwallEvent'
import LedwallBacheca   from '@/components/ledwall/LedwallBacheca'
import type {
  LedwallState, LedwallScene, LedwallSceneConfig, Match, TpcEntry, CalendarioEvent,
} from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_W        = 896
const STAGE_H        = 512
const FRAME_INSET_TOP    = 28   // px
const FRAME_INSET_SIDE   = 32   // px
const FRAME_INSET_BOTTOM = 52   // px — taller bottom frame border

// Coarse safety-net poll — self-heals a silently-dead realtime websocket on
// the venue's cellular SIM connection. Not the primary update mechanism.
const RESYNC_POLL_MS = 60_000

// Pulsantiera overlay total lifetime — the single source of truth for every
// `animation-duration` used inside the overlay (flash core, vignette, text)
// AND the setTimeout that clears it. Change here only; never hardcode 2300
// elsewhere or the cleanup and the CSS can drift apart again.
const LAUNCHPAD_ANIMATION_MS  = 2300
// Shockwave rings and particles are fast effects nested inside the window
// above — they don't need to equal the total, just fit inside it.
const LAUNCHPAD_SHOCKWAVE_MS  = 1100
const LAUNCHPAD_PARTICLE_MS   = 1500

const LAUNCHPAD_PARTICLE_COUNT = 12
const LAUNCHPAD_PARTICLES = Array.from({ length: LAUNCHPAD_PARTICLE_COUNT }, (_, i) => {
  const angle    = (i / LAUNCHPAD_PARTICLE_COUNT) * 360 + (i % 2 === 0 ? -8 : 8)
  const rad      = (angle * Math.PI) / 180
  const distance = 140 + (i % 3) * 30
  return {
    dx: Math.cos(rad) * distance,
    dy: Math.sin(rad) * distance,
    rot: angle,
    delayMs: (i % 4) * 15,
  }
})

// Sting transition total lifetime — the single source of truth for every
// `animation-duration` used inside the sting overlay (lion sweep, diagonal
// panels) AND the setTimeout that swaps the underlying scene and the one
// that clears the overlay. Change here only; never hardcode a duration
// elsewhere or the cleanup and the CSS can drift apart again. Kept short and
// snappy — broadcast-bumper pacing, not a lingering effect.
const STING_DURATION_MS = 800
// Scene swap happens at the exact midpoint — see ledwall-sting's 38%-62%
// hold window in globals.css, which brackets this instant. No dedicated
// full-screen occlusion element: the background stays visible/transparent
// through the transition (by design), same as before this overlay existed.
const STING_SWAP_MS = STING_DURATION_MS / 2

// Broadcast-style diagonal wipe panels: one big brand-orange bar with a
// thin bright leading edge riding it. Fully opaque, hard diagonal edges via
// clip-path — a solid graphic-card wipe, not a soft glow.
const STING_PANELS = [
  { widthPct: 55, color: '#f97316', opacity: 1, delayMs: 0   },
  { widthPct: 4,  color: '#fed7aa', opacity: 1, delayMs: -20 },
]

// Contextual rotation: matches → 4 sponsors → contextual (live-event-driven)
const CONTEXTUAL_ROTATION = ['matches', 'sponsors', 'contextual'] as const

// ─── Types ────────────────────────────────────────────────────────────────────

type Data = TournamentSnapshot

type SceneSlot = { scene: LedwallScene | 'event'; config: LedwallSceneConfig }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LedwallPage() {
  const [ledwallState, setLedwallState] = useState<LedwallState | null>(null)
  const [data, setData] = useState<Data>({
    edition: null, matches: [], groups: [], tpcContests: [], sponsors: [], events: [],
  })
  const [loading,  setLoading]  = useState(true)

  // Scene transition state
  const [displayedSlot, setDisplayedSlot] = useState<SceneSlot | null>(null)
  const [contentVisible, setContentVisible] = useState(true)
  const [stingActive,    setStingActive]    = useState(false)

  // Pulsantiera animation overlay
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLaunchpadCount = useRef(0)

  // Contextual rotation index (0=matches, 1=sponsors, 2=contextual)
  const [rotationSlot, setRotationSlot] = useState(0)
  // Auto-advances after each complete cycle so each loop shows the next group of 4 sponsors
  const [sponsorCycleIndex, setSponsorCycleIndex] = useState(0)
  const prevRotationSlot = useRef(-1)

  // Stage scale to fit viewport
  const [scale, setScale] = useState(1)

  const supabase = createClient()
  const transitioning = useRef(false)

  // ── Stage scaling ──────────────────────────────────────────────────────────
  useEffect(() => {
    function updateScale() {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // ── Data fetch ─────────────────────────────────────────────────────────────
  async function fetchState() {
    const { data: st } = await supabase
      .from('ledwall_state')
      .select('*')
      .eq('id', 'default')
      .single()
    if (st) setLedwallState(st as LedwallState)
  }

  async function fetchData() {
    setData(await fetchTournamentSnapshot(supabase))
  }

  // Initial load
  useEffect(() => {
    Promise.all([fetchState(), fetchData()]).then(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime — push-driven updates instead of polling. `ledwall_state` swaps
  // (admin "Applica") and `matches`/`tpc_entries`/`events` changes (scores,
  // live flags) arrive as soon as they happen; resolveContextualScene() picks
  // them up on its next render since it's a pure function of this state.
  useEffect(() => {
    let hasSubscribedOnce = false

    const channel = supabase
      .channel('ledwall-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ledwall_state', filter: 'id=eq.default' },
        payload => {
          const newState = payload.new as LedwallState
          setLedwallState(newState)
          // Detect launchpad animation trigger: launchpad_count incremented
          if (newState.launchpad_count > lastLaunchpadCount.current && newState.launchpad_text) {
            lastLaunchpadCount.current = newState.launchpad_count
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
            setActiveAnimation(newState.launchpad_text)
            animationTimeoutRef.current = setTimeout(() => setActiveAnimation(null), LAUNCHPAD_ANIMATION_MS)
          }
        }
      )
      .on<Match>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        payload => {
          setData(d => {
            const patched = patchMatches(d.matches, payload)
            if (patched === null) {
              fetchData()
              return d
            }
            return { ...d, matches: patched }
          })
        }
      )
      .on<TpcEntry>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tpc_entries' },
        payload => {
          setData(d => {
            const patched = patchTpcEntries(d.tpcContests, payload)
            if (patched === null) {
              fetchData()
              return d
            }
            return { ...d, tpcContests: patched }
          })
        }
      )
      .on<CalendarioEvent>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        payload => {
          setData(d => ({ ...d, events: patchEvents(d.events, payload) }))
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (hasSubscribedOnce) {
            // Reconnected after a drop — resync in case events were missed.
            fetchState()
            fetchData()
          }
          hasSubscribedOnce = true
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Coarse safety-net poll — self-heals a silently-dead websocket regardless
  // of realtime connection state.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchState()
      fetchData()
    }, RESYNC_POLL_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Contextual rotation — advance slot every N seconds (admin-configurable,
  // default 20s) when mode = 'contextual'. Cosmetic screen-time-sharing,
  // independent of data freshness/realtime.
  useEffect(() => {
    if (ledwallState?.mode !== 'contextual') {
      setRotationSlot(0)
      return
    }
    const slotMs = (ledwallState.contextual_slot_seconds ?? 20) * 1000
    const interval = setInterval(() => {
      setRotationSlot(s => (s + 1) % CONTEXTUAL_ROTATION.length)
    }, slotMs)
    return () => clearInterval(interval)
  }, [ledwallState?.mode, ledwallState?.contextual_slot_seconds])

  // Advance sponsor group whenever the rotation completes a full cycle (wraps back to 0)
  useEffect(() => {
    if (prevRotationSlot.current === CONTEXTUAL_ROTATION.length - 1 && rotationSlot === 0) {
      setSponsorCycleIndex(i => i + 1)
    }
    prevRotationSlot.current = rotationSlot
  }, [rotationSlot])

  // ── Resolve current desired scene ─────────────────────────────────────────
  const desiredSlot = useMemo((): SceneSlot => {
    if (!ledwallState) return { scene: 'matches', config: {} }

    if (ledwallState.mode === 'fixed') {
      return { scene: ledwallState.fixed_scene, config: ledwallState.scene_config ?? {} }
    }

    // Contextual mode
    const slot = CONTEXTUAL_ROTATION[rotationSlot]
    if (slot === 'matches')  return { scene: 'matches', config: {} }
    if (slot === 'sponsors') {
      const totalPages = Math.max(1, Math.ceil(data.sponsors.length / 4))
      return {
        scene: 'sponsors',
        config: {
          variant: 'rotation',
          rotation_index: sponsorCycleIndex % totalPages,
        },
      }
    }
    // contextual slot — derive from live events
    return resolveContextualScene(data.matches, data.tpcContests, data.events)
  }, [ledwallState, rotationSlot, sponsorCycleIndex, data.sponsors.length, data.matches, data.tpcContests])

  // Stable key for change detection (scene + serialised config)
  const desiredKey = `${desiredSlot.scene}:${JSON.stringify(desiredSlot.config)}`
  const displayedKey = displayedSlot
    ? `${displayedSlot.scene}:${JSON.stringify(displayedSlot.config)}`
    : null

  // ── Scene transition ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || transitioning.current) return
    if (desiredKey === displayedKey) return

    const transition = ledwallState?.transition ?? 'fade'
    transitioning.current = true

    if (transition === 'fade') {
      setContentVisible(false)
      const t = setTimeout(() => {
        setDisplayedSlot(desiredSlot)
        setContentVisible(true)
        transitioning.current = false
      }, 300)
      return () => clearTimeout(t)
    }

    // sting
    setStingActive(true)
    const tSwap = setTimeout(() => {
      setDisplayedSlot(desiredSlot)
    }, STING_SWAP_MS)
    const tDone = setTimeout(() => {
      setStingActive(false)
      transitioning.current = false
    }, STING_DURATION_MS)
    return () => {
      clearTimeout(tSwap)
      clearTimeout(tDone)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredKey, loading])

  // Seed displayedSlot on first load (no transition)
  useEffect(() => {
    if (!loading && displayedSlot === null) {
      setDisplayedSlot(desiredSlot)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="font-display uppercase tracking-widest text-gray-600 text-sm">Caricamento...</p>
      </div>
    )
  }

  const frameUrl = ledwallState?.frame_url ?? null

  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: frameUrl
          ? `url(${frameUrl}) center/cover no-repeat`
          : 'black',
      }}
    >
      {/* Fixed-size stage, scaled to fit viewport */}
      <div
        style={{
          width:  STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          flexShrink: 0,
        }}
      >

        {/* ── Bottom footer bar ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: FRAME_INSET_BOTTOM,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: FRAME_INSET_SIDE,
            gap: 20,
          }}
        >
          <span className="font-display font-bold uppercase tracking-wide text-white text-base">
            canestreet.it
          </span>
          <div style={{ width: 2, height: 28, background: 'rgba(255,255,255,0.6)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/estathe-3x3-italia-logo.png" alt="Estathe 3x3 Italia" style={{ height: 30, width: 'auto' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fip-logo-white.png" alt="FIP" style={{ height: 24, width: 'auto' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb3-logo-white.png" alt="LB3" style={{ height: 24, width: 'auto' }} />
        </div>

        {/* ── White content box (covers center; frame visible only around edges) ── */}
        <div
          style={{
            position:   'absolute',
            top:        FRAME_INSET_TOP,
            left:       FRAME_INSET_SIDE,
            right:      FRAME_INSET_SIDE,
            bottom:     FRAME_INSET_BOTTOM,
            background: '#ffffff',
            overflow:   'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transition: 'opacity 0.3s',
              opacity: contentVisible ? 1 : 0,
            }}
          >
            {displayedSlot && <SceneRenderer slot={displayedSlot} data={data} />}
          </div>
        </div>

      </div>

      {/* ── Top progress bar — fixed to the physical screen edge (not the
          scaled stage), fills over the configured contextual slot duration
          and restarts each time rotationSlot advances, so it always shows
          how close the contextual rotation is to switching to the next
          scene. Only meaningful in contextual mode — fixed mode has no
          timer. */}
      {ledwallState?.mode === 'contextual' && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'rgba(255,255,255,0.15)',
            zIndex: 60,
          }}
        >
          <div
            key={rotationSlot}
            style={{
              width: '100%',
              height: '100%',
              background: '#f97316',
              transformOrigin: 'left center',
              animation: `ledwall-progress-fill ${ledwallState.contextual_slot_seconds ?? 20}s linear both`,
            }}
          />
        </div>
      )}

      {/* ── Sting transition overlay — fixed, covers full screen outside scaled stage ── */}
      {stingActive && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {/* Diagonal broadcast-style wipe panels — hard clip-path edges, solid color */}
          {STING_PANELS.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: `${p.widthPct}%`,
                background: p.color,
                opacity: p.opacity,
                clipPath: 'polygon(18% 0%, 100% 0%, 82% 100%, 0% 100%)',
                animation: `ledwall-sting-wipe ${STING_DURATION_MS / 1000}s cubic-bezier(0.4, 0, 0.2, 1) both`,
                animationDelay: `${p.delayMs}ms`,
              }}
            />
          ))}

          {/* Main lion */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lion.png"
              alt=""
              style={{
                height: '90vh',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 32px rgba(249,115,22,0.6))',
                animation: `ledwall-sting ${STING_DURATION_MS / 1000}s cubic-bezier(0.4, 0, 0.2, 1) both`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Pulsantiera explosion overlay — fixed, full-screen, over sting ── */}
      {activeAnimation && (
        <div
          aria-hidden="true"
          key={`${activeAnimation}-${ledwallState?.launchpad_count}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Dark vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%)',
              animation: `ledwall-vignette ${LAUNCHPAD_ANIMATION_MS / 1000}s cubic-bezier(0.4, 0, 0.2, 1) both`,
            }}
          />
          {/* Flash core — smoothly-scaling circle, not a gradient-stop swap */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '60vmin',
              height: '60vmin',
              marginTop: '-30vmin',
              marginLeft: '-30vmin',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,115,22,0.9) 0%, rgba(249,115,22,0) 70%)',
              animation: `ledwall-flash-core ${LAUNCHPAD_ANIMATION_MS / 1000}s cubic-bezier(0.4, 0, 0.2, 1) both`,
            }}
          />
          {/* Staggered shockwave rings */}
          {[0, 120].map(delay => (
            <div
              key={delay}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '40vmin',
                height: '40vmin',
                marginTop: '-20vmin',
                marginLeft: '-20vmin',
                borderRadius: '50%',
                border: '6px solid rgba(249,115,22,0.8)',
                animation: `ledwall-shockwave ${LAUNCHPAD_SHOCKWAVE_MS / 1000}s ease-out both`,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
          {/* Flying particles */}
          {LAUNCHPAD_PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 8,
                height: 16,
                background: '#f97316',
                borderRadius: 2,
                animation: `ledwall-particle-burst ${LAUNCHPAD_PARTICLE_MS / 1000}s cubic-bezier(0.15, 0.6, 0.35, 1) both`,
                animationDelay: `${p.delayMs}ms`,
                ['--p-dx' as string]: `${p.dx}px`,
                ['--p-dy' as string]: `${p.dy}px`,
                ['--p-rot' as string]: `${p.rot}deg`,
              } as React.CSSProperties}
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span
            className="font-display font-black uppercase text-center"
            style={{
              position: 'relative',
              fontSize: 'clamp(4rem, 16vw, 9rem)',
              color: '#ffffff',
              WebkitTextStroke: '3px #f97316',
              textShadow: '0 0 40px rgba(249,115,22,0.9), 0 8px 24px rgba(0,0,0,0.5)',
              lineHeight: 1,
              padding: '0 5%',
              animation: `ledwall-animation-text ${LAUNCHPAD_ANIMATION_MS / 1000}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
            }}
          >
            {activeAnimation}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Scene dispatcher ─────────────────────────────────────────────────────────

function SceneRenderer({ slot, data }: { slot: SceneSlot; data: Data }) {
  const { scene, config } = slot

  if (scene === 'matches') {
    return <LedwallMatches matches={data.matches} events={data.events} />
  }

  if (scene === 'event') {
    return <LedwallEvent name={config.event_name!} description={config.event_description} />
  }

  if (scene === 'standings') {
    const category = config.category ?? 'open_m'
    return (
      <LedwallStandings
        groups={data.groups}
        matches={data.matches}
        category={category}
        group_id={config.group_id}
      />
    )
  }

  if (scene === 'finals') {
    const category = config.category ?? 'open_m'
    return <LedwallFinals matches={data.matches} category={category} />
  }

  if (scene === 'sponsors') {
    return (
      <LedwallSponsors
        sponsors={data.sponsors}
        variant={config.variant ?? 'rotation'}
        rotationIndex={config.rotation_index ?? 0}
        sponsorId={config.sponsor_id}
      />
    )
  }

  if (scene === 'tpc') {
    return (
      <LedwallTpc
        contests={data.tpcContests}
        contestCategory={config.contest_category ?? 'open'}
        roundId={config.round_id}
      />
    )
  }

  if (scene === 'bacheca') {
    return <LedwallBacheca imageUrl={config.bacheca_image_url} />
  }

  return null
}
