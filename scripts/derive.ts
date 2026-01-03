import path from 'node:path';
import { promises as fs } from 'node:fs';
import type {
  Bootstrap,
  EntryHistory,
  GameweekFile,
  MonthlyResult,
  PrizeLedgerItem,
  SeasonFile,
  WeeklyResult,
  ManagersFile,
  MindlessConfig,
  CupResults
} from '../lib/types';
import { ensureDir, getPrizeForRank, loadConfig, rankRows, writeJson } from './utils';

async function readJson<T>(relativePath: string): Promise<T> {
  const file = path.join(process.cwd(), relativePath);
  const content = await fs.readFile(file, 'utf-8');
  return JSON.parse(content) as T;
}

async function loadEntryHistory(entryId: number): Promise<EntryHistory> {
  return readJson<EntryHistory>(path.join('public', 'data', 'raw', 'entry', `${entryId}.json`));
}

function findEvent(events: Bootstrap['events'], gw: number) {
  return events.find((event) => event.id === gw);
}

async function main() {
  const config: MindlessConfig = await loadConfig();
  const managers = await readJson<ManagersFile>(path.join('public', 'data', 'managers.json'));
  const bootstrap = await readJson<Bootstrap>(path.join('public', 'data', 'bootstrap.json'));

  const finishedGws = bootstrap.events.filter((event) => event.finished).map((event) => event.id);

  const histories = new Map<number, EntryHistory>();
  let maxEventAcrossHistories = 0;
  for (const manager of managers.managers) {
    const history = await loadEntryHistory(manager.entryId);
    histories.set(manager.entryId, history);
    const maxEventForEntry = history.current.reduce((max, item) => Math.max(max, item.event), 0);
    if (maxEventForEntry > maxEventAcrossHistories) {
      maxEventAcrossHistories = maxEventForEntry;
    }
  }

  const weeklies: WeeklyResult[] = [];
  const gameweekPoints = new Map<number, Map<number, { points: number; totalPoints: number }>>();
  const prizeLedger: PrizeLedgerItem[] = [];

  await ensureDir(path.join(process.cwd(), 'public', 'data', 'gameweeks'));

  for (const gw of finishedGws) {
    const rows = managers.managers.map((manager) => {
      const history = histories.get(manager.entryId);
      const event = history?.current.find((item) => item.event === gw);
      return {
        entryId: manager.entryId,
        playerName: manager.playerName,
        teamName: manager.teamName,
        points: event?.points ?? 0,
        totalPoints: event?.total_points ?? 0
      };
    });

    const deadlineTime = findEvent(bootstrap.events, gw)?.deadline_time ?? '';
    const gameweekFile: GameweekFile = {
      gw,
      deadlineTime,
      isFinished: true,
      rows
    };

    await writeJson(path.join('public', 'data', 'gameweeks', `${gw}.json`), gameweekFile);

    const pointsMap = new Map<number, { points: number; totalPoints: number }>();
    rows.forEach((row) => pointsMap.set(row.entryId, { points: row.points, totalPoints: row.totalPoints }));
    gameweekPoints.set(gw, pointsMap);

    const ranked = rankRows(rows, config.tieMode, config.weeklyPrizes).map((row) => ({
      entryId: row.entryId,
      playerName: row.playerName,
      teamName: row.teamName,
      points: row.points,
      rank: row.rank,
      prize: row.prize
    }));

    ranked
      .filter((row) => row.prize > 0)
      .forEach((row) =>
        prizeLedger.push({
          type: 'weekly',
          gw,
          entryId: row.entryId,
          amount: row.prize,
          reason: `GW${gw} rank ${row.rank}`
        })
      );

    weeklies.push({ gw, ranked, deadlineTime });
  }

  await writeJson(path.join('public', 'data', 'derived', 'weeklies.json'), weeklies);

  const months: MonthlyResult[] = [];
  for (const month of config.monthDefinitions) {
    const finishedMonthGws = month.gws.filter((gw) => finishedGws.includes(gw));
    const rows = managers.managers.map((manager) => {
      const total = finishedMonthGws.reduce((sum, gw) => {
        const points = gameweekPoints.get(gw)?.get(manager.entryId)?.points ?? 0;
        return sum + points;
      }, 0);
      return {
        entryId: manager.entryId,
        playerName: manager.playerName,
        teamName: manager.teamName,
        points: total
      };
    });

    const ranked = rankRows(rows, config.tieMode, month.payouts).map((row) => ({
      entryId: row.entryId,
      playerName: row.playerName,
      teamName: row.teamName,
      points: row.points,
      rank: row.rank,
      prize: row.prize
    }));

    ranked
      .filter((row) => row.prize > 0)
      .forEach((row) =>
        prizeLedger.push({
          type: 'monthly',
          monthKey: month.key,
          entryId: row.entryId,
          amount: row.prize,
          reason: `${month.key} rank ${row.rank}`
        })
      );

    months.push({ key: month.key, gws: month.gws, ranked });
  }

  await writeJson(path.join('public', 'data', 'derived', 'months.json'), months);

  const lastFinishedGw = finishedGws.length ? Math.max(...finishedGws) : maxEventAcrossHistories;

  const seasonRows = managers.managers.map((manager) => {
    const totalPoints = finishedGws.reduce((sum, gw) => {
      return sum + (gameweekPoints.get(gw)?.get(manager.entryId)?.points ?? 0);
    }, 0);

    return {
      entryId: manager.entryId,
      playerName: manager.playerName,
      teamName: manager.teamName,
      points: totalPoints
    };
  });

  const rankedSeason = rankRows(seasonRows, config.tieMode, config.seasonPrizes).map((row) => ({
    entryId: row.entryId,
    playerName: row.playerName,
    teamName: row.teamName,
    totalPoints: row.points,
    rank: row.rank,
    seasonPrize: getPrizeForRank(config.seasonPrizes, row.rank)
  }));

  rankedSeason
    .filter((row) => row.seasonPrize > 0)
    .forEach((row) =>
      prizeLedger.push({
        type: 'season',
        entryId: row.entryId,
        amount: row.seasonPrize,
        reason: `Season rank ${row.rank}`
      })
    );

  let cupResults: CupResults = {};
  try {
    cupResults = await readJson<CupResults>(path.join('config', 'cups.results.json'));
  } catch (error) {
    cupResults = {};
  }

  Object.entries(cupResults).forEach(([cupKey, result]) => {
    result.winners.forEach((winner) => {
      prizeLedger.push({
        type: 'cup',
        cupKey,
        entryId: winner.entryId,
        amount: winner.amount,
        reason: winner.note ?? `${cupKey} winner`
      });
    });
  });

  const totalsByEntryId: Record<number, number> = {};
  prizeLedger.forEach((item) => {
    totalsByEntryId[item.entryId] = (totalsByEntryId[item.entryId] ?? 0) + item.amount;
  });

  await writeJson(path.join('public', 'data', 'derived', 'prizes.json'), {
    items: prizeLedger,
    totalsByEntryId
  });

  const seasonFile: SeasonFile = {
    season: config.season,
    lastUpdatedGw: lastFinishedGw,
    rows: rankedSeason.map((row) => {
      const weeklyWinnings = prizeLedger
        .filter((item) => item.type === 'weekly' && item.entryId === row.entryId)
        .reduce((sum, item) => sum + item.amount, 0);
      const monthlyWinnings = prizeLedger
        .filter((item) => item.type === 'monthly' && item.entryId === row.entryId)
        .reduce((sum, item) => sum + item.amount, 0);
      const cupWinnings = prizeLedger
        .filter((item) => item.type === 'cup' && item.entryId === row.entryId)
        .reduce((sum, item) => sum + item.amount, 0);
      const totalWinnings = weeklyWinnings + monthlyWinnings + cupWinnings + row.seasonPrize;

      return {
        ...row,
        weeklyWinnings,
        monthlyWinnings,
        cupWinnings,
        totalWinnings
      };
    })
  };

  await writeJson(path.join('public', 'data', 'derived', 'season.json'), seasonFile);

  await writeJson(path.join('public', 'data', 'derived', 'latest.json'), {
    lastFinishedGw,
    currentGw: (bootstrap.events.find((event) => event.is_current)?.id ?? maxEventAcrossHistories) || null,
    generatedAt: new Date().toISOString()
  });

  console.log('Derived files written.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
