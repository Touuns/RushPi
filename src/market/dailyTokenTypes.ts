/**
 * Daily Token Rush types (Phase 11B) — client mirror of the server manifest
 * built by api/_lib/dailyTokenChallenge.ts. The client NEVER selects tokens or
 * computes points; it only consumes this manifest.
 */

export interface DailyTokenSpec {
  order: number;
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  referencePriceUsd: number;
  marketCapRank: number | null;
  points: number;
  spawnTimeMs: number;
  lane: number;
}

export interface DailyTokenChallenge {
  challengeDate: string;
  challengeId: string;
  rulesVersion: 2;
  tokenChallengeVersion: 1;
  snapshotCreatedAt: string;
  providerUpdatedAt: string | null;
  status: "live" | "stale" | "fallback";
  rankedEligible: boolean;
  tokens: DailyTokenSpec[];
  totalTokenPointsPossible: number;
  attribution: string;
}
