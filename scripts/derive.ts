import path from 'node:path';
import { promises as fs } from 'node:fs';
import type {
  Bootstrap,
  EntryHistory,
  GameweekFile,
  GameweekLiveFile,
  GameweekTeamsFile,
  MonthlyResult,
  PrizeLedgerItem,
  SeasonFile,
  WeeklyResult,
  ManagersFile,
  MindlessConfig,
  CupResults,
  CupDraw,
  CupConfigDerived,
  CupGroupKey,
  CupMatchResult,
  CupGroupTableRow,
  CupManualResults
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

type CupStage = 'group' | 'semi' | 'final' | 'third';

function assertCupStage(value: string): CupStage {
  if (value === 'group' || value === 'semi' || value === 'final' || value === 'third') {
    return value;
  }
  throw new Error(`Invalid cup stage: ${value}`);
}

function hashStringToSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), t | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashStringToSeed(seed));
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function seededCoinFlip(seed: string): boolean {
  const rng = mulberry32(hashStringToSeed(seed));
  return rng() >= 0.5;
}

function buildGroupFixtures(entries: number[], group: CupGroupKey): Array<{ round: number; matches: CupDraw['fixtures'][number]['matches'] }> {
  const [t1, t2, t3, t4, t5] = entries;
  return [
    {
      round: 1,
      matches: [
        { matchId: `GR1-${group}-1`, homeEntryId: t1, awayEntryId: t2, group },
        { matchId: `GR1-${group}-2`, homeEntryId: t3, awayEntryId: t4, group }
      ]
    },
    {
      round: 2,
      matches: [
        { matchId: `GR2-${group}-1`, homeEntryId: t1, awayEntryId: t3, group },
        { matchId: `GR2-${group}-2`, homeEntryId: t2, awayEntryId: t5, group }
      ]
    },
    {
      round: 3,
      matches: [
        { matchId: `GR3-${group}-1`, homeEntryId: t1, awayEntryId: t4, group },
        { matchId: `GR3-${group}-2`, homeEntryId: t5, awayEntryId: t3, group }
      ]
    },
    {
      round: 4,
      matches: [
        { matchId: `GR4-${group}-1`, homeEntryId: t1, awayEntryId: t5, group },
        { matchId: `GR4-${group}-2`, homeEntryId: t2, awayEntryId: t4, group }
      ]
    }
  ];
}

function resolveMatchResult(
  matchId: string,
  stage: CupMatchResult['stage'],
  round: number,
  gw: number,
  homeEntryId: number | null,
  awayEntryId: number | null,
  gameweekPoints: Map<number, Map<number, { points: number; totalPoints: number }>>,
  randomSeed: string
): CupMatchResult {
  if (homeEntryId === null || awayEntryId === null) {
    return {
      matchId,
      stage,
      round,
      gw,
      homeEntryId,
      awayEntryId,
      homePoints: null,
      awayPoints: null,
      winnerEntryId: null,
      decidedBy: null
    };
  }

  const homeData = gameweekPoints.get(gw)?.get(homeEntryId) ?? { points: 0, totalPoints: 0 };
  const awayData = gameweekPoints.get(gw)?.get(awayEntryId) ?? { points: 0, totalPoints: 0 };
  const homePoints = homeData.points;
  const awayPoints = awayData.points;

  if (homePoints !== awayPoints) {
    return {
      matchId,
      stage,
      round,
      gw,
      homeEntryId,
      awayEntryId,
      homePoints,
      awayPoints,
      winnerEntryId: homePoints > awayPoints ? homeEntryId : awayEntryId,
      decidedBy: 'gw_points'
    };
  }

  if (homeData.totalPoints !== awayData.totalPoints) {
    return {
      matchId,
      stage,
      round,
      gw,
      homeEntryId,
      awayEntryId,
      homePoints,
      awayPoints,
      winnerEntryId: homeData.totalPoints > awayData.totalPoints ? homeEntryId : awayEntryId,
      decidedBy: 'season_points'
    };
  }

  const homeWins = seededCoinFlip(`${randomSeed}:${matchId}`);
  return {
    matchId,
    stage,
    round,
    gw,
    homeEntryId,
    awayEntryId,
    homePoints,
    awayPoints,
    winnerEntryId: homeWins ? homeEntryId : awayEntryId,
    decidedBy: 'random'
  };
}

function initGroupTableRow(entryId: number): CupGroupTableRow {
  return { entryId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

function getGroupTable(
  entries: number[],
  matches: CupMatchResult[],
  groupPoints: CupConfigDerived['groupPoints'],
  lastFinishedGroupGw: number | null,
  gameweekPoints: Map<number, Map<number, { points: number; totalPoints: number }>>,
  randomSeed: string,
  groupKey: CupGroupKey
): CupGroupTableRow[] {
  const table = new Map<number, CupGroupTableRow>();
  entries.forEach((entryId) => table.set(entryId, initGroupTableRow(entryId)));

  matches.forEach((match) => {
    if (match.homeEntryId === null || match.awayEntryId === null) return;
    if (match.homePoints === null || match.awayPoints === null) return;
    const home = table.get(match.homeEntryId);
    const away = table.get(match.awayEntryId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.gf += match.homePoints;
    home.ga += match.awayPoints;
    away.gf += match.awayPoints;
    away.ga += match.homePoints;

    if (match.winnerEntryId === null) {
      home.drawn += 1;
      away.drawn += 1;
      home.points += groupPoints.draw;
      away.points += groupPoints.draw;
    } else if (match.winnerEntryId === match.homeEntryId) {
      home.won += 1;
      away.lost += 1;
      home.points += groupPoints.win;
      away.points += groupPoints.loss;
    } else {
      away.won += 1;
      home.lost += 1;
      away.points += groupPoints.win;
      home.points += groupPoints.loss;
    }
  });

  table.forEach((row) => {
    row.gd = row.gf - row.ga;
  });

  const lastGw = lastFinishedGroupGw;
  const seasonPointsByEntry = new Map<number, number>();
  if (lastGw !== null) {
    entries.forEach((entryId) => {
      seasonPointsByEntry.set(entryId, gameweekPoints.get(lastGw)?.get(entryId)?.totalPoints ?? 0);
    });
  }

  const headToHeadMap = new Map<string, number>();
  matches.forEach((match) => {
    if (match.winnerEntryId === null) return;
    if (match.homeEntryId === null || match.awayEntryId === null) return;
    headToHeadMap.set(`${match.homeEntryId}-${match.awayEntryId}`, match.winnerEntryId);
    headToHeadMap.set(`${match.awayEntryId}-${match.homeEntryId}`, match.winnerEntryId);
  });

  const seededRank = (entryId: number) => {
    const rng = mulberry32(hashStringToSeed(`${randomSeed}:${groupKey}:${entryId}`));
    return rng();
  };

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const headWinner = headToHeadMap.get(`${a.entryId}-${b.entryId}`);
    if (headWinner === a.entryId) return -1;
    if (headWinner === b.entryId) return 1;
    const seasonA = seasonPointsByEntry.get(a.entryId) ?? 0;
    const seasonB = seasonPointsByEntry.get(b.entryId) ?? 0;
    if (seasonB !== seasonA) return seasonB - seasonA;
    return seededRank(b.entryId) - seededRank(a.entryId);
  });
}

async function loadTeams(gw: number): Promise<GameweekTeamsFile | null> {
  try {
    return await readJson<GameweekTeamsFile>(path.join('public', 'data', 'gameweeks', `${gw}-teams.json`));
  } catch (error) {
    return null;
  }
}

async function loadLive(gw: number): Promise<GameweekLiveFile | null> {
  try {
    return await readJson<GameweekLiveFile>(path.join('public', 'data', 'gameweeks', `${gw}-live.json`));
  } catch (error) {
    return null;
  }
}

async function main() {
  const config: MindlessConfig = await loadConfig();
  const managers = await readJson<ManagersFile>(path.join('public', 'data', 'managers.json'));
  const bootstrap = await readJson<Bootstrap>(path.join('public', 'data', 'bootstrap.json'));

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

  const finishedSet = new Set(bootstrap.events.filter((event) => event.finished).map((event) => event.id));
  const allHistoryGws = Array.from(
    new Set(
      Array.from(histories.values()).flatMap((h) => h.current.map((c) => c.event))
    )
  ).sort((a, b) => a - b);

  const weeklies: WeeklyResult[] = [];
  const gameweekPoints = new Map<number, Map<number, { points: number; totalPoints: number }>>();
  const prizeLedger: PrizeLedgerItem[] = [];
  const cumulativeByEntry = new Map<number, number>();

  await ensureDir(path.join(process.cwd(), 'public', 'data', 'gameweeks'));

  for (const gw of allHistoryGws) {
    const teams = await loadTeams(gw);
    const live = await loadLive(gw);
    const livePoints = new Map<number, number>();
    live?.elements?.forEach((el) => livePoints.set(el.id, el.stats?.total_points ?? 0));

    const isFinished = finishedSet.has(gw);
    const rows = managers.managers.map((manager) => {
      const history = histories.get(manager.entryId);
      const event = history?.current.find((item) => item.event === gw);
      let adjustedPoints = (event?.points ?? 0) + (event?.event_transfers_cost ?? 0);

      if (teams) {
        const squad = teams.squads.find((s) => s.entryId === manager.entryId);
        if (squad) {
          adjustedPoints = squad.picks.reduce((sum, pick) => {
            const pts = livePoints.get(pick.element) ?? 0;
            return sum + pick.multiplier * pts;
          }, 0);
        }
      }

      const prevTotal = cumulativeByEntry.get(manager.entryId) ?? 0;
      const totalPoints = prevTotal + adjustedPoints;
      cumulativeByEntry.set(manager.entryId, totalPoints);
      return {
        entryId: manager.entryId,
        playerName: manager.playerName,
        teamName: manager.teamName,
        points: adjustedPoints,
        totalPoints
      };
    });

    const deadlineTime = findEvent(bootstrap.events, gw)?.deadline_time ?? '';
    const gameweekFile: GameweekFile = {
      gw,
      deadlineTime,
      isFinished,
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

    if (isFinished) {
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
    }

    weeklies.push({ gw, ranked, deadlineTime });
  }

  await writeJson(path.join('public', 'data', 'derived', 'weeklies.json'), weeklies);

  const months: MonthlyResult[] = [];
  for (const month of config.monthDefinitions) {
    const finishedMonthGws = month.gws.filter((gw) => finishedSet.has(gw));
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

  const finishedGwsArray = Array.from(finishedSet);
  const lastAvailableGw = allHistoryGws.length ? Math.max(...allHistoryGws) : 0;
  const lastFinishedGw =
    finishedGwsArray.length > 0 ? Math.max(...finishedGwsArray) : lastAvailableGw || maxEventAcrossHistories;

  const seasonRows = managers.managers.map((manager) => {
    const totalPointsGws = allHistoryGws.length ? allHistoryGws : finishedGwsArray;
    const totalPoints = totalPointsGws.reduce(
      (sum, gw) => sum + (gameweekPoints.get(gw)?.get(manager.entryId)?.points ?? 0),
      0
    );

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

  const derivedCups = config.cups.filter(
    (cup): cup is CupConfigDerived => cup.mode === 'derived' && cup.format === 'groups_then_knockout'
  );

  for (const cup of derivedCups) {
    const cupSlug = cup.key.toLowerCase();
    const cupDir = path.join('public', 'data', 'cups', cupSlug);
    await ensureDir(path.join(process.cwd(), cupDir));

    let draw: CupDraw | null = null;
    try {
      draw = await readJson<CupDraw>(path.join(cupDir, 'draw.json'));
      if (draw.randomSeed !== cup.randomSeed || draw.startGw !== cup.startGw || draw.season !== config.season) {
        draw = null;
      }
    } catch (error) {
      draw = null;
    }

    if (!draw) {
      const entryIds = managers.managers.map((manager) => manager.entryId);
      const shuffled = seededShuffle(entryIds, cup.randomSeed);
      const groupSize = Math.floor(shuffled.length / cup.groupCount);
      if (groupSize < 5) {
        console.warn(`Not enough managers for ${cup.key} cup draw.`);
        continue;
      }
      const needed = cup.groupCount * groupSize;
      const selected = shuffled.slice(0, needed);
      const groups = {
        A: selected.slice(0, 5),
        B: selected.slice(5, 10)
      };

      const groupFixturesA = buildGroupFixtures(groups.A, 'A');
      const groupFixturesB = buildGroupFixtures(groups.B, 'B');

      const fixtures: CupDraw['fixtures'] = [];
      for (let roundIndex = 1; roundIndex <= 4; roundIndex += 1) {
        const gw = cup.startGw + (roundIndex - 1);
        fixtures.push({
          round: roundIndex,
          stage: 'group',
          gw,
          matches: [
            ...groupFixturesA.find((round) => round.round === roundIndex)?.matches ?? [],
            ...groupFixturesB.find((round) => round.round === roundIndex)?.matches ?? []
          ]
        });
      }

      fixtures.push({
        round: 5,
        stage: 'semi',
        gw: cup.startGw + 4,
        matches: [
          { matchId: 'SF1', homeEntryId: null, awayEntryId: null },
          { matchId: 'SF2', homeEntryId: null, awayEntryId: null }
        ]
      });
      fixtures.push({
        round: 6,
        stage: 'final',
        gw: cup.startGw + 5,
        matches: [{ matchId: 'F1', homeEntryId: null, awayEntryId: null }]
      });

      if (cup.includeThirdPlacePlayoff) {
        fixtures.push({
          round: 7,
          stage: 'third',
          gw: cup.startGw + 5,
          matches: [{ matchId: 'TP1', homeEntryId: null, awayEntryId: null }]
        });
      }

      draw = {
        cupKey: cup.key,
        season: config.season,
        generatedAt: new Date().toISOString(),
        randomSeed: cup.randomSeed,
        startGw: cup.startGw,
        groups,
        fixtures
      };

      await writeJson(path.join(cupDir, 'draw.json'), draw);
    }

    if (!draw) continue;

    const groupRounds = draw.fixtures.filter((fixture) => fixture.stage === 'group');
    const groupGws = groupRounds.map((round) => round.gw);
    const finishedGroupGws = groupGws.filter((gw) => finishedSet.has(gw));
    const lastFinishedGroupGw = finishedGroupGws.length > 0 ? Math.max(...finishedGroupGws) : null;
    const groupStageComplete = groupGws.every((gw) => finishedSet.has(gw));

    const rounds: CupResults['rounds'] = groupRounds.map((round) => {
      const stage = assertCupStage(round.stage);
      const isFinished = finishedSet.has(round.gw);
      const matches = round.matches.map((match) =>
        isFinished
          ? resolveMatchResult(
              match.matchId,
              stage,
              round.round,
              round.gw,
              match.homeEntryId,
              match.awayEntryId,
              gameweekPoints,
              cup.randomSeed
            )
          : {
              matchId: match.matchId,
              stage,
              round: round.round,
              gw: round.gw,
              homeEntryId: match.homeEntryId,
              awayEntryId: match.awayEntryId,
              homePoints: null,
              awayPoints: null,
              winnerEntryId: null,
              decidedBy: null
            }
      );
      return { round: round.round, stage, gw: round.gw, matches };
    });

    const groupMatches = rounds.flatMap((round) => round.matches);
    const groupTables = {
      A: getGroupTable(draw.groups.A, groupMatches.filter((match) => match.stage === 'group' && match.matchId.includes('-A-')), cup.groupPoints, lastFinishedGroupGw, gameweekPoints, cup.randomSeed, 'A'),
      B: getGroupTable(draw.groups.B, groupMatches.filter((match) => match.stage === 'group' && match.matchId.includes('-B-')), cup.groupPoints, lastFinishedGroupGw, gameweekPoints, cup.randomSeed, 'B')
    };

    const semiFixture = draw.fixtures.find((fixture) => fixture.stage === 'semi');
    const finalFixture = draw.fixtures.find((fixture) => fixture.stage === 'final');
    const thirdFixture = draw.fixtures.find((fixture) => fixture.stage === 'third');

    const semiRound = semiFixture
      ? {
          round: semiFixture.round,
          stage: 'semi' as const,
          gw: semiFixture.gw,
          matches: semiFixture.matches.map((match, index) => {
            const homeEntryId =
              groupStageComplete && index === 0 ? groupTables.A[0]?.entryId ?? null : groupStageComplete ? groupTables.B[0]?.entryId ?? null : null;
            const awayEntryId =
              groupStageComplete && index === 0 ? groupTables.B[1]?.entryId ?? null : groupStageComplete ? groupTables.A[1]?.entryId ?? null : null;
            const isFinished = finishedSet.has(semiFixture.gw);
            return isFinished
              ? resolveMatchResult(
                  match.matchId,
                  'semi',
                  semiFixture.round,
                  semiFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  gameweekPoints,
                  cup.randomSeed
                )
              : {
                  matchId: match.matchId,
                  stage: 'semi',
                  round: semiFixture.round,
                  gw: semiFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  homePoints: null,
                  awayPoints: null,
                  winnerEntryId: null,
                  decidedBy: null
                };
          })
        }
      : null;

    if (semiRound) {
      rounds.push(semiRound);
    }

    const semiWinners = semiRound?.matches.map((match) => match.winnerEntryId ?? null) ?? [];
    const semiLosers = semiRound?.matches.map((match) => {
      if (match.homeEntryId === null || match.awayEntryId === null || match.winnerEntryId === null) return null;
      return match.winnerEntryId === match.homeEntryId ? match.awayEntryId : match.homeEntryId;
    }) ?? [];

    const finalRound = finalFixture
      ? {
          round: finalFixture.round,
          stage: 'final' as const,
          gw: finalFixture.gw,
          matches: finalFixture.matches.map((match) => {
            const homeEntryId = semiWinners[0] ?? null;
            const awayEntryId = semiWinners[1] ?? null;
            const isFinished = finishedSet.has(finalFixture.gw);
            return isFinished
              ? resolveMatchResult(
                  match.matchId,
                  'final',
                  finalFixture.round,
                  finalFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  gameweekPoints,
                  cup.randomSeed
                )
              : {
                  matchId: match.matchId,
                  stage: 'final',
                  round: finalFixture.round,
                  gw: finalFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  homePoints: null,
                  awayPoints: null,
                  winnerEntryId: null,
                  decidedBy: null
                };
          })
        }
      : null;

    if (finalRound) {
      rounds.push(finalRound);
    }

    const thirdRound = thirdFixture
      ? {
          round: thirdFixture.round,
          stage: 'third' as const,
          gw: thirdFixture.gw,
          matches: thirdFixture.matches.map((match) => {
            const homeEntryId = semiLosers[0] ?? null;
            const awayEntryId = semiLosers[1] ?? null;
            const isFinished = finishedSet.has(thirdFixture.gw);
            return isFinished
              ? resolveMatchResult(
                  match.matchId,
                  'third',
                  thirdFixture.round,
                  thirdFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  gameweekPoints,
                  cup.randomSeed
                )
              : {
                  matchId: match.matchId,
                  stage: 'third',
                  round: thirdFixture.round,
                  gw: thirdFixture.gw,
                  homeEntryId,
                  awayEntryId,
                  homePoints: null,
                  awayPoints: null,
                  winnerEntryId: null,
                  decidedBy: null
                };
          })
        }
      : null;

    if (thirdRound) {
      rounds.push(thirdRound);
    }

    const finalMatch = finalRound?.matches[0];
    const championEntryId = finalMatch?.winnerEntryId ?? undefined;
    const runnerUpEntryId =
      finalMatch?.homeEntryId && finalMatch?.awayEntryId && finalMatch.winnerEntryId
        ? finalMatch.winnerEntryId === finalMatch.homeEntryId
          ? finalMatch.awayEntryId
          : finalMatch.homeEntryId
        : undefined;
    const thirdEntryId = thirdRound?.matches[0]?.winnerEntryId ?? undefined;

    const cupResults: CupResults = {
      cupKey: cup.key,
      updatedAt: new Date().toISOString(),
      rounds,
      groupTables,
      finals: {
        semi1: semiRound?.matches[0] ? { matchId: semiRound.matches[0].matchId, winnerEntryId: semiRound.matches[0].winnerEntryId } : undefined,
        semi2: semiRound?.matches[1] ? { matchId: semiRound.matches[1].matchId, winnerEntryId: semiRound.matches[1].winnerEntryId } : undefined,
        final: finalMatch ? { matchId: finalMatch.matchId, winnerEntryId: finalMatch.winnerEntryId } : undefined,
        third: thirdRound?.matches[0] ? { matchId: thirdRound.matches[0].matchId, winnerEntryId: thirdRound.matches[0].winnerEntryId } : undefined
      },
      placements: {
        championEntryId,
        runnerUpEntryId,
        thirdEntryId
      }
    };

    await writeJson(path.join(cupDir, 'results.json'), cupResults);

    const payoutChampion = cup.cupPayouts?.champion ?? cup.totalPrize ?? 0;
    if (championEntryId && payoutChampion > 0) {
      prizeLedger.push({
        type: 'cup',
        cupKey: cup.key,
        entryId: championEntryId,
        amount: payoutChampion,
        reason: `${cup.name} champion`
      });
    }

    const payoutRunnerUp = cup.cupPayouts?.runnerUp ?? 0;
    if (runnerUpEntryId && payoutRunnerUp > 0) {
      prizeLedger.push({
        type: 'cup',
        cupKey: cup.key,
        entryId: runnerUpEntryId,
        amount: payoutRunnerUp,
        reason: `${cup.name} runner-up`
      });
    }

    const payoutThird = cup.cupPayouts?.third ?? 0;
    if (thirdEntryId && payoutThird > 0) {
      prizeLedger.push({
        type: 'cup',
        cupKey: cup.key,
        entryId: thirdEntryId,
        amount: payoutThird,
        reason: `${cup.name} third place`
      });
    }
  }

  let manualCupResults: CupManualResults = {};
  try {
    manualCupResults = await readJson<CupManualResults>(path.join('config', 'cups.results.json'));
  } catch (error) {
    manualCupResults = {};
  }

  Object.entries(manualCupResults).forEach(([cupKey, result]) => {
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
    lastAvailableGw,
    currentGw: (bootstrap.events.find((event) => event.is_current)?.id ?? maxEventAcrossHistories) || null,
    generatedAt: new Date().toISOString()
  });

  console.log('Derived files written.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
