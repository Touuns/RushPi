/**
 * Token logo manifest types (Phase 12C-1B2C-2D1B) — minimal runtime-only
 * representation of the public release manifest at
 * /data/token-logos/release-manifest.json. This mirrors only what the client
 * needs to resolve a logo asset; it does not model approval, receipt or
 * tooling schemas owned elsewhere in the repository.
 */

/** One published logo (both raster sizes) for a single canonical token. */
export interface TokenLogoManifestEntry {
  readonly tokenId: string;
  readonly logoVersion: number;
  readonly output64Path: string;
  readonly output128Path: string;
  readonly output64Sha256: string;
  readonly output128Sha256: string;
  readonly output64MimeType: string;
  readonly output128MimeType: string;
}

/** The parsed, validated release manifest. */
export interface TokenLogoManifest {
  readonly schemaVersion: number;
  readonly catalogVersion: string;
  readonly logoReleaseVersion: string;
  readonly normalizationPolicyVersion: number;
  readonly entryCount: number;
  readonly entries: readonly TokenLogoManifestEntry[];
}
