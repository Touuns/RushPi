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
  GameResult,
  LeaderboardEntry,
  ProfileStats,
  RunOutcome,
} from "../types";
import { ALL_BADGES } from "./badges";

const SAVE_KEY = "rushpi.save";
const SAVE_VERSION = 1;
const LEGACY_BEST_KEY = "rushpi.bestScore"; // Phase 1 standalone best score
const LEADERBOARD_MAX = 10;

const XP_PER_LEVEL = 500;
const XP_DIVISOR_DAILY = 10;
const XP_DIVISOR_TRAINING = 20;

interface SaveData {
  version: number;
  profile: ProfileStats;
  leaderboard: LeaderboardEntry[];
  badges: BadgeId[];
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
    lastDailyDate: null,
  };
}

function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: defaultProfile(),
    leaderboard: [],
    badges: [],
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
    lastDailyDate:
      typeof rawProfile.lastDailyDate === "string" ? rawProfile.lastDailyDate : null,
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

  return { version: SAVE_VERSION, profile, leaderboard, badges };
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

// ---- Date helpers (local calendar day) ----------------------------------

function dayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function updateStreak(profile: ProfileStats, now: Date): void {
  const today = dayString(now);
  if (profile.lastDailyDate === today) return; // already counted today

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  profile.streak = profile.lastDailyDate === dayString(yesterday) ? profile.streak + 1 : 1;
  profile.lastDailyDate = today;
}

// ---- XP / level ----------------------------------------------------------

export function xpForRun(mode: GameResult["mode"], score: number): number {
  const divisor = mode === "daily" ? XP_DIVISOR_DAILY : XP_DIVISOR_TRAINING;
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

  // Cumulative stats (both modes).
  if (run.mode === "daily") stats.dailyRuns += 1;
  else stats.trainingRuns += 1;
  stats.totalEnergies += run.energiesCollected;
  stats.bestCombo = Math.max(stats.bestCombo, run.maxCombo);
  stats.totalObstaclesHit += run.obstaclesHit;

  // XP / level (both modes).
  const xpGained = xpForRun(run.mode, run.score);
  stats.totalXp += xpGained;
  stats.level = levelForXp(stats.totalXp);

  // Daily-only effects.
  let isNewBest = false;
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

/** Wipe all local progress (best score, leaderboard, profile, XP, badges). */
export function resetLocalProgress(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(LEGACY_BEST_KEY);
  } catch {
    /* ignore */
  }
}
