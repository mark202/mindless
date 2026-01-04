import Link from 'next/link';
import { mindlessConfig } from '../../lib/appConfig';
import { loadBootstrap, loadWeeklies } from '../../lib/data';

export default async function GameweeksPage() {
  const [weeklies, bootstrap] = await Promise.all([loadWeeklies(), loadBootstrap()]);
  const finishedSet = new Set(bootstrap.events.filter((e) => e.finished).map((e) => e.id));
  const sortedWeeklies = [...weeklies].sort((a, b) => b.gw - a.gw);

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Weekly prizes</p>
            <h1 className="text-2xl font-semibold text-white">Gameweek results</h1>
            <p className="text-sm text-gray-400">Top 7 prizes paid each finished GW.</p>
          </div>
          <span className="badge">League {mindlessConfig.leagueId}</span>
        </div>
      </div>

      <div className="card-grid">
        {sortedWeeklies.map((week) => {
          const status = finishedSet.has(week.gw) ? 'Finished' : 'Live';
          return (
            <Link
              key={week.gw}
              href={`/gameweeks/${week.gw}`}
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 hover:border-brand-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-gray-500">GW {week.gw}</div>
                  <div className="text-lg font-semibold text-white">{status}</div>
                </div>
                <span className="badge">{week.ranked.length} managers</span>
              </div>
              <div className="mt-3 text-sm text-gray-300">
                Winner: {week.ranked[0]?.playerName ?? '—'} ({week.ranked[0]?.points ?? 0} pts)
              </div>
            </Link>
          );
        })}
        {weeklies.length === 0 && (
          <div className="text-gray-400">No finished gameweeks yet. Run the ingest job once.</div>
        )}
      </div>
    </section>
  );
}
