/**
 * Rush Sigil v1 — production renderer (Phase 13-S1).
 *
 * Turns a token's pure, Phaser-free draw plan (rushSigilGeometry.ts) into a
 * real Phaser texture, using a Canvas2D-backed `Phaser.Textures.CanvasTexture`
 * rather than `Phaser.GameObjects.Graphics` — Canvas2D natively supports
 * arbitrary-angle linear gradients and clip paths, so this renderer can draw
 * the SAME plan (gradient / facet-split / notches / dots / arc) the offline
 * SVG renderer draws, without a second geometry implementation: only the
 * drawing BACKEND differs (Canvas2D calls vs SVG markup), never the shape,
 * angle or colour math, which lives exclusively in rushSigilGeometry.ts.
 *
 * Generated once per token, cached by the stable `rush-sigil:<tokenId>:v1`
 * texture key (checked via `scene.textures.exists` before drawing anything),
 * never per frame, never from a network request or external asset, no
 * runtime font dependency (nothing here rasterizes text).
 */
import Phaser from "phaser";
import {
  deriveRushSigilParams,
  buildRushSigilDrawPlan,
  rushSigilTextureKey,
  OUTER_RADIUS,
  type SigilDrawCommand,
} from "./rushSigilGeometry";

export { rushSigilTextureKey } from "./rushSigilGeometry";

/** Texture canvas size — matches the SVG renderer's viewBox convention
 * (outer radius plus a small margin so the ring stroke never clips). */
export const RUSH_SIGIL_TEXTURE_SIZE = OUTER_RADIUS * 2 + 8;

function drawCorePolygon(
  ctx: CanvasRenderingContext2D,
  cmd: Extract<SigilDrawCommand, { kind: "corePolygon" }>,
  cx: number,
  cy: number,
): void {
  const path = new Path2D();
  cmd.points.forEach(([x, y], i) => {
    if (i === 0) path.moveTo(cx + x, cy + y);
    else path.lineTo(cx + x, cy + y);
  });
  path.closePath();

  if (cmd.surface === "solid" || !cmd.fill2) {
    ctx.fillStyle = cmd.fill;
    ctx.fill(path);
  } else if (cmd.surface === "gradient") {
    const rad = (cmd.fillAngleDeg * Math.PI) / 180;
    const r = OUTER_RADIUS;
    const grad = ctx.createLinearGradient(
      cx - r * Math.cos(rad),
      cy - r * Math.sin(rad),
      cx + r * Math.cos(rad),
      cy + r * Math.sin(rad),
    );
    grad.addColorStop(0, cmd.fill);
    grad.addColorStop(1, cmd.fill2);
    ctx.fillStyle = grad;
    ctx.fill(path);
  } else {
    // facet-split: fill the full polygon with `fill`, then clip to one
    // half-plane through the centre (rotated to fillAngleDeg) and fill that
    // half with `fill2` — a hard split, matching the SVG renderer exactly.
    ctx.fillStyle = cmd.fill;
    ctx.fill(path);

    ctx.save();
    ctx.fillStyle = cmd.fill2;
    ctx.fill(path); // establishes the polygon as the active fill region...
    ctx.clip(path); // ...then clip to it...
    const rad = (cmd.fillAngleDeg * Math.PI) / 180;
    const big = RUSH_SIGIL_TEXTURE_SIZE * 2;
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.fillStyle = cmd.fill2;
    ctx.fillRect(0, -big / 2, big, big); // ...and fill only "one side" of the line
    ctx.restore();
  }

  ctx.strokeStyle = cmd.stroke;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke(path);
}

function drawRingNotch(ctx: CanvasRenderingContext2D, angleDeg: number, color: string, cx: number, cy: number): void {
  const rad = (angleDeg * Math.PI) / 180;
  const rInner = OUTER_RADIUS - 6;
  const rOuter = OUTER_RADIUS + 6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + rInner * Math.cos(rad), cy + rInner * Math.sin(rad));
  ctx.lineTo(cx + rOuter * Math.cos(rad), cy + rOuter * Math.sin(rad));
  ctx.stroke();
}

function drawRingDot(ctx: CanvasRenderingContext2D, angleDeg: number, color: string, cx: number, cy: number): void {
  const rad = (angleDeg * Math.PI) / 180;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx + OUTER_RADIUS * Math.cos(rad), cy + OUTER_RADIUS * Math.sin(rad), 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRingArc(ctx: CanvasRenderingContext2D, startDeg: number, color: string, cx: number, cy: number): void {
  const span = (40 * Math.PI) / 180;
  const a0 = (startDeg * Math.PI) / 180;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, OUTER_RADIUS, a0, a0 + span);
  ctx.stroke();
}

/**
 * Draw a token's Sigil onto an already-created 2D context (used both for the
 * real Phaser texture below and directly testable without a Phaser runtime
 * via a plain `OffscreenCanvas`/`node-canvas`-shaped context in tests).
 */
export function drawRushSigilToContext(
  ctx: CanvasRenderingContext2D,
  tokenId: string,
  size: number = RUSH_SIGIL_TEXTURE_SIZE,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const params = deriveRushSigilParams(tokenId);
  const plan = buildRushSigilDrawPlan(params);

  for (const cmd of plan) {
    switch (cmd.kind) {
      case "outerDisc":
        ctx.fillStyle = cmd.fill;
        ctx.beginPath();
        ctx.arc(cx, cy, cmd.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "outerRing":
        ctx.strokeStyle = cmd.stroke;
        ctx.lineWidth = cmd.strokeWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, cmd.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "corePolygon":
        drawCorePolygon(ctx, cmd, cx, cy);
        break;
      case "ringNotch":
        drawRingNotch(ctx, cmd.angleDeg, cmd.color, cx, cy);
        break;
      case "ringDot":
        drawRingDot(ctx, cmd.angleDeg, cmd.color, cx, cy);
        break;
      case "ringArc":
        drawRingArc(ctx, cmd.startDeg, cmd.color, cx, cy);
        break;
    }
  }
}

/**
 * Ensure a Phaser texture exists for this token's Sigil, generating it (once,
 * cached by the stable `rush-sigil:<tokenId>:v1` key) if it doesn't. Returns
 * the texture key so the caller can draw a plain `scene.add.image`, or null
 * only on a genuine rendering failure (the canvas texture could not be
 * created/drawn) — the ONLY case allowed to reach the emergency fallback.
 * Reusing an existing key never re-draws — a repeated Daily token or a
 * same-day replay costs nothing extra, and a fresh `Phaser.Game` per scene
 * mount/restart gets a fresh `TextureManager` (no manual cross-restart
 * cleanup needed — see RushPiGame.ts / destroyRushPiGame).
 */
export function ensureRushSigilTexture(scene: Phaser.Scene, tokenId: string): string | null {
  const key = rushSigilTextureKey(tokenId);
  if (scene.textures.exists(key)) return key;

  try {
    const size = RUSH_SIGIL_TEXTURE_SIZE;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return null;
    const ctx = canvasTexture.getContext();
    if (!ctx) return null;
    drawRushSigilToContext(ctx, tokenId, size);
    canvasTexture.refresh();
    return key;
  } catch {
    // Genuine rendering failure (e.g. no 2D context available) — the only
    // case allowed to fall through to the emergency disc.
    return null;
  }
}
