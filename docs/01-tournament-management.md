# Tournament Management — Groups, Calendar & Brackets

The tournament is organized in **two phases**: a **group phase** (round-robin play within groups) followed by a **single-elimination bracket**. This guide covers how to manage it as an admin and what visitors see.

## For Visitors

### Match Calendar

The public site shows all tournament matches in chronological order, grouped by day:

- **Scheduled matches** show the time, team names, and "vs" between them
- **Live matches** have a pulsing red indicator and a red-tinted background so you can spot the action immediately
- **Completed matches** display the final score with the winning team highlighted in green

Each match shows its category (Open, U18, U16, U14) as a colored badge and the phase it belongs to:
- "Gir. A" / "Gir. B" = Group phase matches
- "Quarti" / "Semifinali" / "Finale" = Bracket matches

Use the category filter to see only matches from one category, or "Tutte" to see all.

### Group Standings

After matches are entered, the **Classifiche** section shows standings for each group:

| Column | Meaning |
|--------|---------|
| **V** | Wins |
| **S** | Losses |
| **PF** | Points For (total points scored) |
| **PS** | Points Against (total points given up) |
| **+/-** | Point Differential |

Teams are ranked by:
1. **Wins** (most wins rank highest)
2. **Point differential** (if tied on wins)
3. **Points scored** (if still tied)

The top qualifying teams from each group advance to the bracket. These positions are highlighted in orange.

### Brackets

Once the admin generates the bracket from group standings, the **Tabellone** section shows the elimination tree:

- Rounds are arranged left-to-right: Quarterfinals → Semifinals → Final
- Each match card shows team names and scores (if completed)
- The winner's name appears in bold and automatically advances to the next match

On mobile, rounds stack vertically for easier viewing.

---

## For Admins

### Tab 1: Gironi (Groups)

Create groups and assign teams to them.

#### Create groups
1. Navigate to **Admin → Torneo → Gironi** tab
2. Make sure the correct edition and category are selected (top of page)
3. Click **"+ Nuovo Girone"** to create a new group — it auto-names them A, B, C, etc.
4. Drag teams from the approved teams list into each group
5. Remove teams with the **×** button if you need to reshuffle

#### Generate group matches
Once all teams are assigned:
1. Click **"Genera Partite Girone"** — this creates round-robin matches for all groups in the selected category
2. If you've already generated matches and need to start over, the system asks for confirmation: "Partite già generate per questa categoria. Rigenerare?" — click OK to delete and recreate them

The system automatically calculates round-robin pairings: if a group has 4 teams, it creates 6 matches (each team plays every other team once).

### Tab 2: Calendario (Match Schedule & Scores)

Schedule matches and enter live scores.

#### Schedule matches
1. Go to **Admin → Torneo → Calendario** tab
2. You'll see all matches for the edition (group + bracket) in chronological order
3. Click the **time field** on any match to set a date and time
4. Click **Save** once the schedule looks right

#### Enter scores during the tournament
1. Find the match in the calendar
2. Click the **home team score** input and enter the points
3. Click the **away team score** input and enter the points
4. When both scores are filled, the match auto-marks as "completed" and the winner advances in the bracket (if applicable)

#### Mark a match as live
1. Find the match in the calendar
2. Click **"Avvia"** (Start) to set it as the live match
3. The match is now broadcast to the public site with a pulsing red indicator
4. Click the red **"LIVE"** button again to stop broadcasting that match

_Only one match can be live at a time across the entire tournament._

### Tab 3: Tabellone (Bracket)

Generate and manage the elimination bracket.

#### Generate bracket from group standings
1. Go to **Admin → Torneo → Tabellone** tab
2. Select the desired bracket size: **4, 8, or 16 teams**
3. Click **"Genera da Classifiche"**
4. The system:
   - Takes the top finishers from each group based on group standings
   - Ranks cross-group matches by wins, point differential, and points scored
   - Seeds the bracket so 1st seed plays last seed, 2nd plays second-to-last, etc.
   - Creates all bracket matches with proper advancement links

#### Override teams in the bracket
1. Click on any **team name** in the bracket tree
2. A dropdown appears showing available teams
3. Select a different team to replace them
4. The match automatically relinks to the next round (if the bracket is already seeded)

#### Manual bracket construction
If you prefer to build the bracket manually, click **"+ Aggiungi Round"** and set up rounds and teams step-by-step. (This is usually only needed for special circumstances.)

---

## How It Works (Technical Overview)

**Group standings** are computed on-the-fly from match results — nothing is stored. When you view standings, the system:
- Counts wins and losses for each team
- Sums points scored and conceded
- Calculates point differential
- Ranks teams by the tiebreaker rules

**Bracket advancement** is automatic: when you enter a score for a bracket match, the winner's team ID is instantly written to the next match slot. The public site reflects this immediately.

---

## Troubleshooting

**Q: I generated groups but no matches appeared.**  
A: You need to click **"Genera Partite Girone"** in the Gironi tab — groups are just containers. Match generation is a separate step.

**Q: A team should have advanced but they're not in the bracket.**  
A: Make sure all group matches have scores entered (check the Calendario tab). The bracket generation reads standings, which are only computed from completed matches.

**Q: I need to change a match score after the game ended.**  
A: Go to Calendario tab, click the score field, and update it. The winner will automatically re-advance in any linked bracket match. There's no "lock" on scores — everything is editable.

**Q: How do I show a specific match on the big screen?**  
A: Set that match to "live" in the Calendario tab. Check the **Showcase Screen** guide for displaying live matches on venue monitors.
