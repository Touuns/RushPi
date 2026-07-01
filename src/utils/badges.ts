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
  {
    id: "charged-up",
    name: "Charged Up",
    description: "Reach charge level 3 in Survival",
    icon: "⚡",
    check: (s) => s.highestChargeLevelReached >= 3,
  },
  {
    id: "overcharged",
    name: "Overcharged",
    description: "Reach charge level 6 in Survival",
    icon: "🔆",
    check: (s) => s.highestChargeLevelReached >= 6,
  },
  {
    id: "second-chance",
    name: "Second Chance",
    description: "Absorb a hit at max charge",
    icon: "♻️",
    check: (s) => s.chargeAbsorbs >= 1,
  },
  {
    id: "life-saver",
    name: "Life Saver",
    description: "Recover a life in Survival",
    icon: "💚",
    check: (s) => s.livesRecovered >= 1,
  },
  {
    id: "survivor-growth",
    name: "Survivor Growth",
    description: "Survive 2 minutes with charge level 4+",
    icon: "🌱",
    check: (_s, run) =>
      run.mode === "survival" &&
      run.timeSurvivedSecs >= 120 &&
      run.highestChargeLevel >= 4,
  },

  // Survival stage-reached badges (Phase 9D). Unlocked by best stage reached.
  {
    id: "stage-genesis",
    name: "Genesis Runner",
    description: "Reach Genesis Lane (Survival)",
    icon: "🟣",
    check: (s) => s.bestSurvivalStageReached >= 1,
  },
  {
    id: "stage-orange",
    name: "Orange Chain Runner",
    description: "Reach Orange Chain (Survival)",
    icon: "🟠",
    check: (s) => s.bestSurvivalStageReached >= 2,
  },
  {
    id: "stage-smart",
    name: "Smart Layer Runner",
    description: "Reach Smart Layer (Survival)",
    icon: "🔷",
    check: (s) => s.bestSurvivalStageReached >= 3,
  },
  {
    id: "stage-neon",
    name: "Neon Speedster",
    description: "Reach Neon Speednet (Survival)",
    icon: "🟢",
    check: (s) => s.bestSurvivalStageReached >= 4,
  },
  {
    id: "stage-stable",
    name: "Stable Grid Survivor",
    description: "Reach Stable Grid (Survival)",
    icon: "⬜",
    check: (s) => s.bestSurvivalStageReached >= 5,
  },
  {
    id: "stage-meme",
    name: "Meme Circuit Rider",
    description: "Reach Meme Circuit (Survival)",
    icon: "🟡",
    check: (s) => s.bestSurvivalStageReached >= 6,
  },
  {
    id: "stage-privacy",
    name: "Privacy Tunnel Runner",
    description: "Reach Privacy Tunnel (Survival)",
    icon: "🟪",
    check: (s) => s.bestSurvivalStageReached >= 7,
  },
  {
    id: "stage-storm",
    name: "Chain Storm Survivor",
    description: "Reach Chain Storm (Survival)",
    icon: "🌩️",
    check: (s) => s.bestSurvivalStageReached >= 8,
  },

  // Campaign level-clear badges (Phase 9F). Unlocked on the clearing run.
  {
    id: "clear-genesis",
    name: "Genesis Clear",
    description: "Complete Campaign Level 1",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 1,
  },
  {
    id: "clear-orange",
    name: "Orange Chain Clear",
    description: "Complete Campaign Level 2",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 2,
  },
  {
    id: "clear-smart",
    name: "Smart Layer Clear",
    description: "Complete Campaign Level 3",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 3,
  },
  {
    id: "clear-neon",
    name: "Neon Speednet Clear",
    description: "Complete Campaign Level 4",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 4,
  },
  {
    id: "clear-stable",
    name: "Stable Grid Clear",
    description: "Complete Campaign Level 5",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 5,
  },
  {
    id: "clear-meme",
    name: "Meme Circuit Clear",
    description: "Complete Campaign Level 6",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 6,
  },
  {
    id: "clear-privacy",
    name: "Privacy Tunnel Clear",
    description: "Complete Campaign Level 7",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 7,
  },
  {
    id: "clear-storm",
    name: "Chain Storm Clear",
    description: "Complete Campaign Level 8",
    icon: "🥇",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 8,
  },
  {
    id: "season-1-complete",
    name: "Season 1 Complete",
    description: "Complete the Chain Journey (Level 8)",
    icon: "🏆",
    check: (_s, run) => run.mode === "campaign" && run.campaignSuccess && run.campaignLevelId === 8,
  },
  {
    id: "first-3-star",
    name: "First 3-Star",
    description: "Earn 3 stars on any Campaign level",
    icon: "🌟",
    check: (_s, run) => run.mode === "campaign" && run.campaignStars >= 3,
  },
  {
    id: "perfect-genesis",
    name: "Perfect Genesis",
    description: "Earn 3 stars on Level 1",
    icon: "✨",
    check: (_s, run) =>
      run.mode === "campaign" && run.campaignLevelId === 1 && run.campaignStars >= 3,
  },
  // Total-star badges (Phase 9F-E). Based on campaign.starsByLevel, which the
  // (stats, run) predicate can't see — unlocked manually in recordRun. The
  // always-false check keeps the generic loop from touching them.
  {
    id: "campaign-collector",
    name: "Campaign Collector",
    description: "Collect 10 Campaign stars in total",
    icon: "⭐",
    check: () => false,
  },
  {
    id: "campaign-master",
    name: "Campaign Master",
    description: "Collect all 24 Campaign stars",
    icon: "👑",
    check: () => false,
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
