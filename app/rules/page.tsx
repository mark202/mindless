import { mindlessConfig } from '../../lib/appConfig';

export default function RulesPage() {
  const { weeklyPrizes, monthDefinitions, seasonPrizes, cups, currency, leagueId } = mindlessConfig;

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Ruleset</p>
        <h1 className="text-2xl font-semibold text-white">Prize structure & config</h1>
        <p className="text-sm text-gray-400">League {leagueId} • Currency {currency}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="table-card p-4">
          <h3 className="text-lg font-semibold text-white">Weekly prizes (top 7)</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {Object.entries(weeklyPrizes)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([rank, amount]) => (
                  <tr key={rank} className="border-b border-gray-900/60">
                    <td className="px-2 py-1">{rank}</td>
                    <td className="px-2 py-1">{amount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="table-card p-4">
          <h3 className="text-lg font-semibold text-white">Season prizes (final table)</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {Object.entries(seasonPrizes)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([rank, amount]) => (
                  <tr key={rank} className="border-b border-gray-900/60">
                    <td className="px-2 py-1">{rank}</td>
                    <td className="px-2 py-1">{amount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card p-4">
        <h3 className="text-lg font-semibold text-white">Monthly prize table</h3>
        <table className="mt-2 w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-gray-400">
            <tr>
              <th className="px-2 py-1">Month</th>
              <th className="px-2 py-1">GWs</th>
              <th className="px-2 py-1">1st</th>
              <th className="px-2 py-1">2nd</th>
              <th className="px-2 py-1">3rd</th>
              <th className="px-2 py-1">4th</th>
              <th className="px-2 py-1">5th</th>
            </tr>
          </thead>
          <tbody>
            {monthDefinitions.map((month) => (
              <tr key={month.key} className="border-b border-gray-900/60">
                <td className="px-2 py-1 font-semibold">{month.key}</td>
                <td className="px-2 py-1 text-gray-300">{month.gws.join(', ')}</td>
                {[1, 2, 3, 4, 5].map((rank) => (
                  <td key={rank} className="px-2 py-1 text-right text-gray-200">
                    {month.payouts[String(rank)] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card p-4">
        <h3 className="text-lg font-semibold text-white">Cup rules</h3>
        {cups.length === 0 && <p className="text-sm text-gray-400">No cups configured.</p>}
        <ul className="space-y-2 text-sm text-gray-200">
          {cups.map((cup) => (
            <li key={cup.key} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
              <div className="font-semibold text-white">{cup.name}</div>
              <div className="text-gray-400">Prize pool {cup.totalPrize} {currency} • Mode {cup.mode}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
