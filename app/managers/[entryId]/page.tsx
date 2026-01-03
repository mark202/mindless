import { notFound } from 'next/navigation';
import { PointsChart } from '../../../components/Charts';
import { mindlessConfig } from '../../../lib/appConfig';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { loadManagers, loadPrizes, loadSeason, loadWeeklies } from '../../../lib/data';

export default async function ManagerDetail({ params }: { params: { entryId: string } }) {
  const entryId = Number(params.entryId);
  const [managersFile, season, prizes, weeklies] = await Promise.all([
    loadManagers(),
    loadSeason(),
    loadPrizes(),
    loadWeeklies()
  ]);

  const manager = managersFile.managers.find((m) => m.entryId === entryId);
  if (!manager) {
    notFound();
  }

  const seasonRow = season.rows.find((row) => row.entryId === entryId);
  const ledger = prizes.items.filter((item) => item.entryId === entryId);

  const chartData = weeklies.map((week) => {
    const row = week.ranked.find((r) => r.entryId === entryId);
    return {
      gw: week.gw,
      points: row?.points ?? 0,
      prize: row?.prize ?? 0
    };
  });

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Manager</p>
        <h1 className="text-2xl font-semibold text-white">{manager?.playerName}</h1>
        <p className="text-sm text-gray-400">{manager?.teamName}</p>
        <div className="mt-2">
          <a
            href={`https://fantasy.premierleague.com/entry/${entryId}/event/${weeklies[weeklies.length - 1]?.gw ?? ''}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-100 hover:bg-brand-500/10"
          >
            Open in FPL
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Season rank</div>
          <div className="text-2xl font-semibold text-white">{seasonRow?.rank ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Season points</div>
          <div className="text-2xl font-semibold text-white">{formatNumber(seasonRow?.totalPoints ?? 0)}</div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Total winnings</div>
          <div className="text-2xl font-semibold text-white">
            {formatCurrency(seasonRow?.totalWinnings ?? 0, mindlessConfig.currency)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Weekly prizes</div>
          <div className="text-2xl font-semibold text-white">
            {formatCurrency(seasonRow?.weeklyWinnings ?? 0, mindlessConfig.currency)}
          </div>
        </div>
      </div>

      <PointsChart data={chartData} />

      <div className="table-card p-5">
        <h3 className="text-lg font-semibold text-white">Prize ledger</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((item, idx) => (
              <tr key={`${item.type}-${idx}`} className="border-b border-gray-900/60">
                <td className="px-3 py-2 capitalize text-brand-200">{item.type}</td>
                <td className="px-3 py-2 text-gray-200">{item.reason}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-100">
                  {formatCurrency(item.amount, mindlessConfig.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length === 0 && <div className="py-4 text-center text-gray-400">No prizes yet.</div>}
      </div>
    </section>
  );
}
