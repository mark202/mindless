import Link from 'next/link';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { mindlessConfig } from '../lib/appConfig';
import { formatCurrency } from '../lib/format';
import { getLastUpdated, loadPrizes, loadSeason } from '../lib/data';

export default async function HomePage() {
  const [season, prizes, lastUpdated] = await Promise.all([loadSeason(), loadPrizes(), getLastUpdated()]);
  const currency = mindlessConfig.currency || 'AUD';

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Season</p>
          <div className="text-2xl font-semibold text-white">{mindlessConfig.season}</div>
          <p className="text-sm text-gray-400">League {mindlessConfig.leagueId}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Last updated</p>
          <div className="text-xl font-semibold text-white">{lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Not fetched yet'}</div>
          <p className="text-sm text-gray-400">via scheduled ingest</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Total paid</p>
          <div className="text-2xl font-semibold text-white">
            {formatCurrency(
              Object.values(prizes.totalsByEntryId).reduce((sum, value) => sum + value, 0),
              currency
            )}
          </div>
          <p className="text-sm text-gray-400">weekly • monthly • season • cup</p>
        </div>
      </section>

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
