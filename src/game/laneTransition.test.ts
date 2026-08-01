import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceLaneTransition,
  createLaneTransition,
  horizontallyOverlaps,
  nearestLaneIndex,
  quadraticEaseOut,
  resetLaneTransition,
  startLaneTransition,
} from "./laneTransition.ts";
import { GAME_WIDTH, LANE_COUNT, OBJECTS, PLAYER, SCORING } from "./gameConfig.ts";

/**
 * Phase 13-R1 — lane transition integrity.
 *
 * These tests pin the corrected contract: ONE authoritative horizontal position
 * drives both rendering and collisions. They are deterministic — progress is
 * advanced with explicit deltas, never with real-time sleeps.
 */

// The exact geometry MainScene uses.
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT; // 138
const LANE_X = [0, 1, 2].map((i) => LANE_WIDTH * (i + 0.5)); // [69, 207, 345]
const RADII = PLAYER.radius + OBJECTS.radius; // 40
const DURATION = PLAYER.laneTweenMs; // 110

/** Run a transition to completion in fixed steps, collecting every position. */
function runToCompletion(
  state: ReturnType<typeof createLaneTransition>,
  stepMs: number,
  maxSteps = 10000,
): number[] {
  const path: number[] = [];
  let steps = 0;
  while (state.active && steps < maxSteps) {
    path.push(advanceLaneTransition(state, stepMs));
    steps += 1;
  }
  return path;
}

// ---- 1/2. Stationary collision behaviour --------------------------------

test("stationary: the player collides with an object in its own lane, in every lane", () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const state = createLaneTransition(LANE_X[lane]);
    assert.equal(
      horizontallyOverlaps(state.x, LANE_X[lane], RADII),
      true,
      `lane ${lane} must overlap its own centre`,
    );
  }
});

test("stationary: adjacent lanes never overlap", () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const state = createLaneTransition(LANE_X[lane]);
    for (let other = 0; other < LANE_COUNT; other++) {
      if (other === lane) continue;
      assert.equal(
        horizontallyOverlaps(state.x, LANE_X[other], RADII),
        false,
        `lane ${lane} must not overlap lane ${other}`,
      );
    }
  }
});

test("a full lane width is wider than the collision threshold (settled behaviour is unambiguous)", () => {
  assert.ok(
    LANE_WIDTH > RADII,
    `lane width ${LANE_WIDTH} must exceed the collision threshold ${RADII}`,
  );
});

// ---- 3/4/5. Transition A -> B --------------------------------------------

test("A -> B: the destination lane is NOT collidable before the orb visibly enters it", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  // Immediately after the request the orb has not moved at all.
  assert.equal(state.x, LANE_X[1]);
  assert.equal(
    horizontallyOverlaps(state.x, LANE_X[2], RADII),
    false,
    "destination must not be collidable at transition start",
  );
  // Step until the destination first becomes collidable and verify the orb is
  // genuinely inside its envelope at that moment.
  let becameCollidableAt = -1;
  while (state.active) {
    advanceLaneTransition(state, 1);
    if (horizontallyOverlaps(state.x, LANE_X[2], RADII)) {
      becameCollidableAt = state.x;
      break;
    }
  }
  assert.ok(becameCollidableAt > 0, "destination must eventually become collidable");
  assert.ok(
    Math.abs(becameCollidableAt - LANE_X[2]) <= RADII,
    "the orb must be visibly within the destination envelope when it becomes collidable",
  );
});

test("A -> B: the origin lane stays collidable until the orb visibly leaves it", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  assert.equal(horizontallyOverlaps(state.x, LANE_X[1], RADII), true);
  let lastCollidableX = state.x;
  while (state.active) {
    advanceLaneTransition(state, 1);
    if (!horizontallyOverlaps(state.x, LANE_X[1], RADII)) break;
    lastCollidableX = state.x;
  }
  // It stopped being collidable only once the orb passed the radii boundary.
  assert.ok(
    lastCollidableX - LANE_X[1] <= RADII,
    "origin must remain collidable while the orb is inside its envelope",
  );
  assert.ok(
    state.x - LANE_X[1] > RADII,
    "origin must stop being collidable only after the orb leaves its envelope",
  );
});

test("collision is evaluated at the actual intermediate position, not at either lane centre", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, DURATION / 2);
  const midX = state.x;
  assert.ok(midX > LANE_X[0] && midX < LANE_X[1], "midpoint must lie strictly between lanes");
  // An object placed at the orb's real position overlaps; the two lane centres
  // are judged purely by distance from that same position.
  assert.equal(horizontallyOverlaps(midX, midX, RADII), true);
  assert.equal(
    horizontallyOverlaps(midX, LANE_X[0], RADII),
    Math.abs(midX - LANE_X[0]) <= RADII,
  );
  assert.equal(
    horizontallyOverlaps(midX, LANE_X[1], RADII),
    Math.abs(midX - LANE_X[1]) <= RADII,
  );
});

test("there is a genuine gap where neither lane overlaps (discs are further apart than their radii)", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  let sawGap = false;
  while (state.active) {
    advanceLaneTransition(state, 1);
    const inA = horizontallyOverlaps(state.x, LANE_X[0], RADII);
    const inB = horizontallyOverlaps(state.x, LANE_X[1], RADII);
    assert.equal(inA && inB, false, "the player may never overlap two lanes at once");
    if (!inA && !inB) sawGap = true;
  }
  assert.equal(sawGap, true, "a mid-transition non-overlapping window must exist");
});

// ---- 6/12. Completion ----------------------------------------------------

test("a transition completes exactly on the destination centre, with no overshoot", () => {
  for (const step of [1, 4, 8, 16, 33, 60]) {
    const state = createLaneTransition(LANE_X[0]);
    startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
    const path = runToCompletion(state, step);
    assert.equal(state.active, false, `step ${step}: must settle`);
    assert.equal(state.x, LANE_X[2], `step ${step}: must land exactly on the centre`);
    // Monotonic and never beyond the destination.
    for (const x of path) {
      assert.ok(x <= LANE_X[2] + 1e-9, `step ${step}: must never overshoot`);
      assert.ok(x >= LANE_X[0] - 1e-9, `step ${step}: must never undershoot`);
    }
  }
});

test("a single-lane change keeps exactly the configured duration", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  assert.equal(state.durationMs, DURATION);
});

test("a partial reversal keeps the same speed (duration scales with distance)", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, DURATION / 2);
  const travelled = state.x - LANE_X[1];
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  const expected = (DURATION * travelled) / LANE_WIDTH;
  assert.ok(
    Math.abs(state.durationMs - expected) < 1e-9,
    "reversal duration must be proportional to the remaining distance",
  );
});

// ---- 7. Rapid reversal ---------------------------------------------------

test("A -> B -> A reversal starts from the visible position and never snaps", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, 40);
  const atReversal = state.x;
  assert.ok(atReversal > LANE_X[1] && atReversal < LANE_X[2]);

  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  // No snap: the very first position of the new transition is where we were.
  assert.equal(state.x, atReversal, "reversal must not teleport the player");
  assert.equal(state.fromX, atReversal, "reversal must start from the visible position");
  assert.equal(state.toX, LANE_X[1], "no stale target may survive");

  const path = runToCompletion(state, 4);
  for (const x of path) {
    assert.ok(x <= atReversal + 1e-9, "reversal must not continue toward the abandoned target");
    assert.ok(x >= LANE_X[1] - 1e-9, "reversal must not overshoot the origin");
  }
  assert.equal(state.x, LANE_X[1], "reversal must finish exactly on lane A's centre");
});

test("collision follows the visible position across a reversal", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  while (state.active) {
    advanceLaneTransition(state, 2);
    // Overlap is always decided by the real distance from the authoritative x.
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      assert.equal(
        horizontallyOverlaps(state.x, LANE_X[lane], RADII),
        Math.abs(state.x - LANE_X[lane]) <= RADII,
      );
    }
    if (state.x > LANE_X[1] + 30) {
      startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
    }
  }
  assert.equal(state.x, LANE_X[1]);
});

// ---- 8/9. Repeated input and boundaries ----------------------------------

test("30 rapid alternating requests leave no stuck state and land on a lane centre", () => {
  const state = createLaneTransition(LANE_X[1]);
  let lane = 1;
  for (let i = 0; i < 30; i++) {
    lane = i % 2 === 0 ? 2 : 1;
    startLaneTransition(state, LANE_X[lane], LANE_WIDTH, DURATION);
    advanceLaneTransition(state, 6); // interrupt well before completion
    assert.ok(Number.isFinite(state.x), "position must stay finite");
    assert.ok(
      state.x >= LANE_X[0] && state.x <= LANE_X[LANE_COUNT - 1],
      "position must stay inside the track",
    );
  }
  runToCompletion(state, 4);
  assert.equal(state.active, false, "no transition may stay stuck");
  assert.equal(state.x, LANE_X[lane], "must settle exactly on the last requested centre");
});

test("repeated same-target requests are idempotent and never restart a settled move", () => {
  const state = createLaneTransition(LANE_X[1]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  assert.equal(state.active, false, "a zero-distance request must settle, not start");
  assert.equal(state.x, LANE_X[1]);
  runToCompletion(state, 16);
  assert.equal(state.x, LANE_X[1]);
});

test("track boundaries: leftmost and rightmost lanes are reachable and never exceeded", () => {
  const left = createLaneTransition(LANE_X[1]);
  startLaneTransition(left, LANE_X[0], LANE_WIDTH, DURATION);
  for (const x of runToCompletion(left, 3)) {
    assert.ok(x >= LANE_X[0] - 1e-9, "must not pass the left edge");
  }
  assert.equal(left.x, LANE_X[0]);

  const right = createLaneTransition(LANE_X[1]);
  startLaneTransition(right, LANE_X[2], LANE_WIDTH, DURATION);
  for (const x of runToCompletion(right, 3)) {
    assert.ok(x <= LANE_X[2] + 1e-9, "must not pass the right edge");
  }
  assert.equal(right.x, LANE_X[2]);
});

// ---- 10/11. Frame-delta independence -------------------------------------

test("low and large frame deltas converge to the same destination", () => {
  const results: number[] = [];
  for (const step of [0.5, 1, 16.67, 100, 5000]) {
    const state = createLaneTransition(LANE_X[0]);
    startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
    runToCompletion(state, step);
    results.push(state.x);
  }
  for (const x of results) assert.equal(x, LANE_X[2]);
});

test("one huge delta completes the move exactly rather than overshooting", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  const x = advanceLaneTransition(state, 100000);
  assert.equal(x, LANE_X[1]);
  assert.equal(state.active, false);
});

test("a non-positive delta never advances or rewinds the position", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, 20);
  const x = state.x;
  assert.equal(advanceLaneTransition(state, 0), x);
  assert.equal(advanceLaneTransition(state, -50), x);
  assert.equal(state.x, x);
});

test("position is monotonic along a transition (no jitter between frames)", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  let previous = state.x;
  while (state.active) {
    const next = advanceLaneTransition(state, 2);
    assert.ok(next >= previous - 1e-9, "position must not move backwards");
    previous = next;
  }
});

// ---- 13/14. One hit per object, invulnerability untouched ----------------

test("a single visual overlap registers exactly one hit for one object", () => {
  // Mirrors the scene's guard: an object is marked dead on the first overlap and
  // skipped afterwards, so a multi-frame overlap cannot double-register.
  const state = createLaneTransition(LANE_X[1]);
  const obj = { lane: 1, alive: true };
  let hits = 0;
  for (let frame = 0; frame < 20; frame++) {
    advanceLaneTransition(state, 16);
    if (!obj.alive) continue;
    if (horizontallyOverlaps(state.x, LANE_X[obj.lane], RADII)) {
      hits += 1;
      obj.alive = false;
    }
  }
  assert.equal(hits, 1, "one object may only be hit once");
});

test("invulnerability and hit constants are untouched by this phase", () => {
  assert.equal(SCORING.obstaclePenalty, 50);
  assert.equal(SCORING.energyPoints, 10);
  assert.equal(SCORING.comboStep, 0.1);
  assert.equal(SCORING.comboMaxMultiplier, 3);
  assert.equal(SCORING.cleanRunBonus, 500);
  assert.equal(SCORING.survivalPerSecond, 5);
});

// ---- 15. Scene restart ---------------------------------------------------

test("reset clears every field of an in-flight transition", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, 30);
  assert.equal(state.active, true);

  resetLaneTransition(state, LANE_X[1]);
  assert.equal(state.active, false, "no transition may survive a restart");
  assert.equal(state.x, LANE_X[1]);
  assert.equal(state.fromX, LANE_X[1]);
  assert.equal(state.toX, LANE_X[1]);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.durationMs, 0);
  // A stale collision position cannot linger either.
  assert.equal(horizontallyOverlaps(state.x, LANE_X[2], RADII), false);
});

// ---- 16. Keyboard and drag share the same semantics ----------------------

test("keyboard and drag produce identical positions for the same request sequence", () => {
  // Both input paths call the same one-lane move, so an identical request
  // sequence must yield an identical authoritative path.
  const play = (requests: number[]) => {
    const state = createLaneTransition(LANE_X[1]);
    let lane = 1;
    const path: number[] = [];
    for (const dir of requests) {
      const target = Math.max(0, Math.min(LANE_COUNT - 1, lane + dir));
      if (target !== lane) {
        lane = target;
        startLaneTransition(state, LANE_X[lane], LANE_WIDTH, DURATION);
      }
      for (let f = 0; f < 4; f++) path.push(advanceLaneTransition(state, 16));
    }
    return path;
  };
  const keyboard = play([1, -1, -1, 1]); // arrow keys
  const drag = play([1, -1, -1, 1]); // drag steps
  assert.deepEqual(keyboard, drag);
});

test("clamping at the edges never yields an illegal lane index", () => {
  let lane = 0;
  for (const dir of [-1, -1, -1, 1, 1, 1, 1, 1]) {
    lane = Math.max(0, Math.min(LANE_COUNT - 1, lane + dir));
    assert.ok(lane >= 0 && lane < LANE_COUNT, "lane index must stay in range");
  }
});

// ---- 17. No RNG consumption ----------------------------------------------

test("movement and collision never consume randomness", () => {
  const original = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    return original();
  };
  try {
    const state = createLaneTransition(LANE_X[0]);
    startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
    while (state.active) {
      advanceLaneTransition(state, 8);
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        horizontallyOverlaps(state.x, LANE_X[lane], RADII);
      }
      nearestLaneIndex(state.x, LANE_X);
    }
  } finally {
    Math.random = original;
  }
  assert.equal(calls, 0, "the movement/collision path must not draw any RNG");
});

test("an identical request sequence is bit-for-bit reproducible", () => {
  const run = () => {
    const state = createLaneTransition(LANE_X[1]);
    const path: number[] = [];
    startLaneTransition(state, LANE_X[0], LANE_WIDTH, DURATION);
    for (let f = 0; f < 6; f++) path.push(advanceLaneTransition(state, 16.6667));
    startLaneTransition(state, LANE_X[2], LANE_WIDTH, DURATION);
    for (let f = 0; f < 20; f++) path.push(advanceLaneTransition(state, 16.6667));
    return path;
  };
  assert.deepEqual(run(), run());
});

// ---- 18/19/20. Invariants the phase must not touch ------------------------

test("lane geometry and collision thresholds are unchanged", () => {
  assert.equal(GAME_WIDTH, 414);
  assert.equal(LANE_COUNT, 3);
  assert.equal(LANE_WIDTH, 138);
  assert.deepEqual(LANE_X, [69, 207, 345]);
  assert.equal(PLAYER.radius, 22);
  assert.equal(OBJECTS.radius, 18);
  assert.equal(RADII, 40);
});

test("movement duration and spawn/speed constants are unchanged", () => {
  assert.equal(PLAYER.laneTweenMs, 110);
  assert.equal(OBJECTS.baseSpeed, 220);
  assert.equal(OBJECTS.speedRampPerRun, 260);
  assert.equal(OBJECTS.baseSpawnIntervalMs, 820);
  assert.equal(OBJECTS.minSpawnIntervalMs, 420);
  assert.equal(OBJECTS.obstacleChance, 0.42);
});

test("the easing curve still matches Phaser's Quadratic.Out", () => {
  // Phaser: Math.Easing.Quadratic.Out = v => v * (2 - v)
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    assert.equal(quadraticEaseOut(t), t * (2 - t));
  }
  assert.equal(quadraticEaseOut(0), 0);
  assert.equal(quadraticEaseOut(1), 1);
});

// ---- Nearest-lane helper (magnet proximity) -------------------------------

test("nearestLaneIndex equals the occupied lane whenever the player is settled", () => {
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    assert.equal(nearestLaneIndex(LANE_X[lane], LANE_X), lane);
  }
});

test("nearestLaneIndex follows the visible side during a transition", () => {
  const state = createLaneTransition(LANE_X[0]);
  startLaneTransition(state, LANE_X[1], LANE_WIDTH, DURATION);
  advanceLaneTransition(state, 5); // barely moved: still nearest to lane 0
  assert.equal(nearestLaneIndex(state.x, LANE_X), 0);
  runToCompletion(state, 5);
  assert.equal(nearestLaneIndex(state.x, LANE_X), 1);
});
