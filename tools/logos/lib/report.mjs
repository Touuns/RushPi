// Toolchain fingerprint + report helpers (Phase 12C-1B2B). Recorded in every
// generated processing report so committed output bytes can later be traced
// back to the exact pinned toolchain that produced them. Byte-identical
// output is only guaranteed within the same pinned toolchain (see README) -
// this fingerprint is what lets a future run detect a toolchain drift.
import sharp from "sharp";
import { createRequire } from "node:module";
import { NORMALIZATION_POLICY_VERSION } from "./constants.mjs";

const require = createRequire(import.meta.url);

/**
 * @returns {{ nodeVersion:string, platform:string, arch:string, sharpVersion:string, libvipsVersion:string, resvgVersion:string, normalizationPolicyVersion:number }}
 */
export function getToolchainFingerprint() {
  let resvgVersion = "unresolved";
  try {
    resvgVersion = require("@resvg/resvg-js/package.json").version;
  } catch {
    resvgVersion = "unresolved";
  }
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    sharpVersion: sharp.versions.sharp,
    libvipsVersion: sharp.versions.vips,
    resvgVersion,
    normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
  };
}
