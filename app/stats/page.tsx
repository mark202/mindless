import { StatsBoard } from '../../components/StatsBoard';
import { mindlessConfig } from '../../lib/appConfig';
import { formatCurrency, formatNumber } from '../../lib/format';
import { loadPrizes, loadSeason, loadWeeklies } from '../../lib/data';

export default async function StatsPage() {
  const [season, weeklies, prizes] = await Promise.all([loadSeason(), loadWeeklies(), loadPrizes()]);

  const gwWinsCount = new Map<number, { count: number; player: string }>();
  weeklies.forEach((w) => {
    const winner = w.ranked[0];
    if (winner) {
      const prev = gwWinsCount.get(winner.entryId) ?? { count: 0, player: winner.playerName };
      gwWinsCount.set(winner.entryId, { count: prev.count + 1, player: winner.playerName });
    }
  });

  const gwWins = Array.from(gwWinsCount.entries())
    .map(([entryId, data]) => ({ name: data.player, value: data.count, entryId }))
    .sort((a, b) => b.value - a.value);

  const seasonPoints = season.rows
    .map((row) => ({ name: row.playerName, value: row.totalPoints, entryId: row.entryId }))
    .sort((a, b) => b.value - a.value);

  const richest = season.rows
    .map((row) => ({ name: row.playerName, value: row.totalWinnings, entryId: row.entryId }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const biggestWeekly = weeklies
    .flatMap((w) => w.ranked.map((r) => ({ ...r, gw: w.gw })))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="table-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Stats</p>
            <h1 className="text-2xl font-semibold text-white">League insights</h1>
            <p className="text-sm text-gray-400">GW wins, season points, and standout hauls.</p>
          </div>
          <span className="badge">{season.rows.length} managers</span>
        </div>
      </div>

      <StatsBoard gwWins={gwWins} seasonPoints={seasonPoints} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="table-card p-5">
          <h3 className="text-lg font-semibold text-white">Rich list</h3>
          <p className="text-sm text-gray-400">Total winnings across weekly/monthly/season/cup.</p>
          <div className="mt-3 space-y-2">
            {richest.map((row, idx) => (
              <div key={row.entryId} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-brand-300 font-semibold">#{idx + 1}</span>
                  <span className="text-white">{row.name}</span>
                </div>
                <span className="font-mono text-brand-200">{formatCurrency(row.value, mindlessConfig.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="table-card p-5">
          <h3 className="text-lg font-semibold text-white">Biggest weekly hauls</h3>
          <p className="text-sm text-gray-400">Top single-GW scores so far.</p>
          <div className="mt-3 space-y-2">
            {biggestWeekly.map((row, idx) => (
              <div key={`${row.entryId}-${row.gw}`} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-brand-300 font-semibold">#{idx + 1}</span>
                  <span className="text-white">{row.playerName}</span>
                  <span className="text-gray-500">GW {row.gw}</span>
                </div>
                <span className="font-mono text-gray-100">{formatNumber(row.points)} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
