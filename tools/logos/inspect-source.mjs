#!/usr/bin/env node
// CLI: security-validate a local intake file against its approved source-plan
// entry and print an evidence report. Never downloads anything - the file
// must already exist locally, placed by a separate, later, approved Codex
// task. Writes no output image; performs no normalization.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { assertProcessable, findPlanEntry, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { resolveSafePath, UnsafePathError } from "./lib/path-safety.mjs";
import { inspectSource, SourceRejectedError } from "./lib/inspect-source.mjs";
import { getToolchainFingerprint } from "./lib/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");

function parseArgs(argv) {
  const args = { plan: path.join(here, "data", "pilot-source-plan.json") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--plan" && argv[i + 1]) { args.plan = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--token" && argv[i + 1]) { args.token = argv[i + 1]; i += 1; }
    else if (argv[i] === "--file" && argv[i + 1]) { args.file = argv[i + 1]; i += 1; }
  }
  return args;
}

async function main() {
  const { plan: planPath, token, file } = parseArgs(process.argv.slice(2));
  if (!token || !file) {
    console.error("Usage: node tools/logos/inspect-source.mjs --token <tokenId> --file <relative-intake-path>");
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

    const safePath = resolveSafePath(intakeRoot, file);
    const fileBuffer = readFileSync(safePath);

    const result = await inspectSource(fileBuffer, entry);
    console.log(JSON.stringify({
      ok: true,
      tokenId: token,
      mime: result.mime,
      width: result.width,
      height: result.height,
      fileSize: result.fileSize,
      sha256: result.sha256,
      toolchain: getToolchainFingerprint(),
    }, null, 2));
  } catch (e) {
    if (e instanceof ProcessingNotPermittedError || e instanceof UnsafePathError || e instanceof SourceRejectedError) {
      console.error(`STOP: ${e.name}: ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details));
      process.exit(1);
    }
    throw e;
  }
}

main();
