import Link from 'next/link';
import { mindlessConfig } from '../../../lib/appConfig';
import { loadCupResults, loadManagers } from '../../../lib/data';

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

export default async function CupBracketPage() {
  const cupConfig = mindlessConfig.cups.find((cup) => cup.mode === 'derived');
  if (!cupConfig) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup bracket</h1>
        <p className="text-sm text-gray-400">No derived cup is configured.</p>
      </section>
    );
  }

  const [results, managers] = await Promise.all([loadCupResults(cupConfig.key), loadManagers()]);
  if (!results) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup bracket</h1>
        <p className="text-sm text-gray-400">Cup results are not available yet.</p>
      </section>
    );
  }

  const managerMap = new Map<number, ManagerLabel>();
  managers.managers.forEach((manager) => managerMap.set(manager.entryId, manager));
  const rounds = results.rounds;
  const semiRound = rounds.find((round) => round.stage === 'semi');
  const finalRound = rounds.find((round) => round.stage === 'final');
  const thirdRound = rounds.find((round) => round.stage === 'third');

  return (
    <section className="table-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Cup</p>
          <h1 className="text-2xl font-semibold text-white">Bracket</h1>
        </div>
        <Link href="/cup" className="btn">
          Back to cup
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="text-sm font-semibold text-white">Semi-finals</h2>
          <div className="mt-3 space-y-2 text-sm">
            {semiRound?.matches.map((match) => (
              <div key={match.matchId} className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2">
                <div className="flex flex-col gap-1">
                  <span>{formatManager(match.homeEntryId, managerMap)}</span>
                  <span className="text-gray-500">vs</span>
                  <span>{formatManager(match.awayEntryId, managerMap)}</span>
                  <span className="font-mono text-gray-200">
                    {match.homePoints ?? '—'} : {match.awayPoints ?? '—'}
                  </span>
                </div>
              </div>
            ))}
            {!semiRound && <span className="text-gray-500">TBD</span>}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="text-sm font-semibold text-white">Final</h2>
          <div className="mt-3 space-y-2 text-sm">
            {finalRound?.matches.map((match) => (
              <div key={match.matchId} className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2">
                <div className="flex flex-col gap-1">
                  <span>{formatManager(match.homeEntryId, managerMap)}</span>
                  <span className="text-gray-500">vs</span>
                  <span>{formatManager(match.awayEntryId, managerMap)}</span>
                  <span className="font-mono text-gray-200">
                    {match.homePoints ?? '—'} : {match.awayPoints ?? '—'}
                  </span>
                </div>
              </div>
            ))}
            {!finalRound && <span className="text-gray-500">TBD</span>}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="text-sm font-semibold text-white">3rd place</h2>
          <div className="mt-3 space-y-2 text-sm">
            {thirdRound?.matches.map((match) => (
              <div key={match.matchId} className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2">
                <div className="flex flex-col gap-1">
                  <span>{formatManager(match.homeEntryId, managerMap)}</span>
                  <span className="text-gray-500">vs</span>
                  <span>{formatManager(match.awayEntryId, managerMap)}</span>
                  <span className="font-mono text-gray-200">
                    {match.homePoints ?? '—'} : {match.awayPoints ?? '—'}
                  </span>
                </div>
              </div>
            ))}
            {!thirdRound && <span className="text-gray-500">Not scheduled</span>}
          </div>
        </div>
      </div>

      {results.placements.championEntryId && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Champion: {formatManager(results.placements.championEntryId, managerMap)}
        </div>
      )}
    </section>
  );
}
