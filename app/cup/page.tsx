import Link from 'next/link';
import { mindlessConfig } from '../../lib/appConfig';
import { loadBootstrap, loadCupDraw, loadCupResults, loadManagers } from '../../lib/data';

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

export default async function CupPage() {
  const cupConfig = mindlessConfig.cups.find((cup) => cup.mode === 'derived');
  if (!cupConfig) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup</h1>
        <p className="text-sm text-gray-400">No derived cup is configured.</p>
      </section>
    );
  }

  const [draw, results, managers, bootstrap] = await Promise.all([
    loadCupDraw(cupConfig.key),
    loadCupResults(cupConfig.key),
    loadManagers(),
    loadBootstrap()
  ]);

  if (!draw) {
    return (
      <section className="table-card p-6">
        <h1 className="text-2xl font-semibold text-white">Cup</h1>
        <p className="text-sm text-gray-400">Cup draw has not been generated yet.</p>
      </section>
    );
  }

  const managerMap = new Map<number, ManagerLabel>();
  managers.managers.forEach((manager) => managerMap.set(manager.entryId, manager));
  const matchResults = new Map(
    results?.rounds.flatMap((round) => round.matches).map((match) => [match.matchId, match]) ?? []
  );

  const currentGw = bootstrap.events.find((event) => event.is_current)?.id ?? null;

  return (
    <section className="space-y-6">
      <div className="table-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Cup</p>
            <h1 className="text-2xl font-semibold text-white">{cupConfig.name}</h1>
            <p className="text-sm text-gray-400">
              Starts GW {draw.startGw} · Current GW {currentGw ?? '—'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/cup/bracket" className="btn">
              Bracket view
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="table-card p-5">
          <h2 className="text-lg font-semibold text-white">Group A</h2>
          <div className="mt-3 space-y-2">
            {draw.groups.A.map((entryId) => (
              <div key={entryId} className="rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm">
                {formatManager(entryId, managerMap)}
              </div>
            ))}
          </div>
        </div>
        <div className="table-card p-5">
          <h2 className="text-lg font-semibold text-white">Group B</h2>
          <div className="mt-3 space-y-2">
            {draw.groups.B.map((entryId) => (
              <div key={entryId} className="rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm">
                {formatManager(entryId, managerMap)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Fixtures</p>
            <h2 className="text-2xl font-semibold text-white">Round schedule</h2>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {draw.fixtures.map((round) => (
            <div key={`${round.stage}-${round.round}`} className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-400">
                <div>
                  Round {round.round} · {round.stage.toUpperCase()} · GW {round.gw}
                </div>
                <Link href={`/cup/round/${round.round}`} className="text-brand-300 hover:text-brand-100">
                  View round
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {round.matches.map((match) => {
                  const result = matchResults.get(match.matchId);
                  const decidedBy =
                    result?.decidedBy === 'season_points'
                      ? 'Decided by season points'
                      : result?.decidedBy === 'random'
                      ? 'Decided by coin flip'
                      : null;
                  return (
                    <div key={match.matchId} className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-950/40 px-3 py-2 text-sm">
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
                      {decidedBy && <span className="text-xs text-amber-200">{decidedBy}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {results && (
        <div className="grid gap-4 md:grid-cols-2">
          {(['A', 'B'] as const).map((groupKey) => (
            <div key={groupKey} className="table-card p-5">
              <h3 className="text-lg font-semibold text-white">Group {groupKey} table</h3>
              <div className="mt-3 space-y-2 text-sm">
                {results.groupTables[groupKey].map((row, index) => (
                  <div key={row.entryId} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-brand-300 font-semibold">#{index + 1}</span>
                      {formatManager(row.entryId, managerMap)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>P{row.played}</span>
                      <span>W{row.won}</span>
                      <span>D{row.drawn}</span>
                      <span>L{row.lost}</span>
                      <span>GD{row.gd}</span>
                      <span className="text-white">{row.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
