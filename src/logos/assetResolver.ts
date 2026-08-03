/**
 * Browser URL resolution for logo assets. Deliberately narrow: this never
 * accepts an arbitrary string, only a repository-relative path shape already
 * accepted by TOKEN_LOGO_OUTPUT_PATH_RE (manifestParser.ts) — i.e. a path
 * that has already survived parseTokenLogoManifest. No protocol/host
 * support, no fallback to a remote source/provider URL — this module only
 * ever resolves a verified local asset path.
 *
 * Device-size selection is intentionally decoupled from
 * src/game/productionAssets.ts (resolveDeviceTier / Phaser-adjacent) so this
 * module has zero Phaser dependency and stays trivially unit-testable. A
 * caller that already knows the device tier passes it in explicitly.
 */
import { TOKEN_LOGO_OUTPUT_PATH_RE } from "./manifestParser.ts";
import type { TokenLogoManifestEntry } from "./types.ts";

const REPO_PUBLIC_PREFIX = "public/";

/**
 * Convert a repository-relative path (as found on a manifest entry, e.g.
 * "public/assets/rushpi/token-logos/rpt-0001/v1/64/<hash>.png") to the
 * same-origin browser path ("/assets/rushpi/token-logos/rpt-0001/v1/64/<hash>.png").
 * Throws if the path was not produced by the strict manifest parser — this is
 * a caller precondition violation, not an untrusted-input case.
 */
export function toBrowserAssetPath(repoRelativePath: string): string {
  if (!TOKEN_LOGO_OUTPUT_PATH_RE.test(repoRelativePath)) {
    throw new Error("toBrowserAssetPath: path was not validated by the token logo manifest parser");
  }
  return `/${repoRelativePath.slice(REPO_PUBLIC_PREFIX.length)}`;
}

/**
 * Narrow, explicit density signal — no dependency on resolveDeviceTier() or
 * any other Phaser-adjacent module. Callers that already have a DPR-based
 * tier map it to this before calling resolvePreferredLogoAsset.
 */
export type LogoDensityPreference = "standard" | "high-density";

export type ResolvedLogoSize = 64 | 128;

export interface ResolvedTokenLogoAsset {
  readonly tokenId: string;
  readonly logoVersion: number;
  readonly browserPath: string;
  readonly sha256: string;
  readonly mimeType: string;
  readonly size: ResolvedLogoSize;
}

/**
 * Pick exactly one raster size for a manifest entry: 128px when the caller
 * indicates a high-density device (DPR >= 2), 64px otherwise. Pure — no
 * loading, no caching, no image request.
 */
export function resolvePreferredLogoAsset(
  entry: TokenLogoManifestEntry,
  densityPreference: LogoDensityPreference,
): ResolvedTokenLogoAsset {
  const useHighDensity = densityPreference === "high-density";
  return {
    tokenId: entry.tokenId,
    logoVersion: entry.logoVersion,
    browserPath: toBrowserAssetPath(useHighDensity ? entry.output128Path : entry.output64Path),
    sha256: useHighDensity ? entry.output128Sha256 : entry.output64Sha256,
    mimeType: useHighDensity ? entry.output128MimeType : entry.output64MimeType,
    size: useHighDensity ? 128 : 64,
  };
}
