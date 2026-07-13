import type { BadgeId } from "../types";

/**
 * Per-zone visual identity (Phase 10D-A). Purely decorative: colors for the
 * road/rails/halo, a background pattern type, particle palette and the zone
 * gate color. No hitbox, spawn, difficulty or objective data lives here.
 */
export type ZonePattern =
  | "rings"
  | "blocks"
  | "nodes"
  | "streaks"
  | "grid"
  | "confetti"
  | "tunnel"
  | "storm";

export interface ZoneVisual {
  roadColor: number;
  railColor: number;
  laneColor: number;
  railWidth: number;
  haloColor: number;
  haloCoreColor: number;
  gateColor: number;
  particleColors: number[];
  pattern: ZonePattern;
  /** 0..1 — how present the decorative pattern is. */
  patternIntensity: number;
}

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
  /** Track Drift amplitude as a fraction of screen width (0 = no drift). */
  driftMaxX: number;
  /** Visual-only obstacle scale factor (hitbox unchanged). */
  obstacleVisualScale: number;
  /** Background particle density multiplier (>1 = livelier). */
  bgBoost: number;
  /** Visual identity applied when the zone gate is crossed (Phase 10D-A). */
  visual: ZoneVisual;
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
    driftMaxX: 0,
    obstacleVisualScale: 1,
    bgBoost: 1,
    visual: {
      roadColor: 0x8b5cf6,
      railColor: 0xffd166,
      laneColor: 0x8b5cf6,
      railWidth: 4,
      haloColor: 0xffd166,
      haloCoreColor: 0xff7a3d,
      gateColor: 0xffd166,
      particleColors: [0x8b5cf6, 0xffd166, 0xff7a3d],
      pattern: "rings",
      patternIntensity: 0.5,
    },
    badgeId: "stage-genesis",
  },
  {
    id: 2,
    name: "Orange Chain",
    startTimeMs: 45000,
    tint: 0xff7a3d,
    tintAlpha: 0.1,
    chevronMultiplier: 1.05,
    driftMaxX: 0.06,
    obstacleVisualScale: 1.15,
    bgBoost: 1,
    visual: {
      roadColor: 0xff7a3d,
      railColor: 0xffb347,
      laneColor: 0xb45309,
      railWidth: 6,
      haloColor: 0xffb347,
      haloCoreColor: 0xff7a3d,
      gateColor: 0xff7a3d,
      particleColors: [0xff7a3d, 0xffd166, 0xb45309],
      pattern: "blocks",
      patternIntensity: 0.7,
    },
    badgeId: "stage-orange",
  },
  {
    id: 3,
    name: "Smart Layer",
    startTimeMs: 90000,
    tint: 0x38bdf8,
    tintAlpha: 0.1,
    chevronMultiplier: 1.1,
    driftMaxX: 0.06,
    obstacleVisualScale: 1,
    bgBoost: 1,
    visual: {
      roadColor: 0x3b82f6,
      railColor: 0x38bdf8,
      laneColor: 0x60a5fa,
      railWidth: 4,
      haloColor: 0x38bdf8,
      haloCoreColor: 0x818cf8,
      gateColor: 0x38bdf8,
      particleColors: [0x38bdf8, 0x60a5fa, 0xa78bfa],
      pattern: "nodes",
      patternIntensity: 0.7,
    },
    badgeId: "stage-smart",
  },
  {
    id: 4,
    name: "Neon Speednet",
    startTimeMs: 135000,
    tint: 0x34d399,
    tintAlpha: 0.11,
    chevronMultiplier: 1.3,
    driftMaxX: 0.1,
    obstacleVisualScale: 1,
    bgBoost: 1.1,
    visual: {
      roadColor: 0x10b981,
      railColor: 0x34d399,
      laneColor: 0x2dd4bf,
      railWidth: 4,
      haloColor: 0x34d399,
      haloCoreColor: 0x22d3ee,
      gateColor: 0x34d399,
      particleColors: [0x34d399, 0x22d3ee, 0xa78bfa],
      pattern: "streaks",
      patternIntensity: 0.9,
    },
    badgeId: "stage-neon",
  },
  {
    id: 5,
    name: "Stable Grid",
    startTimeMs: 180000,
    tint: 0xa7f3d0,
    tintAlpha: 0.09,
    chevronMultiplier: 1.0,
    driftMaxX: 0,
    obstacleVisualScale: 1,
    bgBoost: 0.9,
    visual: {
      roadColor: 0x6ee7b7,
      railColor: 0xa7f3d0,
      laneColor: 0xd1fae5,
      railWidth: 3,
      haloColor: 0xa7f3d0,
      haloCoreColor: 0xffd166,
      gateColor: 0xa7f3d0,
      particleColors: [0xa7f3d0, 0xffffff, 0xffd166],
      pattern: "grid",
      patternIntensity: 0.5,
    },
    badgeId: "stage-stable",
  },
  {
    id: 6,
    name: "Meme Circuit",
    startTimeMs: 240000,
    tint: 0xff6ec7,
    tintAlpha: 0.11,
    chevronMultiplier: 1.15,
    driftMaxX: 0.08,
    obstacleVisualScale: 1,
    bgBoost: 1.25,
    visual: {
      roadColor: 0xff6ec7,
      railColor: 0xffd166,
      laneColor: 0xf472b6,
      railWidth: 4,
      haloColor: 0xff6ec7,
      haloCoreColor: 0xffd166,
      gateColor: 0xff6ec7,
      particleColors: [0xff6ec7, 0xffd166, 0xff7a3d],
      pattern: "confetti",
      patternIntensity: 0.9,
    },
    badgeId: "stage-meme",
  },
  {
    id: 7,
    name: "Privacy Tunnel",
    startTimeMs: 300000,
    tint: 0x3b2a6d,
    tintAlpha: 0.18,
    chevronMultiplier: 1.1,
    driftMaxX: 0.12,
    obstacleVisualScale: 1,
    bgBoost: 0.85,
    visual: {
      roadColor: 0x3b2a6d,
      railColor: 0x7c3aed,
      laneColor: 0x4c1d95,
      railWidth: 4,
      haloColor: 0x6d28d9,
      haloCoreColor: 0x312e81,
      gateColor: 0x7c3aed,
      particleColors: [0x6d28d9, 0x1e3a8a, 0x4c1d95],
      pattern: "tunnel",
      patternIntensity: 0.8,
    },
    badgeId: "stage-privacy",
  },
  {
    id: 8,
    name: "Chain Storm",
    startTimeMs: 360000,
    tint: 0xff4d6d,
    tintAlpha: 0.12,
    chevronMultiplier: 1.3,
    driftMaxX: 0.14,
    obstacleVisualScale: 1.1,
    bgBoost: 1.3,
    visual: {
      roadColor: 0xef4444,
      railColor: 0xff4d6d,
      laneColor: 0xa78bfa,
      railWidth: 5,
      haloColor: 0xff4d6d,
      haloCoreColor: 0xffd166,
      gateColor: 0xff4d6d,
      particleColors: [0xa78bfa, 0xffd166, 0xff4d6d, 0x22d3ee],
      pattern: "storm",
      patternIntensity: 1,
    },
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
