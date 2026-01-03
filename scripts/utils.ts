import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { MindlessConfig, TieMode } from '../lib/types';

const BASE_URL = 'https://fantasy.premierleague.com/api';

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(relativePath: string, data: unknown) {
  const target = path.join(process.cwd(), relativePath);
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, JSON.stringify(data, null, 2));
}

export function getPrizeForRank(prizeTable: Record<string, number>, rank: number): number {
  const value = prizeTable[String(rank)];
  return typeof value === 'number' ? value : 0;
}

export type RankableRow<T extends object> = T & { points: number; entryId: number };

export function rankRows<T extends object>(
  rows: Array<RankableRow<T>>,
  tieMode: TieMode,
  prizeTable: Record<string, number>
): Array<RankableRow<T> & { rank: number; prize: number }> {
  const sorted = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.entryId - b.entryId;
  });

  const ranked: Array<RankableRow<T> & { rank: number; prize: number }> = [];

  let index = 0;
  while (index < sorted.length) {
    const groupPoints = sorted[index].points;
    const group: Array<RankableRow<T>> = [];
    while (index + group.length < sorted.length && sorted[index + group.length].points === groupPoints) {
      group.push(sorted[index + group.length]);
    }

    const rank = ranked.length + 1;

    if (tieMode === 'split' && group.length > 1) {
      const prizePool = Array.from({ length: group.length })
        .map((_, offset) => getPrizeForRank(prizeTable, rank + offset))
        .reduce((total, value) => total + value, 0);
      const share = prizePool / group.length;
      group.forEach((row) => {
        ranked.push({ ...row, rank, prize: share });
      });
    } else {
      group.forEach((row) => {
        const computedRank = tieMode === 'deterministic' ? ranked.length + 1 : rank;
        const prize = getPrizeForRank(prizeTable, computedRank);
        ranked.push({ ...row, rank: computedRank, prize });
      });
    }

    index += group.length;
  }

  return ranked;
}

export async function fetchJson<T>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  let attempt = 0;
  while (attempt < 4) {
    attempt += 1;
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'mindless-fpl-ingest' } });
      if (!response.ok) {
        if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 4) {
          await delay(200 * attempt);
          continue;
        }
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= 4) throw error;
      await delay(200 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

export async function loadConfig(): Promise<MindlessConfig> {
  const file = path.join(process.cwd(), 'config', 'mindless.config.json');
  const content = await fs.readFile(file, 'utf-8');
  return JSON.parse(content) as MindlessConfig;
}
