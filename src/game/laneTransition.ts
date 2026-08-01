/**
 * Authoritative horizontal player position (Phase 13-R1).
 *
 * Before this phase the logical lane (`MainScene.currentLane`) flipped to the
 * destination the instant a movement began, while the orb needed the full
 * lane-change duration to travel there. Collisions read the logical lane, so for
 * ~110 ms the collision position and the visible position disagreed by up to a
 * full lane width (measured: 138 px). That produced hits in the destination lane
 * before the orb had visibly arrived, and immunity in the origin lane before it
 * had visibly left.
 *
 * This module owns ONE deterministic horizontal position. MainScene renders from
 * it and collides against it — there is no second timing system. Everything here
 * is pure: no Phaser import, no DOM, no wall-clock time. Progress is advanced by
 * the caller with the scene's own frame delta, so behaviour is frame-rate
 * independent and fully reproducible in tests.
 *
 * The module deliberately knows nothing about lanes-as-indices: it works in
 * pixels only. Lane bookkeeping stays in MainScene.
 */

/**
 * Live transition state. `x` is the single authoritative horizontal position —
 * both the rendered orb and every collision test must read this value.
 */
export interface LaneTransitionState {
  /** Authoritative horizontal position, in logical game px. */
  x: number;
  /** Where the current transition started (the visible position at the time). */
  fromX: number;
  /** Where the current transition ends (the destination lane centre). */
  toX: number;
  /** Game-time elapsed inside the current transition, in ms. */
  elapsedMs: number;
  /** Total duration of the current transition, in ms. */
  durationMs: number;
  /** False when the player is settled on a lane centre. */
  active: boolean;
}

/**
 * Quadratic ease-out, identical to Phaser's `Math.Easing.Quadratic.Out`
 * (`v * (2 - v)`). Reimplemented locally so this module stays Phaser-free and
 * unit-testable in plain Node — the movement easing is unchanged by Phase 13-R1.
 */
export function quadraticEaseOut(t: number): number {
  return t * (2 - t);
}

/** A settled state at `x` (no transition in flight). */
export function createLaneTransition(x: number): LaneTransitionState {
  return { x, fromX: x, toX: x, elapsedMs: 0, durationMs: 0, active: false };
}

/**
 * Hard-reset to a settled position. Used on scene start/restart so no transition
 * state ever survives a replay.
 */
export function resetLaneTransition(state: LaneTransitionState, x: number): void {
  state.x = x;
  state.fromX = x;
  state.toX = x;
  state.elapsedMs = 0;
  state.durationMs = 0;
  state.active = false;
}

/**
 * Begin a transition to `targetX`, starting from the position the player
 * currently OCCUPIES (never from a lane centre) — so a reversal mid-flight never
 * snaps, and collisions stay continuous.
 *
 * Duration is proportional to the distance actually travelled, at the constant
 * speed implied by `laneDurationMs` per `laneWidthPx`. A normal single-lane
 * change therefore keeps exactly its previous duration; a reversal from halfway
 * takes half as long instead of crawling, and a two-lane slide takes twice as
 * long instead of teleporting. Movement speed and easing are unchanged.
 */
export function startLaneTransition(
  state: LaneTransitionState,
  targetX: number,
  laneWidthPx: number,
  laneDurationMs: number,
): void {
  const distance = Math.abs(targetX - state.x);
  // Already exactly there: settle rather than start a zero-length transition
  // (which would divide by zero on the next advance).
  if (distance === 0 || laneWidthPx <= 0 || laneDurationMs <= 0) {
    resetLaneTransition(state, targetX);
    return;
  }
  state.fromX = state.x;
  state.toX = targetX;
  state.elapsedMs = 0;
  state.durationMs = (laneDurationMs * distance) / laneWidthPx;
  state.active = true;
}

/**
 * Advance the transition by one frame of game time and return the new
 * authoritative position. Clamps at the destination, so a very large delta
 * completes the move exactly without ever overshooting. A non-positive delta is
 * a no-op (never rewinds).
 */
export function advanceLaneTransition(
  state: LaneTransitionState,
  deltaMs: number,
): number {
  if (!state.active || !(deltaMs > 0)) return state.x;
  state.elapsedMs += deltaMs;
  if (state.elapsedMs >= state.durationMs) {
    // Land on the exact destination — no accumulated float drift.
    state.x = state.toX;
    state.elapsedMs = state.durationMs;
    state.active = false;
    return state.x;
  }
  const t = state.elapsedMs / state.durationMs;
  state.x = state.fromX + (state.toX - state.fromX) * quadraticEaseOut(t);
  return state.x;
}

/**
 * Horizontal overlap between the player and a gameplay object, both given as
 * centre positions in logical game px.
 *
 * `threshold` is the existing sum of radii (player + object) already used for the
 * vertical test, so a settled player behaves EXACTLY as before: distance 0 to its
 * own lane always overlaps, and an adjacent lane centre (a full lane width away)
 * never does. Mid-transition the player legitimately overlaps neither lane while
 * the two discs are further apart than the sum of their radii.
 */
export function horizontallyOverlaps(
  playerX: number,
  objectX: number,
  threshold: number,
): boolean {
  return Math.abs(playerX - objectX) <= threshold;
}

/**
 * Index of the lane whose centre is nearest the authoritative position. While
 * settled this is exactly the occupied lane; mid-transition it tracks the side
 * the orb is visibly on. Used only for lane-PROXIMITY rules (the Magnet's
 * `laneReach`), whose generosity is unchanged — it simply follows the visible
 * position now instead of the destination lane. Ties resolve to the lower index.
 */
export function nearestLaneIndex(playerX: number, laneX: readonly number[]): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < laneX.length; i++) {
    const distance = Math.abs(playerX - laneX[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
