/**
 * Logo INGESTION MANIFEST contract (Phase 12C-1A / hardened in 12C-1A.1) —
 * FOUNDATION ONLY. No logo has been retrieved, converted, generated,
 * rasterized, uploaded or authorized in this phase or in any prior phase.
 * Every V1 entry sits at status "pending" with every ingestion-specific
 * field null.
 *
 * This is deliberately a SEPARATE concept from CanonicalTokenEntry.logo
 * (TokenLogoAsset in types.ts, the lightweight "registry logo metadata"
 * embedded per entry). This manifest instead tracks the full future
 * ingestion pipeline state: where a logo would come from, whether it needs
 * rasterization, and why it was rejected if it was.
 *
 * Hard rules for any future logo ingestion:
 * - logos must be exact authorized/provider assets;
 * - never AI-generated or redrawn;
 * - rasterized before client delivery when the source is SVG (only once the
 *   source format is actually known — requiresRasterization must stay null
 *   until then, never default to true);
 * - normalized to transparent 64px and 128px outputs (normalizedSizes is
 *   always exactly [64, 128]);
 * - content-hashed and immutable once marked "ready".
 *
 * Supabase Storage is the planned future location for the actual image
 * bytes; this phase creates no bucket, migration or upload.
 */

import type { LogoStatus } from "./types";

/**
 * Where a logo is expected to come from once ingested. This describes a
 * PLANNED category, not proof that anything has actually been sourced —
 * every V1 entry uses "authorized-provider" purely as a placeholder
 * classification pending real ingestion in a later phase.
 */
export type LogoSourceType =
  | "official-project"
  | "official-brand-kit"
  | "authorized-provider";

export interface LogoManifestEntry {
  tokenId: string;
  status: LogoStatus;
  sourceType: LogoSourceType;
  /** Required once status is "ready"; may be null before then. */
  sourceReference: string | null;
  /** Required once status is "ready"; may be null before then. */
  sourceMimeType: string | null;
  /**
   * Whether the source must be rasterized before delivery. Stays null until
   * the source format is actually known — never defaults to true.
   */
  requiresRasterization: boolean | null;
  /** Always exactly [64, 128] — the two normalized transparent outputs. */
  normalizedSizes: [64, 128];
  /** 0 while pending/rejected; >= 1 once ready. */
  version: number;
  contentHash: string | null;
  url64: string | null;
  url128: string | null;
  ingestedAt: string | null;
  /** Required once status is "rejected"; null otherwise. */
  rejectionReason: string | null;
}

export interface LogoManifest {
  schemaVersion: number;
  entries: LogoManifestEntry[];
}
