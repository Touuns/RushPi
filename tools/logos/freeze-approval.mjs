#!/usr/bin/env node
// CLI: freeze the CURRENT approved source-plan entry for one token into an
// IMMUTABLE approval record (Phase 12C-1B2B.2). This is the moment a mutable,
// editable plan entry becomes a permanent, auditable decision bound to an
// exact logoVersion - later edits to the plan (e.g. preparing logoVersion 2)
// can never retroactively alter this frozen record.
//
// Performs no network retrieval: it only reads the local intake file already
// placed under tools/logos/intake/ and verifies its bytes already match
// approvedSourceContentHash before freezing.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { findPlanEntry, assertProcessable, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { readApprovedIntakeFile, SourceRejectedError } from "./lib/inspect-source.mjs";
import { sha256Hex } from "./lib/hashes.mjs";
import { buildApprovalRecord, writeApprovalRecordAtomically, verifyApprovalMatchesRegistry, ApprovalError } from "./lib/approval.mjs";
import { UnsafePathError } from "./lib/path-safety.mjs";
import { APPROVALS_ROOT } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");
const approvalsRoot = path.join(repoRoot, APPROVALS_ROOT);

function parseArgs(argv) {
  const args = { plan: path.join(here, "data", "pilot-source-plan.json") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--plan" && argv[i + 1]) { args.plan = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--token" && argv[i + 1]) { args.token = argv[i + 1]; i += 1; }
  }
  return args;
}

function main() {
  const { plan: planPath, token } = parseArgs(process.argv.slice(2));
  if (!token) {
    console.error("Usage: node tools/logos/freeze-approval.mjs --token <tokenId> [--plan <path>]");
    process.exit(1);
  }

  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const registry = loadV2Registry(repoRoot);

  // Validate the COMPLETE plan first - a single bad entry elsewhere must not
  // silently be ignored just because we only care about one token here.
  const planErrors = validateSourcePlan(plan.entries, registry, { intakeRoot });
  if (planErrors.length > 0) {
    console.error("STOP: source plan is not internally valid; fix it before freezing any approval.");
    for (const e of planErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  try {
    const entry = findPlanEntry(plan, token);
    // require source-approved + a processable permission state (also implies
    // approvedSourceContentHash/expectedLogoVersion/intakePath/provider-
    // fallback fields are all already valid, per validateSourcePlan above).
    assertProcessable(entry);

    // Verify the CURRENT intake bytes already exist and match
    // approvedSourceContentHash - never trust the plan's claim alone.
    const fileBuffer = readApprovedIntakeFile(entry, intakeRoot);
    const actualHash = sha256Hex(fileBuffer);
    if (actualHash !== entry.approvedSourceContentHash) {
      console.error(`STOP: intake bytes for ${token} do not match approvedSourceContentHash (actual ${actualHash}).`);
      process.exit(1);
    }

    const record = buildApprovalRecord(entry);
    const registryErrors = verifyApprovalMatchesRegistry(record, registry);
    if (registryErrors.length > 0) {
      console.error("STOP: approval record does not match the approved registry:");
      for (const e of registryErrors) console.error(` - ${e}`);
      process.exit(1);
    }

    const writtenPath = writeApprovalRecordAtomically(approvalsRoot, record);
    console.log(JSON.stringify({ ok: true, approvalPath: path.relative(repoRoot, writtenPath), record }, null, 2));
  } catch (e) {
    if (e instanceof ProcessingNotPermittedError || e instanceof SourceRejectedError || e instanceof UnsafePathError || e instanceof ApprovalError) {
      console.error(`STOP: ${e.name}: ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details));
      process.exit(1);
    }
    throw e;
  }
}

main();
