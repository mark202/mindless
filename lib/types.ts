export type TieMode = "deterministic" | "split";

export type MonthDefinition = {
  key: string;
  gws: number[];
  payouts: Record<string, number>;
};

export type CupConfigManual = {
  key: string;
  name: string;
  totalPrize: number;
  mode: "manual";
};

export type CupConfigDerived = {
  key: string;
  name: string;
  mode: "derived";
  format: "groups_then_knockout";
  groupCount: number;
  advancePerGroup: number;
  startGw: number;
  useGwPoints: boolean;
  groupPoints: { win: number; draw: number; loss: number };
  includeThirdPlacePlayoff: boolean;
  randomSeed: string;
  totalPrize?: number;
  cupPayouts?: { champion?: number; runnerUp?: number; third?: number };
};

export type CupConfig = CupConfigManual | CupConfigDerived;

export type MindlessConfig = {
  season: string;
  leagueId: number;
  timezone: string;
  currency: string;
  tieMode: TieMode;
  weeklyPrizes: Record<string, number>;
  seasonPrizes: Record<string, number>;
  monthDefinitions: MonthDefinition[];
  cups: CupConfig[];
};

export type Manager = {
  entryId: number;
  playerName: string;
  teamName: string;
};

export type ManagersFile = {
  season: string;
  leagueId: number;
  managers: Manager[];
  fetchedAt: string;
};

export type GameweekPointsRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  points: number;
  totalPoints: number;
};

export type GameweekFile = {
  gw: number;
  deadlineTime: string;
  isFinished: boolean;
  rows: GameweekPointsRow[];
};

export type GameweekPick = {
  element: number;
  position: number;
  multiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  webName?: string;
  teamCode?: number;
  elementType?: number;
};

export type GameweekTeamsFile = {
  gw: number;
  squads: Array<{
    entryId: number;
    playerName: string;
    teamName: string;
    picks: GameweekPick[];
  }>;
};

export type LiveElement = {
  id: number;
  web_name: string;
  team_code: number;
  element_type: number;
  stats: { total_points: number };
};

export type GameweekLiveFile = {
  elements: LiveElement[];
};

export type WeeklyRankedRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  points: number;
  rank: number;
  prize: number;
};

export type WeeklyResult = {
  gw: number;
  ranked: WeeklyRankedRow[];
  deadlineTime?: string;
};

export type MonthlyRankedRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  points: number;
  rank: number;
  prize: number;
};

export type MonthlyResult = {
  key: string;
  gws: number[];
  ranked: MonthlyRankedRow[];
};

export type SeasonRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  totalPoints: number;
  rank: number;
  seasonPrize: number;
  weeklyWinnings: number;
  monthlyWinnings: number;
  cupWinnings: number;
  totalWinnings: number;
};

export type SeasonFile = {
  season: string;
  lastUpdatedGw: number;
  rows: SeasonRow[];
};

export type PrizeLedgerItem =
  | { type: "weekly"; gw: number; entryId: number; amount: number; reason: string }
  | { type: "monthly"; monthKey: string; entryId: number; amount: number; reason: string }
  | { type: "season"; entryId: number; amount: number; reason: string }
  | { type: "cup"; cupKey: string; entryId: number; amount: number; reason: string };

export type PrizesFile = { items: PrizeLedgerItem[]; totalsByEntryId: Record<number, number> };

export type CupManualResults = {
  [cupKey: string]: { winners: Array<{ entryId: number; amount: number; note?: string }> };
};

export type CupGroupKey = "A" | "B";

export type CupDrawMatch = {
  matchId: string;
  homeEntryId: number | null;
  awayEntryId: number | null;
  group?: CupGroupKey;
};

export type CupDrawRound = {
  round: number;
  stage: "group" | "semi" | "final" | "third";
  gw: number;
  matches: CupDrawMatch[];
};

export type CupDraw = {
  cupKey: string;
  season: string;
  generatedAt: string;
  randomSeed: string;
  startGw: number;
  groups: {
    A: number[];
    B: number[];
  };
  fixtures: CupDrawRound[];
};

export type CupMatchResult = {
  matchId: string;
  stage: "group" | "semi" | "final" | "third";
  round: number;
  gw: number;
  homeEntryId: number | null;
  awayEntryId: number | null;
  homePoints: number | null;
  awayPoints: number | null;
  winnerEntryId: number | null;
  decidedBy: "gw_points" | "season_points" | "random" | null;
};

export type CupGroupTableRow = {
  entryId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export type CupResults = {
  cupKey: string;
  updatedAt: string;
  rounds: Array<{
    round: number;
    stage: "group" | "semi" | "final" | "third";
    gw: number;
    matches: CupMatchResult[];
  }>;
  groupTables: {
    A: CupGroupTableRow[];
    B: CupGroupTableRow[];
  };
  finals: {
    semi1?: { matchId: string; winnerEntryId: number | null };
    semi2?: { matchId: string; winnerEntryId: number | null };
    final?: { matchId: string; winnerEntryId: number | null };
    third?: { matchId: string; winnerEntryId: number | null };
  };
  placements: {
    championEntryId?: number;
    runnerUpEntryId?: number;
    thirdEntryId?: number;
  };
};

export type BootstrapEvent = {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  is_next?: boolean;
  deadline_time: string;
};

export type Bootstrap = {
  events: BootstrapEvent[];
  // We only need a subset for squad display; keep it permissive.
  elements?: Array<{ id: number; web_name: string; team_code: number; element_type: number }>;
  teams?: Array<{ id: number; code: number; name: string; short_name: string }>;
};

export type WeeklyNarrative = {
  gw: number;
  summary: string;
};

export type Fixture = {
  id: number;
  event?: number | null;
  kickoff_time?: string | null;
  finished: boolean;
  team_h: number;
  team_a: number;
  team_h_score?: number | null;
  team_a_score?: number | null;
};

export type FixturesFile = {
  fixtures: Fixture[];
  fetchedAt: string;
};

export type EntryHistory = {
  current: Array<{
    event: number;
    points: number;
    event_transfers_cost?: number;
    total_points: number;
  }>;
};
