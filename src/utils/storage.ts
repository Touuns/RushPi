/**
 * Local persistence for Rush Pi (Phase 2).
 *
 * Everything lives under ONE versioned key as a single JSON blob, loaded
 * defensively (handles empty / corrupted / partial data without crashing) and
 * normalized against defaults. No backend, no network — pure localStorage.
 *
 * Public surface:
 *  - getProfile / getBestScore / getLeaderboard / getUnlockedBadgeIds (reads)
 *  - recordRun(result) -> RunOutcome (the single mutation after a run)
 *  - resetLocalProgress() (wipe; wired to a discreet, confirmed UI button)
 */

import type {
  Badge,
  BadgeId,
  DailyHistoryEntry,
  GameResult,
  LeaderboardEntry,
  ProfileStats,
  RunOutcome,
  StreakInfo,
} from "../types";
import { ALL_BADGES } from "./badges";

const SAVE_KEY = "rushpi.save";
const SAVE_VERSION = 1;
const LEGACY_BEST_KEY = "rushpi.bestScore"; // Phase 1 standalone best score
const LEADERBOARD_MAX = 10;

const RANKED_ATTEMPTS_KEY = "rushpi.rankedAttempts"; // { date: YYYY-MM-DD, used }
const MAX_RANKED_ATTEMPTS = 3;

const XP_PER_LEVEL = 500;
const XP_DIVISOR_DAILY = 10;
const XP_DIVISOR_TRAINING = 20;
const XP_DIVISOR_SURVIVAL = 12;

const DAILY_HISTORY_MAX = 30;

interface SaveData {
  version: number;
  profile: ProfileStats;
  leaderboard: LeaderboardEntry[];
  badges: BadgeId[];
  dailyHistory: DailyHistoryEntry[];
}

// ---- Defaults & normalization -------------------------------------------

function defaultProfile(): ProfileStats {
  return {
    dailyRuns: 0,
    trainingRuns: 0,
    bestDailyScore: 0,
    totalEnergies: 0,
    bestCombo: 0,
    totalObstaclesHit: 0,
    totalXp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastDailyDate: null,
    piTestPaymentCompleted: false,
    bestSurvivalScore: 0,
    bestSurvivalTimeSecs: 0,
    survivalRuns: 0,
    highestChargeLevelReached: 0,
    chargeAbsorbs: 0,
    livesRecovered: 0,
    lifeOrbsCollected: 0,
  };
}

function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: defaultProfile(),
    leaderboard: [],
    badges: [],
    dailyHistory: [],
  };
}

/** Coerce an unknown into a finite, non-negative integer with a fallback. */
function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Deep-validate/merge a parsed blob against defaults so missing/corrupt fields
 *  never crash the app. Unknown shapes degrade gracefully to defaults. */
function normalize(parsed: unknown): SaveData {
  const base = defaultSave();
  if (!parsed || typeof parsed !== "object") return base;

  const p = parsed as Record<string, unknown>;
  const rawProfile = (p.profile as Record<string, unknown>) ?? {};
  const dp = base.profile;

  const profile: ProfileStats = {
    dailyRuns: num(rawProfile.dailyRuns, dp.dailyRuns),
    trainingRuns: num(rawProfile.trainingRuns, dp.trainingRuns),
    bestDailyScore: num(rawProfile.bestDailyScore, dp.bestDailyScore),
    totalEnergies: num(rawProfile.totalEnergies, dp.totalEnergies),
    bestCombo: num(rawProfile.bestCombo, dp.bestCombo),
    totalObstaclesHit: num(rawProfile.totalObstaclesHit, dp.totalObstaclesHit),
    totalXp: num(rawProfile.totalXp, dp.totalXp),
    level: Math.max(1, num(rawProfile.level, dp.level)),
    streak: num(rawProfile.streak, dp.streak),
    bestStreak: num(rawProfile.bestStreak, dp.bestStreak),
    lastDailyDate:
      typeof rawProfile.lastDailyDate === "string" ? rawProfile.lastDailyDate : null,
    piTestPaymentCompleted: rawProfile.piTestPaymentCompleted === true,
    bestSurvivalScore: num(rawProfile.bestSurvivalScore, dp.bestSurvivalScore),
    bestSurvivalTimeSecs: num(rawProfile.bestSurvivalTimeSecs, dp.bestSurvivalTimeSecs),
    survivalRuns: num(rawProfile.survivalRuns, dp.survivalRuns),
    highestChargeLevelReached: num(
      rawProfile.highestChargeLevelReached,
      dp.highestChargeLevelReached,
    ),
    chargeAbsorbs: num(rawProfile.chargeAbsorbs, dp.chargeAbsorbs),
    livesRecovered: num(rawProfile.livesRecovered, dp.livesRecovered),
    lifeOrbsCollected: num(rawProfile.lifeOrbsCollected, dp.lifeOrbsCollected),
  };

  const knownBadgeIds = new Set(ALL_BADGES.map((b) => b.id));
  const badges = Array.isArray(p.badges)
    ? (p.badges.filter(
        (id): id is BadgeId => typeof id === "string" && knownBadgeIds.has(id as BadgeId),
      ) as BadgeId[])
    : [];

  const leaderboard = Array.isArray(p.leaderboard)
    ? p.leaderboard
        .map((e) => {
          const r = (e ?? {}) as Record<string, unknown>;
          const entry: LeaderboardEntry = {
            score: num(r.score, 0),
            energiesCollected: num(r.energiesCollected, 0),
            maxCombo: num(r.maxCombo, 0),
            obstaclesHit: num(r.obstaclesHit, 0),
            dateISO: typeof r.dateISO === "string" ? r.dateISO : new Date(0).toISOString(),
          };
          return entry;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_MAX)
    : [];

  const dailyHistory = Array.isArray(p.dailyHistory)
    ? p.dailyHistory
        .map((e) => {
          const r = (e ?? {}) as Record<string, unknown>;
          const entry: DailyHistoryEntry = {
            date: typeof r.date === "string" ? r.date : "",
            bestScore: num(r.bestScore, 0),
            runs: num(r.runs, 0),
          };
          return entry;
        })
        .filter((e) => e.date !== "")
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, DAILY_HISTORY_MAX)
    : [];

  return { version: SAVE_VERSION, profile, leaderboard, badges, dailyHistory };
}

// ---- Low-level load/save -------------------------------------------------

function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      return normalize(JSON.parse(raw));
    }
    // First run on Phase 2: migrate a Phase 1 standalone best score if present.
    const legacy = window.localStorage.getItem(LEGACY_BEST_KEY);
    const save = defaultSave();
    if (legacy) {
      save.profile.bestDailyScore = num(Number.parseInt(legacy, 10), 0);
    }
    return save;
  } catch {
    return defaultSave();
  }
}

function persist(save: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable (private mode / quota) — fail silently */
  }
}

// ---- Date helpers (UTC calendar day, consistent with the Daily Challenge) ----

/** UTC calendar day as YYYY-MM-DD. */
function dayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Previous UTC day relative to `d`. */
function previousDay(d: Date): string {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return dayString(prev);
}

function updateStreak(profile: ProfileStats, now: Date): void {
  const today = dayString(now);
  if (profile.lastDailyDate === today) return; // already counted today

  profile.streak =
    profile.lastDailyDate === previousDay(now) ? profile.streak + 1 : 1;
  profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
  profile.lastDailyDate = today;
}

// ---- XP / level ----------------------------------------------------------

export function xpForRun(mode: GameResult["mode"], score: number): number {
  const divisor =
    mode === "daily"
      ? XP_DIVISOR_DAILY
      : mode === "survival"
        ? XP_DIVISOR_SURVIVAL
        : XP_DIVISOR_TRAINING;
  return Math.round(score / divisor);
}

export function levelForXp(totalXp: number): number {
  return 1 + Math.floor(totalXp / XP_PER_LEVEL);
}

/** XP progress within the current level, for the XP bar. */
export function levelProgress(totalXp: number): {
  intoLevel: number;
  perLevel: number;
  ratio: number;
} {
  const intoLevel = totalXp % XP_PER_LEVEL;
  return { intoLevel, perLevel: XP_PER_LEVEL, ratio: intoLevel / XP_PER_LEVEL };
}

// ---- Public reads --------------------------------------------------------

export function getProfile(): ProfileStats {
  return loadSave().profile;
}

export function getBestScore(): number {
  return loadSave().profile.bestDailyScore;
}

export function getLeaderboard(): LeaderboardEntry[] {
  return loadSave().leaderboard;
}

export function getUnlockedBadgeIds(): BadgeId[] {
  return loadSave().badges;
}

export function getDailyHistory(): DailyHistoryEntry[] {
  return loadSave().dailyHistory;
}

/**
 * Effective streak state vs the current UTC day (the stored streak only updates
 * on play, so we re-derive whether it's still alive for display).
 */
export function getStreakInfo(): StreakInfo {
  const profile = loadSave().profile;
  const now = new Date();
  const today = dayString(now);
  const yesterday = previousDay(now);
  const last = profile.lastDailyDate;

  const playedToday = last === today;
  const alive = playedToday || last === yesterday;
  return {
    current: alive ? profile.streak : 0,
    best: profile.bestStreak,
    playedToday,
    atRisk: !playedToday && last === yesterday,
    lastDailyDate: last,
  };
}

/** Cosmetic, display-only streak title based on best streak (no gameplay effect). */
export function getStreakTitle(bestStreak: number): string | null {
  if (bestStreak >= 30) return "Pi Legend";
  if (bestStreak >= 14) return "Pi Devoted";
  if (bestStreak >= 7) return "Pi Regular";
  if (bestStreak >= 3) return "Pi Riser";
  return null;
}

// ---- Main mutation -------------------------------------------------------

/**
 * Persist a finished run and return the progression deltas to display.
 * Daily-only effects: best score, leaderboard, streak. XP/level/badges/stats
 * accrue for both modes.
 */
export function recordRun(run: GameResult): RunOutcome {
  const save = loadSave();
  const stats = save.profile;
  const previousLevel = stats.level;
  const now = new Date();

  // Cumulative stats (all modes).
  if (run.mode === "daily") stats.dailyRuns += 1;
  else if (run.mode === "survival") stats.survivalRuns += 1;
  else stats.trainingRuns += 1;
  stats.totalEnergies += run.energiesCollected;
  stats.bestCombo = Math.max(stats.bestCombo, run.maxCombo);
  stats.totalObstaclesHit += run.obstaclesHit;

  // XP / level (all modes).
  const xpGained = xpForRun(run.mode, run.score);
  stats.totalXp += xpGained;
  stats.level = levelForXp(stats.totalXp);

  // Survival-only effects (local; never sent to the server).
  let isNewBest = false;
  if (run.mode === "survival") {
    if (run.score > stats.bestSurvivalScore) {
      stats.bestSurvivalScore = run.score;
      isNewBest = true;
    }
    stats.bestSurvivalTimeSecs = Math.max(stats.bestSurvivalTimeSecs, run.timeSurvivedSecs);
    stats.highestChargeLevelReached = Math.max(
      stats.highestChargeLevelReached,
      run.highestChargeLevel,
    );
    stats.chargeAbsorbs += run.chargeAbsorbs;
    stats.livesRecovered += run.livesRecovered;
    stats.lifeOrbsCollected += run.lifeOrbsCollected;
  }

  // Daily-only effects.
  if (run.mode === "daily") {
    if (run.score > stats.bestDailyScore) {
      stats.bestDailyScore = run.score;
      isNewBest = true;
    }
    updateStreak(stats, now);

    save.leaderboard.push({
      score: run.score,
      energiesCollected: run.energiesCollected,
      maxCombo: run.maxCombo,
      obstaclesHit: run.obstaclesHit,
      dateISO: now.toISOString(),
    });
    save.leaderboard.sort((a, b) => b.score - a.score);
    save.leaderboard = save.leaderboard.slice(0, LEADERBOARD_MAX);

    // Daily Challenge history (per UTC day): track best score + run count.
    const today = dayString(now);
    const existing = save.dailyHistory.find((e) => e.date === today);
    if (existing) {
      existing.bestScore = Math.max(existing.bestScore, run.score);
      existing.runs += 1;
    } else {
      save.dailyHistory.unshift({ date: today, bestScore: run.score, runs: 1 });
    }
    save.dailyHistory.sort((a, b) => (a.date < b.date ? 1 : -1));
    save.dailyHistory = save.dailyHistory.slice(0, DAILY_HISTORY_MAX);
  }

  // Badges (evaluated against updated stats + this run).
  const unlockedBadges: Badge[] = [];
  const owned = new Set(save.badges);
  for (const def of ALL_BADGES) {
    if (!owned.has(def.id) && def.check(stats, run)) {
      save.badges.push(def.id);
      unlockedBadges.push({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
      });
    }
  }

  persist(save);

  return {
    isNewBest,
    xpGained,
    totalXp: stats.totalXp,
    level: stats.level,
    previousLevel,
    leveledUp: stats.level > previousLevel,
    unlockedBadges,
  };
}

/**
 * Mark the Pi developer-checklist test payment as completed and unlock the
 * cosmetic "Pi Supporter" badge. Returns the badge if newly unlocked, else null.
 * Purely cosmetic — grants no gameplay advantage.
 */
export function markPiTestPaymentCompleted(): Badge | null {
  const save = loadSave();
  save.profile.piTestPaymentCompleted = true;

  let unlocked: Badge | null = null;
  if (!save.badges.includes("pi-supporter")) {
    save.badges.push("pi-supporter");
    const def = ALL_BADGES.find((b) => b.id === "pi-supporter");
    if (def) {
      unlocked = {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
      };
    }
  }

  persist(save);
  return unlocked;
}

export function getPiTestPaymentCompleted(): boolean {
  return loadSave().profile.piTestPaymentCompleted;
}

// ---- Ranked Daily attempts (3 per UTC day) ------------------------------

export interface RankedAttempts {
  date: string; // YYYY-MM-DD UTC
  used: number;
  left: number;
  max: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ranked Daily attempts remaining today (UTC). Auto-resets when the UTC day
 * changes. This is a UX aid; the server enforces the real limit.
 */
export function getRankedAttemptsToday(): RankedAttempts {
  const today = todayUtc();
  let used = 0;
  try {
    const raw = window.localStorage.getItem(RANKED_ATTEMPTS_KEY);
    if (raw) {
      const o = JSON.parse(raw) as { date?: unknown; used?: unknown };
      if (o && o.date === today && typeof o.used === "number") {
        used = o.used;
      }
    }
  } catch {
    /* ignore */
  }
  used = Math.max(0, Math.min(MAX_RANKED_ATTEMPTS, Math.floor(used)));
  return { date: today, used, left: MAX_RANKED_ATTEMPTS - used, max: MAX_RANKED_ATTEMPTS };
}

/** Consume one ranked Daily attempt for today (call when a ranked run starts). */
export function consumeRankedAttempt(): void {
  const current = getRankedAttemptsToday();
  const used = Math.min(MAX_RANKED_ATTEMPTS, current.used + 1);
  try {
    window.localStorage.setItem(
      RANKED_ATTEMPTS_KEY,
      JSON.stringify({ date: current.date, used }),
    );
  } catch {
    /* ignore */
  }
}

/** Wipe all local progress (best score, leaderboard, profile, XP, badges). */
export function resetLocalProgress(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(LEGACY_BEST_KEY);
    window.localStorage.removeItem(RANKED_ATTEMPTS_KEY);
  } catch {
    /* ignore */
  }
}
