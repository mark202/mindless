import path from 'node:path';
import { promises as fs } from 'node:fs';
import type {
  Bootstrap,
  EntryHistory,
  GameweekTeamsFile,
  Manager,
  ManagersFile,
  GameweekPick,
  GameweekLiveFile
} from '../lib/types';
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

async function fetchEntryPicks(entryId: number, gw: number) {
  return fetchJson<any>(`/entry/${entryId}/event/${gw}/picks/`);
}

async function fetchEventLive(gw: number): Promise<GameweekLiveFile> {
  return fetchJson<GameweekLiveFile>(`/event/${gw}/live/`);
}

async function main() {
  const config = await loadConfig();
  const dataRoot = path.join(process.cwd(), 'public', 'data');
  await ensureDir(dataRoot);

  console.log('Fetching bootstrap-static...');
  const bootstrap = await fetchJson<Bootstrap>('/bootstrap-static/');
  await writeJson(path.join('public', 'data', 'bootstrap.json'), bootstrap);

  const elementMeta = new Map<number, { webName: string; teamCode: number; elementType: number }>();
  bootstrap.elements?.forEach((el: any) => {
    elementMeta.set(el.id, { webName: el.web_name, teamCode: el.team_code, elementType: el.element_type });
  });

  const finishedGws = bootstrap.events.filter((e) => e.finished).map((e) => e.id);
  const currentEvent = bootstrap.events.find((e) => e.is_current) ?? null;

  for (const gw of finishedGws) {
    console.log(`Fetching live data for GW ${gw}`);
    const live = await fetchEventLive(gw);
    await writeJson(path.join('public', 'data', 'gameweeks', `${gw}-live.json`), live);
    await delay(150);
  }

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

  const picksByGw: Record<number, GameweekTeamsFile['squads']> = {};

  for (const manager of managers) {
    console.log(`Fetching history for ${manager.playerName} (${manager.entryId})`);
    const history = await fetchEntryHistory(manager.entryId);
    await writeJson(path.join(rawDir, `${manager.entryId}.json`), history);
    for (const gw of finishedGws) {
      const picks = await fetchEntryPicks(manager.entryId, gw);
      const mappedPicks: GameweekPick[] =
        picks?.picks?.map((pick: any) => {
          const meta = elementMeta.get(pick.element);
          return {
            element: pick.element,
            position: pick.position,
            multiplier: pick.multiplier,
            isCaptain: pick.is_captain,
            isViceCaptain: pick.is_vice_captain,
            webName: meta?.webName,
            teamCode: meta?.teamCode,
            elementType: meta?.elementType
          };
        }) ?? [];
      picksByGw[gw] = picksByGw[gw] || [];
      picksByGw[gw].push({
        entryId: manager.entryId,
        playerName: manager.playerName,
        teamName: manager.teamName,
        picks: mappedPicks
      });
      await delay(150);
    }
    await delay(150);
  }

  // Write picks grouped per finished GW
  for (const gw of finishedGws) {
    const squads = picksByGw[gw] || [];
    const teamsFile: GameweekTeamsFile = { gw, squads };
    await writeJson(path.join('public', 'data', 'gameweeks', `${gw}-teams.json`), teamsFile);
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
