import { notFound } from 'next/navigation';
import { mindlessConfig } from '../../../lib/appConfig';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { loadMonths } from '../../../lib/data';

export default async function MonthDetail({ params }: { params: { key: string } }) {
  const months = await loadMonths();
  const month = months.find((m) => m.key.toLowerCase() === params.key.toLowerCase());

  if (!month) {
    notFound();
  }

  const endGw = month.gws[month.gws.length - 1];

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Monthly ladder</p>
            <h1 className="text-2xl font-semibold text-white">
              {month.key} (GW {month.gws[0]}–{endGw})
            </h1>
            <p className="text-sm text-gray-400">Top five paid by configured pool.</p>
          </div>
          <span className="badge">{mindlessConfig.currency}</span>
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
            {month.ranked.map((row) => (
              <tr key={row.entryId} className="border-b border-gray-900/60">
                <td className="px-3 py-2 text-brand-300">{row.rank}</td>
                <td className="px-3 py-2 text-white">{row.playerName}</td>
                <td className="px-3 py-2 text-gray-300">{row.teamName}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(row.points)}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-200">{formatCurrency(row.prize, mindlessConfig.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {month.ranked.length === 0 && <div className="py-4 text-center text-gray-400">No finished GWs for this month yet.</div>}
      </div>
    </section>
  );
}
