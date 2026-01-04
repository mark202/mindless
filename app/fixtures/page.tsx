import { loadBootstrap, loadFixtures } from '../../lib/data';
import { mindlessConfig } from '../../lib/appConfig';
import { Fixture } from '../../lib/types';

function teamLookup(teams: any[] | undefined) {
  const map = new Map<number, { name: string; short: string }>();
  teams?.forEach((t) => map.set(t.id, { name: t.name, short: t.short_name }));
  return (id: number) => map.get(id)?.short || map.get(id)?.name || `Team ${id}`;
}

function formatKickoff(value?: string | null) {
  if (!value) return 'TBC';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: mindlessConfig.timezone || 'Europe/London',
    hour12: false
  });
}

function groupByEvent(fixtures: Fixture[], finished: boolean) {
  const groups = new Map<number, Fixture[]>();
  fixtures
    .filter((f) => f.finished === finished)
    .forEach((f) => {
      const key = f.event ?? -1;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    });
  return Array.from(groups.entries())
    .map(([event, list]) => ({ event, list: list.sort((a, b) => (a.kickoff_time && b.kickoff_time ? a.kickoff_time.localeCompare(b.kickoff_time) : 0)) }))
    .sort((a, b) => (finished ? b.event - a.event : a.event - b.event));
}

export default async function FixturesPage() {
  const [fixturesFile, bootstrap] = await Promise.all([loadFixtures(), loadBootstrap()]);
  const fixtures = fixturesFile?.fixtures ?? [];
  const teams = bootstrap?.teams ?? [];
  const nameFor = teamLookup(teams);

  const upcomingByGw = groupByEvent(fixtures.filter((f) => !f.finished), false).slice(0, 6);
  const resultsByGw = groupByEvent(fixtures.filter((f) => f.finished), true).slice(0, 6);

  return (
    <section className="space-y-6">
      <div className="table-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Fixtures</p>
            <h1 className="text-2xl font-semibold text-white">Premier League schedule</h1>
            <p className="text-sm text-gray-400">Grouped by gameweek, pulled from FPL.</p>
          </div>
          <span className="badge">{fixtures.length} matches</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="table-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Upcoming</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Next {upcomingByGw.length} GWs</span>
          </div>
          <div className="mt-3 space-y-3">
            {upcomingByGw.map((group) => (
              <div key={group.event} className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900/60 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-400">
                  <span>GW {group.event}</span>
                  <span>{group.list.length} matches</span>
                </div>
                {group.list.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-200">
                        {nameFor(f.team_h)} vs {nameFor(f.team_a)}
                      </span>
                      <span className="text-xs text-gray-500">{formatKickoff(f.kickoff_time)}</span>
                    </div>
                    <span className="badge">Upcoming</span>
                  </div>
                ))}
              </div>
            ))}
            {upcomingByGw.length === 0 && <div className="text-sm text-gray-400">No upcoming fixtures available.</div>}
          </div>
        </div>

        <div className="table-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent results</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Last {resultsByGw.length} GWs</span>
          </div>
          <div className="mt-3 space-y-3">
            {resultsByGw.map((group) => (
              <div key={group.event} className="space-y-2 rounded-2xl border border-gray-800 bg-gray-900/60 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-400">
                  <span>GW {group.event}</span>
                  <span>{group.list.length} matches</span>
                </div>
                {group.list.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-200">
                        {nameFor(f.team_h)} {f.team_h_score ?? '-'} – {f.team_a_score ?? '-'} {nameFor(f.team_a)}
                      </span>
                      <span className="text-xs text-gray-500">{formatKickoff(f.kickoff_time)}</span>
                    </div>
                    <span className="badge">Final</span>
                  </div>
                ))}
              </div>
            ))}
            {resultsByGw.length === 0 && <div className="text-sm text-gray-400">No results yet.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
