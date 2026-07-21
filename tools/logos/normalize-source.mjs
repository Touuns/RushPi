#!/usr/bin/env node
// CLI: security-validate (never trusting a prior result) then deterministically
// normalize an approved local intake file into 64x64/128x128 transparent PNG
// outputs, writing them to their immutable content-hash path. Refuses to
// overwrite a conflicting already-published (tokenId, logoVersion, size).
//
// With the shipped pilot-source-plan.json (every entry unresearched), this
// CLI cannot produce any real output: the processing gate blocks it
// structurally. --output-root exists only so selftest.mjs can point outputs
// at a temporary directory and never touch public/assets/rushpi/token-logos.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { assertProcessable, findPlanEntry, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { resolveSafePath, UnsafePathError } from "./lib/path-safety.mjs";
import { inspectSource, SourceRejectedError } from "./lib/inspect-source.mjs";
import { normalizeToOutputs, NormalizationError } from "./lib/normalize.mjs";
import { sha256Hex } from "./lib/hashes.mjs";
import { writeOutputAtomically, OutputConflictError } from "./lib/output-paths.mjs";
import { getToolchainFingerprint } from "./lib/report.mjs";
import { TOKEN_LOGOS_OUTPUT_ROOT, NORMALIZATION_POLICY_VERSION } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const intakeRoot = path.join(here, "intake");
const workReportsDir = path.join(here, "work", "reports");

function parseArgs(argv) {
  const args = {
    plan: path.join(here, "data", "pilot-source-plan.json"),
    outputRoot: path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT),
    logoVersion: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--plan" && argv[i + 1]) { args.plan = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--token" && argv[i + 1]) { args.token = argv[i + 1]; i += 1; }
    else if (argv[i] === "--file" && argv[i + 1]) { args.file = argv[i + 1]; i += 1; }
    else if (argv[i] === "--output-root" && argv[i + 1]) { args.outputRoot = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--logo-version" && argv[i + 1]) { args.logoVersion = Number(argv[i + 1]); i += 1; }
  }
  return args;
}

async function main() {
  const { plan: planPath, token, file, outputRoot, logoVersion: logoVersionArg } = parseArgs(process.argv.slice(2));
  if (!token || !file) {
    console.error("Usage: node tools/logos/normalize-source.mjs --token <tokenId> --file <relative-intake-path> [--logo-version N]");
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
    assertProcessable(entry);

    const safePath = resolveSafePath(intakeRoot, file);
    const fileBuffer = readFileSync(safePath);

    // Full security validation, always re-run here - never trust an earlier
    // inspect-source.mjs invocation.
    const inspected = await inspectSource(fileBuffer, entry);

    const { buf64, buf128 } = await normalizeToOutputs(inspected.rasterForNormalization, entry.cropMode);
    const hash64 = sha256Hex(buf64);
    const hash128 = sha256Hex(buf128);
    const logoVersion = logoVersionArg ?? entry.expectedLogoVersion ?? 1;

    const path64 = writeOutputAtomically(outputRoot, token, logoVersion, 64, hash64, buf64);
    const path128 = writeOutputAtomically(outputRoot, token, logoVersion, 128, hash128, buf128);

    const report = {
      ok: true,
      tokenId: token,
      logoVersion,
      normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
      source: { mime: inspected.mime, width: inspected.width, height: inspected.height, fileSize: inspected.fileSize, sha256: inspected.sha256 },
      output64: { path: path.relative(repoRoot, path64), hash: hash64 },
      output128: { path: path.relative(repoRoot, path128), hash: hash128 },
      toolchain: getToolchainFingerprint(),
    };
    console.log(JSON.stringify(report, null, 2));

    mkdirSync(workReportsDir, { recursive: true });
    writeFileSync(path.join(workReportsDir, `${token}.json`), `${JSON.stringify(report, null, 2)}\n`);
  } catch (e) {
    if (
      e instanceof ProcessingNotPermittedError ||
      e instanceof UnsafePathError ||
      e instanceof SourceRejectedError ||
      e instanceof NormalizationError ||
      e instanceof OutputConflictError
    ) {
      console.error(`STOP: ${e.name}: ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details));
      process.exit(1);
    }
    throw e;
  }
}

main();
