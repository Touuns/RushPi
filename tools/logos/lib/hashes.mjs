// Content hashing shared by the logo tooling. Mirrors the sha256-hex
// convention used by tools/registry/lib/canonical.mjs.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** @param {Buffer|string} input */
export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

/** @param {string} filePath */
export function sha256File(filePath) {
  return sha256Hex(readFileSync(filePath));
}
