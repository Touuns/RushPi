#!/usr/bin/env node
// CLI: security-validate the token's APPROVED intake file (bound to
// entry.intakePath - never an operator-supplied path) against its
// source-plan entry, verify its SHA-256 matches approvedSourceContentHash,
// and print an evidence report. Never downloads anything - the file must
// already exist locally, placed by a separate, later, approved Codex task.
// Writes no output image; performs no normalization.
//
// There is deliberately no --file flag: the file to inspect is always
// exactly entry.intakePath. A diagnostic override exists ONLY as an internal
// JS API (lib/inspect-source.mjs's `testOnly.fileBufferOverride`), used
// exclusively by selftest.mjs - it is never reachable from this CLI.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { assertProcessable, findPlanEntry, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { inspectApprovedIntake, SourceRejectedError } from "./lib/inspect-source.mjs";
import { getToolchainFingerprint } from "./lib/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");

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
    console.error("Usage: node tools/logos/inspect-source.mjs --token <tokenId> [--plan <path>]");
    process.exit(1);
  }

  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const registry = loadV2Registry(repoRoot);
  const planErrors = validateSourcePlan(plan.entries, registry, { intakeRoot });
  if (planErrors.length > 0) {
    console.error("STOP: source plan is not internally valid; fix it before inspecting any source.");
    for (const e of planErrors) console.error(` - ${e}`);
    process.exit(1);
  }

  try {
    const entry = findPlanEntry(plan, token);
    assertProcessable(entry);

    const result = await inspectApprovedIntake(entry, intakeRoot);
    console.log(JSON.stringify({
      ok: true,
      tokenId: token,
      mime: result.mime,
      width: result.width,
      height: result.height,
      fileSize: result.fileSize,
      actualSourceContentHash: result.actualSourceContentHash,
      toolchain: getToolchainFingerprint(),
    }, null, 2));
  } catch (e) {
    if (e instanceof ProcessingNotPermittedError || e instanceof SourceRejectedError) {
      console.error(`STOP: ${e.name}: ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details));
      process.exit(1);
    }
    throw e;
  }
}

main();
