/**
 * Public API surface of the token logo manifest client layer
 * (Phase 12C-1B2C-2D1B). Not yet imported by Daily/Phaser/tokenAssetCache —
 * this phase is client-layer only.
 */
export type { TokenLogoManifest, TokenLogoManifestEntry } from "./types.ts";
export {
  parseTokenLogoManifest,
  SUPPORTED_MANIFEST_SCHEMA_VERSION,
  TOKEN_LOGO_OUTPUT_PATH_RE,
  type TokenLogoManifestParseResult,
  type TokenLogoManifestParseSuccess,
  type TokenLogoManifestParseFailure,
  type TokenLogoManifestParseFailureCode,
} from "./manifestParser.ts";
export {
  buildManifestIndex,
  lookupManifestEntry,
  type TokenLogoManifestIndex,
} from "./manifestIndex.ts";
export {
  toBrowserAssetPath,
  resolvePreferredLogoAsset,
  type LogoDensityPreference,
  type ResolvedLogoSize,
  type ResolvedTokenLogoAsset,
} from "./assetResolver.ts";
export {
  checkCatalogCompatibility,
  type CatalogCompatibilityResult,
} from "./catalogCompatibility.ts";
export { resolveTokenIdFromCoinGeckoId } from "./coingeckoTokenMap.ts";
export {
  fetchTokenLogoManifest,
  TOKEN_LOGO_MANIFEST_URL,
  type TokenLogoManifestFetchResult,
  type TokenLogoManifestFetchSuccess,
  type TokenLogoManifestFetchFailure,
} from "./manifestClient.ts";
