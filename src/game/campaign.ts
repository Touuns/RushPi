import type { BadgeId } from "../types";

/**
 * Campaign / Chain Journey (Phase 9F + 9F-C). A separate, LOCAL-ONLY progression
 * mode: discrete levels the player completes to unlock the next, now with a 1–3
 * star system for replayability. Reuses the Survival engine (lives, charge,
 * Shield/Magnet, Life Orbs). Each level has a fixed finish (target duration).
 * Never sent to the server.
 *
 * Stars: 1★ = reach the finish, 2★ = secondary objective, 3★ = mastery.
 * A level is "completed" (and unlocks the next) as soon as it earns 1★.
 */

/** Run stats used to evaluate star objectives. */
export interface StarRunStats {
  livesRemaining: number;
  energiesCollected: number;
  maxCombo: number;
  maxChargeLevel: number;
}

export interface StarObjective {
  label: string;
  /** Only evaluated when the finish was reached. */
  test: (run: StarRunStats) => boolean;
}

export interface CampaignLevel {
  id: number;
  name: string;
  /** Exactly 3 objectives: [1★, 2★, 3★]. The first is always "reach the finish". */
  stars: [StarObjective, StarObjective, StarObjective];
  targetDurationSecs: number;
  /** Zone ambiance (reused from the Survival biomes). */
  tint: number;
  tintAlpha: number;
  chevronMultiplier: number;
  driftMaxX: number;
  /** Background particle density multiplier (>1 livelier, <1 calmer). */
  bgBoost: number;
  badgeId: BadgeId;
}

const REACH: StarObjective = { label: "Reach the finish", test: () => true };

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    id: 1,
    name: "Genesis Lane",
    stars: [
      REACH,
      { label: "Collect 20 energies", test: (r) => r.energiesCollected >= 20 },
      { label: "Finish with 2 lives or more", test: (r) => r.livesRemaining >= 2 },
    ],
    targetDurationSecs: 45,
    tint: 0x8b5cf6,
    tintAlpha: 0.0,
    chevronMultiplier: 1.0,
    driftMaxX: 0,
    bgBoost: 1,
    badgeId: "clear-genesis",
  },
  {
    id: 2,
    name: "Orange Chain",
    stars: [
      REACH,
      { label: "Finish with at least 1 life", test: (r) => r.livesRemaining >= 1 },
      { label: "Finish with 2 lives or more", test: (r) => r.livesRemaining >= 2 },
    ],
    targetDurationSecs: 50,
    tint: 0xff7a3d,
    tintAlpha: 0.1,
    chevronMultiplier: 1.05,
    driftMaxX: 0.06,
    bgBoost: 1,
    badgeId: "clear-orange",
  },
  {
    id: 3,
    name: "Smart Layer",
    stars: [
      REACH,
      { label: "Collect 25 energies", test: (r) => r.energiesCollected >= 25 },
      { label: "Reach charge level 4+", test: (r) => r.maxChargeLevel >= 4 },
    ],
    targetDurationSecs: 55,
    tint: 0x38bdf8,
    tintAlpha: 0.1,
    chevronMultiplier: 1.1,
    driftMaxX: 0.06,
    bgBoost: 1,
    badgeId: "clear-smart",
  },
  {
    id: 4,
    name: "Neon Speednet",
    stars: [
      REACH,
      { label: "Reach a combo of 15+", test: (r) => r.maxCombo >= 15 },
      { label: "Finish with 2 lives or more", test: (r) => r.livesRemaining >= 2 },
    ],
    targetDurationSecs: 60,
    tint: 0x34d399,
    tintAlpha: 0.11,
    chevronMultiplier: 1.3,
    driftMaxX: 0.1,
    bgBoost: 1.1,
    badgeId: "clear-neon",
  },
  {
    id: 5,
    name: "Stable Grid",
    stars: [
      REACH,
      { label: "Finish with 2 lives or more", test: (r) => r.livesRemaining >= 2 },
      { label: "Finish with 3 lives", test: (r) => r.livesRemaining >= 3 },
    ],
    targetDurationSecs: 60,
    tint: 0xa7f3d0,
    tintAlpha: 0.09,
    chevronMultiplier: 1.0,
    driftMaxX: 0,
    bgBoost: 0.9,
    badgeId: "clear-stable",
  },
  {
    id: 6,
    name: "Meme Circuit",
    stars: [
      REACH,
      { label: "Collect 35 energies", test: (r) => r.energiesCollected >= 35 },
      { label: "Reach charge level 5+", test: (r) => r.maxChargeLevel >= 5 },
    ],
    targetDurationSecs: 65,
    tint: 0xff6ec7,
    tintAlpha: 0.11,
    chevronMultiplier: 1.15,
    driftMaxX: 0.08,
    bgBoost: 1.25,
    badgeId: "clear-meme",
  },
  {
    id: 7,
    name: "Privacy Tunnel",
    stars: [
      REACH,
      { label: "Finish with at least 1 life", test: (r) => r.livesRemaining >= 1 },
      { label: "Finish with 2 lives or more", test: (r) => r.livesRemaining >= 2 },
    ],
    targetDurationSecs: 70,
    tint: 0x3b2a6d,
    tintAlpha: 0.18,
    chevronMultiplier: 1.1,
    driftMaxX: 0.12,
    bgBoost: 0.85,
    badgeId: "clear-privacy",
  },
  {
    id: 8,
    name: "Chain Storm",
    stars: [
      REACH,
      { label: "Collect 40 energies", test: (r) => r.energiesCollected >= 40 },
      {
        label: "Finish with 2 lives+ and charge 5+",
        test: (r) => r.livesRemaining >= 2 && r.maxChargeLevel >= 5,
      },
    ],
    targetDurationSecs: 75,
    tint: 0xff4d6d,
    tintAlpha: 0.12,
    chevronMultiplier: 1.3,
    driftMaxX: 0.14,
    bgBoost: 1.3,
    badgeId: "clear-storm",
  },
];

export function getCampaignLevel(id: number): CampaignLevel | undefined {
  return CAMPAIGN_LEVELS.find((l) => l.id === id);
}

/** Stars earned this run (0 if the finish wasn't reached), 0..3. */
export function computeStars(
  level: CampaignLevel,
  run: StarRunStats,
  reachedFinish: boolean,
): number {
  if (!reachedFinish) return 0;
  return level.stars.reduce((n, s) => n + (s.test(run) ? 1 : 0), 0);
}
