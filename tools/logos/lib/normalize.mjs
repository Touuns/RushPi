// Deterministic normalization pipeline (Phase 12C-1B2B, normalizationPolicyVersion 1).
//
// Permitted processing ONLY: format decoding, safe SVG rasterization, removal
// of fully empty (transparent) canvas around the mark, proportional scaling,
// centring, transparent padding, deterministic PNG encoding, metadata
// stripping. The visible mark itself is never altered: no rotation, no
// recolouring, no background removal/keying, no sharpening, no contrast or
// saturation change, no shape modification, no text removal.
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { computeAlphaBoundingBox } from "./inspect-raster.mjs";
import {
  OUTPUT_SIZES,
  MAX_VISIBLE_OCCUPANCY,
  PNG_ENCODE_OPTIONS,
  SVG_RASTER_TARGET_WIDTH,
  OUTPUT_COLOR_SPACE,
} from "./constants.mjs";

export class NormalizationError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "NormalizationError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * Rasterize an already-security-scanned SVG source to RGBA pixels using the
 * pinned resvg rasterizer. Only the resulting raster is ever processed
 * further - the SVG text itself is discarded after this call and never
 * copied into public assets or exposed to the browser.
 * @param {string} svgText
 * @returns {Buffer} PNG-encoded raster bytes
 */
export function rasterizeSvg(svgText) {
  let resvg;
  try {
    resvg = new Resvg(svgText, {
      fitTo: { mode: "width", value: SVG_RASTER_TARGET_WIDTH },
      background: "rgba(0,0,0,0)",
    });
  } catch {
    throw new NormalizationError("malformed-svg");
  }
  const rendered = resvg.render();
  const png = rendered.asPng();
  if (!png || png.length === 0) {
    throw new NormalizationError("svg-rasterization-produced-no-output");
  }
  return Buffer.from(png);
}

/**
 * @param {Buffer} rasterPngBuffer  decoded-source raster (direct PNG, or an
 *   already-rasterized SVG) that has already passed inspect-raster checks.
 * @param {"alpha-bounds"|"preserve-canvas"} cropMode
 * @returns {Promise<{ buf64: Buffer, buf128: Buffer, hash64Input: Buffer, hash128Input: Buffer }>}
 */
export async function normalizeToOutputs(rasterPngBuffer, cropMode) {
  const { data, info } = await sharp(rasterPngBuffer)
    .toColourspace(OUTPUT_COLOR_SPACE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  let box;
  if (cropMode === "alpha-bounds") {
    box = computeAlphaBoundingBox(data, width, height, channels);
    if (!box) throw new NormalizationError("raster-empty-transparent");
  } else if (cropMode === "preserve-canvas") {
    box = { left: 0, top: 0, right: width, bottom: height };
  } else {
    throw new NormalizationError("unknown-crop-mode", { cropMode });
  }

  const boxWidth = box.right - box.left;
  const boxHeight = box.bottom - box.top;

  // sharp() re-wraps the raw pixels with their known geometry so we can
  // extract + resize deterministically without re-decoding source bytes.
  const baseImage = () =>
    sharp(data, { raw: { width, height, channels } }).extract({
      left: box.left,
      top: box.top,
      width: boxWidth,
      height: boxHeight,
    });

  const outputs = {};
  for (const size of OUTPUT_SIZES) {
    outputs[size] = await renderOutputSize(baseImage(), boxWidth, boxHeight, size);
  }

  return { buf64: outputs[64], buf128: outputs[128] };
}

async function renderOutputSize(extractedImage, sourceWidth, sourceHeight, outputSize) {
  const targetMax = Math.round(outputSize * MAX_VISIBLE_OCCUPANCY);
  const scale = targetMax / Math.max(sourceWidth, sourceHeight);
  const scaledWidth = Math.max(1, Math.round(sourceWidth * scale));
  const scaledHeight = Math.max(1, Math.round(sourceHeight * scale));

  const resized = await extractedImage
    .resize(scaledWidth, scaledHeight, { kernel: sharp.kernel.lanczos3, fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const left = Math.round((outputSize - scaledWidth) / 2);
  const top = Math.round((outputSize - scaledHeight) / 2);

  const canvas = sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    {
      input: resized.data,
      raw: { width: resized.info.width, height: resized.info.height, channels: resized.info.channels },
      left,
      top,
    },
  ]);

  // Fixed, deterministic encoder settings; no metadata is retained because
  // withMetadata() is never called.
  return canvas.toColourspace(OUTPUT_COLOR_SPACE).png(PNG_ENCODE_OPTIONS).toBuffer();
}
