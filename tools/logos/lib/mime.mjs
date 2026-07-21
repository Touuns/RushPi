// MIME sniffing by magic bytes / content shape - never trusts a file
// extension. Only PNG raster and SVG (heuristically, text-based) are
// recognized; every other format sniffs to a named type so callers can
// produce a precise rejection reason instead of a silent "unknown".

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const GIF87_MAGIC = Buffer.from("GIF87a", "ascii");
const GIF89_MAGIC = Buffer.from("GIF89a", "ascii");
const BMP_MAGIC = Buffer.from("BM", "ascii");
const RIFF_MAGIC = Buffer.from("RIFF", "ascii");
const WEBP_MAGIC = Buffer.from("WEBP", "ascii");

function startsWith(buf, magic) {
  return buf.length >= magic.length && buf.subarray(0, magic.length).equals(magic);
}

/**
 * Sniff a buffer's coarse MIME type from its content.
 * @param {Buffer} buffer
 * @returns {"image/png"|"image/jpeg"|"image/gif"|"image/bmp"|"image/webp"|"image/svg+xml"|"unknown"}
 */
export function sniffMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return "unknown";

  if (startsWith(buffer, PNG_MAGIC)) return "image/png";
  if (startsWith(buffer, JPEG_MAGIC)) return "image/jpeg";
  if (startsWith(buffer, GIF87_MAGIC) || startsWith(buffer, GIF89_MAGIC)) return "image/gif";
  if (startsWith(buffer, BMP_MAGIC)) return "image/bmp";
  if (startsWith(buffer, RIFF_MAGIC) && buffer.subarray(8, 12).equals(WEBP_MAGIC)) return "image/webp";

  if (looksLikeSvgText(buffer)) return "image/svg+xml";

  return "unknown";
}

// SVG has no fixed magic bytes: it is XML/text. This heuristic only decides
// whether the content is shaped like SVG for routing purposes - it makes NO
// claim about safety. All safety checks live in scan-svg.mjs and run
// regardless of this heuristic's result.
function looksLikeSvgText(buffer) {
  // Only consider the first few KB - enough to find the root element without
  // reading a potentially huge file fully for this cheap check.
  const headBuf = buffer.subarray(0, Math.min(buffer.length, 4096));
  // A NUL byte in the sampled head is a strong signal of a binary format we
  // don't recognize rather than XML/SVG text.
  if (headBuf.includes(0x00)) return false;

  const head = headBuf.toString("utf8");
  // Strip a UTF-8 BOM if present.
  const stripped = head.charCodeAt(0) === 0xfeff ? head.slice(1) : head;
  const trimmed = stripped.replace(/^\s+/, "");
  if (trimmed.length === 0) return false;
  return /^(<\?xml[\s\S]*?\?>)?\s*(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(trimmed);
}
