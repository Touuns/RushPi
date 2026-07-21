#!/usr/bin/env node
// CLI: validate a logo source plan against the approved V2 registry and the
// full set of admin/audit consistency rules. Read-only - performs no network
// access, no file writes, no image processing.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { SOURCE_REVIEW_STATUSES } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");

function parseArgs(argv) {
  const args = { plan: path.join(here, "data", "pilot-source-plan.json") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--plan" && argv[i + 1]) {
      args.plan = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function main() {
  const { plan: planPath } = parseArgs(process.argv.slice(2));
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const registry = loadV2Registry(repoRoot);

  if (plan.catalogVersion !== registry.catalogVersion) {
    console.error(`Source plan catalogVersion "${plan.catalogVersion}" does not match the approved registry catalogVersion "${registry.catalogVersion}".`);
    process.exit(1);
  }

  const errors = validateSourcePlan(plan.entries, registry, { intakeRoot });
  if (errors.length > 0) {
    console.error(`Source plan validation FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  const counts = {};
  for (const status of SOURCE_REVIEW_STATUSES) counts[status] = 0;
  for (const e of plan.entries) counts[e.sourceReviewStatus] = (counts[e.sourceReviewStatus] ?? 0) + 1;

  console.log(`Source plan validation OK: ${plan.entries.length} entries at ${planPath}`);
  console.log(`catalogVersion=${plan.catalogVersion}`);
  console.log(`sourceReviewStatus counts: ${JSON.stringify(counts)}`);
  const approvedCount = plan.entries.filter((e) => e.sourceReviewStatus === "source-approved").length;
  console.log(`processable (source-approved) entries: ${approvedCount}`);
}

main();
