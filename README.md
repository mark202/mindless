# Mindless FPL Automation

Automated pipeline + static Next.js site for the Mindless fantasy league (ID 1237332). It fetches league data from the public FPL API, derives weekly/monthly/season prizes, writes JSON to `public/data/`, and renders an interactive site.

## Commands

- `npm run dev` – start Next.js locally
- `npm run build` / `npm start` – production build + serve
- `npm run ingest` – run `scripts/fetch-fpl.ts` then `scripts/derive.ts` to refresh data
- `npm run summary` – generate `public/data/derived/weekly-email-{gw}.html` from the latest finished GW
- `npm run verify-cup` – validate seeded cup draw + fixtures against config

## Data flow

1. `scripts/fetch-fpl.ts` loads `config/mindless.config.json`, fetches `bootstrap-static`, league members (with pagination), and each entry's history. Raw responses are cached in `public/data/raw/entry/{entryId}.json` and lightweight summaries in `public/data/bootstrap.json` + `public/data/managers.json`.
2. `scripts/derive.ts` builds deterministic JSON outputs:
   - `public/data/gameweeks/{gw}.json` – per-GW points table
   - `public/data/gameweeks/{gw}-teams.json` – per-GW manager picks (squads)
   - `public/data/derived/weeklies.json` – weekly ranks + prizes
   - `public/data/derived/months.json` – month blocks + prizes
   - `public/data/derived/season.json` – season leaderboard with winnings breakdown
   - `public/data/derived/prizes.json` – unified ledger + totals
   - `public/data/derived/latest.json` – last finished/current GW and generated timestamp
3. The Next.js app reads the JSON files at build/runtime and renders Leaderboard, Gameweek, Month, Prize, Rules, and Manager detail views.
4. Cup data (draw + results) is written under `public/data/cups/{cupKey}/` for the Cup pages.

## Configuration

Core config lives in `config/mindless.config.json` (season, leagueId, timezone, currency, weekly/monthly/season prize tables, cup definitions, and tie mode). Optional display overrides and manual cup results live in `config/aliases.json` and `config/cups.results.json` respectively.

## GitHub Actions

`.github/workflows/ingest.yml` runs `npm run ingest` on a schedule or manually, commits updated `public/data/**`, and pushes them so static hosting (Netlify/GitHub Pages) redeploys.

## Sync now button

The homepage includes a "Sync now" button that dispatches the GitHub Actions ingest workflow. Configure these environment variables on Netlify (or any hosting that runs the Next.js API route):

- `GITHUB_WORKFLOW_TOKEN` (PAT with `repo` + `workflow` permissions)
- `GITHUB_REPO_OWNER` (GitHub org/user)
- `GITHUB_REPO_NAME` (repository name)
- `GITHUB_WORKFLOW_FILE` (optional, default `ingest.yml`)
- `GITHUB_REF` (optional, default `main`)
- `SYNC_TRIGGER_TOKEN` (optional but recommended; when set the button prompts for it)

## Notes

- Tie handling supports deterministic ordering (entryId asc) or prize splitting via `tieMode` in config.
- The UI is App Router + Tailwind + Recharts and gracefully handles empty datasets if the ingest job has not yet run.
- Prize ledger is the single source of truth; season totals aggregate weekly/monthly/cup + season prizes.
