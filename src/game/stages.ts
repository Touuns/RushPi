import type { BadgeId } from "../types";

/**
 * Survival stages (Phase 9D). The Survival run is a journey across blockchain-
 * inspired "networks" — evocative ambiances, NO official names/logos. Stages are
 * reached by SURVIVED TIME. Effects are cosmetic + very light (a colour tint and
 * a small chevron-speed factor); no new obstacles, no hitbox change, no unfair
 * difficulty spikes. Survival-only.
 */
export interface Stage {
  id: number; // 1..8
  name: string;
  startTimeMs: number;
  /** Dominant ambiance colour (subtle full-screen tint) + its alpha. */
  tint: number;
  tintAlpha: number;
  /** Small chevron-speed factor for a per-stage "feel" (visual only). */
  chevronMultiplier: number;
  badgeId: BadgeId;
}

export const STAGES: Stage[] = [
  {
    id: 1,
    name: "Genesis Lane",
    startTimeMs: 0,
    tint: 0x8b5cf6,
    tintAlpha: 0.0,
    chevronMultiplier: 1.0,
    badgeId: "stage-genesis",
  },
  {
    id: 2,
    name: "Orange Chain",
    startTimeMs: 45000,
    tint: 0xff7a3d,
    tintAlpha: 0.1,
    chevronMultiplier: 1.05,
    badgeId: "stage-orange",
  },
  {
    id: 3,
    name: "Smart Layer",
    startTimeMs: 90000,
    tint: 0x38bdf8,
    tintAlpha: 0.1,
    chevronMultiplier: 1.1,
    badgeId: "stage-smart",
  },
  {
    id: 4,
    name: "Neon Speednet",
    startTimeMs: 135000,
    tint: 0x34d399,
    tintAlpha: 0.11,
    chevronMultiplier: 1.3,
    badgeId: "stage-neon",
  },
  {
    id: 5,
    name: "Stable Grid",
    startTimeMs: 180000,
    tint: 0xa7f3d0,
    tintAlpha: 0.09,
    chevronMultiplier: 1.0,
    badgeId: "stage-stable",
  },
  {
    id: 6,
    name: "Meme Circuit",
    startTimeMs: 240000,
    tint: 0xff6ec7,
    tintAlpha: 0.11,
    chevronMultiplier: 1.15,
    badgeId: "stage-meme",
  },
  {
    id: 7,
    name: "Privacy Tunnel",
    startTimeMs: 300000,
    tint: 0x3b2a6d,
    tintAlpha: 0.18,
    chevronMultiplier: 1.1,
    badgeId: "stage-privacy",
  },
  {
    id: 8,
    name: "Chain Storm",
    startTimeMs: 360000,
    tint: 0xff4d6d,
    tintAlpha: 0.12,
    chevronMultiplier: 1.3,
    badgeId: "stage-storm",
  },
];

/** Index into STAGES for a given survived time. */
export function stageIndexForTime(elapsedMs: number): number {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (elapsedMs >= STAGES[i].startTimeMs) idx = i;
    else break;
  }
  return idx;
}
