import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Bootstrap, EntryHistory, Manager, ManagersFile } from '../lib/types';
import { delay, ensureDir, fetchJson, loadConfig, writeJson } from './utils';

async function fetchLeagueMembers(leagueId: number) {
  const members: any[] = [];
  let page = 1;
  while (true) {
    const data = await fetchJson<any>(`/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
    const results = data?.standings?.results ?? data?.results ?? [];
    members.push(...results);
    const hasNext = data?.standings?.has_next ?? data?.has_next ?? false;
    if (!hasNext) break;
    page += 1;
    await delay(250);
  }
  return members;
}

async function fetchEntryHistory(entryId: number): Promise<EntryHistory> {
  return fetchJson<EntryHistory>(`/entry/${entryId}/history/`);
}

async function main() {
  const config = await loadConfig();
  const dataRoot = path.join(process.cwd(), 'public', 'data');
  await ensureDir(dataRoot);

  console.log('Fetching bootstrap-static...');
  const bootstrap = await fetchJson<Bootstrap>('/bootstrap-static/');
  await writeJson(path.join('public', 'data', 'bootstrap.json'), bootstrap);

  const finishedGws = bootstrap.events.filter((e) => e.finished).map((e) => e.id);
  const currentEvent = bootstrap.events.find((e) => e.is_current) ?? null;

  console.log('Fetching league members...');
  const memberResults = await fetchLeagueMembers(config.leagueId);
  const managers: Manager[] = memberResults.map((member: any) => ({
    entryId: Number(member.entry),
    playerName: member.player_name,
    teamName: member.entry_name
  }));

  const managersFile: ManagersFile = {
    season: config.season,
    leagueId: config.leagueId,
    managers,
    fetchedAt: new Date().toISOString()
  };

  await writeJson(path.join('public', 'data', 'managers.json'), managersFile);

  const rawDir = path.join('public', 'data', 'raw', 'entry');
  await ensureDir(path.join(process.cwd(), rawDir));

  for (const manager of managers) {
    console.log(`Fetching history for ${manager.playerName} (${manager.entryId})`);
    const history = await fetchEntryHistory(manager.entryId);
    await writeJson(path.join(rawDir, `${manager.entryId}.json`), history);
    await delay(300);
  }

  await writeJson(path.join('public', 'data', 'derived', 'latest.json'), {
    lastFinishedGw: finishedGws.length ? Math.max(...finishedGws) : 0,
    currentGw: currentEvent?.id ?? null,
    generatedAt: new Date().toISOString()
  });

  console.log('Fetch complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
