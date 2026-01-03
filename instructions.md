# Mindless FPL Automation + Interactive Website (Codex Spec)

> Goal: Replace the “Mindless Gambling” weekly spreadsheet workflow with a fully automated pipeline that:
> 1) pulls FPL points for League **1237332**, 2) computes weekly/monthly/season/cup prizes, 3) publishes an interactive website, and 4) (optional) emails a weekly summary.
>
> Inputs today: manual points entry + manual week number update + email attachment.  
> Output target: a website + machine-generated weekly summary (HTML/PDF) with no manual editing.

---

## 1. Scope

### 1.1 Must-have (MVP)
- Automatically fetch all managers in FPL classic league **1237332**
- Store both **real names** and **team names** (as shown in FPL)
- Compute and display:
  - Current Gameweek (GW) number automatically
  - Weekly points + weekly rank
  - Monthly totals + monthly rank (per your “Monthly prize structure”)
  - Season totals + season rank (FPL total points)
  - Prize ledger (weekly prizes + monthly prizes + season + cup prizes)
- Publish an interactive website that replaces the spreadsheet

### 1.2 Should-have
- Historical views: any GW, any month
- Downloadable “Week Summary” page (print-friendly HTML)
- Basic charts: points trend per manager, winnings by manager

### 1.3 Nice-to-have
- Automated email of the weekly summary to a configured mailing list
- Admin-only overrides (rare): e.g., forcing display order, nickname, or tie-break notes

---

## 2. Current Rules (from the spreadsheet)

### 2.1 Weekly prizes (per GW)
Paid to top 7 each GW:
1st: 8  
2nd: 6  
3rd: 5  
4th: 4  
5th: 2.5  
6th: 1.5  
7th: 1  
(8th–10th: 0)

### 2.2 Monthly prize structure (variable per month)
The spreadsheet defines month windows by “Weeks” and monthly total prize pool, distributed to top 5.

Use this table exactly:

| Month | GWs in month | Total | 1st | 2nd | 3rd | 4th | 5th |
|------|--------------:|------:|----:|----:|----:|----:|----:|
| Aug  | 3 | 48  | 15 | 12 | 7.5 | 6  | 4.5 |
| Sep  | 3 | 48  | 15 | 12 | 7.5 | 6  | 4.5 |
| Oct  | 3 | 48  | 15 | 12 | 7.5 | 6  | 4.5 |
| Nov  | 4 | 64  | 20 | 16 | 10  | 8  | 6   |
| Dec  | 6 | 96  | 30 | 24 | 15  | 12 | 9   |
| Jan  | 5 | 80  | 25 | 20 | 12.5| 10 | 7.5 |
| Feb  | 4 | 64  | 20 | 16 | 10  | 8  | 6   |
| Mar  | 3 | 48  | 15 | 12 | 7.5 | 6  | 4.5 |
| Apr  | 3 | 48  | 15 | 12 | 7.5 | 6  | 4.5 |
| May  | 4 | 64  | 20 | 16 | 10  | 8  | 6   |

**Important:** this table is *not* necessarily aligned to calendar months; it’s aligned to GW blocks (total 38).

We will define the GW ranges for each month in config (see §5.2).

### 2.3 Season prizes (final league standings)
From spreadsheet “Prizes” tab, season/competition prize amounts by position (1–10):
1st: 60  
2nd: 54  
3rd: 48  
4th: 42  
5th: 36  
6th: 30  
7th: 24  
8th: 18  
9th: 12  
10th: 6  

### 2.4 Cup prizes
Spreadsheet “Pay Structure” includes:
- Cup Competition no. 1 prize: 56 (qty currently 0 in the sheet)
- Cup Competition no. 2 prize: 53 (qty 1)

Implementation:
- MVP: support “Cup Competition no. 2” only (or both via config)
- Cup winner/runner-up etc are not derived from FPL; cups are tracked by your rules.  
  For MVP, allow cup results to be entered as a small JSON file (winner entryId etc).  
  Later: implement full cup bracket/group computation using your existing spreadsheet logic (see §10).

---

## 3. System Overview

### 3.1 Architecture (low cost, reliable)
- **Frontend:** Next.js (App Router) + Tailwind CSS + TypeScript
- **Data ingest job:** Node.js script run by GitHub Actions on a schedule
- **Storage:** JSON files committed to repo (or published as build artifacts)
- **Hosting:** Netlify or GitHub Pages (static output)

Rationale: no database needed; you get an always-up-to-date website and a full history for free.

### 3.2 High-level flow
1) GitHub Action runs `scripts/fetch-fpl.ts` on schedule  
2) Script fetches:
   - league standings for league 1237332 (members + entry IDs)
   - each entry’s history (per-GW points + totals)
   - bootstrap-static (to determine current GW and deadline state)
3) Script writes deterministic JSON:
   - `public/data/bootstrap.json`
   - `public/data/managers.json`
   - `public/data/gameweeks/{gw}.json`
   - `public/data/derived/latest.json`
   - `public/data/derived/months.json`
   - `public/data/derived/season.json`
   - `public/data/derived/prizes.json`
4) Website reads JSON and renders leaderboard + views.

---

## 4. FPL Data Sources

> Note: FPL endpoints are public but effectively “internal”; do not rely on browser direct fetch (CORS). Fetch server-side in the ingest job.

Required endpoints:
- `GET https://fantasy.premierleague.com/api/bootstrap-static/`
  - used to detect current GW, finished GWs, deadlines
- `GET https://fantasy.premierleague.com/api/leagues-classic/1237332/standings/?page_standings=1`
  - returns league members; each record includes:
    - `entry` (entryId)
    - `player_name` (real name)
    - `entry_name` (team name)
- `GET https://fantasy.premierleague.com/api/entry/{entryId}/history/`
  - returns:
    - `current[]`: per-GW points and ranks
    - `past[]`: past seasons (ignore)
    - `chips[]` (ignore for MVP)

Pagination:
- League standings may paginate. Implement loop:
  - request pages until no more results.

---

## 5. Configuration

### 5.1 Core config file
Create: `config/mindless.config.json`

Example:
```json
{
  "season": "2025-2026",
  "leagueId": 1237332,
  "timezone": "Australia/Brisbane",
  "currency": "AUD",
  "weeklyPrizes": { "1": 8, "2": 6, "3": 5, "4": 4, "5": 2.5, "6": 1.5, "7": 1 },
  "seasonPrizes": { "1": 60, "2": 54, "3": 48, "4": 42, "5": 36, "6": 30, "7": 24, "8": 18, "9": 12, "10": 6 },
  "monthDefinitions": [
    { "key": "Aug", "gws": [1,2,3], "payouts": { "1": 15, "2": 12, "3": 7.5, "4": 6, "5": 4.5 } },
    { "key": "Sep", "gws": [4,5,6], "payouts": { "1": 15, "2": 12, "3": 7.5, "4": 6, "5": 4.5 } },
    { "key": "Oct", "gws": [7,8,9], "payouts": { "1": 15, "2": 12, "3": 7.5, "4": 6, "5": 4.5 } },
    { "key": "Nov", "gws": [10,11,12,13], "payouts": { "1": 20, "2": 16, "3": 10, "4": 8, "5": 6 } },
    { "key": "Dec", "gws": [14,15,16,17,18,19], "payouts": { "1": 30, "2": 24, "3": 15, "4": 12, "5": 9 } },
    { "key": "Jan", "gws": [20,21,22,23,24], "payouts": { "1": 25, "2": 20, "3": 12.5, "4": 10, "5": 7.5 } },
    { "key": "Feb", "gws": [25,26,27,28], "payouts": { "1": 20, "2": 16, "3": 10, "4": 8, "5": 6 } },
    { "key": "Mar", "gws": [29,30,31], "payouts": { "1": 15, "2": 12, "3": 7.5, "4": 6, "5": 4.5 } },
    { "key": "Apr", "gws": [32,33,34], "payouts": { "1": 15, "2": 12, "3": 7.5, "4": 6, "5": 4.5 } },
    { "key": "May", "gws": [35,36,37,38], "payouts": { "1": 20, "2": 16, "3": 10, "4": 8, "5": 6 } }
  ],
  "cups": [
    { "key": "Cup2", "name": "Cup Competition No. 2", "totalPrize": 53, "mode": "manual" }
  ]
}

5.2 Manager display preferences

Create: config/aliases.json (optional)
	•	Used to set nicknames, ordering, or handle name changes
	•	Keyed by entryId

Example:

{
  "123456": { "nickname": "Dicky", "sortKey": 5 }
}


⸻

6. Data Model (JSON outputs)

6.1 Raw manager list

public/data/managers.json

type Manager = {
  entryId: number;
  playerName: string;  // real name
  teamName: string;    // FPL team name
};
type ManagersFile = { season: string; leagueId: number; managers: Manager[]; fetchedAt: string; };

6.2 Per-entry history cache (optional)

Store raw responses to simplify debugging:
public/data/raw/entry/{entryId}.json

6.3 Per-GW points table

public/data/gameweeks/{gw}.json

type GameweekPointsRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  points: number;
  totalPoints: number;
};
type GameweekFile = {
  gw: number;
  deadlineTime: string;
  isFinished: boolean;
  rows: GameweekPointsRow[];
};

6.4 Derived: weekly results + prizes

public/data/derived/weeklies.json

type WeeklyResult = {
  gw: number;
  ranked: Array<{
    entryId: number;
    playerName: string;
    teamName: string;
    points: number;
    rank: number;
    prize: number;
  }>;
};

6.5 Derived: monthly results + prizes

public/data/derived/months.json

type MonthlyResult = {
  key: string; // Aug..May
  gws: number[];
  ranked: Array<{
    entryId: number;
    playerName: string;
    teamName: string;
    points: number;   // sum of month GWs
    rank: number;
    prize: number;
  }>;
};

6.6 Derived: season leaderboard + season prizes

public/data/derived/season.json

type SeasonRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  totalPoints: number;
  rank: number;
  seasonPrize: number;
  weeklyWinnings: number;
  monthlyWinnings: number;
  cupWinnings: number;
  totalWinnings: number;
};
type SeasonFile = { season: string; lastUpdatedGw: number; rows: SeasonRow[]; };

6.7 Prize ledger (single source of truth for payouts)

public/data/derived/prizes.json

type PrizeLedgerItem =
  | { type: "weekly"; gw: number; entryId: number; amount: number; reason: string }
  | { type: "monthly"; monthKey: string; entryId: number; amount: number; reason: string }
  | { type: "season"; entryId: number; amount: number; reason: string }
  | { type: "cup"; cupKey: string; entryId: number; amount: number; reason: string };

type PrizesFile = { items: PrizeLedgerItem[]; totalsByEntryId: Record<number, number>; };


⸻

7. Computation Rules

7.1 Ranking and ties
	•	Rank by points descending.
	•	If tied:
	•	Primary: same rank number can be shared OR break ties deterministically.
	•	MVP approach: deterministic tie-break using entryId ascending (stable and simple).
	•	Prize distribution in ties:
	•	MVP: keep deterministic order; do not split prizes.
	•	Optional enhancement: split prize pool for tied positions.

Make tie behaviour configurable:

{ "tieMode": "deterministic" | "split" }

7.2 Weekly prize calculation

For each GW:
	1.	build list of {entryId, points}
	2.	sort desc points
	3.	assign rank 1..N
	4.	prize = config.weeklyPrizes[rank] else 0
	5.	emit ledger items

7.3 Monthly calculation

For each month definition:
	1.	sum points across its GW list (only finished GWs, unless “live month view” is enabled)
	2.	rank
	3.	pay top 5 per month payouts

7.4 Season calculation
	1.	totalPoints comes from:
	•	the latest finished GW cumulative total (from entry history current[].total_points)
	2.	rank
	3.	seasonPrize = config.seasonPrizes[rank] else 0

7.5 Cup calculation (MVP: manual)

Create: config/cups.results.json

{
  "Cup2": { "winners": [{ "entryId": 123456, "amount": 53, "note": "Cup2 winner" }] }
}

Job merges these into prize ledger.

⸻

8. Website UX + Pages

8.1 Global layout
	•	Header: “Mindless” + season + last updated
	•	Tabs: Leaderboard | Gameweeks | Months | Prizes | Rules
	•	Sticky filter: search managers by name/team

8.2 Pages

/ (Leaderboard)
	•	Table columns:
	•	Rank
	•	Real Name
	•	Team Name
	•	Season Points
	•	Weekly Winnings
	•	Monthly Winnings
	•	Cup Winnings
	•	Total Winnings
	•	Row click opens manager detail page

/gameweeks
	•	List of GWs with status (finished/current)
	•	Click-through to /gameweeks/[gw]

/gameweeks/[gw]
	•	Table:
	•	Rank, Name, Team, Points, Prize
	•	“Print summary” button → /gameweeks/[gw]/print

/months
	•	Cards for each month key with GW range and “finished/in-progress”
	•	Click-through to /months/[key]

/months/[key]
	•	Table:
	•	Rank, Name, Team, Points (sum), Prize

/prizes
	•	Ledger view with filters:
	•	weekly / monthly / season / cup
	•	Totals per manager

/rules
	•	Render config rules:
	•	weekly prize table
	•	monthly prize table
	•	season prize table
	•	cup rules

/managers/[entryId]
	•	Manager detail:
	•	header: playerName + teamName
	•	points per GW chart
	•	winnings breakdown + ledger items list

⸻

9. Tech Stack

9.1 Frontend
	•	Next.js 14+ (App Router)
	•	Tailwind CSS
	•	TypeScript
	•	Recharts (for charts)
	•	Zod (optional) for runtime validation of JSON files

9.2 Data ingest
	•	Node 20+
	•	undici or native fetch
	•	fs for output files

⸻

10. Repository Structure

mindless-fpl/
  app/
    layout.tsx
    page.tsx
    gameweeks/page.tsx
    gameweeks/[gw]/page.tsx
    months/page.tsx
    months/[key]/page.tsx
    prizes/page.tsx
    rules/page.tsx
    managers/[entryId]/page.tsx
  components/
    LeaderboardTable.tsx
    PrizeLedgerTable.tsx
    Filters.tsx
    Charts.tsx
  config/
    mindless.config.json
    aliases.json
    cups.results.json
  public/
    data/
      managers.json
      bootstrap.json
      gameweeks/
      derived/
  scripts/
    fetch-fpl.ts
    derive.ts
    utils.ts
  .github/workflows/
    ingest.yml
  package.json
  tsconfig.json
  next.config.js
  README.md


⸻

11. Ingest Job Implementation

11.1 scripts/fetch-fpl.ts

Responsibilities:
	•	Load config/mindless.config.json
	•	Fetch bootstrap-static → determine current GW, finished GWs, deadlines
	•	Fetch league standings pages until complete → build managers list
	•	For each manager entryId:
	•	fetch entry history
	•	cache raw response (optional)
	•	Write:
	•	public/data/bootstrap.json
	•	public/data/managers.json
	•	raw caches

Pseudo-steps:
	1.	bootstrap = GET /bootstrap-static/
	2.	events = bootstrap.events
	3.	finishedGws = events.filter(e => e.finished).map(e => e.id)
	4.	leagueMembers = fetchAllPages( /leagues-classic/{id}/standings/?page_standings=n )
	5.	managers = leagueMembers.map(r => ({ entryId: r.entry, playerName: r.player_name, teamName: r.entry_name }))
	6.	histories[entryId] = GET /entry/{entryId}/history/

11.2 scripts/derive.ts

Responsibilities:
	•	Read managers.json, bootstrap, and raw entry histories
	•	Build points per GW:
	•	for each finished GW:
	•	for each entry:
	•	find that GW in history.current[] (match event)
	•	read event_points and total_points
	•	Produce derived outputs (§6.4–§6.7)
	•	Merge manual cup results from config/cups.results.json

⸻

12. GitHub Actions

Create .github/workflows/ingest.yml:
	•	Schedule: daily (or every 6 hours)
	•	Also allow manual run (workflow_dispatch)
	•	Steps:
	•	checkout
	•	setup node 20
	•	npm ci
	•	npm run ingest (runs fetch + derive)
	•	commit updated public/data/** (only if changed)
	•	push

Example commands in package.json:

{
  "scripts": {
    "ingest": "ts-node scripts/fetch-fpl.ts && ts-node scripts/derive.ts",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}

If using Netlify:
	•	Netlify will build/deploy on repo changes. The ingest job commits JSON updates → triggers deployment.

⸻

13. Performance + Reliability
	•	Rate limiting:
	•	Fetch entry histories sequentially with small delay (e.g., 200–500ms) to avoid hammering FPL
	•	Retry with exponential backoff on 429/5xx
	•	Data correctness:
	•	Only treat GW as “finished” when bootstrap.events[gw].finished === true
	•	For “current GW live view”, show partial points but mark as provisional.

⸻

14. Security
	•	No secrets required for read-only FPL public endpoints.
	•	If adding email:
	•	use GitHub Secrets for SMTP / SendGrid API key
	•	job generates weekly HTML and sends it to a configured list.

⸻

15. Email Summary (Optional)

15.1 Output

Generate:
	•	public/data/derived/weekly-email-{gw}.html
	•	includes:
	•	GW number + deadline
	•	ranked weekly table with prizes
	•	link to website gameweek page

15.2 Sending
	•	Node script scripts/email-weekly.ts
	•	Trigger only when a GW transitions from not-finished → finished.
	•	Store last sent GW in public/data/derived/state.json

⸻

16. Acceptance Criteria

MVP is done when:
	•	Running npm run ingest produces JSON data for all managers in league 1237332
	•	Website renders:
	•	leaderboard
	•	any GW page
	•	any month page
	•	prizes ledger
	•	Weekly prizes match the configured payout table
	•	Monthly prizes match the configured month definitions and payouts
	•	Season prizes match configured season payout table

⸻

17. Developer Notes / Edge Cases
	•	Manager names/team names can change mid-season; always use latest from league standings.
	•	Some managers may miss GWs (still have 0 points) – ensure missing GW entries default to 0.
	•	Handle pagination for standings robustly.
	•	Ensure deterministic ordering for ties (configurable).

⸻

18. Future Enhancements (Phase 2+)
	•	Implement cup competitions:
	•	Use your existing spreadsheet logic as a reference:
	•	“2026 Cup”, “Summer Cup”, “Spring Cup”, “Playoffs”
	•	Derive fixtures and winners from GW points:
	•	group stages → knockout → final
	•	Add admin auth and manual overrides (Supabase/Firebase):
	•	mark payments / buy-ins
	•	track owed/net in-app
	•	Add “Season archive” capability:
	•	snapshot JSON at season end and serve multiple seasons.

⸻


If you want, I can also generate:
- the **actual initial repo files** (Next.js pages/components + ingest scripts + workflow YAML) as a complete scaffold, so you can drop it into GitHub and it’ll start publishing straight away.