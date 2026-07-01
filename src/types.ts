/**
 * Shared types for Rush Pi.
 *
 * Kept framework-agnostic so both the React UI layer and the Phaser game layer
 * can depend on the same contracts without importing each other.
 */

/**
 * Game modes. Daily runs are ranked & feed progression; Training runs are
 * unranked practice (do not touch best score or leaderboard). The whole app
 * branches on this single value.
 */
export type GameMode = "daily" | "training" | "survival" | "campaign";

/** The screens the app can show. A small screen state-machine lives in App.tsx. */
export type Screen =
  | "home"
  | "game"
  | "result"
  | "leaderboard"
  | "profile"
  | "campaign";

/**
 * Live HUD state emitted by the Phaser scene during a run and rendered by React.
 * This is the React-overlay HUD contract: Phaser owns the loop, React owns the UI.
 */
export interface HudState {
  /** Current score, already including the combo multiplier. */
  score: number;
  /** Whole seconds remaining in the run (0..RUN_DURATION_SECONDS). */
  timeLeft: number;
  /** Current combo count (consecutive energies collected without a hit). */
  combo: number;
  /** Remaining whole seconds of the shield (0 = inactive). */
  shieldSecs: number;
  /** Remaining whole seconds of the magnet (0 = inactive). */
  magnetSecs: number;
  /** Active dynamic event (Phase 8B), or null. */
  event: GameEventKind | null;
  /** Survival lives remaining (Phase 9B). 0 for non-survival modes. */
  lives: number;
  /** Survival Pi-orb charge level 1..6 (Phase 9C). 0 for non-survival modes. */
  charge: number;
  /** Survival current stage/zone name (Phase 9D). "" for non-survival modes. */
  stage: string;
  /** Campaign progress toward the level finish, 0..1 (Phase 9F). 0 otherwise. */
  progress: number;
}

/** Deterministic power-ups (Phase 8A). */
export type PowerupKind = "shield" | "magnet";

/** Deterministic dynamic events (Phase 8B). */
export type GameEventKind = "speed" | "energy" | "danger" | "tunnel";

/**
 * Raw result of a run, produced by the scene and consumed by storage.recordRun().
 * Intentionally contains only what the gameplay knows — no persistence-derived
 * fields (those live in RunOutcome).
 */
export interface GameResult {
  mode: GameMode;
  score: number;
  energiesCollected: number;
  maxCombo: number;
  obstaclesHit: number;
  endBonus: number;
  /** Survival: seconds survived (Time Attack = run length). */
  timeSurvivedSecs: number;
  /** Survival: lives left at game over (0 for other modes). */
  livesRemaining: number;
  /** Survival 9C counters (0 for other modes). */
  livesRecovered: number;
  chargeAbsorbs: number;
  lifeOrbsCollected: number;
  highestChargeLevel: number;
  /** Survival stage reached (1..8) and its name (Phase 9D; 0/"" otherwise). */
  stageReached: number;
  stageName: string;
  /** Campaign (Phase 9F): level id, whether the finish was reached (not died),
   *  and whether the objective was met. 0/false for non-campaign. */
  campaignLevelId: number;
  reachedFinish: boolean;
  campaignSuccess: boolean;
  /** Stars earned this run (Phase 9F-C), 0..3. 0 for non-campaign. */
  campaignStars: number;
}

/**
 * Outcome of persisting a run: progression deltas computed by storage.recordRun()
 * and shown on the Result screen. Daily-only effects (best score) are false/0 for
 * Training runs.
 */
export interface RunOutcome {
  isNewBest: boolean;
  xpGained: number;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  unlockedBadges: Badge[];
}

/** A single saved Daily leaderboard entry. */
export interface LeaderboardEntry {
  score: number;
  energiesCollected: number;
  maxCombo: number;
  obstaclesHit: number;
  /** ISO timestamp of when the run finished. */
  dateISO: string;
}

/** Cumulative local profile/progression stats. */
export interface ProfileStats {
  dailyRuns: number;
  trainingRuns: number;
  bestDailyScore: number;
  totalEnergies: number;
  bestCombo: number;
  totalObstaclesHit: number;
  totalXp: number;
  level: number;
  /** Daily streak as of lastDailyDate (consecutive UTC days with a Daily run). */
  streak: number;
  /** Best streak ever reached (never decreases). */
  bestStreak: number;
  /** Last Daily run date as YYYY-MM-DD (UTC), or null if never. */
  lastDailyDate: string | null;
  /** Whether the Pi developer-checklist test payment has succeeded (cosmetic). */
  piTestPaymentCompleted: boolean;
  /** Survival Mode (Phase 9B), local-only. */
  bestSurvivalScore: number;
  bestSurvivalTimeSecs: number;
  survivalRuns: number;
  /** Survival 9C cumulative stats (local-only). */
  highestChargeLevelReached: number;
  chargeAbsorbs: number;
  livesRecovered: number;
  lifeOrbsCollected: number;
  /** Survival 9D best stage reached (1..8) + its name (local-only). */
  bestSurvivalStageReached: number;
  bestSurvivalStageName: string;
}

/** One day of Daily Challenge history (local). */
export interface DailyHistoryEntry {
  /** Challenge date YYYY-MM-DD (UTC). */
  date: string;
  /** Best local score that day. */
  bestScore: number;
  /** Number of Daily runs played that day. */
  runs: number;
}

/** Effective streak state computed against the current UTC day (for display). */
export interface StreakInfo {
  /** Effective current streak (0 if it has lapsed). */
  current: number;
  best: number;
  playedToday: boolean;
  /** Alive (played yesterday) but not yet today — will break if not played. */
  atRisk: boolean;
  lastDailyDate: string | null;
}

/** Badge identifiers (stable keys persisted in storage). */
export type BadgeId =
  | "first-run"
  | "daily-challenger"
  | "training-starter"
  | "combo-starter"
  | "combo-master"
  | "energy-collector"
  | "rising-pioneer"
  | "obstacle-survivor"
  | "pi-supporter"
  | "streak-3"
  | "streak-7"
  | "streak-14"
  | "streak-30"
  | "survivor-starter"
  | "long-runner"
  | "survival-pro"
  | "last-heart-hero"
  | "charged-up"
  | "overcharged"
  | "second-chance"
  | "life-saver"
  | "survivor-growth"
  | "stage-genesis"
  | "stage-orange"
  | "stage-smart"
  | "stage-neon"
  | "stage-stable"
  | "stage-meme"
  | "stage-privacy"
  | "stage-storm"
  | "clear-genesis"
  | "clear-orange"
  | "clear-smart"
  | "clear-neon"
  | "clear-stable"
  | "first-3-star"
  | "perfect-genesis"
  | "clear-meme"
  | "clear-privacy"
  | "clear-storm"
  | "season-1-complete"
  | "campaign-collector"
  | "campaign-master";

/** Local Campaign progression (Phase 9F). */
export interface CampaignProgress {
  /** Highest level unlocked (playable). Starts at 1. */
  unlockedLevel: number;
  /** Level ids the player has completed. */
  completed: number[];
  /** Best local score per level id. */
  bestScoreByLevel: Record<string, number>;
  /** Best stars (0..3) per level id (Phase 9F-C). */
  starsByLevel: Record<string, number>;
}

/** Display metadata for a badge. */
export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  /** Short emoji/glyph used in the procedural badge art. */
  icon: string;
}

/** Events the Phaser game emits to the React layer. Keep names centralized. */
export const GameEvents = {
  HudUpdate: "hud-update",
  GameOver: "game-over",
} as const;
