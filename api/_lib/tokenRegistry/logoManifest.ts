/**
 * Logo manifest contract (Phase 12C-1A) — FOUNDATION ONLY. Defines the shape
 * that a future logo ingestion pipeline must produce; no retrieval,
 * conversion, generation, upload or placement happens in this phase.
 *
 * Hard rules for any future logo ingestion:
 * - logos must be exact authorized/provider assets;
 * - never AI-generated or redrawn;
 * - rasterized before client delivery when the source is SVG;
 * - normalized to transparent 64px and 128px outputs;
 * - content-hashed and immutable once marked "ready".
 *
 * Supabase Storage is the planned future location for the actual image
 * bytes; this phase creates no bucket, migration or upload.
 */

import type { LogoStatus } from "./types";

export interface LogoManifestEntry {
  tokenId: string;
  status: LogoStatus;
  sourceType: "authorized-provider-asset";
  requiresRasterization: boolean;
  normalizedSizes: [64, 128];
  contentHash: string | null;
  ingestedAt: string | null;
}

export interface LogoManifest {
  schemaVersion: number;
  entries: LogoManifestEntry[];
}
