import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mindlessConfig } from '../../../lib/appConfig';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { loadGameweek, loadWeeklies, loadWeeklyNarratives } from '../../../lib/data';

export default async function GameweekDetail({ params }: { params: { gw: string } }) {
  const gw = Number(params.gw);
  const [gameweek, weeklies, narratives] = await Promise.all([loadGameweek(gw), loadWeeklies(), loadWeeklyNarratives()]);
  const weekly = weeklies.find((w) => w.gw === gw);
  const narrative = narratives.find((n) => n.gw === gw);

  if (!gameweek && !weekly) {
    notFound();
  }

  const rows = weekly?.ranked ?? gameweek?.rows ?? [];

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Gameweek</p>
              <h1 className="text-2xl font-semibold text-white">GW {gw}</h1>
              <p className="text-sm text-gray-400">
                Deadline {gameweek?.deadlineTime ? new Date(gameweek.deadlineTime).toLocaleString() : 'TBC'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/gameweeks/${gw}/teams`} className="btn">View teams</Link>
              <Link href={`/gameweeks/${gw}/print`} className="btn">Print summary</Link>
              <Link href="/gameweeks" className="rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-200 hover:border-brand-400">
                Back
              </Link>
            </div>
        </div>
      </div>

      <div className="table-card p-5">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">Points</th>
              <th className="px-3 py-2 text-right">Prize</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.entryId} className="border-b border-gray-900/60">
                <td className="px-3 py-2 text-brand-300">{'rank' in row ? row.rank : idx + 1}</td>
                <td className="px-3 py-2 text-white">{row.playerName}</td>
                <td className="px-3 py-2 text-gray-300">{row.teamName}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber('points' in row ? row.points : 0)}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-200">
                  {'prize' in row ? formatCurrency(row.prize, mindlessConfig.currency) : formatCurrency(0, mindlessConfig.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-4 text-center text-gray-400">No data for this GW yet.</div>}
      </div>

      {narrative?.summary && (
        <div className="table-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">AI summary</p>
          <p className="mt-2 text-sm text-gray-200">{narrative.summary}</p>
        </div>
      )}
    </section>
  );
}
