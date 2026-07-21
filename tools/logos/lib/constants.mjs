// Shared constants for the token-logo ingestion tooling (Phase 12C-1B2B).
// No network access, no current time enters any hashed/deterministic content.

export const V2_CATALOG_PATH = "registry/tokens/v2-proposal/registry.json";
export const V1_CATALOG_PATH = "registry/tokens/v1/registry.json";

// Same shape as tools/registry — internal Rush Pi tokenId, never derived from
// array position, shared across V1 and V2.
export const TOKEN_ID_PATTERN = /^rpt-[0-9]{4}$/;

export const SCHEMA_VERSION = 1;
export const NORMALIZATION_POLICY_VERSION = 1;

export const OUTPUT_SIZES = Object.freeze([64, 128]);

// --- Source review lifecycle (separate from output-processing status) -----
export const SOURCE_REVIEW_STATUSES = new Set([
  "unresearched",
  "candidate-found",
  "identity-verified",
  "source-approved",
  "source-rejected",
  "needs-human-review",
]);

export const PERMISSION_REVIEW_STATUSES = new Set([
  "unreviewed",
  "permission-confirmed",
  "explicit-product-exception",
  "rejected",
  "needs-legal-review",
]);

// Permission states that make a source-approved entry eligible for processing.
export const PROCESSABLE_PERMISSION_STATUSES = new Set([
  "permission-confirmed",
  "explicit-product-exception",
]);

// Source type classification. "authorized-provider" is the controlled
// fallback path and requires the extra providerFallbackApproved fields.
export const SOURCE_TYPES = new Set([
  "official-brand-kit",
  "official-project-website",
  "official-github",
  "official-documentation",
  "authorized-provider",
]);
export const PROVIDER_FALLBACK_SOURCE_TYPE = "authorized-provider";

export const VARIANT_TYPES = new Set(["icon", "full-mark"]);
export const CROP_MODES = new Set(["alpha-bounds", "preserve-canvas"]);

// What MIME class the approved source is expected to be. Deliberately
// separate from sniffed MIME so a source plan can be reviewed and approved
// before any file is ever read.
export const EXPECTED_MIME_CLASSES = new Set(["image/png", "image/svg+xml"]);

// --- Security limits --------------------------------------------------
export const MAX_RASTER_INPUT_BYTES = 512 * 1024;
export const MAX_RASTER_DIMENSION = 4096;
export const MAX_RASTER_PIXELS = 16_777_216; // 4096 * 4096
export const MAX_SVG_INPUT_BYTES = 512 * 1024;

// Reject width:height (or height:width) beyond this ratio unless the source
// plan entry explicitly sets allowExtremeAspectRatio=true. Not part of the
// literal field list in the phase brief, but required by its rule "reject
// extreme aspect ratios unless source plan explicitly permits them" — added
// as a documented optional admin field (see README).
export const EXTREME_ASPECT_RATIO_THRESHOLD = 3;

// Fixed rasterization width used when rendering an approved SVG source to
// pixels before normalization. Only the resulting raster is ever processed.
export const SVG_RASTER_TARGET_WIDTH = 1024;

// --- Normalization policy (normalizationPolicyVersion = 1) -------------
export const MAX_VISIBLE_OCCUPANCY = 0.88; // of the output canvas
export const MIN_PADDING_RATIO = 0.06; // per limiting side
export const OUTPUT_BIT_DEPTH = 8;
export const OUTPUT_COLOR_SPACE = "srgb";

// Fixed, deterministic PNG encoder settings — never varied per token.
export const PNG_ENCODE_OPTIONS = Object.freeze({
  compressionLevel: 9,
  adaptiveFiltering: false,
  palette: false,
  effort: 10,
});

// --- Storage / paths -----------------------------------------------------
export const TOKEN_LOGOS_OUTPUT_ROOT = "public/assets/rushpi/token-logos";
