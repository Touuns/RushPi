/**
 * Canonical token registry contract (Phase 12C-1A). Server-safe types only —
 * no Node-only imports here so this module stays safe to mirror or import
 * from any future context (server endpoint, build tool, or client code).
 *
 * This is the FOUNDATION only: it freezes the shape of a scalable, immutable
 * canonical token registry and the current 36-token V1 catalog as its first
 * artifact. It does not change what Daily selection reads today — that still
 * consumes api/_lib/tokenCatalog.ts (TOKEN_CATALOG) and TOKEN_RULES_VERSION.
 *
 * Two identities stay strictly separate:
 * - challengeAlgorithmVersion: version of selection/scheduling/validation
 *   rules (legacy value stays 1; unrelated to TOKEN_RULES_VERSION in
 *   dailyTokenChallenge.ts, which governs the existing Daily Token Rush
 *   ruleset and is not touched by this phase).
 * - catalogVersion: immutable identity of an exact registry artifact,
 *   content-derived (see hash.ts) — never a mutable label like "latest".
 */

import type { TokenCategory } from "../tokenCatalog";

export type { TokenCategory };

export type TokenStatus = "active" | "inactive" | "deprecated";

export type EligibilityTier =
  | "anchor"
  | "core"
  | "established"
  | "discovery"
  | "excluded";

export type AssetClass =
  | "native"
  | "token"
  | "wrapped"
  | "bridged"
  | "stablecoin"
  | "meme"
  | "other";

export type LogoStatus = "pending" | "ready" | "rejected";

/**
 * Required internal tokenId format for the frozen V1 artifact. tokenId is
 * assigned once by hand (see tools/registry/data/v1-metadata.mjs) and never
 * computed from array position or renumbered — this pattern only documents
 * the expected shape, it does not derive values.
 */
export const V1_TOKEN_ID_PATTERN = /^rpt-[0-9]{4}$/;

/** Extensible provider ID bag. Adding a new provider never changes tokenId. */
export interface TokenProviderIds {
  coingecko?: string;
  [providerKey: string]: string | undefined;
}

/** Metadata only — no contract-address ingestion in this phase. */
export interface TokenNetworkRef {
  name: string;
  contractAddress?: string;
}

/**
 * Logo asset state. url64/url128/contentHash may be null while status is
 * "pending". A "ready" logo MUST carry contentHash, version >= 1, url64,
 * url128 and source — enforced by tools/registry/validate.mjs, never by
 * convention alone.
 *
 * Logo sourcing rules (documented here, enforced later in 12C when logos are
 * actually ingested):
 * - exact authorized/provider assets only, never AI-generated or redrawn;
 * - rasterized before client delivery when the source is SVG;
 * - normalized to transparent 64px and 128px outputs;
 * - content-hashed and immutable once ready.
 */
export interface TokenLogoAsset {
  status: LogoStatus;
  version: number;
  contentHash: string | null;
  url64: string | null;
  url128: string | null;
  source: string | null;
  sourceReference: string | null;
  ingestedAt: string | null;
}

/**
 * A single canonical registry entry. tokenId is the stable Rush Pi internal
 * identifier: assigned once, immutable after publication, never derived at
 * runtime, and never a symbol or a provider primary key (providerIds.coingecko
 * is the provider-side key and can change independently of tokenId).
 *
 * tools/registry/lib/validateEntries.mjs enforces that tokenId can never
 * collide (case-insensitively) with any symbol, slug, provider ID or alias
 * anywhere in the registry — the identity namespaces must never mix.
 *
 * name and slug are curated canonical metadata authored for this registry —
 * unlike category/symbol/providerIds.coingecko, they have no equivalent field
 * in the legacy production catalog (api/_lib/tokenCatalog.ts) to be checked
 * against, so they cannot be claimed as literal production parity. See
 * tools/registry/README.md.
 */
export interface CanonicalTokenEntry {
  tokenId: string;
  name: string;
  symbol: string;
  slug: string;
  category: TokenCategory;
  status: TokenStatus;
  eligibilityTier: EligibilityTier;
  assetClass: AssetClass;
  providerIds: TokenProviderIds;
  /** Previous names, symbols or provider IDs — empty array, never omitted. */
  aliases: string[];
  /** Explicit grouping required whenever two entries share a symbol. */
  symbolConflictGroup?: string;
  networks: TokenNetworkRef[];
  exclusionReason?: string;
  /**
   * Explicit human approval escape hatch: an active, Daily-eligible entry
   * with assetClass "wrapped" or "bridged" fails validation unless this is
   * true. No V1 entry needs it (none are wrapped/bridged).
   */
  wrappedOrBridgedApproved?: boolean;
  logo: TokenLogoAsset;
}

/**
 * The immutable registry artifact. Two builds from identical source data
 * must produce byte-identical entries, the same contentHash and the same
 * catalogVersion — see tools/registry/lib/canonical.mjs. generatedAt is
 * intentionally NOT part of this type: current time must never enter
 * deterministic content.
 */
export interface TokenRegistryArtifact {
  schemaVersion: number;
  catalogVersion: string;
  entryCount: number;
  contentHash: string;
  entries: CanonicalTokenEntry[];
}

/**
 * FUTURE LEGACY CONTRACT (types only — no dispatch logic in this phase).
 * The eventual V2 challenge seed will carry both identities below so
 * validation can select the right ruleset AND the right registry artifact.
 * challengeAlgorithmVersion stays 1 (legacy) until 12C-2 introduces a V2
 * selector; this phase must not change the current seed or challenge ID.
 */
export const LEGACY_CHALLENGE_ALGORITHM_VERSION = 1;

export interface ChallengeRegistrySelector {
  challengeAlgorithmVersion: number;
  catalogVersion: string;
}
