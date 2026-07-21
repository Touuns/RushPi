#!/usr/bin/env node
// CLI: run the full approved-token pipeline (gate -> bound intake read ->
// source-hash match -> security inspection -> deterministic normalization ->
// version-conflict-checked write -> output re-verification -> receipt) for
// exactly one already-approved token.
//
// There is deliberately no --file and no --logo-version flag: the file is
// always exactly entry.intakePath, and the version is always exactly
// entry.expectedLogoVersion. Neither can be overridden from the command
// line. Output/receipt roots are always the real committed locations -
// selftest.mjs never invokes this CLI, it calls
// lib/normalize-pipeline.mjs's normalizeApprovedToken() directly against
// temporary directories, which is the only supported test-only path.
//
// With the shipped pilot-source-plan.json (every entry unresearched), this
// CLI cannot produce any real output or receipt: the processing gate blocks
// it structurally.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { findPlanEntry, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { SourceRejectedError } from "./lib/inspect-source.mjs";
import { NormalizationError } from "./lib/normalize.mjs";
import { OutputConflictError } from "./lib/output-paths.mjs";
import { ReceiptError } from "./lib/receipt.mjs";
import { ApprovalError } from "./lib/approval.mjs";
import { PublishRollbackError } from "./lib/publish-outputs.mjs";
import { normalizeApprovedToken, PipelineError } from "./lib/normalize-pipeline.mjs";
import { TOKEN_LOGOS_OUTPUT_ROOT, RECEIPTS_ROOT, APPROVALS_ROOT } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");
const outputRoot = path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT);
const receiptsRoot = path.join(repoRoot, RECEIPTS_ROOT);
const approvalsRoot = path.join(repoRoot, APPROVALS_ROOT);

function parseArgs(argv) {
  const args = { plan: path.join(here, "data", "pilot-source-plan.json") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--plan" && argv[i + 1]) { args.plan = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--token" && argv[i + 1]) { args.token = argv[i + 1]; i += 1; }
  }
  return args;
}

async function main() {
  const { plan: planPath, token } = parseArgs(process.argv.slice(2));
  if (!token) {
    console.error("Usage: node tools/logos/normalize-source.mjs --token <tokenId> [--plan <path>]");
    process.exit(1);
  }

  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const registry = loadV2Registry(repoRoot);
  const planErrors = validateSourcePlan(plan.entries, registry, { intakeRoot });
  if (planErrors.length > 0) {
    console.error("STOP: source plan is not internally valid; fix it before normalizing any source.");
    for (const e of planErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  try {
    const entry = findPlanEntry(plan, token);
    const { receipt, receiptPath } = await normalizeApprovedToken({ entry, intakeRoot, outputRoot, receiptsRoot, approvalsRoot, repoRoot, registry });
    console.log(JSON.stringify({ ok: true, receiptPath: path.relative(repoRoot, receiptPath), receipt }, null, 2));
  } catch (e) {
    if (
      e instanceof ProcessingNotPermittedError ||
      e instanceof SourceRejectedError ||
      e instanceof NormalizationError ||
      e instanceof OutputConflictError ||
      e instanceof ReceiptError ||
      e instanceof ApprovalError ||
      e instanceof PublishRollbackError ||
      e instanceof PipelineError
    ) {
      console.error(`STOP: ${e.name}: ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details));
      process.exit(1);
    }
    throw e;
  }
}

main();
