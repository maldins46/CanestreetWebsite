# Free Tier Capacity Estimate — 14–17 July Tournament

Out-of-the-envelope estimate of whether the Supabase + Vercel free tiers
survive the live tournament, and whether the venue's SIM router (250GB cap)
is a real constraint. Written ahead of the 2026 edition (~48 teams,
14–17 July). Assumes ledwall + showcase run 8–10h/day across the 4 days
(~36–40h total), and the SIM router is dedicated to venue AV gear (ledwall
device, showcase monitor, Chromecast, admin control tablet) — not shared as
public WiFi for spectators.

## What actually drives load

| Source | Route | Refresh cadence | Queries/cycle | Payload/cycle |
|---|---|---|---|---|
| Ledwall | `/ledwall` | data every 25s; state poll 20s (drops to 2s in fixed-sponsor/bacheca scenes) | 6 (editions, matches+joins, groups+group_teams+teams, tpc_contests+rounds+entries, sponsors, events) | ~50–150 KB |
| Showcase | `/showcase` | data every 15s | 7 (same set + showcase_modes) | ~85–160 KB |
| Public `/tournament` | ISR, `revalidate = 15` | at most 1 regen per 15s **regardless of visitor count** | 5 queries | ~200–250 KB |
| Other public pages (`/`, `/news`, `/editions`, etc.) | ISR, `revalidate = 60` | same "1 regen per window" logic | 1–4 queries | ~50–100 KB |
| Admin panel (staff refreshing scenes/scores during play) | `/admin/ledwall`, `/admin/showcase` | manual/sporadic | similar query set | small, bursty |

Ledwall and showcase bypass ISR — they're Client Components polling
Supabase directly from the browser, so their load scales with *wall-clock
time the device is on*, not with visitor count. The public `/tournament`
page is the opposite: Next.js ISR caches the rendered page and only
re-fetches from Supabase when the cache goes stale *and* a request arrives
— ten spectators loading the page in the same 15s window still trigger only
one Supabase query, the rest are served cached HTML from Vercel's edge.
This is why the two venue displays, not public spectator traffic, dominate
the Supabase bill.

`next.config.js` sets `images.unoptimized = true`, so all images bypass
Vercel's Image Optimization pipeline and are served straight from Supabase
Storage — 100% of image bandwidth counts against Supabase's Storage egress
budget, not Vercel's. Sponsor logos on both ledwall and showcase are plain
`<img>` tags re-requested every poll cycle with no explicit cache in the
component code.

## Supabase free tier — the tight one

Limits: 500 MB DB, **5 GB database egress**, 1 GB Storage, **5 GB storage
(cached) egress**, 500K edge function invocations, 200 concurrent
Realtime / 2M Realtime messages.

**Database egress** (JSON query payloads), assuming 9h/day × 4 days = 36h = 129,600s:

| Source | Cycles | Est. total |
|---|---|---|
| Ledwall data (25s) | 5,184 | ~520 MB |
| Ledwall state poll | — | ~10 MB (tiny rows) |
| Showcase data (15s) | 8,640 | ~1.0 GB |
| `/tournament` ISR, worst case (sustained 15s traffic) | 8,640 | ~1.9 GB |
| `/tournament` ISR, realistic (intermittent checking) | ~3,400 | ~0.77 GB |
| Other public pages | ~2,160 | ~160 MB |
| Admin panel | — | ~150–250 MB |

**Total: ~2.65 GB realistic / ~3.9 GB worst-case**, against a 5 GB cap —
53–78% utilization. Survivable but not comfortable; no slack if the event
runs longer than planned, admins refresh more than expected, or the public
is busier than assumed.

**Storage egress is the bigger risk.** Sponsor `<img>` tags re-request the
same URL every poll cycle. If Supabase Storage's `Cache-Control` header on
the `media` bucket is short or absent, the browser re-downloads the full
image every cycle instead of getting a cheap `304 Not Modified`:

- Uncached worst case: 10 sponsor logos × 100 KB × (5,184 ledwall +
  8,640 showcase cycles) ≈ **13.8 GB** — nearly 3× the 5 GB cap.
- Cached (proper `Cache-Control`/ETag, browser sends conditional GETs):
  effectively a few MB of `304` header overhead — a non-issue.

This one setting is the difference between "comfortably fine" and "breaks
mid-tournament." It needs to be verified before the event, not assumed.

## Vercel Hobby — not a concern

100 GB Fast Data Transfer, 1M invocations, 4 CPU-hrs, non-commercial ToS.
Since images bypass Vercel entirely and ISR caching means Vercel just
serves cached HTML/JS/CSS per request, total Vercel traffic for ~48 teams'
worth of spectators over 4 days lands in the hundreds-of-MB range — well
under 1% of the 100GB cap. Not a risk.

One non-technical flag: the Hobby plan's ToS restricts to non-commercial
use. If the tournament involves paid sponsorship/registration revenue
running through the site, that's a policy question for Vercel's terms, not
a capacity one.

## SIM router (250 GB) — not a constraint

1. **Chromecast mirroring is LAN-only.** If the ledwall page is cast via
   tab-mirroring, the laptop encodes video and streams it to the Chromecast
   over local WiFi — that hop never touches the SIM's WAN/cellular uplink.
   If the URL is cast directly instead (Chromecast loads `/ledwall` itself),
   the traffic pattern doesn't change materially — it's still just that
   device's own Supabase calls hitting the internet. Either casting mode is
   fine data-wise.
2. **Actual WAN usage = the Supabase egress computed above**, since that's
   the only traffic those devices send over the internet: ~2.65–3.9 GB DB
   egress + up to ~14 GB storage egress in the uncached worst case ≈ ~18 GB
   max, against 250 GB — **~7% utilization even in the worst case**. The
   SIM cap will not be the failure point.

The real network risk isn't data volume, it's cellular congestion in a
crowded public square (many nearby phones on the same cell towers slowing
the SIM's connection) — independent of the 250GB quota. Since both ledwall
and showcase poll-and-retry rather than hold a persistent connection, a
dropped/slow request just means one stale cycle (20–25s) before the next
poll recovers. Displays might visibly "hang" for a cycle during congestion
spikes, but won't break outright.

## Bottom line

- **Vercel**: fine, huge margin.
- **SIM 250GB**: fine, huge margin — not the constraint people usually worry about.
- **Supabase DB egress (5GB)**: tight (53–78% used) — survivable if nothing
  runs long or extra, worth watching live.
- **Supabase Storage egress (5GB)**: the actual risk — depends entirely on
  whether sponsor/bacheca images are served with proper cache headers. This
  is the one thing to check, not just estimate.

## Recommended actions

1. **Verify image cache headers before the event.** Open a sponsor logo URL
   in browser devtools, check for `Cache-Control`/`ETag` on the response
   from Supabase Storage, confirm repeat requests come back as `304`. If
   missing, set `cacheControl` on upload (Supabase Storage client accepts a
   `cacheControl` option, e.g. `'3600'`) or fix at the bucket level.
2. **Watch the Supabase dashboard usage meter live during the event** — it
   shows real-time egress against the 5GB cap, cheap early warning if
   trending toward the ceiling.
3. **Optional insurance, not urgent**: bump ledwall data-refresh from 25s→30s
   and showcase from 15s→20s during the event days — cuts DB egress ~20–30%
   with negligible perceptible staleness on a live display. One-line
   constant change if the dashboard shows egress trending high mid-event.
4. **Longer-term, not for this event**: consider Supabase Realtime
   subscriptions instead of REST polling for ledwall/showcase — Realtime
   messages are a separate 2M/month budget from DB egress, and would remove
   most of the recurring query cost. Bigger refactor, worth considering for
   next year's edition.

**Last updated:** July 2026
