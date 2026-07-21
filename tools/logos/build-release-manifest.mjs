#!/usr/bin/env node
// CLI: build the public logo-release manifest EXCLUSIVELY from verified
// processing receipts that are themselves bound to a valid, matching
// IMMUTABLE approval record (Phase 12C-1B2B, hardened in 12C-1B2B.1/.2) -
// directory discovery is never trusted, and a receipt with no approval
// record (or a mismatched one) is rejected as unbound.
//
// Contains ONLY safe-for-client fields (schemaVersion, logoReleaseVersion,
// normalizationPolicyVersion, catalogVersion, tokenId, logoVersion, output
// paths/hashes, output MIME types) - never a source URL, approval identity,
// intake path, source-hash or approval-hash field.
//
// For every receipt: validated against the V2 registry, catalogVersion and
// normalizationPolicyVersion; both output files must exist with recomputed
// hashes, correct dimensions, PNG format and alpha; its approval record must
// exist, be internally valid, match the current registry, and its content
// hash must equal the receipt's own approvalRecordContentHash. A token with
// more than one verified receipted logoVersion requires an explicit,
// itself-validated entry in data/release-selection.json - the highest
// version number is NEVER auto-inferred. Any invalid/incomplete/ambiguous/
// unbound receipt FAILS THE BUILD LOUDLY rather than being silently skipped.
//
// With zero committed receipts (the state shipped in this phase), this
// produces a manifest with entries: [] - a declaration of "no logos ready
// yet", not itself a logo asset.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { loadAllReceipts, verifyReceiptAgainstOutputs, verifyReceiptApprovalBinding } from "./lib/receipt.mjs";
import { selectReceiptsForRelease, receiptToPublicEntry } from "./lib/release-builder.mjs";
import { validateReleaseSelection } from "./lib/validate-release-selection.mjs";
import { buildReleaseManifest, validateReleaseManifest } from "./lib/release-manifest.mjs";
import { RECEIPTS_ROOT, RELEASE_SELECTION_PATH, APPROVALS_ROOT } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

function parseArgs(argv) {
  const args = {
    repoRoot,
    receiptsRoot: path.join(repoRoot, RECEIPTS_ROOT),
    approvalsRoot: path.join(repoRoot, APPROVALS_ROOT),
    selectionPath: path.join(repoRoot, RELEASE_SELECTION_PATH),
    out: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo-root" && argv[i + 1]) { args.repoRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--receipts-root" && argv[i + 1]) { args.receiptsRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--approvals-root" && argv[i + 1]) { args.approvalsRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--selection" && argv[i + 1]) { args.selectionPath = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--out" && argv[i + 1]) { args.out = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
  }
  return args;
}

async function main() {
  const { repoRoot: effectiveRepoRoot, receiptsRoot, approvalsRoot, selectionPath, out } = parseArgs(process.argv.slice(2));
  const registry = loadV2Registry(effectiveRepoRoot);

  const { receipts, errors: loadErrors } = loadAllReceipts(receiptsRoot);
  if (loadErrors.length > 0) {
    console.error(`Release manifest build FAILED (${loadErrors.length} receipt loading error(s)):`);
    for (const e of loadErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  const verificationErrors = [];
  for (const receipt of receipts) {
    verificationErrors.push(...(await verifyReceiptAgainstOutputs(receipt, effectiveRepoRoot, registry)));
    verificationErrors.push(...verifyReceiptApprovalBinding(receipt, approvalsRoot, registry));
  }
  if (verificationErrors.length > 0) {
    console.error(`Release manifest build FAILED (${verificationErrors.length} receipt verification error(s)):`);
    for (const e of verificationErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  let selection = { schemaVersion: 1, selections: {} };
  try {
    selection = JSON.parse(readFileSync(selectionPath, "utf8"));
  } catch {
    console.error(`Release manifest build FAILED: could not read release-selection file at ${selectionPath}`);
    process.exit(1);
  }

  const selectionErrors = validateReleaseSelection(selection, receipts, registry);
  if (selectionErrors.length > 0) {
    console.error(`Release manifest build FAILED (${selectionErrors.length} release-selection error(s)):`);
    for (const e of selectionErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  const { chosen, errors: pickErrors } = selectReceiptsForRelease(receipts, selection);
  if (pickErrors.length > 0) {
    console.error(`Release manifest build FAILED (${pickErrors.length} selection error(s)):`);
    for (const e of pickErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  const entries = chosen.map(receiptToPublicEntry);
  const manifest = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
  const manifestErrors = validateReleaseManifest(manifest, registry);
  if (manifestErrors.length > 0) {
    console.error(`Release manifest build FAILED (${manifestErrors.length} manifest error(s)):`);
    for (const e of manifestErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (out) {
    writeFileSync(out, json);
    console.log(`Wrote ${out}`);
  } else {
    console.log(json);
  }
  console.log(`logoReleaseVersion=${manifest.logoReleaseVersion} entryCount=${manifest.entryCount} (from ${receipts.length} verified, approval-bound receipt(s))`);
}

main();
