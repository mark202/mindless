import Link from 'next/link';
import { mindlessConfig } from '../../../../lib/appConfig';
import { loadCupDraw, loadCupResults, loadManagers } from '../../../../lib/data';

type ManagerLabel = { playerName: string; teamName: string };

function formatManager(entryId: number | null, managerMap: Map<number, ManagerLabel>) {
  if (entryId === null) return <span className="text-gray-500">TBD</span>;
  const manager = managerMap.get(entryId);
  if (!manager) return <span className="text-gray-500">#{entryId}</span>;
  return (
    <span className="text-white">
      {manager.playerName} <span className="text-gray-500">({manager.teamName})</span>
    </span>
  );
}

export default async function CupRoundPage({ params }: { params: { round: string } }) {
  const roundNumber = Number.parseInt(params.round, 10);
  if (!Number.isFinite(roundNumber)) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup round</h1>
        <p className="text-sm text-gray-400">Invalid round.</p>
      </section>
    );
  }

  const cupConfig = mindlessConfig.cups.find((cup) => cup.mode === 'derived');
  if (!cupConfig) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup round</h1>
        <p className="text-sm text-gray-400">No derived cup is configured.</p>
      </section>
    );
  }

  const [draw, results, managers] = await Promise.all([
    loadCupDraw(cupConfig.key),
    loadCupResults(cupConfig.key),
    loadManagers()
  ]);

  if (!draw) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup round</h1>
        <p className="text-sm text-gray-400">Cup draw has not been generated yet.</p>
      </section>
    );
  }

  const managerMap = new Map<number, ManagerLabel>();
  managers.managers.forEach((manager) => managerMap.set(manager.entryId, manager));

  const round = draw.fixtures.find((fixture) => fixture.round === roundNumber);
  const resultRound = results?.rounds.find((fixture) => fixture.round === roundNumber);
  const resultMap = new Map(resultRound?.matches.map((match) => [match.matchId, match]) ?? []);

  if (!round) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup round</h1>
        <p className="text-sm text-gray-400">Round not found.</p>
      </section>
    );
  }

  return (
    <section className="table-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Cup</p>
          <h1 className="text-2xl font-semibold text-white">
            Round {round.round} · {round.stage.toUpperCase()}
          </h1>
          <p className="text-sm text-gray-400">Gameweek {round.gw}</p>
        </div>
        <Link href="/cup" className="btn">
          Back to cup
        </Link>
      </div>

      <div className="space-y-3">
        {round.matches.map((match) => {
          const result = resultMap.get(match.matchId);
          const decidedBy =
            result?.decidedBy === 'season_points'
              ? 'Decided by season points'
              : result?.decidedBy === 'random'
              ? 'Decided by coin flip'
              : null;
          return (
            <div key={match.matchId} className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {formatManager(match.homeEntryId, managerMap)}
                  <span className="text-gray-500">vs</span>
                  {formatManager(match.awayEntryId, managerMap)}
                </div>
                <span className="font-mono text-gray-200">
                  {result?.homePoints ?? '—'} : {result?.awayPoints ?? '—'}
                </span>
              </div>
              {decidedBy && <div className="mt-1 text-xs text-amber-200">{decidedBy}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
