import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  Bootstrap,
  GameweekFile,
  GameweekTeamsFile,
  GameweekLiveFile,
  ManagersFile,
  MonthlyResult,
  PrizesFile,
  SeasonFile,
  WeeklyResult,
  PrizeLedgerItem,
  WeeklyNarrative,
  FixturesFile,
  CupDraw,
  CupResults
} from './types';

const dataRoot = path.join(process.cwd(), 'public', 'data');

async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const file = path.join(dataRoot, relativePath);
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    return fallback;
  }
}

export async function loadManagers(): Promise<ManagersFile> {
  return readJson<ManagersFile>('managers.json', {
    season: '',
    leagueId: 0,
    managers: [],
    fetchedAt: ''
  });
}

export async function loadBootstrap(): Promise<Bootstrap> {
  return readJson<Bootstrap>('bootstrap.json', { events: [] });
}

export async function loadWeeklies(): Promise<WeeklyResult[]> {
  return readJson<WeeklyResult[]>('derived/weeklies.json', []);
}

export async function loadMonths(): Promise<MonthlyResult[]> {
  return readJson<MonthlyResult[]>('derived/months.json', []);
}

export async function loadSeason(): Promise<SeasonFile> {
  return readJson<SeasonFile>('derived/season.json', {
    season: '',
    lastUpdatedGw: 0,
    rows: []
  });
}

export async function loadPrizes(): Promise<PrizesFile> {
  return readJson<PrizesFile>('derived/prizes.json', { items: [], totalsByEntryId: {} });
}

export async function listGameweeks(): Promise<number[]> {
  try {
    const files = await fs.readdir(path.join(dataRoot, 'gameweeks'));
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => Number.parseInt(file.replace('.json', ''), 10))
      .filter((gw) => Number.isFinite(gw))
      .sort((a, b) => a - b);
  } catch (error) {
    return [];
  }
}

export async function loadGameweek(gw: number): Promise<GameweekFile | null> {
  return readJson<GameweekFile | null>(`gameweeks/${gw}.json`, null);
}

export async function loadGameweekTeams(gw: number): Promise<GameweekTeamsFile | null> {
  return readJson<GameweekTeamsFile | null>(`gameweeks/${gw}-teams.json`, null);
}

export async function loadGameweekLive(gw: number): Promise<GameweekLiveFile | null> {
  return readJson<GameweekLiveFile | null>(`gameweeks/${gw}-live.json`, null);
}

export async function loadWeeklyNarratives(): Promise<WeeklyNarrative[]> {
  return readJson<WeeklyNarrative[]>('derived/week-narratives.json', []);
}

export async function loadFixtures(): Promise<FixturesFile | null> {
  return readJson<FixturesFile | null>('fixtures.json', null);
}

export async function loadLedgerForEntry(entryId: number): Promise<PrizeLedgerItem[]> {
  const prizes = await loadPrizes();
  return prizes.items.filter((item) => item.entryId === entryId);
}

export async function getLastUpdated(): Promise<string | null> {
  const managers = await loadManagers();
  if (managers.fetchedAt) return managers.fetchedAt;
  try {
    const stat = await fs.stat(path.join(dataRoot, 'managers.json'));
    return stat.mtime.toISOString();
  } catch (error) {
    return null;
  }
}

function cupSlug(cupKey: string): string {
  return cupKey.toLowerCase();
}

export async function loadCupDraw(cupKey: string): Promise<CupDraw | null> {
  return readJson<CupDraw | null>(path.join('cups', cupSlug(cupKey), 'draw.json'), null);
}

export async function loadCupResults(cupKey: string): Promise<CupResults | null> {
  return readJson<CupResults | null>(path.join('cups', cupSlug(cupKey), 'results.json'), null);
}
