/**
 * Strict parser for the public token logo release manifest
 * (public/data/token-logos/release-manifest.json, served at
 * /data/token-logos/release-manifest.json). Pure function over unknown JSON
 * input — no fetch, no fs, no side effects. Rejects the whole document on
 * the first structural or content violation (fail-fast, all-or-nothing).
 *
 * Field allowlist: the manifest-building tooling also writes a top-level
 * `contentHash` field that this client layer does not model. Required
 * fields are validated strictly; `contentHash` is the only
 * additional top-level field tolerated (present on every committed manifest
 * to date). Any other unrecognized top-level field is rejected. Entry objects
 * have no such carve-out: exactly the eight known fields are accepted.
 */
import type { TokenLogoManifest, TokenLogoManifestEntry } from "./types.ts";

export const SUPPORTED_MANIFEST_SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = [
  "schemaVersion",
  "catalogVersion",
  "logoReleaseVersion",
  "normalizationPolicyVersion",
  "entryCount",
  "entries",
] as const;

/** Top-level fields tolerated beyond the required set (see module doc). */
const ALLOWED_EXTRA_TOP_LEVEL_FIELDS = new Set<string>(["contentHash"]);

const REQUIRED_ENTRY_FIELDS = [
  "tokenId",
  "logoVersion",
  "output64Path",
  "output128Path",
  "output64Hash",
  "output128Hash",
  "output64MimeType",
  "output128MimeType",
] as const;

const TOKEN_ID_RE = /^rpt-\d{4}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const REQUIRED_MIME_TYPE = "image/png";

/**
 * Repository-relative output path shape. Anchored full-match (`^...$`) with a
 * fixed, closed character set at every segment — this alone rejects path
 * traversal (`..`), external URLs (`http://`, `//host/...`) and non-PNG
 * extensions (including `.svg`), since none of those can satisfy the pattern.
 * Capture groups: 1=tokenId, 2=logoVersion, 3=size ("64"|"128"), 4=sha256.
 */
export const TOKEN_LOGO_OUTPUT_PATH_RE =
  /^public\/assets\/rushpi\/token-logos\/(rpt-\d{4})\/v(\d+)\/(64|128)\/([0-9a-f]{64})\.png$/;

export type TokenLogoManifestParseFailureCode =
  | "invalid-root"
  | "unsupported-schema-version"
  | "missing-field"
  | "unknown-field"
  | "invalid-entries"
  | "entry-count-mismatch"
  | "invalid-entry"
  | "duplicate-token-id";

export interface TokenLogoManifestParseFailure {
  readonly ok: false;
  readonly code: TokenLogoManifestParseFailureCode;
  readonly detail: string;
}

export interface TokenLogoManifestParseSuccess {
  readonly ok: true;
  readonly manifest: TokenLogoManifest;
}

export type TokenLogoManifestParseResult =
  | TokenLogoManifestParseSuccess
  | TokenLogoManifestParseFailure;

function fail(code: TokenLogoManifestParseFailureCode, detail: string): TokenLogoManifestParseFailure {
  return { ok: false, code, detail };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function parseEntry(raw: unknown, index: number): TokenLogoManifestEntry | TokenLogoManifestParseFailure {
  if (!isPlainObject(raw)) {
    return fail("invalid-entry", `entries[${index}] is not an object`);
  }

  for (const key of Object.keys(raw)) {
    if (!(REQUIRED_ENTRY_FIELDS as readonly string[]).includes(key)) {
      return fail("invalid-entry", `entries[${index}] has unrecognized field: ${key}`);
    }
  }
  for (const key of REQUIRED_ENTRY_FIELDS) {
    if (!(key in raw)) {
      return fail("invalid-entry", `entries[${index}] is missing field: ${key}`);
    }
  }

  const { tokenId, logoVersion, output64Path, output128Path, output64Hash, output128Hash, output64MimeType, output128MimeType } =
    raw as Record<(typeof REQUIRED_ENTRY_FIELDS)[number], unknown>;

  if (typeof tokenId !== "string" || !TOKEN_ID_RE.test(tokenId)) {
    return fail("invalid-entry", `entries[${index}].tokenId is not a valid rpt-#### id`);
  }
  if (!isPositiveInteger(logoVersion)) {
    return fail("invalid-entry", `entries[${index}].logoVersion must be a positive integer`);
  }
  if (typeof output64MimeType !== "string" || output64MimeType !== REQUIRED_MIME_TYPE) {
    return fail("invalid-entry", `entries[${index}].output64MimeType must be "${REQUIRED_MIME_TYPE}"`);
  }
  if (typeof output128MimeType !== "string" || output128MimeType !== REQUIRED_MIME_TYPE) {
    return fail("invalid-entry", `entries[${index}].output128MimeType must be "${REQUIRED_MIME_TYPE}"`);
  }
  if (typeof output64Hash !== "string" || !SHA256_RE.test(output64Hash)) {
    return fail("invalid-entry", `entries[${index}].output64Hash must be 64 lowercase hex characters`);
  }
  if (typeof output128Hash !== "string" || !SHA256_RE.test(output128Hash)) {
    return fail("invalid-entry", `entries[${index}].output128Hash must be 64 lowercase hex characters`);
  }

  if (typeof output64Path !== "string") {
    return fail("invalid-entry", `entries[${index}].output64Path must be a string`);
  }
  const match64 = TOKEN_LOGO_OUTPUT_PATH_RE.exec(output64Path);
  if (!match64) {
    return fail("invalid-entry", `entries[${index}].output64Path does not match the expected shape`);
  }
  if (match64[3] !== "64") {
    return fail("invalid-entry", `entries[${index}].output64Path must live under a /64/ directory`);
  }
  if (match64[1] !== tokenId) {
    return fail("invalid-entry", `entries[${index}].output64Path tokenId segment does not match entry tokenId`);
  }
  if (match64[4] !== output64Hash) {
    return fail("invalid-entry", `entries[${index}].output64Path filename hash does not match output64Hash`);
  }

  if (typeof output128Path !== "string") {
    return fail("invalid-entry", `entries[${index}].output128Path must be a string`);
  }
  const match128 = TOKEN_LOGO_OUTPUT_PATH_RE.exec(output128Path);
  if (!match128) {
    return fail("invalid-entry", `entries[${index}].output128Path does not match the expected shape`);
  }
  if (match128[3] !== "128") {
    return fail("invalid-entry", `entries[${index}].output128Path must live under a /128/ directory`);
  }
  if (match128[1] !== tokenId) {
    return fail("invalid-entry", `entries[${index}].output128Path tokenId segment does not match entry tokenId`);
  }
  if (match128[4] !== output128Hash) {
    return fail("invalid-entry", `entries[${index}].output128Path filename hash does not match output128Hash`);
  }

  return {
    tokenId,
    logoVersion,
    output64Path,
    output128Path,
    output64Sha256: output64Hash,
    output128Sha256: output128Hash,
    output64MimeType,
    output128MimeType,
  };
}

/** Parse and strictly validate unknown JSON input as a token logo manifest. */
export function parseTokenLogoManifest(input: unknown): TokenLogoManifestParseResult {
  if (!isPlainObject(input)) {
    return fail("invalid-root", "Manifest root must be a JSON object");
  }

  for (const key of Object.keys(input)) {
    if (!(REQUIRED_TOP_LEVEL_FIELDS as readonly string[]).includes(key) && !ALLOWED_EXTRA_TOP_LEVEL_FIELDS.has(key)) {
      return fail("unknown-field", `Unrecognized top-level field: ${key}`);
    }
  }
  for (const key of REQUIRED_TOP_LEVEL_FIELDS) {
    if (!(key in input)) {
      return fail("missing-field", `Missing required top-level field: ${key}`);
    }
  }

  const { schemaVersion, catalogVersion, logoReleaseVersion, normalizationPolicyVersion, entryCount, entries } = input;

  if (schemaVersion !== SUPPORTED_MANIFEST_SCHEMA_VERSION) {
    return fail("unsupported-schema-version", `Unsupported schemaVersion: ${JSON.stringify(schemaVersion)}`);
  }
  if (typeof catalogVersion !== "string" || catalogVersion.length === 0) {
    return fail("missing-field", "catalogVersion must be a non-empty string");
  }
  if (typeof logoReleaseVersion !== "string" || logoReleaseVersion.length === 0) {
    return fail("missing-field", "logoReleaseVersion must be a non-empty string");
  }
  if (!isPositiveInteger(normalizationPolicyVersion)) {
    return fail("missing-field", "normalizationPolicyVersion must be a positive integer");
  }
  if (typeof entryCount !== "number" || !Number.isInteger(entryCount) || entryCount < 0) {
    return fail("missing-field", "entryCount must be a non-negative integer");
  }
  if (!Array.isArray(entries)) {
    return fail("invalid-entries", "entries must be an array");
  }
  if (entryCount !== entries.length) {
    return fail("entry-count-mismatch", `entryCount (${entryCount}) does not match entries.length (${entries.length})`);
  }

  const parsedEntries: TokenLogoManifestEntry[] = [];
  const seenTokenIds = new Set<string>();
  for (let i = 0; i < entries.length; i += 1) {
    const parsed = parseEntry(entries[i], i);
    if ("ok" in parsed) {
      return parsed;
    }
    if (seenTokenIds.has(parsed.tokenId)) {
      return fail("duplicate-token-id", `Duplicate tokenId: ${parsed.tokenId}`);
    }
    seenTokenIds.add(parsed.tokenId);
    parsedEntries.push(parsed);
  }

  return {
    ok: true,
    manifest: {
      schemaVersion,
      catalogVersion,
      logoReleaseVersion,
      normalizationPolicyVersion,
      entryCount,
      entries: parsedEntries,
    },
  };
}
