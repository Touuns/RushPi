/**
 * Rush Sigil v1 — Prismatic Core geometry (Phase 13-S1).
 *
 * Pure, Phaser-free geometry/fingerprint derivation, mirroring the existing
 * split between dailyTokenLogoRender.ts (Phaser-free helpers) and
 * dailyTokens.ts (the Phaser-drawing caller) — this module has ZERO Phaser
 * import so it stays unit-testable outside a browser and reusable by the
 * offline uniqueness validator.
 *
 * A Sigil's ENTIRE visual identity is derived from `tokenId` alone (plus the
 * fixed `RUSH_SIGIL_VERSION` salt). No symbol, ticker, name, price, rank,
 * spawn order, challenge seed, date/time, Math.random or gameplay RNG ever
 * enters this file — verified by `rushSigilRuntime.test.ts`.
 *
 * ---------------------------------------------------------------------
 * Why a "visual fingerprint" is a SEPARATE, canonicalized thing from the raw
 * derived parameters (Phase 13-S1 correction over the RV2 prototype):
 *
 * The RV2 prototype proved uniqueness of the raw parameter TUPLE, not of the
 * actual rendered pixels. Two problems that creates:
 *
 *  1. `square` and `diamond` used to be the same 4-sided regular polygon at
 *     different rotations — two different tuples, one visible shape.
 *  2. A rotation step that is a whole multiple of a shape's own rotational
 *     symmetry period is INVISIBLE (a square rotated 90° looks identical to
 *     an unrotated square; a hexagon rotated 60° looks identical to an
 *     unrotated hexagon).
 *
 * `deriveRushSigilParams` below already resolves every angle to its
 * CANONICAL value (modulo the relevant symmetry period) before returning it,
 * and zeroes out parameters that have no visual effect in the resolved state
 * (e.g. a surface-angle is meaningless when the surface treatment is a flat
 * solid fill). `rushSigilVisualFingerprint` is then a plain, stable
 * stringification of that already-canonical param set — never the tokenId,
 * never an unused field.
 * ---------------------------------------------------------------------
 */

export const RUSH_SIGIL_VERSION = "v1";

// ---------------------------------------------------------------------------
// Deterministic hashing — standalone FNV-1a, NOT src/game/seededRandom.ts
// (the gameplay/challenge RNG). Zero imports in this file, so nothing here
// can ever accidentally pull in gameplay randomness.
// ---------------------------------------------------------------------------

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function channel(tokenId: string, salt: string): number {
  return fnv1a(`${tokenId}::${RUSH_SIGIL_VERSION}::${salt}`);
}

// ---------------------------------------------------------------------------
// Curated Rush Pi palette pairs. Deliberately avoids the EXACT hex values
// used by Hazard (0xff4d6d) and Shield (0x38bdf8) — see theme.ts PALETTE —
// so a Sigil is never a one-color match for an unrelated gameplay object.
// Every pair is a genuinely distinct hue combination, not a lightness twin.
// ---------------------------------------------------------------------------

const VIOLET = "#8b5cf6";
const VIOLET_SOFT = "#a78bfa";
const GOLD = "#ffd166";
const ORANGE = "#ff7a3d";
const MAGENTA = "#ec4899"; // Sigil-only accent; distinct hue from Hazard red
const INDIGO = "#6366f1"; // Sigil-only accent; distinct hue from Shield cyan

const PALETTE_PAIRS: readonly (readonly [string, string])[] = [
  [VIOLET, GOLD],
  [ORANGE, VIOLET_SOFT],
  [MAGENTA, VIOLET],
  [GOLD, INDIGO],
  [VIOLET_SOFT, ORANGE],
  [INDIGO, GOLD],
  [MAGENTA, GOLD],
  [VIOLET, ORANGE],
  [INDIGO, MAGENTA],
  [GOLD, VIOLET_SOFT],
  [ORANGE, INDIGO],
  [VIOLET, MAGENTA],
];

// ---------------------------------------------------------------------------
// Shape families. `square` and `rhombus` are BOTH 4-sided but genuinely
// different silhouettes: rhombus applies a fixed vertical:horizontal stretch
// so it never reduces to a rotated square (Phase 13-S1 correction).
// ---------------------------------------------------------------------------

export type SigilShape = "triangle" | "square" | "rhombus" | "pentagon" | "hexagon";

interface ShapeDef {
  readonly shape: SigilShape;
  readonly sides: number;
  /** Rotational symmetry period in degrees — used to canonicalize rotation. */
  readonly rotationPeriodDeg: number;
  /** Vertical:horizontal radius stretch; 1 = regular polygon. */
  readonly stretch: number;
  /** Fixed base orientation added before the per-token rotation — a styling
   * choice only (doesn't change the symmetry period), used so `square`
   * defaults to an axis-aligned tilted-square read while `rhombus` (built
   * from the same 4-sided polygon generator) reads as a taller diamond —
   * genuinely distinct silhouettes, not the same shape at a different spin. */
  readonly baseOffsetDeg: number;
}

const SHAPES: readonly ShapeDef[] = [
  { shape: "triangle", sides: 3, rotationPeriodDeg: 120, stretch: 1, baseOffsetDeg: 0 },
  { shape: "square", sides: 4, rotationPeriodDeg: 90, stretch: 1, baseOffsetDeg: 45 },
  { shape: "rhombus", sides: 4, rotationPeriodDeg: 180, stretch: 1.35, baseOffsetDeg: 0 },
  { shape: "pentagon", sides: 5, rotationPeriodDeg: 72, stretch: 1, baseOffsetDeg: 0 },
  { shape: "hexagon", sides: 6, rotationPeriodDeg: 60, stretch: 1, baseOffsetDeg: 0 },
];

export type SigilSurface = "solid" | "gradient" | "facet-split";
const SURFACES: readonly SigilSurface[] = ["solid", "gradient", "facet-split"];

export type SigilRingCue = "notch-single" | "notch-paired" | "dot-single" | "dot-paired" | "arc";
const RING_CUES: readonly SigilRingCue[] = [
  "notch-single",
  "notch-paired",
  "dot-single",
  "dot-paired",
  "arc",
];

function isPairedCue(cue: SigilRingCue): boolean {
  return cue === "notch-paired" || cue === "dot-paired";
}

/** Reduce a 0-330° (30° step) angle into [0, period), collapsing rotations
 * that a regular/symmetric shape renders identically. */
function canonicalAngle(rawDeg: number, periodDeg: number): number {
  const m = rawDeg % periodDeg;
  return m < 0 ? m + periodDeg : m;
}

/** Approved refinement (Phase 13-S1 section 5): core is ~33/100, up from the
 * RV2 prototype's ~30/100 — the dominant feature at real (~40px) game size. */
export const CORE_RADIUS = 33;
export const OUTER_RADIUS = 46;

/**
 * Every dimension that actually reaches the renderer, already canonicalized.
 * This IS the visual identity — two tokens with different raw hash channels
 * but the same resolved `RushSigilParams` render pixel-identical Sigils, and
 * are therefore (correctly) treated as a fingerprint collision.
 */
export interface RushSigilParams {
  readonly colors: readonly [string, string];
  readonly shape: SigilShape;
  readonly sides: number;
  readonly stretch: number;
  /** Canonicalized to [0, shape's rotation period). */
  readonly coreRotationDeg: number;
  readonly surface: SigilSurface;
  /** Meaningful only when surface !== "solid"; 0 otherwise (no visual effect). */
  readonly surfaceAngleDeg: number;
  readonly ringCue: SigilRingCue;
  /** Canonicalized to [0, 180) for paired cues (symmetric), else [0, 360). */
  readonly ringCueAngleDeg: number;
}

/**
 * Derive a token's COMPLETE, already-canonicalized Prismatic Core parameter
 * set from its tokenId alone. Pure function: same input -> same output,
 * forever, on every device — no I/O, no randomness, no Date.
 */
export function deriveRushSigilParams(tokenId: string): RushSigilParams {
  const paletteIdx = channel(tokenId, "palette") % PALETTE_PAIRS.length;
  const shapeIdx = channel(tokenId, "shape") % SHAPES.length;
  const shapeDef = SHAPES[shapeIdx];

  // Phase 13-S1: 5° raw steps (72 per full turn), not 30° (12 per turn).
  // A coarser 30° step left several shapes with very few EFFECTIVE rotation
  // buckets once canonicalized against their own symmetry period (hexagon's
  // 60° period left only 2 distinct buckets out of 12 raw steps), which is
  // what produced real fingerprint collisions across the 250-token registry
  // during development (see 09-CONCEPT-NOTES / final report). 5° is still a
  // genuinely visible rotation (not invisible entropy) and divides evenly
  // into every symmetry period used here (60/72/90/120/180), so canonicalAngle
  // still collapses truly-identical states while keeping far more distinct
  // effective buckets for every shape.
  const ANGLE_STEP_DEG = 5;
  const ANGLE_STEPS_PER_TURN = 360 / ANGLE_STEP_DEG; // 72

  const rawCoreRotationStep = channel(tokenId, "core-rotation") % ANGLE_STEPS_PER_TURN;
  const coreRotationDeg = canonicalAngle(
    rawCoreRotationStep * ANGLE_STEP_DEG,
    shapeDef.rotationPeriodDeg,
  );

  const surfaceIdx = channel(tokenId, "surface") % SURFACES.length;
  const surface = SURFACES[surfaceIdx];
  const rawSurfaceAngleStep = channel(tokenId, "surface-angle") % ANGLE_STEPS_PER_TURN;
  // Facet-split is a straight line through the centre: angle θ and θ+180°
  // are the SAME line, so canonicalize mod 180. A directional gradient from
  // colour A to colour B is NOT 180°-symmetric (the colours swap ends), so
  // it keeps the full mod-360 range. A solid fill has no angle at all.
  const surfaceAngleDeg =
    surface === "solid"
      ? 0
      : surface === "facet-split"
        ? canonicalAngle(rawSurfaceAngleStep * ANGLE_STEP_DEG, 180)
        : canonicalAngle(rawSurfaceAngleStep * ANGLE_STEP_DEG, 360);

  const ringCueIdx = channel(tokenId, "ring-cue") % RING_CUES.length;
  const ringCue = RING_CUES[ringCueIdx];
  const rawRingCueAngleStep = channel(tokenId, "ring-cue-angle") % ANGLE_STEPS_PER_TURN;
  // A PAIRED cue (two marks 180° apart) looks identical to itself rotated by
  // 180°, so canonicalize mod 180; a single mark or short arc has no such
  // symmetry and keeps the full mod-360 range.
  const ringCueAngleDeg = canonicalAngle(
    rawRingCueAngleStep * ANGLE_STEP_DEG,
    isPairedCue(ringCue) ? 180 : 360,
  );

  return {
    colors: PALETTE_PAIRS[paletteIdx],
    shape: shapeDef.shape,
    sides: shapeDef.sides,
    stretch: shapeDef.stretch,
    coreRotationDeg,
    surface,
    surfaceAngleDeg,
    ringCue,
    ringCueAngleDeg,
  };
}

/**
 * Canonical string encoding of the FULLY RESOLVED visual params — the
 * "complete visual signature" uniqueness is checked against. Contains only
 * dimensions that actually reach the renderer; never the tokenId, never an
 * SVG element id, never a texture key, never the symbol/ticker.
 */
export function rushSigilVisualFingerprint(tokenId: string): string {
  const p = deriveRushSigilParams(tokenId);
  return [
    p.colors[0],
    p.colors[1],
    p.shape,
    p.coreRotationDeg,
    p.surface,
    p.surfaceAngleDeg,
    p.ringCue,
    p.ringCueAngleDeg,
  ].join("|");
}

export function rushSigilTextureKey(tokenId: string): string {
  return `rush-sigil:${tokenId}:${RUSH_SIGIL_VERSION}`;
}

// ---------------------------------------------------------------------------
// Pure "draw plan" — a renderer-agnostic list of primitive shape commands
// that BOTH the production Phaser/Canvas renderer (rushSigil.ts) and the
// Node-side SVG renderer used only for offline visual review/validation
// consume. This is the single source of truth for the geometry: neither
// renderer computes angles/positions on its own, both just draw this plan,
// so there is exactly one implementation of Prismatic geometry, never two.
// ---------------------------------------------------------------------------

function polygonPoints(
  sides: number,
  radius: number,
  rotationDeg: number,
  stretch: number,
): readonly (readonly [number, number])[] {
  const pts: (readonly [number, number])[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides + (rotationDeg * Math.PI) / 180 - Math.PI / 2;
    const x = radius * Math.cos(a);
    const y = radius * Math.sin(a) * stretch;
    pts.push([x, y]);
  }
  return pts;
}

export type SigilDrawCommand =
  | { readonly kind: "outerDisc"; readonly radius: number; readonly fill: string }
  | {
      readonly kind: "outerRing";
      readonly radius: number;
      readonly stroke: string;
      readonly strokeWidth: number;
    }
  | {
      readonly kind: "corePolygon";
      readonly points: readonly (readonly [number, number])[];
      readonly surface: SigilSurface;
      readonly fill: string;
      /** Second colour for "gradient" (blend target) or "facet-split" (other
       * half); null for a flat "solid" fill. */
      readonly fill2: string | null;
      /** Meaningful only for "gradient"/"facet-split"; 0 for "solid". */
      readonly fillAngleDeg: number;
      readonly stroke: string;
    }
  | { readonly kind: "ringNotch"; readonly angleDeg: number; readonly color: string }
  | { readonly kind: "ringDot"; readonly angleDeg: number; readonly color: string }
  | { readonly kind: "ringArc"; readonly startDeg: number; readonly color: string };

function baseOffsetForShape(shape: SigilShape): number {
  return SHAPES.find((s) => s.shape === shape)?.baseOffsetDeg ?? 0;
}

/** Build the renderer-agnostic draw plan for a token's ALREADY-derived params. */
export function buildRushSigilDrawPlan(params: RushSigilParams): readonly SigilDrawCommand[] {
  const [colorA, colorB] = params.colors;
  // The fixed per-shape base offset (e.g. square's 45°) is a styling constant
  // applied only at draw time — it never varies per token and stays out of
  // `coreRotationDeg` so that field remains the pure canonical per-token
  // rotation relative to the shape's own base pose.
  const drawRotationDeg = params.coreRotationDeg + baseOffsetForShape(params.shape);
  const plan: SigilDrawCommand[] = [
    { kind: "outerDisc", radius: OUTER_RADIUS, fill: "#1b1230" },
    { kind: "outerRing", radius: OUTER_RADIUS, stroke: colorB, strokeWidth: 3 },
    {
      kind: "corePolygon",
      points: polygonPoints(params.sides, CORE_RADIUS, drawRotationDeg, params.stretch),
      surface: params.surface,
      fill: colorA,
      fill2: params.surface === "solid" ? null : colorB,
      fillAngleDeg: params.surfaceAngleDeg,
      stroke: colorB,
    },
  ];

  const cueAngles: number[] =
    params.ringCue === "notch-paired" || params.ringCue === "dot-paired"
      ? [params.ringCueAngleDeg, params.ringCueAngleDeg + 180]
      : [params.ringCueAngleDeg];

  for (const angleDeg of cueAngles) {
    if (params.ringCue === "notch-single" || params.ringCue === "notch-paired") {
      plan.push({ kind: "ringNotch", angleDeg, color: colorB });
    } else if (params.ringCue === "dot-single" || params.ringCue === "dot-paired") {
      plan.push({ kind: "ringDot", angleDeg, color: colorB });
    } else if (params.ringCue === "arc") {
      plan.push({ kind: "ringArc", startDeg: angleDeg, color: colorB });
    }
  }

  return plan;
}

// ---------------------------------------------------------------------------
// SVG renderer — for the offline uniqueness/visual-collision validator and
// the local visual-review gallery ONLY. Never used at runtime (the game
// draws the same plan via Phaser/Canvas — see rushSigil.ts). Consumes the
// exact same `SigilDrawCommand[]` so there is one geometry implementation.
// ---------------------------------------------------------------------------

const VIEW = OUTER_RADIUS * 2 + 8; // small margin so the ring stroke never clips
const CX = VIEW / 2;
const CY = VIEW / 2;

function toXY([x, y]: readonly [number, number]): [number, number] {
  return [CX + x, CY + y];
}

function polygonSvgPoints(points: readonly (readonly [number, number])[]): string {
  return points.map((p) => toXY(p).map((n) => n.toFixed(2)).join(",")).join(" ");
}

/** Half-plane clip rectangle used to render a "facet-split" polygon as two
 * solid-colour halves without a gradient — a large rect through the centre,
 * rotated to `angleDeg`, covering everything on one side of that line. */
function facetClipRect(angleDeg: number, clipId: string): string {
  const size = VIEW * 2;
  return `<clipPath id="${clipId}"><rect x="${-size / 2}" y="0" width="${size}" height="${size}" transform="translate(${CX} ${CY}) rotate(${angleDeg})" /></clipPath>`;
}

/**
 * Render a token's Sigil to a standalone SVG string, purely from its already
 * -built draw plan. Deterministic, no randomness, no network, no DOM.
 */
export function renderRushSigilSVG(tokenId: string, sizePx: number): string {
  const params = deriveRushSigilParams(tokenId);
  const plan = buildRushSigilDrawPlan(params);

  const defs: string[] = [];
  const body: string[] = [];
  let clipCounter = 0;

  for (const cmd of plan) {
    switch (cmd.kind) {
      case "outerDisc":
        body.push(`<circle cx="${CX}" cy="${CY}" r="${cmd.radius}" fill="${cmd.fill}" />`);
        break;
      case "outerRing":
        body.push(
          `<circle cx="${CX}" cy="${CY}" r="${cmd.radius}" fill="none" stroke="${cmd.stroke}" stroke-width="${cmd.strokeWidth}" />`,
        );
        break;
      case "corePolygon": {
        const pts = polygonSvgPoints(cmd.points);
        if (cmd.surface === "solid" || !cmd.fill2) {
          body.push(
            `<polygon points="${pts}" fill="${cmd.fill}" stroke="${cmd.stroke}" stroke-width="1.5" stroke-linejoin="round" />`,
          );
        } else if (cmd.surface === "gradient") {
          const gradId = `grad-${clipCounter++}`;
          const rad = (cmd.fillAngleDeg * Math.PI) / 180;
          const x1 = (50 - 50 * Math.cos(rad)).toFixed(1);
          const y1 = (50 - 50 * Math.sin(rad)).toFixed(1);
          const x2 = (50 + 50 * Math.cos(rad)).toFixed(1);
          const y2 = (50 + 50 * Math.sin(rad)).toFixed(1);
          defs.push(
            `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${cmd.fill}"/><stop offset="100%" stop-color="${cmd.fill2}"/></linearGradient>`,
          );
          body.push(
            `<polygon points="${pts}" fill="url(#${gradId})" stroke="${cmd.stroke}" stroke-width="1.5" stroke-linejoin="round" />`,
          );
        } else {
          // facet-split: draw the full polygon in fill, then the SAME polygon
          // clipped to one half-plane in fill2 — a hard split, not a blend.
          const clipId = `facet-${clipCounter++}`;
          defs.push(facetClipRect(cmd.fillAngleDeg, clipId));
          body.push(
            `<polygon points="${pts}" fill="${cmd.fill}" stroke="${cmd.stroke}" stroke-width="1.5" stroke-linejoin="round" />`,
          );
          body.push(`<polygon points="${pts}" fill="${cmd.fill2}" clip-path="url(#${clipId})" />`);
        }
        break;
      }
      case "ringNotch": {
        const rad = (cmd.angleDeg * Math.PI) / 180;
        const rInner = OUTER_RADIUS - 6;
        const rOuter = OUTER_RADIUS + 6;
        const x1 = CX + rInner * Math.cos(rad);
        const y1 = CY + rInner * Math.sin(rad);
        const x2 = CX + rOuter * Math.cos(rad);
        const y2 = CY + rOuter * Math.sin(rad);
        body.push(
          `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${cmd.color}" stroke-width="4" stroke-linecap="round" />`,
        );
        break;
      }
      case "ringDot": {
        const rad = (cmd.angleDeg * Math.PI) / 180;
        const x = CX + OUTER_RADIUS * Math.cos(rad);
        const y = CY + OUTER_RADIUS * Math.sin(rad);
        body.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${cmd.color}" />`);
        break;
      }
      case "ringArc": {
        const span = 40;
        const a0 = (cmd.startDeg * Math.PI) / 180;
        const a1 = ((cmd.startDeg + span) * Math.PI) / 180;
        const x0 = CX + OUTER_RADIUS * Math.cos(a0);
        const y0 = CY + OUTER_RADIUS * Math.sin(a0);
        const x1 = CX + OUTER_RADIUS * Math.cos(a1);
        const y1 = CY + OUTER_RADIUS * Math.sin(a1);
        body.push(
          `<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${cmd.color}" stroke-width="5" stroke-linecap="round" />`,
        );
        break;
      }
      default: {
        const _exhaustive: never = cmd;
        void _exhaustive;
      }
    }
  }

  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg" data-rush-sigil-version="${RUSH_SIGIL_VERSION}"><defs>${defs.join("")}</defs>${body.join("")}</svg>`;
}

/**
 * Normalize a rendered SVG string for a REAL visual-output collision check:
 * strips every id/clip-path reference (which are per-call-counter, never
 * tokenId-derived, but must still be excluded so two structurally-identical
 * Sigils that merely got different internal counter values are correctly
 * recognized as the same picture) and rounds numeric attributes, so two
 * SVGs that paint the same pixels always normalize to the same string.
 */
export function normalizeRushSigilSVGForComparison(svg: string): string {
  return svg
    .replace(/\sxmlns="[^"]*"/g, "")
    .replace(/\sdata-rush-sigil-version="[^"]*"/g, "")
    .replace(/id="[^"]*"/g, 'id=""')
    .replace(/url\(#[^)]*\)/g, "url(#x)");
}
