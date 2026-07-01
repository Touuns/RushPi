/**
 * Badge definitions and unlock rules for Rush Pi (local, Phase 2).
 *
 * Each badge has a `check` predicate evaluated against the UPDATED cumulative
 * stats (after a run is recorded) plus the just-finished run. storage.recordRun()
 * uses these to detect newly unlocked badges. Keeping the rules here (not in the
 * scene or storage) makes them easy to extend without touching gameplay.
 */

import type { Badge, BadgeId, GameResult, ProfileStats } from "../types";

interface BadgeDef extends Badge {
  /** True when the badge's condition is met given current stats + this run. */
  check: (stats: ProfileStats, run: GameResult) => boolean;
}

export const ALL_BADGES: BadgeDef[] = [
  {
    id: "first-run",
    name: "First Run",
    description: "Finish your first game",
    icon: "🏁",
    check: (s) => s.dailyRuns + s.trainingRuns >= 1,
  },
  {
    id: "daily-challenger",
    name: "Daily Challenger",
    description: "Play a Daily Run",
    icon: "📅",
    check: (s) => s.dailyRuns >= 1,
  },
  {
    id: "training-starter",
    name: "Training Starter",
    description: "Play a Training run",
    icon: "🎯",
    check: (s) => s.trainingRuns >= 1,
  },
  {
    id: "combo-starter",
    name: "Combo Starter",
    description: "Reach an x10 combo",
    icon: "⚡",
    check: (s) => s.bestCombo >= 10,
  },
  {
    id: "combo-master",
    name: "Combo Master",
    description: "Reach an x25 combo",
    icon: "🔥",
    check: (s) => s.bestCombo >= 25,
  },
  {
    id: "energy-collector",
    name: "Energy Collector",
    description: "Collect 100 energies total",
    icon: "💠",
    check: (s) => s.totalEnergies >= 100,
  },
  {
    id: "rising-pioneer",
    name: "Rising Pioneer",
    description: "Reach level 3",
    icon: "🚀",
    check: (s) => s.level >= 3,
  },
  {
    id: "obstacle-survivor",
    name: "Obstacle Survivor",
    description: "Finish a run with 3 hits or fewer",
    icon: "🛡️",
    check: (_s, run) => run.obstaclesHit <= 3,
  },
  {
    id: "pi-supporter",
    name: "Pi Supporter",
    description: "Completed the Pi test payment",
    icon: "π",
    // Unlocked via storage.markPiTestPaymentCompleted(), not by gameplay.
    // The predicate keeps it consistent if re-evaluated after a run.
    check: (s) => s.piTestPaymentCompleted === true,
  },
  {
    id: "streak-3",
    name: "3-Day Streak",
    description: "Play the Daily Run 3 days in a row",
    icon: "🔥",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    name: "7-Day Streak",
    description: "Play the Daily Run 7 days in a row",
    icon: "🔥",
    check: (s) => s.streak >= 7,
  },
  {
    id: "streak-14",
    name: "14-Day Streak",
    description: "Play the Daily Run 14 days in a row",
    icon: "🌟",
    check: (s) => s.streak >= 14,
  },
  {
    id: "streak-30",
    name: "30-Day Streak",
    description: "Play the Daily Run 30 days in a row",
    icon: "👑",
    check: (s) => s.streak >= 30,
  },
  {
    id: "survivor-starter",
    name: "Survivor Starter",
    description: "Play a Survival run",
    icon: "🕹️",
    check: (s) => s.survivalRuns >= 1,
  },
  {
    id: "long-runner",
    name: "Long Runner",
    description: "Survive 2 minutes",
    icon: "🏃",
    check: (s) => s.bestSurvivalTimeSecs >= 120,
  },
  {
    id: "survival-pro",
    name: "Survival Pro",
    description: "Survive 5 minutes",
    icon: "🛰️",
    check: (s) => s.bestSurvivalTimeSecs >= 300,
  },
  {
    id: "last-heart-hero",
    name: "Last Heart Hero",
    description: "Survive 60s and finish with 1 life",
    icon: "💗",
    check: (_s, run) =>
      run.mode === "survival" && run.timeSurvivedSecs >= 60 && run.livesRemaining === 1,
  },
];

const BADGE_BY_ID = new Map<BadgeId, Badge>(
  ALL_BADGES.map((b) => [
    b.id,
    { id: b.id, name: b.name, description: b.description, icon: b.icon },
  ]),
);

/** Look up a badge's display metadata by id (without the predicate). */
export function badgeById(id: BadgeId): Badge | undefined {
  return BADGE_BY_ID.get(id);
}
