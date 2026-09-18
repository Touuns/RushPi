import type { ServerSyncStatus } from "../App";

/**
 * Phase 13F — copy for the one-time meta lesson shown on the first completed
 * Daily result.
 *
 * Plain data/logic only (no JSX, no React, no Phaser) so it can be imported
 * both by `ResultScreen.tsx` and by tests without a DOM — the same convention
 * `modeGuidance.ts` (13A) and `coachMarks.ts` (13E) already established. The
 * type import is erased at runtime, so nothing pulls App.tsx in.
 *
 * The lesson teaches MEANING, not state: what the leaderboard is and what a
 * streak is. The surrounding result already shows the state itself (sync
 * status, attempts left, and the existing "come back tomorrow" streak line),
 * so this never repeats it.
 *
 * HONESTY CONTRACT: the copy is a pure function of the real `serverSync` value
 * and must never tell a player they are on the ranked leaderboard when the run
 * did not get there. Only "ok" means the score actually reached it.
 */
export interface DailyMetaLesson {
  title: string;
  text: string;
}

/** The one sentence every variant ends on — the streak lesson. */
const STREAK_LESSON = "Your streak grows on each day you play a Daily run.";

export function firstDailyLesson(serverSync: ServerSyncStatus): DailyMetaLesson {
  if (serverSync === "ok") {
    return {
      title: "You're on today's leaderboard",
      text: `Ranked Daily runs are scored against every other Pioneer today. ${STREAK_LESSON}`,
    };
  }
  if (serverSync === "pending") {
    return {
      title: "Sending your score",
      text: `Ranked Daily runs are scored against every other Pioneer today. ${STREAK_LESSON}`,
    };
  }
  // local-only / limit-reached / auth-required / failed-retryable / rejected /
  // conflict / idle — none of these put the score on the ranked leaderboard, so
  // the lesson must not imply otherwise.
  return {
    title: "This run stayed local",
    text: `Connect Pi before a Daily run to score against every other Pioneer on today's leaderboard. ${STREAK_LESSON}`,
  };
}

/** True only for the states where the score genuinely reached the leaderboard. */
export function claimsRankedPlacement(serverSync: ServerSyncStatus): boolean {
  return serverSync === "ok";
}
