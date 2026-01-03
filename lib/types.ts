export type TieMode = "deterministic" | "split";

export type MonthDefinition = {
  key: string;
  gws: number[];
  payouts: Record<string, number>;
};

export type CupConfig = {
  key: string;
  name: string;
  totalPrize: number;
  mode: "manual" | "derived";
};

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

export type CupResults = {
  [cupKey: string]: { winners: Array<{ entryId: number; amount: number; note?: string }> };
};

export type BootstrapEvent = {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  deadline_time: string;
};

export type Bootstrap = {
  events: BootstrapEvent[];
};

export type EntryHistory = {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
  }>;
};
