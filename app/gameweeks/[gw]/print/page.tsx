import { mindlessConfig } from '../../../../lib/appConfig';
import { formatCurrency, formatNumber } from '../../../../lib/format';
import { loadWeeklies } from '../../../../lib/data';

export default async function GameweekPrint({ params }: { params: { gw: string } }) {
  const gw = Number(params.gw);
  const weeklies = await loadWeeklies();
  const weekly = weeklies.find((week) => week.gw === gw);

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-gray-900">
      <h1 className="text-3xl font-bold">Mindless FPL — GW {gw} summary</h1>
      <p className="text-sm text-gray-600">League {mindlessConfig.leagueId}</p>

      <table className="mt-6 w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 text-left">Rank</th>
            <th className="border px-2 py-1 text-left">Manager</th>
            <th className="border px-2 py-1 text-left">Team</th>
            <th className="border px-2 py-1 text-right">Points</th>
            <th className="border px-2 py-1 text-right">Prize</th>
          </tr>
        </thead>
        <tbody>
          {weekly?.ranked.map((row) => (
            <tr key={row.entryId}>
              <td className="border px-2 py-1">{row.rank}</td>
              <td className="border px-2 py-1">{row.playerName}</td>
              <td className="border px-2 py-1">{row.teamName}</td>
              <td className="border px-2 py-1 text-right">{formatNumber(row.points)}</td>
              <td className="border px-2 py-1 text-right">{formatCurrency(row.prize, mindlessConfig.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!weekly && <p className="mt-4 text-gray-600">No data yet.</p>}
    </div>
  );
}
