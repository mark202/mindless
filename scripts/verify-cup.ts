import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { CupConfigDerived, CupDraw, ManagersFile, MindlessConfig } from '../lib/types';

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

function buildGroupFixtures(entries: number[], group: 'A' | 'B') {
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

async function readJson<T>(relativePath: string): Promise<T> {
  const file = path.join(process.cwd(), relativePath);
  const content = await fs.readFile(file, 'utf-8');
  return JSON.parse(content) as T;
}

async function main() {
  const config = await readJson<MindlessConfig>('config/mindless.config.json');
  const managers = await readJson<ManagersFile>('public/data/managers.json');

  const derivedCups = config.cups.filter(
    (cup): cup is CupConfigDerived => cup.mode === 'derived' && cup.format === 'groups_then_knockout'
  );

  for (const cup of derivedCups) {
    const cupSlug = cup.key.toLowerCase();
    const draw = await readJson<CupDraw>(path.join('public', 'data', 'cups', cupSlug, 'draw.json'));

    const entryIds = managers.managers.map((manager) => manager.entryId);
    const shuffled = seededShuffle(entryIds, cup.randomSeed);
    const groupSize = Math.floor(shuffled.length / cup.groupCount);
    if (groupSize < 5) {
      throw new Error(`Not enough managers to verify ${cup.key}`);
    }
    const selected = shuffled.slice(0, cup.groupCount * groupSize);
    const expectedGroups = {
      A: selected.slice(0, 5),
      B: selected.slice(5, 10)
    };

    if (JSON.stringify(draw.groups) !== JSON.stringify(expectedGroups)) {
      throw new Error(`Cup draw groups mismatch for ${cup.key}`);
    }

    const fixturesA = buildGroupFixtures(expectedGroups.A, 'A');
    const fixturesB = buildGroupFixtures(expectedGroups.B, 'B');
    const expectedFixtures = [];
    for (let roundIndex = 1; roundIndex <= 4; roundIndex += 1) {
      expectedFixtures.push({
        round: roundIndex,
        stage: 'group',
        gw: cup.startGw + (roundIndex - 1),
        matches: [
          ...fixturesA.find((round) => round.round === roundIndex)?.matches ?? [],
          ...fixturesB.find((round) => round.round === roundIndex)?.matches ?? []
        ]
      });
    }

    const drawGroupRounds = draw.fixtures.filter((fixture) => fixture.stage === 'group');
    if (JSON.stringify(drawGroupRounds) !== JSON.stringify(expectedFixtures)) {
      throw new Error(`Cup fixtures mismatch for ${cup.key}`);
    }
  }

  console.log('Cup verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
