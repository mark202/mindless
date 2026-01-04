import Link from 'next/link';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { mindlessConfig } from '../lib/appConfig';
import { formatCurrency, formatNumber } from '../lib/format';
import { getLastUpdated, loadBootstrap, loadPrizes, loadSeason, loadWeeklies } from '../lib/data';

export default async function HomePage() {
  const [season, prizes, lastUpdated, bootstrap, weeklies] = await Promise.all([
    loadSeason(),
    loadPrizes(),
    getLastUpdated(),
    loadBootstrap(),
    loadWeeklies()
  ]);
  const currency = mindlessConfig.currency || 'GBP';

  const finishedGws = bootstrap.events.filter((e) => e.finished).map((e) => e.id);
  const currentGw = bootstrap.events.find((e) => e.is_current)?.id ?? null;
  const totalEvents = bootstrap.events.length || 38;
  const remainingGws = totalEvents - finishedGws.length;
  const latestWeekly = weeklies.find((w) => w.gw === Math.max(...weeklies.map((w) => w.gw)));
  const nextDeadline =
    bootstrap.events.find((e) => e.is_next)?.deadline_time ??
    bootstrap.events.find((e) => e.is_current)?.deadline_time ??
    null;
  const latestRanked = latestWeekly?.ranked ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-900/30 bg-gradient-to-r from-brand-900/60 via-gray-900 to-gray-900 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-200">Mindless • {mindlessConfig.season}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Gameweek {currentGw ?? '—'}</h1>
            <p className="text-sm text-gray-300">
              League {mindlessConfig.leagueId} · {finishedGws.length} GWs played · {remainingGws} remaining
            </p>
            <p className="text-xs text-gray-400">
              Last update{' '}
              {lastUpdated
                ? new Date(lastUpdated).toLocaleString('en-GB', {
                    timeZone: mindlessConfig.timezone || 'Europe/London',
                    hour12: false
                  })
                : '—'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/gameweeks" className="btn">
              Weekly details
            </Link>
            <Link href="/months" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">
              Monthly ladders
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-300">Prize pool paid</p>
            <div className="text-2xl font-semibold text-white">
              {formatCurrency(Object.values(prizes.totalsByEntryId).reduce((sum, value) => sum + value, 0), currency)}
            </div>
            <p className="text-xs text-gray-400">weekly • monthly • season • cup</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-300">Current GW leader</p>
            <div className="text-lg font-semibold text-white">{latestWeekly?.ranked[0]?.playerName ?? 'TBD'}</div>
            <p className="text-sm text-gray-400">
              {latestWeekly?.ranked[0] ? `${formatNumber(latestWeekly.ranked[0].points)} pts` : 'Awaiting data'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-300">GWs played</p>
            <div className="text-2xl font-semibold text-white">{finishedGws.length}</div>
            <p className="text-sm text-gray-400">{remainingGws} to go</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-300">Next deadline</p>
            <div className="text-lg font-semibold text-white">
              {nextDeadline ? new Date(nextDeadline).toLocaleString() : 'TBC'}
            </div>
            <p className="text-sm text-gray-400">Premier League fixtures pending</p>
          </div>
        </div>
      </section>

      {latestWeekly && (
        <div className="table-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">This gameweek</p>
              <h2 className="text-2xl font-semibold text-white">GW {latestWeekly.gw} leaders</h2>
              <p className="text-sm text-gray-400">Top 3 with full table below.</p>
            </div>
            <Link href={`/gameweeks/${latestWeekly.gw}`} className="btn">
              View GW {latestWeekly.gw}
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {latestRanked.slice(0, 3).map((row) => {
              const accent =
                row.rank === 1 ? 'from-amber-400 to-amber-600' : row.rank === 2 ? 'from-sky-400 to-sky-600' : 'from-emerald-400 to-emerald-600';
              return (
                <div key={row.entryId} className="rounded-2xl border border-white/10 bg-gradient-to-b from-gray-900 to-gray-950 p-4 shadow-xl">
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${accent} px-3 py-1 text-xs font-bold text-black/80`}>#{row.rank}</div>
                  <Link
                    href={`https://fantasy.premierleague.com/entry/${row.entryId}/event/${latestWeekly.gw}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate text-lg font-semibold text-white hover:underline"
                  >
                    {row.playerName}
                  </Link>
                  <div className="text-sm text-gray-300 truncate">{row.teamName}</div>
                  <div className="mt-2 text-2xl font-black text-white">{formatNumber(row.points)} pts</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="grid gap-2 md:grid-cols-2">
              {latestRanked.slice(3).map((row) => (
                <div key={row.entryId} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-300 font-semibold">#{row.rank}</span>
                    <Link
                      href={`https://fantasy.premierleague.com/entry/${row.entryId}/event/${latestWeekly.gw}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-white hover:underline"
                    >
                      {row.playerName}
                    </Link>
                    <span className="text-gray-500 truncate">({row.teamName})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-200">{formatNumber(row.points)} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <LeaderboardTable rows={season.rows} currency={currency} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="table-card p-5">
          <h3 className="text-lg font-semibold text-white">Gameweeks</h3>
          <p className="text-sm text-gray-400">See weekly breakdowns, ranks, and prizes.</p>
          <Link href="/gameweeks" className="btn mt-3 inline-flex">
            View gameweeks
          </Link>
        </div>
        <div className="table-card p-5">
          <h3 className="text-lg font-semibold text-white">Monthly ladders</h3>
          <p className="text-sm text-gray-400">Blocks of GWs with configured payouts.</p>
          <Link href="/months" className="btn mt-3 inline-flex">
            View months
          </Link>
        </div>
      </section>
    </div>
  );
}
