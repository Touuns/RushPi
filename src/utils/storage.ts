/**
 * Typed localStorage wrapper for Rush Pi.
 *
 * Phase 1 only needs the local best score (Daily). The API is kept tiny and
 * defensive (try/catch around storage access) so it works in private-mode
 * browsers and inside embedded webviews like Pi Browser.
 */

import type { GameMode } from "../types";

const KEYS = {
  bestScore: "rushpi.bestScore",
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) — fail silently */
  }
}

/** Read the local best score (0 if none yet). */
export function getBestScore(): number {
  const raw = safeGet(KEYS.bestScore);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Submit a finished run's score. Training scores are intentionally NOT persisted
 * (matching the design: "Training scores are not ranked"). Returns whether the
 * score became the new local best.
 */
export function submitScore(score: number, mode: GameMode): boolean {
  if (mode !== "daily") return false;
  const best = getBestScore();
  if (score > best) {
    safeSet(KEYS.bestScore, String(score));
    return true;
  }
  return false;
}
