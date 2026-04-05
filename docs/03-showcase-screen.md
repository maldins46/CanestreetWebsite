# Showcase Screen — Live Display for Venue

The Showcase Screen is a full-screen display optimized for large monitors at the tournament venue. It shows live tournament information automatically, with no user interaction needed once you start it.

## For Venue Operators

### How to use the showcase

1. Open the public site on a large monitor: **https://yoursite.com/showcase** (or `http://localhost:3000/showcase` locally)
2. Go to **Admin → Showcase** and click a mode button to choose what displays
3. The showcase updates automatically every 15 seconds, and the monitor will show the selected content in landscape layout
4. To switch displays, go back to the admin page and click a different mode

That's it — no remote control needed, no manual refreshing.

---

## Display Modes

### 1. Tournament Calendar — Open Category
Shows all matches (group phase + bracket) for the Open category in chronological order.

- **Auto-scrolls** to the live match if one is in progress (it centers on the screen)
- Displays match times, team names, scores (if completed), and live status
- Great for fans tracking the schedule and current scores

### 2. Tournament Calendar — Under Category
Same as Open, but shows U14, U16, U18 matches. The category rotates every 20 seconds, so all age groups get screen time.

- U14 plays for 20 seconds, then U16, then U18, then back to U14
- Auto-scrolls to the live match in the current category
- Useful when the venue has simultaneous games in different categories

### 3. 3-Point Contest — Open
Displays the shooting competition for the Open category.

- Shows all rounds (Qualifications, Semifinals, Finals) side-by-side
- **Auto-scrolls** to center the live shooter if one is currently shooting
- Participant names and scores are visible
- Great for keeping spectators engaged during breaks in main tournament play

### 4. 3-Point Contest — Under
Same as Open, but for the Under division.

### 5. Sponsors
Displays one large sponsor logo at a time, rotating every 5 seconds with dot indicators.

- If a sponsor has a website URL, clicking the logo opens their site
- Shows all sponsors in a loop
- Useful between games or during halftime

---

## Admin Controls

Navigate to **Admin → Showcase** to manage display modes.

### Switching modes

Click any of the 5 mode buttons to change what's displayed on the monitor:
- **Calendario - Open**
- **Calendario - Under** (auto-cycles through U14, U16, U18)
- **3-Point Contest - Open**
- **3-Point Contest - Under**
- **Sponsor Carousel**

The change takes effect immediately on the monitor.

### Sunlight Mode ("Modalità Chioppo del Sole")

If the monitor is outdoors or in bright sunlight, enable **Sunlight Mode** with the toggle switch.

This switches the showcase to a **white background** with **dark text** and **high-contrast elements** for visibility under direct sun.

- Disable it when moving the monitor back indoors for a darker, easier-on-the-eyes display
- Works with all 5 display modes

### Open the showcase in a new window

Click **"Apri showcase"** to open the public showcase page in a new browser tab — useful if you're running admin and showcase on the same machine.

---

## How It Works

The showcase page is **read-only** from the public side — visitors cannot interact with it, just view. All control happens in the admin dashboard.

- **Auto-refresh:** Every 15 seconds, the showcase fetches the latest data (match scores, player scores, current mode)
- **Live auto-scroll:** If a match or player is marked as "live" in the tournament or 3-Point Contest admin, the showcase automatically scrolls to center them
- **Sponsor strip:** On all modes except Sponsors-only, a scrolling sponsor logo strip appears at the bottom as a subtle promotion

---

## Setup & Troubleshooting

**Q: The showcase isn't updating with new scores.**  
A: The page auto-refreshes every 15 seconds. If you just entered a score, wait up to 15 seconds for it to appear. You can also manually refresh the showcase page.

**Q: The live match/player isn't centered on screen.**  
A: Make sure the match/player is marked as "live" in the admin tournament or 3-Point Contest page. The auto-scroll only works if there's a live item to scroll to.

**Q: What's the sponsor strip at the bottom?**  
A: On all modes except pure Sponsors mode, a thin scrolling bar of sponsor logos appears at the bottom. You can disable this by switching to Sponsors mode if you prefer full-screen tournament/contest display.

**Q: Can I display the showcase on a tablet or phone?**  
A: Yes, but it's designed for landscape on large monitors. Mobile/portrait displays will squish the layout. Best to use a standard monitor (16:9 or wider).

**Q: Do I need to keep the admin page open while the showcase runs?**  
A: No — once you've selected a mode on the admin page, you can close that browser tab. The showcase page runs independently and updates every 15 seconds.

---

## Display Settings Reference

| Setting | Effect |
|---------|--------|
| Mode button | Selects what content displays (calendar, 3-Point, sponsors) |
| Category in mode | Under mode auto-cycles U14/U16/U18; Open is static |
| Sunlight Mode | Switches to white background, dark text for outdoor visibility |
| Match set to "live" | Auto-scrolls calendar to that match |
| Player set to "live" | Auto-scrolls 3-Point Contest to that player's column |

