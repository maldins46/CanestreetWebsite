'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveContextualScene } from '@/lib/ledwall'
import LedwallMatches   from '@/components/ledwall/LedwallMatches'
import LedwallStandings from '@/components/ledwall/LedwallStandings'
import LedwallFinals    from '@/components/ledwall/LedwallFinals'
import LedwallSponsors  from '@/components/ledwall/LedwallSponsors'
import LedwallTpc       from '@/components/ledwall/LedwallTpc'
import type {
  Edition, GroupWithTeams, MatchWithTeams, TpcContestFull, Sponsor,
  LedwallState, LedwallScene, LedwallSceneConfig,
} from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_W        = 896
const STAGE_H        = 512
const FRAME_INSET_TOP    = 28   // px
const FRAME_INSET_SIDE   = 32   // px
const FRAME_INSET_BOTTOM = 52   // px — taller bottom frame border
const STATE_POLL_MS  = 20_000
const DATA_REFRESH_MS = 25_000

// Contextual rotation: matches → 4 sponsors → contextual (live-event-driven)
const CONTEXTUAL_ROTATION = ['matches', 'sponsors', 'contextual'] as const

// ─── Types ────────────────────────────────────────────────────────────────────

type Data = {
  edition:    Edition | null
  matches:    MatchWithTeams[]
  groups:     GroupWithTeams[]
  tpcContests: TpcContestFull[]
  sponsors:   Sponsor[]
}

type SceneSlot = { scene: LedwallScene; config: LedwallSceneConfig }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LedwallPage() {
  const [ledwallState, setLedwallState] = useState<LedwallState | null>(null)
  const [data, setData] = useState<Data>({
    edition: null, matches: [], groups: [], tpcContests: [], sponsors: [],
  })
  const [loading,  setLoading]  = useState(true)

  // Scene transition state
  const [displayedSlot, setDisplayedSlot] = useState<SceneSlot | null>(null)
  const [contentVisible, setContentVisible] = useState(true)
  const [stingActive,    setStingActive]    = useState(false)

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
    const [
      { data: editionData },
      { data: matchData   },
      { data: groupData   },
      { data: tpcData     },
      { data: sponsorData },
    ] = await Promise.all([
      supabase.from('editions').select('*').eq('is_current', true).maybeSingle(),
      supabase
        .from('matches')
        .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('sort_order'),
      supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('sort_order'),
      supabase.from('tpc_contests').select('*, tpc_players(*), tpc_rounds(*, tpc_entries(*, tpc_players(id, name)))'),
      supabase.from('sponsors').select('*').eq('is_active', true).order('sort_order'),
    ])

    setData({
      edition:    editionData,
      matches:    matchData    ?? [],
      groups:     groupData    ?? [],
      tpcContests: tpcData     ?? [],
      sponsors:   sponsorData  ?? [],
    })
  }

  // Initial load
  useEffect(() => {
    Promise.all([fetchState(), fetchData()]).then(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // State poll — re-read control row every 20s
  useEffect(() => {
    const interval = setInterval(fetchState, STATE_POLL_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Data refresh — re-fetch tournament data every 25s
  useEffect(() => {
    const interval = setInterval(fetchData, DATA_REFRESH_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Contextual rotation — advance slot every 20s when mode = 'contextual'
  useEffect(() => {
    if (ledwallState?.mode !== 'contextual') {
      setRotationSlot(0)
      return
    }
    const interval = setInterval(() => {
      setRotationSlot(s => (s + 1) % CONTEXTUAL_ROTATION.length)
    }, STATE_POLL_MS)
    return () => clearInterval(interval)
  }, [ledwallState?.mode])

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
    return resolveContextualScene(data.matches, data.tpcContests)
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
    }, 450)
    const tDone = setTimeout(() => {
      setStingActive(false)
      transitioning.current = false
    }, 900)
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Orange wipe strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '60%',
              background: '#f97316',
              animation: 'ledwall-sting-wipe 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              opacity: 0.15,
            }}
          />
          {/* Lion logo — centered via flexbox, animation only translates horizontally */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lion.png"
            alt=""
            style={{
              height: '90vh',
              width: 'auto',
              objectFit: 'contain',
              animation: 'ledwall-sting 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              filter: 'drop-shadow(0 0 32px rgba(249,115,22,0.6))',
              position: 'relative',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Scene dispatcher ─────────────────────────────────────────────────────────

function SceneRenderer({ slot, data }: { slot: SceneSlot; data: Data }) {
  const { scene, config } = slot

  if (scene === 'matches') {
    return <LedwallMatches matches={data.matches} />
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

  return null
}
