/**
 * Deterministic daily challenge: same course for everyone, every UTC day.
 *
 * The Daily Run uses a seeded PRNG derived from the UTC date so all players get
 * the exact same sequence of lanes and obstacle/energy types. Training stays on
 * Math.random (see MainScene).
 */

/**
 * Mulberry32 PRNG seeded from a string. Returns a function producing floats in
 * [0, 1). Deterministic: same seed → same sequence on every device.
 */
export function createSeededRandom(seed: string): () => number {
  // Hash the string seed into a 32-bit integer (xfnv1a-ish).
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Current UTC calendar date as YYYY-MM-DD. */
export function getDailyDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Stable per-day seed, e.g. "RUSHPI-2026-06-30". */
export function getDailySeed(date: Date = new Date()): string {
  return `RUSHPI-${getDailyDate(date)}`;
}

/** Challenge identifier (same string as the seed for now). */
export function getDailyChallengeId(date: Date = new Date()): string {
  return getDailySeed(date);
}

/** Short human label for the UI, e.g. "Jun 30". */
export function getDailyChallengeLabel(date: Date = new Date()): string {
  return new Date(`${getDailyDate(date)}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
