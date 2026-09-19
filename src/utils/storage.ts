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
  CampaignProgress,
  DailyHistoryEntry,
  GameResult,
  LeaderboardEntry,
  ProfileStats,
  RunOutcome,
  StreakInfo,
} from "../types";
// Explicit .ts extensions (the convention already used across src/logos and
// src/game) so this module resolves under Node's ESM loader and its Phase 13D
// first-run migration can be tested against real behaviour, not source text.
import { ALL_BADGES } from "./badges.ts";
import { CAMPAIGN_LEVELS } from "../game/campaign.ts";
import { DAILY_RULES_VERSION } from "../game/dailyRulesVersion.ts";

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
const XP_DIVISOR_CAMPAIGN = 12;

const DAILY_HISTORY_MAX = 30;

interface SaveData {
  version: number;
  profile: ProfileStats;
  leaderboard: LeaderboardEntry[];
  badges: BadgeId[];
  dailyHistory: DailyHistoryEntry[];
  campaign: CampaignProgress;
  /**
   * Phase 13D — gates the one-time Guided First Run auto-launch.
   *
   * MIGRATION RULE (deliberate, and the opposite of every other field here):
   * a brand-new save defaults to `false`, but an EXISTING pre-13D save that
   * has no such field must normalize to `true`. Those two cases produce the
   * same "field is absent" input, so the distinction cannot live in
   * `normalize()` — only `loadSave()` knows whether a stored blob existed at
   * all. See `normalize(parsed, saveExisted)`.
   *
   * Getting this backwards would push every already-onboarded player through
   * the tutorial on their next launch.
   */
  firstRunCompleted: boolean;
  /**
   * Phase 13E — gates the three one-time in-run coach marks (Move → Avoid →
   * Collect) shown during the Guided First Run.
   *
   * MIGRATION RULE: an explicit boolean always wins; when the field is absent
   * it INHERITS the normalized `firstRunCompleted`. That single rule produces
   * every canonical outcome:
   *   - genuine new player (no save)          → false / false
   *   - legacy pre-13D/13E save (no fields)   → true  / true   (never re-taught)
   *   - explicitly incomplete first run       → false / false  (cues can run)
   *   - completed player                      → true  / true
   *
   * Deliberately a SEPARATE flag rather than a reuse of `firstRunCompleted`:
   * the two flip at different moments (cues complete ~17 s into the run, the
   * first run completes at the 60 s finish), so a player who closes the tab
   * in between is re-offered the run but not the lesson.
   */
  coachMarksSeen: boolean;
  /**
   * Phase 13F — gates the one-time first-Daily teaching: the attempt-context
   * notice shown before the first ranked claim, and the meta lesson (leaderboard
   * + streak meaning) shown on the first completed Daily result.
   *
   * MIGRATION RULE — deliberately NOT the `saveExisted` rule used by
   * `firstRunCompleted`, and NOT an inherit like `coachMarksSeen`. An explicit
   * boolean always wins; when the field is absent the answer is derived from
   * whether the player has actually finished a Daily before:
   *
   *   absent + dailyRuns > 0 (or any dailyHistory) → true   (experienced, never taught)
   *   absent + no Daily ever finished              → false  (still owed the lesson)
   *
   * Inheriting "a save exists → true" would be wrong here: a 13D/13E player who
   * completed Guided Training but has never played a Daily has a save, yet is
   * exactly the player this phase exists for.
   */
  firstDailyResultSeen: boolean;
  /**
   * Phase 13G — the player has explicitly accepted, once, that starting a
   * ranked run while exactly one ranked attempt remained would spend their
   * final ranked attempt of the day (canonical §9 / §11).
   *
   * It records the ACKNOWLEDGEMENT only — not that a claim succeeded, not that
   * the attempt was consumed, not that the run finished.
   *
   * MIGRATION RULE: explicit boolean wins; absent → FALSE for every save,
   * including experienced players with Daily history. Unlike the first-run
   * teaching flags, history does not imply this cost was ever confirmed, so a
   * veteran is still owed the confirmation once, at their next last attempt.
   */
  attemptCostAcknowledged: boolean;
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
    bestDailyTokenRushScore: 0,
    bestDailyRulesV3Score: 0,
    lastDailyDate: null,
    piTestPaymentCompleted: false,
    bestSurvivalScore: 0,
    bestSurvivalTimeSecs: 0,
    survivalRuns: 0,
    highestChargeLevelReached: 0,
    chargeAbsorbs: 0,
    livesRecovered: 0,
    lifeOrbsCollected: 0,
    bestSurvivalStageReached: 0,
    bestSurvivalStageName: "",
  };
}

function defaultCampaign(): CampaignProgress {
  return { unlockedLevel: 1, completed: [], bestScoreByLevel: {}, starsByLevel: {} };
}

function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: defaultProfile(),
    leaderboard: [],
    badges: [],
    dailyHistory: [],
    campaign: defaultCampaign(),
    // A genuinely new player has not completed the first run yet (13D)
    // and has not been shown the three coach marks yet (13E).
    firstRunCompleted: false,
    coachMarksSeen: false,
    // A genuinely new player has not finished a Daily yet (13F).
    firstDailyResultSeen: false,
    // ...and has never confirmed spending a final ranked attempt (13G).
    attemptCostAcknowledged: false,
  };
}

/** Coerce an unknown into a finite, non-negative integer with a fallback. */
function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Deep-validate/merge a parsed blob against defaults so missing/corrupt fields
 *  never crash the app. Unknown shapes degrade gracefully to defaults.
 *
 *  `saveExisted` (Phase 13D) tells this function whether `parsed` came from a
 *  real stored save. It ONLY affects `firstRunCompleted`: an existing pre-13D
 *  save with no such field belongs to a player who is already onboarded, so it
 *  migrates to `true`; every other absent field keeps its usual default. */
function normalize(parsed: unknown, saveExisted = false): SaveData {
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
    bestDailyTokenRushScore: num(
      rawProfile.bestDailyTokenRushScore,
      dp.bestDailyTokenRushScore,
    ),
    // Phase 13-R2: absent on pre-R2 saves → 0, so a v2 best is never shown as
    // the active v3 best. Non-destructive: the v2 field is left untouched.
    bestDailyRulesV3Score: num(
      rawProfile.bestDailyRulesV3Score,
      dp.bestDailyRulesV3Score,
    ),
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
    bestSurvivalStageReached: num(
      rawProfile.bestSurvivalStageReached,
      dp.bestSurvivalStageReached,
    ),
    bestSurvivalStageName:
      typeof rawProfile.bestSurvivalStageName === "string"
        ? rawProfile.bestSurvivalStageName
        : dp.bestSurvivalStageName,
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
            // Pre-R2 entries carry no version: they are v2 runs by definition.
            rulesVersion: num(r.rulesVersion, 2),
          };
          return entry;
        })
        .filter((e) => e.date !== "")
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, DAILY_HISTORY_MAX)
    : [];

  const rawCampaign = (p.campaign as Record<string, unknown>) ?? {};
  const totalLevels = CAMPAIGN_LEVELS.length;
  const bestByLevel: Record<string, number> = {};
  const rawBest = (rawCampaign.bestScoreByLevel as Record<string, unknown>) ?? {};
  for (const [k, v] of Object.entries(rawBest)) bestByLevel[k] = num(v, 0);

  const completed = Array.isArray(rawCampaign.completed)
    ? (rawCampaign.completed.filter((n) => typeof n === "number") as number[])
    : [];

  const starsByLevel: Record<string, number> = {};
  const rawStars = (rawCampaign.starsByLevel as Record<string, unknown>) ?? {};
  for (const [k, v] of Object.entries(rawStars)) {
    starsByLevel[k] = Math.max(0, Math.min(3, num(v, 0)));
  }
  // Migration: a level completed before 9F-C counts as at least 1 star.
  for (const id of completed) {
    if (!(String(id) in starsByLevel)) starsByLevel[String(id)] = 1;
  }

  const campaign: CampaignProgress = {
    unlockedLevel: Math.min(
      totalLevels,
      Math.max(1, num(rawCampaign.unlockedLevel, 1)),
    ),
    completed,
    bestScoreByLevel: bestByLevel,
    starsByLevel,
  };

  // Phase 13D first-run gate. An explicit boolean always wins. When the field
  // is absent, the answer depends on whether this blob is a REAL existing save
  // (a pre-13D player who is already past onboarding → true) or a synthesized
  // default for a first-time player (→ false).
  const firstRunCompleted =
    typeof p.firstRunCompleted === "boolean" ? p.firstRunCompleted : saveExisted;

  // Phase 13E coach-mark gate. An explicit boolean always wins; otherwise the
  // flag INHERITS the answer above, so a legacy save never becomes eligible for
  // the tutorial cues while an explicitly-unfinished first run still is.
  const coachMarksSeen =
    typeof p.coachMarksSeen === "boolean" ? p.coachMarksSeen : firstRunCompleted;

  // Phase 13F first-Daily gate. An explicit boolean always wins; otherwise the
  // answer comes from the player's REAL Daily history, not from the existence of
  // a save — a 13D/13E player who finished Guided Training but never played a
  // Daily must still be eligible. Both inputs below are already normalized.
  const hasFinishedADailyBefore = profile.dailyRuns > 0 || dailyHistory.length > 0;
  const firstDailyResultSeen =
    typeof p.firstDailyResultSeen === "boolean"
      ? p.firstDailyResultSeen
      : hasFinishedADailyBefore;

  return {
    version: SAVE_VERSION,
    profile,
    leaderboard,
    badges,
    dailyHistory,
    campaign,
    firstRunCompleted,
    coachMarksSeen,
    firstDailyResultSeen,
    // Phase 13G: explicit boolean wins; absent means "never confirmed" for
    // every save, whatever its history (see the rule on SaveData).
    attemptCostAcknowledged: p.attemptCostAcknowledged === true,
  };
}

// ---- Low-level load/save -------------------------------------------------

function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      // A stored save exists → pre-13D blobs migrate to firstRunCompleted=true.
      return normalize(JSON.parse(raw), true);
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
        : mode === "campaign"
          ? XP_DIVISOR_CAMPAIGN
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

export function getCampaignProgress(): CampaignProgress {
  return loadSave().campaign;
}

/**
 * Phase 13D — has the player already been through (or skipped) the Guided
 * First Run? Side-effect free: reading this NEVER writes a save, so merely
 * booting the app cannot silently onboard-complete a first-time player.
 *
 * Returns true for every pre-13D save (see the migration rule on SaveData),
 * so existing players go straight Home exactly as they do today.
 */
export function isFirstRunCompleted(): boolean {
  return loadSave().firstRunCompleted;
}

/**
 * Phase 13D — mark the Guided First Run as done (finished OR skipped).
 * Idempotent, and preserves every other saved field: it round-trips the whole
 * normalized save and only flips this one flag.
 */
export function markFirstRunCompleted(): void {
  const save = loadSave();
  if (save.firstRunCompleted) return; // already done — no write, no churn
  save.firstRunCompleted = true;
  persist(save);
}

/**
 * Phase 13E — have the three in-run coach marks already been shown?
 * Side-effect free, exactly like `isFirstRunCompleted()`: reading it never
 * writes a save. Returns true for every pre-13E save (see the migration rule
 * on SaveData), so no existing player is ever taught the basics again.
 */
export function areCoachMarksSeen(): boolean {
  return loadSave().coachMarksSeen;
}

/**
 * Phase 13E — record that the coach-mark sequence was actually presented.
 *
 * Called only once the THIRD cue has finished being displayed, never when the
 * run merely starts: marking early would suppress cues the player never saw.
 * Idempotent, and preserves every other saved field — including
 * `firstRunCompleted`, which flips separately at the 60 s finish, so a player
 * who leaves in between gets the Guided First Run back without the lesson.
 */
export function markCoachMarksSeen(): void {
  const save = loadSave();
  if (save.coachMarksSeen) return; // already seen — no write, no churn
  save.coachMarksSeen = true;
  persist(save);
}

/**
 * Phase 13F — has the player already been through their first Daily?
 * Side-effect free, like the other two onboarding reads: merely booting the app
 * can never silently mark a player as taught.
 *
 * True for every save that already shows a finished Daily (see the migration
 * rule on SaveData), so an experienced player is never onboarded again.
 */
export function isFirstDailyResultSeen(): boolean {
  return loadSave().firstDailyResultSeen;
}

/**
 * Phase 13F — record that the first Daily has actually been COMPLETED.
 *
 * Called only once a real Daily result exists — never when the Daily intro
 * opens, when preparation starts, when an attempt is claimed, or when gameplay
 * begins. A player who enters Daily and cancels is still owed the lesson.
 *
 * Idempotent, and preserves every other saved field (progression, streak,
 * history, the 13D/13E flags).
 */
export function markFirstDailyResultSeen(): void {
  const save = loadSave();
  if (save.firstDailyResultSeen) return; // already seen — no write, no churn
  save.firstDailyResultSeen = true;
  persist(save);
}

/**
 * Phase 13G — has the player already confirmed spending a final ranked
 * attempt once? Side-effect free: reading never writes a save.
 */
export function isAttemptCostAcknowledged(): boolean {
  return loadSave().attemptCostAcknowledged;
}

/**
 * Phase 13G — record that the player explicitly accepted the last-attempt
 * confirmation. Called ONLY from the confirmation's accept action — never when
 * it merely appears, on Cancel, on Play locally, or when >1 or 0 attempts
 * remain. Idempotent, and preserves every other saved field.
 */
export function markAttemptCostAcknowledged(): void {
  const save = loadSave();
  if (save.attemptCostAcknowledged) return; // already acknowledged — no churn
  save.attemptCostAcknowledged = true;
  persist(save);
}

/** Total Campaign stars earned across all levels (0..24). */
export function getTotalCampaignStars(campaign: CampaignProgress): number {
  return Object.values(campaign.starsByLevel).reduce((a, b) => a + b, 0);
}

/** Unlock a badge by id (if the condition holds and it isn't owned yet). */
function unlockBadge(
  save: SaveData,
  out: Badge[],
  id: BadgeId,
  condition: boolean,
): void {
  if (!condition || save.badges.includes(id)) return;
  save.badges.push(id);
  const def = ALL_BADGES.find((b) => b.id === id);
  if (def) out.push({ id: def.id, name: def.name, description: def.description, icon: def.icon });
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
  else if (run.mode === "training") stats.trainingRuns += 1;
  // (campaign has its own progression below; no run counter needed)
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
    if (run.stageReached > stats.bestSurvivalStageReached) {
      stats.bestSurvivalStageReached = run.stageReached;
      stats.bestSurvivalStageName = run.stageName;
    }
  }

  // Campaign-only effects (local; never sent to the server).
  if (run.mode === "campaign") {
    const lvl = run.campaignLevelId;
    const key = String(lvl);
    const prevBest = save.campaign.bestScoreByLevel[key] ?? 0;
    if (run.score > prevBest) {
      save.campaign.bestScoreByLevel[key] = run.score;
      isNewBest = true;
    }
    // Stars (best kept) — 9F-C.
    const prevStars = save.campaign.starsByLevel[key] ?? 0;
    if (run.campaignStars > prevStars) {
      save.campaign.starsByLevel[key] = run.campaignStars;
    }
    if (run.campaignSuccess) {
      if (!save.campaign.completed.includes(lvl)) save.campaign.completed.push(lvl);
      save.campaign.unlockedLevel = Math.min(
        CAMPAIGN_LEVELS.length,
        Math.max(save.campaign.unlockedLevel, lvl + 1),
      );
    }
  }

  // Daily-only effects.
  if (run.mode === "daily") {
    // Each rules version tracks its OWN best so two rule sets are never
    // compared. Phase 13-R1 changed the collision model, so v3 (active) is kept
    // apart from v2 (Token Rush) exactly as v2 was kept apart from the legacy
    // v1 best. Existing values are never rewritten or relabelled.
    if (run.rulesVersion === DAILY_RULES_VERSION) {
      if (run.score > stats.bestDailyRulesV3Score) {
        stats.bestDailyRulesV3Score = run.score;
        isNewBest = true;
      }
    } else if (run.rulesVersion === 2) {
      if (run.score > stats.bestDailyTokenRushScore) {
        stats.bestDailyTokenRushScore = run.score;
        isNewBest = true;
      }
    } else if (run.score > stats.bestDailyScore) {
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

    // Daily Challenge history (per UTC day AND rules version): a v2 day and a
    // v3 day are separate entries, so a legacy best is never merged into the
    // active one on the day the version changes (Phase 13-R2).
    const today = dayString(now);
    const existing = save.dailyHistory.find(
      (e) => e.date === today && e.rulesVersion === run.rulesVersion,
    );
    if (existing) {
      existing.bestScore = Math.max(existing.bestScore, run.score);
      existing.runs += 1;
    } else {
      save.dailyHistory.unshift({
        date: today,
        bestScore: run.score,
        runs: 1,
        rulesVersion: run.rulesVersion,
      });
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

  // Campaign total-star badges (9F-E): based on starsByLevel, not stat predicates.
  if (run.mode === "campaign") {
    const totalStars = getTotalCampaignStars(save.campaign);
    unlockBadge(save, unlockedBadges, "campaign-collector", totalStars >= 10);
    unlockBadge(save, unlockedBadges, "campaign-master", totalStars >= 24);
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

/**
 * Align the local ranked-attempt mirror with the SERVER counter (Phase 11B-P4).
 * When connected, the server is authoritative: this overwrites the local `used`
 * for `date` with the server value (clamped), so clearing localStorage can never
 * hand back server-consumed attempts. Backward compatible; wipes nothing else.
 */
export function syncRankedAttemptsFromServer(
  date: string,
  used: number,
  max: number = MAX_RANKED_ATTEMPTS,
): void {
  const clampedUsed = Math.max(0, Math.min(max, Math.floor(used)));
  try {
    window.localStorage.setItem(
      RANKED_ATTEMPTS_KEY,
      JSON.stringify({ date, used: clampedUsed }),
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
