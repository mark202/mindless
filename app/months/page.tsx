import Link from 'next/link';
import { mindlessConfig } from '../../lib/appConfig';
import { loadBootstrap, loadMonths } from '../../lib/data';

export default async function MonthsPage() {
  const [months, bootstrap] = await Promise.all([loadMonths(), loadBootstrap()]);
  const finished = new Set(bootstrap.events.filter((e) => e.finished).map((e) => e.id));

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Monthly prizes</p>
            <h1 className="text-2xl font-semibold text-white">Month blocks</h1>
            <p className="text-sm text-gray-400">Configured by GW ranges per ruleset.</p>
          </div>
          <span className="badge">{mindlessConfig.season}</span>
        </div>
      </div>

      <div className="card-grid">
        {months.map((month) => {
          const finishedCount = month.gws.filter((gw) => finished.has(gw)).length;
          const done = finishedCount === month.gws.length;
          return (
            <Link
              key={month.key}
              href={`/months/${month.key}`}
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 hover:border-brand-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-gray-500">{month.key}</div>
                  <div className="text-lg font-semibold text-white">GW {month.gws[0]}–{month.gws[month.gws.length - 1]}</div>
                  <div className="text-sm text-gray-400">{finishedCount} / {month.gws.length} finished</div>
                </div>
                <span className="badge">{done ? 'Finished' : 'In progress'}</span>
              </div>
              <div className="mt-3 text-sm text-gray-300">
                Leader: {month.ranked[0]?.playerName ?? '—'} ({month.ranked[0]?.points ?? 0} pts)
              </div>
            </Link>
          );
        })}
        {months.length === 0 && <div className="text-gray-400">No months yet. Run ingest.</div>}
      </div>
    </section>
  );
}
