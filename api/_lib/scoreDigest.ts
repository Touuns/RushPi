import { createHash } from "node:crypto";

/**
 * Canonical score digest (Phase 11B-P4, Bloc 13).
 *
 * A stable SHA-256 over the normalized, server-verified run facts. It lets the
 * server detect idempotent replays (same run → same digest → no second row) and
 * conflicts (same submissionId, different run → different digest → reject). It
 * deliberately EXCLUDES the access token, username, any timestamp, URL, or UI
 * data. Token ids are sorted lexically so collection order never changes it.
 */
export interface ScoreDigestInput {
  submissionId: string;
  uid: string;
  challengeId: string;
  challengeDate: string;
  rulesVersion: number;
  tokenChallengeVersion: number;
  score: number;
  energyCollected: number;
  maxCombo: number;
  obstaclesHit: number;
  durationSeconds: number;
  tokenPoints: number;
  tokensCollectedCount: number;
  tokenIds: string[];
}

export function computeScoreDigest(input: ScoreDigestInput): string {
  const sortedIds = [...input.tokenIds].sort();
  const parts = [
    input.submissionId,
    input.uid,
    input.challengeId,
    input.challengeDate,
    String(input.rulesVersion),
    String(input.tokenChallengeVersion),
    String(input.score),
    String(input.energyCollected),
    String(input.maxCombo),
    String(input.obstaclesHit),
    String(input.durationSeconds),
    String(input.tokenPoints),
    String(input.tokensCollectedCount),
    sortedIds.join(","),
  ];
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}
