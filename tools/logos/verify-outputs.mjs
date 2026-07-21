#!/usr/bin/env node
// CLI: verify every committed output PNG under the output root AND that it
// is backed by a verified processing receipt (Phase 12C-1B2B.1). A manually
// placed output file with no matching receipt is rejected as an orphan.
// Read-only. Handles an absent/empty output root gracefully (0 outputs and 0
// receipts is a valid, expected state before any pilot logo is published).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { loadAllReceipts, verifyReceiptAgainstOutputs } from "./lib/receipt.mjs";
import { verifyOutputTreeShape } from "./lib/output-tree.mjs";
import { TOKEN_LOGOS_OUTPUT_ROOT, RECEIPTS_ROOT } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

function parseArgs(argv) {
  const args = {
    repoRoot,
    root: path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT),
    receiptsRoot: path.join(repoRoot, RECEIPTS_ROOT),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo-root" && argv[i + 1]) { args.repoRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--root" && argv[i + 1]) { args.root = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--receipts-root" && argv[i + 1]) { args.receiptsRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
  }
  return args;
}

async function main() {
  const { repoRoot: effectiveRepoRoot, root, receiptsRoot } = parseArgs(process.argv.slice(2));
  const registry = loadV2Registry(effectiveRepoRoot);

  const { errors: shapeErrors, found, verifiedFileCount } = await verifyOutputTreeShape(root, registry);
  const { receipts, errors: receiptLoadErrors } = loadAllReceipts(receiptsRoot);

  const errors = [...shapeErrors, ...receiptLoadErrors];

  const receiptKeys = new Set(receipts.map((r) => `${r.tokenId}:${r.logoVersion}`));
  for (const key of found) {
    if (!receiptKeys.has(key)) {
      const [tokenId, logoVersion] = key.split(":");
      errors.push(`orphan published output with no matching receipt: ${tokenId} v${logoVersion}`);
    }
  }
  for (const receipt of receipts) {
    const key = `${receipt.tokenId}:${receipt.logoVersion}`;
    if (!found.has(key)) {
      errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} has no complete matching published output (incomplete 64/128 pair or missing entirely)`);
      continue;
    }
    const verifyErrs = await verifyReceiptAgainstOutputs(receipt, effectiveRepoRoot, registry);
    errors.push(...verifyErrs);
  }

  if (errors.length > 0) {
    console.error(`Output verification FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`Output verification OK: ${verifiedFileCount} output file(s), ${receipts.length} matching verified receipt(s) at ${root}${verifiedFileCount === 0 ? " (no outputs published yet)" : ""}`);
}

main();
