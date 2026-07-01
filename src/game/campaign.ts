import type { BadgeId } from "../types";

/**
 * Campaign / Chain Journey (Phase 9F). A separate, LOCAL-ONLY progression mode:
 * discrete levels the player completes to unlock the next. Reuses the Survival
 * engine (lives, charge, Shield/Magnet, Life Orbs) but each level has a fixed
 * finish (target duration) and an objective. Never sent to the server.
 */
export type CampaignObjective =
  | { kind: "reach"; label: string }
  | { kind: "lives"; value: number; label: string }
  | { kind: "collect"; value: number; label: string };

export interface CampaignLevel {
  id: number;
  name: string;
  objective: CampaignObjective;
  targetDurationSecs: number;
  /** Zone ambiance (reused from the Survival biomes). */
  tint: number;
  tintAlpha: number;
  chevronMultiplier: number;
  driftMaxX: number;
  badgeId: BadgeId;
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    id: 1,
    name: "Genesis Lane",
    objective: { kind: "reach", label: "Reach the finish" },
    targetDurationSecs: 45,
    tint: 0x8b5cf6,
    tintAlpha: 0.0,
    chevronMultiplier: 1.0,
    driftMaxX: 0,
    badgeId: "clear-genesis",
  },
  {
    id: 2,
    name: "Orange Chain",
    objective: { kind: "lives", value: 1, label: "Finish with at least 1 life" },
    targetDurationSecs: 50,
    tint: 0xff7a3d,
    tintAlpha: 0.1,
    chevronMultiplier: 1.05,
    driftMaxX: 0.06,
    badgeId: "clear-orange",
  },
  {
    id: 3,
    name: "Smart Layer",
    objective: { kind: "collect", value: 25, label: "Collect 25 energies and finish" },
    targetDurationSecs: 55,
    tint: 0x38bdf8,
    tintAlpha: 0.1,
    chevronMultiplier: 1.1,
    driftMaxX: 0.06,
    badgeId: "clear-smart",
  },
  {
    id: 4,
    name: "Neon Speednet",
    objective: { kind: "reach", label: "Reach the finish" },
    targetDurationSecs: 60,
    tint: 0x34d399,
    tintAlpha: 0.11,
    chevronMultiplier: 1.3,
    driftMaxX: 0.1,
    badgeId: "clear-neon",
  },
  {
    id: 5,
    name: "Stable Grid",
    objective: { kind: "lives", value: 2, label: "Finish with 2 lives or more" },
    targetDurationSecs: 60,
    tint: 0xa7f3d0,
    tintAlpha: 0.09,
    chevronMultiplier: 1.0,
    driftMaxX: 0,
    badgeId: "clear-stable",
  },
];

export function getCampaignLevel(id: number): CampaignLevel | undefined {
  return CAMPAIGN_LEVELS.find((l) => l.id === id);
}

/** Whether the objective is satisfied given the finished run's stats. */
export function objectiveMet(
  objective: CampaignObjective,
  run: { livesRemaining: number; energiesCollected: number },
): boolean {
  switch (objective.kind) {
    case "reach":
      return true;
    case "lives":
      return run.livesRemaining >= objective.value;
    case "collect":
      return run.energiesCollected >= objective.value;
  }
}
