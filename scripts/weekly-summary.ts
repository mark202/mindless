import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  Bootstrap,
  GameweekLiveFile,
  GameweekTeamsFile,
  MindlessConfig,
  MonthlyResult,
  SeasonFile,
  WeeklyNarrative,
  WeeklyResult
} from '../lib/types';

async function readJson<T>(relative: string): Promise<T | null> {
  try {
    const content = await fs.readFile(path.join(process.cwd(), relative), 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-GB').format(value);
}

async function main() {
  const config = (await readJson<MindlessConfig>('config/mindless.config.json'));
  const weeklies = (await readJson<WeeklyResult[]>('public/data/derived/weeklies.json')) ?? [];
  const months = (await readJson<MonthlyResult[]>('public/data/derived/months.json')) ?? [];
  const season = (await readJson<SeasonFile>('public/data/derived/season.json'));
  const latest = await readJson<{ lastFinishedGw: number | null }>('public/data/derived/latest.json');
  const bootstrap = await readJson<Bootstrap>('public/data/bootstrap.json');

  const currency = config?.currency ?? 'GBP';
  const lastFinishedGw = latest?.lastFinishedGw || (weeklies.length ? Math.max(...weeklies.map((w) => w.gw)) : 0);
  if (!lastFinishedGw) {
    console.log('No finished gameweek to summarise.');
    return;
  }

  const weekly = weeklies.find((w) => w.gw === lastFinishedGw);
  if (!weekly) {
    console.log(`No weekly record for GW ${lastFinishedGw}`);
    return;
  }

  const teams = (await readJson<GameweekTeamsFile>(`public/data/gameweeks/${lastFinishedGw}-teams.json`)) ?? {
    gw: lastFinishedGw,
    squads: []
  };
  const live = (await readJson<GameweekLiveFile>(`public/data/gameweeks/${lastFinishedGw}-live.json`)) ?? { elements: [] };
  const playerMeta = new Map<number, { name: string; pts: number }>();
  live.elements?.forEach((el) => playerMeta.set(el.id, { name: el.web_name, pts: el.stats?.total_points ?? 0 }));
  bootstrap?.elements?.forEach((el: any) => {
    const existing = playerMeta.get(el.id);
    if (existing) {
      if (!existing.name) existing.name = el.web_name;
    } else {
      playerMeta.set(el.id, { name: el.web_name, pts: 0 });
    }
  });

  const captainCounts = new Map<number, { count: number; pts: number; name: string }>();
  let topPlayer: { id: number; name: string; pts: number } | null = null;
  teams.squads.forEach((squad) => {
    squad.picks.forEach((pick) => {
      const meta = playerMeta.get(pick.element);
      if (meta) {
        if (!topPlayer || meta.pts > topPlayer.pts) topPlayer = { id: pick.element, name: meta.name, pts: meta.pts };
      }
      if (pick.isCaptain) {
        const metaName = meta?.name ?? String(pick.element);
        const prev = captainCounts.get(pick.element) ?? { count: 0, pts: meta?.pts ?? 0, name: metaName };
        captainCounts.set(pick.element, { count: prev.count + 1, pts: meta?.pts ?? prev.pts, name: metaName });
      }
    });
  });

  const mostCaptained = Array.from(captainCounts.values()).sort((a, b) => b.count - a.count)[0];
  const flopCaptain = Array.from(captainCounts.values())
    .filter((c) => c.count > 1)
    .sort((a, b) => a.pts - b.pts)[0];

  const leader = weekly.ranked[0];
  const runner = weekly.ranked[1];
  const tail = weekly.ranked[weekly.ranked.length - 1];
  const avg = weekly.ranked.reduce((sum, row) => sum + row.points, 0) / (weekly.ranked.length || 1);

  const seasonLeader = season?.rows?.find((row) => row.rank === 1);

  const monthKey = config?.monthDefinitions?.find((m) => m.gws.includes(lastFinishedGw))?.key;
  const month = months.find((m) => m.key === monthKey);
  const monthLeader = month?.ranked?.[0];

  const narrativeLines = [
    leader ? `${leader.playerName} (${leader.teamName}) topped the week on ${formatNumber(leader.points)} pts, taking £${leader.prize?.toFixed(2) ?? '0'} in prizes.` : '',
    runner ? `${runner.playerName} followed with ${formatNumber(runner.points)} pts; league average was ${formatNumber(Math.round(avg))} pts.` : `League average was ${formatNumber(Math.round(avg))} pts.`,
    mostCaptained ? `Most captained: ${mostCaptained.name} (${formatNumber(mostCaptained.count)} teams) for ${formatNumber(mostCaptained.pts)} pts.` : '',
    flopCaptain ? `Flop captain: ${flopCaptain.name} returning ${formatNumber(flopCaptain.pts)} pts despite ${formatNumber(flopCaptain.count)} armbands.` : '',
    topPlayer ? `Top individual haul: ${topPlayer.name} with ${formatNumber(topPlayer.pts)} pts.` : '',
    tail ? `Lowest score: ${tail.playerName} on ${formatNumber(tail.points)} pts.` : '',
    seasonLeader ? `Season leader: ${seasonLeader.playerName} at ${formatNumber(seasonLeader.totalPoints)} pts.` : '',
    monthLeader && monthKey ? `${monthKey} month leader: ${monthLeader.playerName} on ${formatNumber(monthLeader.points)} pts.` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Mindless FPL — GW ${lastFinishedGw} Summary</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e5e7eb; margin: 0; padding: 24px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #256eff; color: #fff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    h1 { margin: 0 0 6px; }
    h2 { margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 6px 8px; text-align: left; }
    th { color: #9ca3af; border-bottom: 1px solid #1f2937; }
    tr + tr td { border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="pill">GW ${lastFinishedGw}</div>
  <h1>Mindless FPL — Weekly Roundup</h1>
  <p>League ${config?.leagueId ?? ''} • Season ${config?.season ?? ''}</p>

  <div class="card">
    <h2>Headlines</h2>
    <ul>
      <li>Winner: ${leader?.playerName ?? '—'} (${leader?.teamName ?? ''}) with ${formatNumber(leader?.points ?? 0)} pts and ${formatCurrency(leader?.prize ?? 0, currency)} prize.</li>
      <li>Runner-up: ${runner?.playerName ?? '—'} on ${formatNumber(runner?.points ?? 0)} pts.</li>
      <li>Average score: ${formatNumber(Math.round(avg))} pts across ${weekly.ranked.length} teams.</li>
      <li>Low score: ${tail?.playerName ?? '—'} on ${formatNumber(tail?.points ?? 0)} pts.</li>
      ${seasonLeader ? `<li>Season leader: ${seasonLeader.playerName} (${seasonLeader.teamName}) on ${formatNumber(seasonLeader.totalPoints)} pts.</li>` : ''}
      ${monthLeader && monthKey ? `<li>${monthKey} leader: ${monthLeader.playerName} on ${formatNumber(monthLeader.points)} pts.</li>` : ''}
    </ul>
  </div>

  <div class="card">
    <h2>Top 7 — Paid Places</h2>
    <table>
      <thead>
        <tr><th>Rank</th><th>Manager</th><th>Team</th><th>Points</th><th>Prize</th></tr>
      </thead>
      <tbody>
        ${weekly.ranked
          .slice(0, 7)
          .map(
            (row) => `<tr>
              <td>${row.rank}</td>
              <td>${row.playerName}</td>
              <td>${row.teamName}</td>
              <td>${formatNumber(row.points)}</td>
              <td>${formatCurrency(row.prize, currency)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Full Table</h2>
    <table>
      <thead>
        <tr><th>Rank</th><th>Manager</th><th>Team</th><th>Points</th><th>Prize</th></tr>
      </thead>
      <tbody>
        ${weekly.ranked
          .map(
            (row) => `<tr>
              <td>${row.rank}</td>
              <td>${row.playerName}</td>
              <td>${row.teamName}</td>
              <td>${formatNumber(row.points)}</td>
              <td>${row.prize ? formatCurrency(row.prize, currency) : '—'}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const outPath = path.join(process.cwd(), 'public', 'data', 'derived', `weekly-email-${lastFinishedGw}.html`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html);
  console.log(`Weekly summary generated: ${outPath}`);

  const narrativePath = path.join(process.cwd(), 'public', 'data', 'derived', 'week-narratives.json');
  let existing: WeeklyNarrative[] = [];
  try {
    existing = JSON.parse(await fs.readFile(narrativePath, 'utf-8')) as WeeklyNarrative[];
  } catch (error) {
    existing = [];
  }
  const filtered = existing.filter((n) => n.gw !== lastFinishedGw);
  filtered.push({ gw: lastFinishedGw, summary: narrativeLines });
  await fs.writeFile(narrativePath, JSON.stringify(filtered, null, 2));
  console.log(`Narrative updated for GW ${lastFinishedGw}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
