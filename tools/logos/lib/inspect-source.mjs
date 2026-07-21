// Orchestrates full security validation of a local intake file against its
// approved source-plan entry (Phase 12C-1B2B). Used by both inspect-source.mjs
// (report-only) and normalize-source.mjs (as a mandatory pre-normalize gate -
// normalize-source never trusts a prior inspection result blindly).
import { sniffMime } from "./mime.mjs";
import { scanSvgText } from "./scan-svg.mjs";
import { inspectRasterBuffer, RasterRejectedError } from "./inspect-raster.mjs";
import { rasterizeSvg, NormalizationError } from "./normalize.mjs";
import { sha256Hex } from "./hashes.mjs";
import { MAX_RASTER_INPUT_BYTES, MAX_SVG_INPUT_BYTES } from "./constants.mjs";

export class SourceRejectedError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "SourceRejectedError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * @param {Buffer} fileBuffer  raw bytes read from the local intake file
 * @param {{ expectedMimeClass:string, allowExtremeAspectRatio?:boolean }} planEntry
 * @returns {Promise<{ mime:string, width:number, height:number, fileSize:number, sha256:string, rasterForNormalization:Buffer }>}
 */
export async function inspectSource(fileBuffer, planEntry) {
  const fileSize = fileBuffer.length;
  const sniffed = sniffMime(fileBuffer);

  if (planEntry.expectedMimeClass === "image/png") {
    if (sniffed !== "image/png") {
      throw new SourceRejectedError("mime-mismatch", { expected: "image/png", sniffed });
    }
    if (fileSize > MAX_RASTER_INPUT_BYTES) {
      throw new SourceRejectedError("raster-exceeds-max-bytes", { fileSize });
    }
    let info;
    try {
      info = await inspectRasterBuffer(fileBuffer, { allowExtremeAspectRatio: planEntry.allowExtremeAspectRatio === true });
    } catch (e) {
      if (e instanceof RasterRejectedError) throw new SourceRejectedError(e.reason, e.details);
      throw e;
    }
    return {
      mime: "image/png",
      width: info.width,
      height: info.height,
      fileSize,
      sha256: sha256Hex(fileBuffer),
      rasterForNormalization: fileBuffer,
    };
  }

  if (planEntry.expectedMimeClass === "image/svg+xml") {
    if (sniffed !== "image/svg+xml") {
      throw new SourceRejectedError("mime-mismatch", { expected: "image/svg+xml", sniffed });
    }
    if (fileSize > MAX_SVG_INPUT_BYTES) {
      throw new SourceRejectedError("svg-exceeds-max-bytes", { fileSize });
    }
    const text = fileBuffer.toString("utf8");
    const scan = scanSvgText(text);
    if (!scan.ok) {
      throw new SourceRejectedError("svg-security-check-failed", { reasons: scan.reasons });
    }
    let rasterized;
    try {
      rasterized = rasterizeSvg(text);
    } catch (e) {
      if (e instanceof NormalizationError) throw new SourceRejectedError(e.reason);
      throw e;
    }
    let info;
    try {
      info = await inspectRasterBuffer(rasterized, { allowExtremeAspectRatio: planEntry.allowExtremeAspectRatio === true });
    } catch (e) {
      if (e instanceof RasterRejectedError) throw new SourceRejectedError(e.reason, e.details);
      throw e;
    }
    return {
      mime: "image/svg+xml",
      width: info.width,
      height: info.height,
      fileSize,
      sha256: sha256Hex(fileBuffer),
      rasterForNormalization: rasterized,
    };
  }

  throw new SourceRejectedError("unsupported-expected-mime-class", { expectedMimeClass: planEntry.expectedMimeClass });
}
