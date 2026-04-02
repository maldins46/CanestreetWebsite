# 3-Point Contest

The 3-Point Contest is a shooting competition organized alongside each Canestreet edition. There are two contests per edition: one for the **Open** category and one for the **Under** category.

## How it works

The competition runs in **rounds**. Each round has a list of participants with their scores. After a round ends, the admin marks which players advance (qualify) to the next round. The final round determines the winner.

### Rounds
- Rounds are sequential (e.g., Qualificazioni → Semifinale → Finale)
- Each round has its own set of participants and scores
- A player can appear in multiple rounds

### Qualification
- At the end of a round, the admin checks the "Qualificato" checkbox for each player who advances
- Qualified rows are highlighted in the public view so spectators can easily see who's through

### Live pointer
- During a round, the admin can mark one player as **LIVE** — this indicates who is currently shooting
- The live player appears with a green pulsing indicator on both the admin and public views
- Only one player can be live at a time across the entire contest (setting a new one clears the previous)
- The live state is cleared by clicking the Live button again on the same player

---

## Admin workflow

The 3-Point Contest is managed from the **Torneo → 3-Point Contest** tab in the backoffice.

### Step 1 — Create the contest
Select Open or Under category, then click **Crea Gara** if no contest exists yet for that category and edition.

### Step 2 — Add players
In the **Giocatori** section, type a player's name and click the `+` button (or press Enter). Players are shared across all rounds of the same contest. Delete a player to remove them from all rounds.

### Step 3 — Create rounds
In the **Turni** section, type the round name (e.g., "Qualificazioni", "Finale") and click `+`. Rounds are numbered automatically.

### Step 4 — Populate a round
Click on a round to expand it. Use the **Aggiungi giocatore** dropdown to add any contest player to the round. Any player can be added to any round at any time — useful when you miss adding someone during live action.

Use **Avanza qualificati** to automatically copy all players marked as qualified in the previous round into the current round.

### Step 5 — Live action
During the contest:
- Click the **Live** icon (radio button icon) next to the player who is currently shooting — this broadcasts the live indicator to the public page
- Enter the **Punteggio** (score) in the inline input field and press Tab or click away to save
- Use the **#** (sort order) field to reorder players within a round
- Check **Qualificato** for players who advance to the next round

### Editing after the fact
All fields are editable at any time: scores, qualification status, sort order, and player name. Nothing is locked.

---

## Public display

The 3-Point Contest section appears at the bottom of the `/torneo` page, below the bracket.

- **Category pills** (Open / Under) let visitors switch between the two contests
- Rounds are shown in order, each as a card with a table of participants
- **Qualified players** have an orange-highlighted row and a "Qualificato" badge
- The **live player** has a green-highlighted row and a pulsing "Live" badge next to their name
- The page **auto-refreshes every 15 seconds** so spectators see live updates without reloading

---

## Data model

| Table | Purpose |
|---|---|
| `tpc_contests` | One per edition+category. FK to `editions`. |
| `tpc_players` | Participants. FK to `tpc_contests`. Name only. |
| `tpc_rounds` | Named rounds in order. FK to `tpc_contests`. |
| `tpc_entries` | A player's result in a round. FK to `tpc_rounds` + `tpc_players`. Holds `score`, `is_qualified`, `is_live`, `sort_order`. |

All tables have public read RLS and admin write RLS (via `is_admin()`). Cascade deletes flow from edition → contest → players/rounds → entries.

The `is_live` flag is managed at the application level: setting a player live first clears all `is_live` flags across all rounds of the same contest, then sets the chosen entry.
