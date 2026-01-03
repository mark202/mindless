import { notFound } from 'next/navigation';
import { loadBootstrap, loadGameweekTeams } from '../../../../lib/data';

export default async function GameweekTeams({ params }: { params: { gw: string } }) {
  const gw = Number(params.gw);
  const [teamsFile, bootstrap] = await Promise.all([loadGameweekTeams(gw), loadBootstrap()]);
  if (!teamsFile) {
    notFound();
  }

  const elements = new Map<number, { webName: string; teamCode: number; elementType: number }>();
  bootstrap.events; // ensure bootstrap loaded
  try {
    // @ts-ignore bootstrap includes full data shape
    bootstrap?.elements?.forEach?.((el: any) => {
      elements.set(el.id, { webName: el.web_name, teamCode: el.team_code, elementType: el.element_type });
    });
  } catch (error) {
    // ignore
  }

  const positionLabel: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
  const entryUrl = (entryId: number) => `https://fantasy.premierleague.com/entry/${entryId}/event/${gw}`;

  return (
    <section className="space-y-4">
      <div className="table-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Gameweek squads</p>
            <h1 className="text-2xl font-semibold text-white">GW {gw} lineups</h1>
            <p className="text-sm text-gray-400">Each manager’s picks for this gameweek.</p>
          </div>
          <span className="badge">{teamsFile.squads.length} managers</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teamsFile.squads.map((squad) => (
          <div key={squad.entryId} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-gray-500">{squad.entryId}</div>
                <div className="text-lg font-semibold text-white">{squad.playerName}</div>
                <div className="text-sm text-gray-400">{squad.teamName}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="badge">{squad.picks.length} picks</span>
                <a
                  href={entryUrl(squad.entryId)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-100 hover:bg-brand-500/10"
                >
                  View on FPL
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {squad.picks
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((pick) => {
                  const meta = elements.get(pick.element);
                  const isCap = pick.isCaptain;
                  const isVc = pick.isViceCaptain;
                  return (
                    <div
                      key={`${squad.entryId}-${pick.element}-${pick.position}`}
                      className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-sm text-white"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{positionLabel[meta?.elementType ?? 0] ?? '—'} • #{pick.position}</span>
                        <span className="text-gray-500">x{pick.multiplier}</span>
                      </div>
                      <div className="mt-1 text-base font-semibold text-white">{meta?.webName ?? pick.element}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Team {meta?.teamCode ?? '—'}</div>
                      <div className="mt-1 text-xs text-amber-300">
                        {isCap ? 'Captain' : isVc ? 'Vice' : ''}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
