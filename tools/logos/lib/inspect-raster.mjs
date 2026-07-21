// Raster pixel inspection (Phase 12C-1B2B), backed by sharp. Used both for
// directly-supplied PNG sources and for the pixel buffer produced by
// rasterizing an approved SVG. Never trusts declared dimensions - always
// reads real decoded metadata/pixels.
import sharp from "sharp";
import {
  MAX_RASTER_DIMENSION,
  MAX_RASTER_PIXELS,
  EXTREME_ASPECT_RATIO_THRESHOLD,
} from "./constants.mjs";

export class RasterRejectedError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "RasterRejectedError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * Inspect a raster (PNG-decoded) buffer: dimensions, pixel count, alpha
 * emptiness, aspect ratio. Throws RasterRejectedError on any violation.
 * @param {Buffer} buffer  decoded-source-agnostic RGBA-capable raster bytes
 * @param {object} [options]
 * @param {boolean} [options.allowExtremeAspectRatio]  from the source plan entry
 * @returns {Promise<{ width:number, height:number, hasAlpha:boolean, channels:number }>}
 */
export async function inspectRasterBuffer(buffer, options = {}) {
  const { allowExtremeAspectRatio = false } = options;

  let image;
  let metadata;
  try {
    image = sharp(buffer, { failOn: "error" });
    metadata = await image.metadata();
  } catch {
    throw new RasterRejectedError("raster-malformed");
  }

  const { width, height } = metadata;
  if (!width || !height) {
    throw new RasterRejectedError("raster-malformed");
  }
  if (width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION) {
    throw new RasterRejectedError("raster-dimensions-exceed-max", { width, height });
  }
  if (width * height > MAX_RASTER_PIXELS) {
    throw new RasterRejectedError("raster-pixel-count-exceeds-max", { width, height });
  }

  const aspect = Math.max(width, height) / Math.min(width, height);
  if (aspect > EXTREME_ASPECT_RATIO_THRESHOLD && !allowExtremeAspectRatio) {
    throw new RasterRejectedError("raster-extreme-aspect-ratio", { width, height, aspect });
  }

  const rgba = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (isFullyTransparent(rgba.data, rgba.info.channels)) {
    throw new RasterRejectedError("raster-empty-transparent");
  }

  return {
    width,
    height,
    hasAlpha: Boolean(metadata.hasAlpha),
    channels: metadata.channels ?? rgba.info.channels,
  };
}

/**
 * @param {Buffer} raw  raw RGBA pixel data
 * @param {number} channels
 */
export function isFullyTransparent(raw, channels) {
  if (channels < 4) return false; // no alpha channel at all -> not "empty"
  for (let i = 3; i < raw.length; i += channels) {
    if (raw[i] !== 0) return false;
  }
  return true;
}

/**
 * Compute the tight bounding box of non-transparent pixels.
 * @param {Buffer} raw  raw RGBA pixel data
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 * @returns {{ left:number, top:number, right:number, bottom:number } | null}
 *   right/bottom are exclusive. Returns null if fully transparent.
 */
export function computeAlphaBoundingBox(raw, width, height, channels) {
  if (channels < 4) {
    return { left: 0, top: 0, right: width, bottom: height };
  }
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * channels;
    for (let x = 0; x < width; x += 1) {
      const alpha = raw[rowOffset + x * channels + 3];
      if (alpha !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 };
}
