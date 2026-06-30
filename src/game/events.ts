import { EVENTS } from "./theme";
import type { GameEventKind } from "../types";

export interface ExtraEnergy {
  timeMs: number;
  lane: number;
}

export interface EventSlot {
  kind: GameEventKind;
  startMs: number;
  endMs: number;
  /** Bonus energies for an Energy Zone (deterministic). Empty otherwise. */
  extraEnergies: ExtraEnergy[];
}

/**
 * Build the deterministic dynamic-event schedule for a run from a SEPARATE seeded
 * RNG stream. Events are spread into non-overlapping segments (so they never
 * collide and never start before EVENTS.minStartMs), each given a weighted-random
 * kind and a 4–7s duration. Energy Zones precompute their bonus-energy spawns.
 *
 * Same RNG seed -> identical schedule for every Daily player.
 */
export function buildEventSchedule(
  rng: () => number,
  runMs: number,
  laneCount: number,
): EventSlot[] {
  if (!EVENTS.enabled) return [];

  const kinds = (Object.entries(EVENTS.kinds) as [GameEventKind, { enabled: boolean; weight: number }][])
    .filter(([, cfg]) => cfg.enabled && cfg.weight > 0);
  if (kinds.length === 0) return [];

  const totalWeight = kinds.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
  const pickKind = (): GameEventKind => {
    let r = rng() * totalWeight;
    for (const [kind, cfg] of kinds) {
      r -= cfg.weight;
      if (r <= 0) return kind;
    }
    return kinds[kinds.length - 1][0];
  };

  // 2 or 3 events, capped by config.
  const count = Math.min(EVENTS.maxPerRun, 2 + (rng() < 0.4 ? 1 : 0));

  const usableStart = EVENTS.minStartMs;
  const usableEnd = runMs - EVENTS.endMarginMs - EVENTS.durationMaxMs;
  const segment = (usableEnd - usableStart) / count;
  if (segment <= 0) return [];

  const slots: EventSlot[] = [];
  for (let i = 0; i < count; i++) {
    const duration = Math.round(
      EVENTS.durationMinMs + rng() * (EVENTS.durationMaxMs - EVENTS.durationMinMs),
    );
    const segStart = usableStart + segment * i;
    const jitterRoom = Math.max(0, segment - duration - 1000);
    const startMs = Math.round(segStart + rng() * jitterRoom);
    const endMs = startMs + duration;
    const kind = pickKind();

    const extraEnergies: ExtraEnergy[] = [];
    if (kind === "energy") {
      for (let t = startMs + 300; t < endMs; t += EVENTS.energySpawnIntervalMs) {
        extraEnergies.push({ timeMs: Math.round(t), lane: Math.floor(rng() * laneCount) });
      }
    }

    slots.push({ kind, startMs, endMs, extraEnergies });
  }
  return slots;
}
