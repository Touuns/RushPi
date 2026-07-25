/**
 * Pure compatibility check between an expected registry catalogVersion and a
 * parsed manifest's catalogVersion. Never hard-fails — returns a result so a
 * future loader can fall back to procedural rendering on a mismatch. Not
 * wired into Daily yet (Phase 12C-1B2C-2D1B is client-layer only).
 */
import type { TokenLogoManifest } from "./types.ts";

export type CatalogCompatibilityResult =
  | { readonly compatible: true }
  | { readonly compatible: false; readonly expectedCatalogVersion: string; readonly actualCatalogVersion: string };

export function checkCatalogCompatibility(
  expectedCatalogVersion: string,
  manifest: TokenLogoManifest,
): CatalogCompatibilityResult {
  if (manifest.catalogVersion === expectedCatalogVersion) {
    return { compatible: true };
  }
  return {
    compatible: false,
    expectedCatalogVersion,
    actualCatalogVersion: manifest.catalogVersion,
  };
}
