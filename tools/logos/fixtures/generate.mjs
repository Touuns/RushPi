// Synthetic test fixtures for the logo tooling self-tests (Phase 12C-1B2B).
//
// Every fixture here is an abstract generated shape (a plain square, circle
// or checkerboard) or a deliberately malicious/malformed snippet used ONLY to
// exercise the security/normalization pipeline. NONE of these resemble, are
// derived from, or claim to be any real token brand mark. Nothing here is
// committed as a binary file - everything is generated in memory at test
// time by pure functions, so there is no image asset in this repository.
import sharp from "sharp";

/** A solid opaque square mark on a transparent canvas, centered with padding. */
export async function validPngMark({ canvas = 200, markSize = 60, color = { r: 40, g: 90, b: 180 } } = {}) {
  const mark = await sharp({ create: { width: markSize, height: markSize, channels: 4, background: { ...color, alpha: 1 } } }).png().toBuffer();
  const offset = Math.round((canvas - markSize) / 2);
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
}

/** A fully transparent canvas - no visible content at all. */
export async function emptyTransparentPng({ size = 64 } = {}) {
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
}

/** A very wide, thin opaque bar - extreme aspect ratio case. */
export async function extremeAspectRatioPng({ width = 1200, height = 40 } = {}) {
  return sharp({ create: { width, height, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
}

/** Dimensions/pixel-count exceeding the configured maximum. */
export async function oversizedDimensionsPng() {
  return sharp({ create: { width: 4200, height: 4200, channels: 4, background: { r: 5, g: 5, b: 5, alpha: 1 } } })
    .png({ compressionLevel: 0 })
    .toBuffer();
}

/** A byte buffer padded past the max-size limit while still PNG-sniffable at the head. */
export async function oversizedBytesPng() {
  const base = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  // Append an oversized zero-filled "extra" chunk-like tail. This is not a
  // valid PNG once appended, but it IS still PNG-magic-sniffable and exceeds
  // the byte budget, which is exactly what the max-size check must catch
  // before it ever reaches the decoder.
  return Buffer.concat([base, Buffer.alloc(600 * 1024)]);
}

/** Truncated/corrupted PNG bytes. */
export function truncatedPng() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
}

/** Bytes that are not PNG at all (JPEG magic). */
export function wrongMimeJpegLike() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
}

// --- SVG fixtures -------------------------------------------------------

export const validSimpleSvg =
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#2a5aa0"/></svg>';

/** Same abstract mark, but with generous whitespace/padding preserved in the canvas (for preserve-canvas cropMode tests). */
export const validPaddedSvg =
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="70" y="70" width="60" height="60" fill="#308050"/></svg>';

export const svgWithScript =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';

export const svgWithEventHandler =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';

export const svgWithExternalHref =
  '<svg xmlns="http://www.w3.org/2000/svg"><image href="http://example.invalid/x.png" width="10" height="10"/></svg>';

export const svgWithDataUrl =
  '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AAAA" width="10" height="10"/></svg>';

export const svgWithForeignObject =
  '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>';

export const svgWithAnimation =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animate attributeName="x" to="5" dur="1s"/></rect></svg>';

export const svgWithEntityDoctype =
  '<!DOCTYPE svg [<!ENTITY xxe "boom">]><svg xmlns="http://www.w3.org/2000/svg">&xxe;</svg>';

export const svgWithRemoteFont =
  '<svg xmlns="http://www.w3.org/2000/svg"><style>@font-face{font-family:"x";src:url(http://example.invalid/f.woff)}</style><rect width="10" height="10"/></svg>';

export const malformedSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10">';

export const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>';

export const oversizedSvg = `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${"x".repeat(520 * 1024)} --><rect width="1" height="1"/></svg>`;
