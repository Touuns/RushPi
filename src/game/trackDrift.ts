import { DRIFT } from "./theme";

/**
 * Track Drift controller (Phase 9E, Survival only). Produces a smooth horizontal
 * offset (px) for the track's vanishing point so the road appears to lean/turn.
 * PURELY VISUAL — the scene never uses this for collisions.
 *
 * Cycle: rest at centre → ease to one side, hold → ease back, pause → other side…
 * Direction alternates (deterministic). No drift before DRIFT.firstDriftMs, and
 * amplitude 0 (calm stages) keeps it perfectly centred.
 */
export class TrackDrift {
  private driftX = 0;
  private targetX = 0;
  private nextChangeMs = DRIFT.firstDriftMs;
  private dir = 1;

  reset(): void {
    this.driftX = 0;
    this.targetX = 0;
    this.nextChangeMs = DRIFT.firstDriftMs;
    this.dir = 1;
  }

  /** Advance and return the current drift offset in px. */
  update(elapsedMs: number, deltaMs: number, amplitudePx: number): number {
    if (amplitudePx <= 0) {
      this.targetX = 0;
    } else if (elapsedMs >= this.nextChangeMs) {
      if (this.targetX === 0) {
        this.dir = -this.dir; // alternate sides each drift
        this.targetX = this.dir * amplitudePx;
        this.nextChangeMs = elapsedMs + DRIFT.holdMs;
      } else {
        this.targetX = 0;
        this.nextChangeMs = elapsedMs + DRIFT.pauseMs;
      }
    }
    // Ease the actual offset toward the target (smooth, never brutal).
    const k = Math.min(1, deltaMs / DRIFT.easeMs);
    this.driftX += (this.targetX - this.driftX) * k;
    return this.driftX;
  }
}
