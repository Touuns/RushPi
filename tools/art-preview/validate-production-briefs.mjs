#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const briefsPath = path.join(repoRoot, "public/data/art/phase-12a-production-briefs.json");
const manifestPath = path.join(repoRoot, "public/assets/rushpi/asset-manifest.json");
const expectedBaseCommit = "00ed0734fdc023c9ca50a3691f3e631557b90018";
const expectedTargetIds = new Set([
  "home-background-production",
  "daily-market-tunnel-production",
  "chain-block-production",
  "finish-portal-production",
]);
const prohibitedFilenameSegments = new Set([
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "stellar", "xlm",
  "avalanche", "avax", "cosmos", "atom", "polkadot", "dot", "dogecoin",
  "doge", "binance", "bnb", "tether", "usdt", "usdc", "xrp", "cardano",
  "ada", "monero", "xmr", "zcash", "pi-network",
]);
const errors = [];

function error(message) {
  errors.push(message);
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (cause) {
    error(`${label}: invalid or unreadable JSON (${cause.message})`);
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function safeRelativePath(value, context, mustExist = false) {
  if (typeof value !== "string" || value.trim().length === 0) {
    error(`${context}: non-empty relative path required`);
    return;
  }
  if (value.includes("\\") || path.isAbsolute(value) || /^[a-zA-Z]:/.test(value)) {
    error(`${context}: path must be relative and use forward slashes`);
    return;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    error(`${context}: unsafe path segment`);
    return;
  }
  const absolute = path.resolve(repoRoot, ...segments);
  if (absolute !== repoRoot && !absolute.startsWith(`${repoRoot}${path.sep}`)) {
    error(`${context}: path escapes repository root`);
    return;
  }
  if (mustExist && !fs.existsSync(absolute)) error(`${context}: referenced file does not exist`);
}

function validateDimensions(value, context) {
  if (!isRecord(value)) {
    error(`${context}: dimension object required`);
    return;
  }
  if (!Number.isInteger(value.width) || value.width <= 0) error(`${context}.width: positive integer required`);
  if (!Number.isInteger(value.height) || value.height <= 0) error(`${context}.height: positive integer required`);
}

function futureFiles(target) {
  const result = [];
  if (typeof target.filePlan?.sourceMaster === "string") result.push(target.filePlan.sourceMaster);
  if (Array.isArray(target.filePlan?.runtimeFiles)) result.push(...target.filePlan.runtimeFiles);
  return result;
}

function filenameUsesOfficialName(file, context) {
  const name = path.basename(file).toLowerCase();
  const segments = name.split(/[/@._-]+/).filter(Boolean);
  for (const prohibited of prohibitedFilenameSegments) {
    if (segments.includes(prohibited) || name.includes(prohibited === "pi-network" ? prohibited : `-${prohibited}-`)) {
      error(`${context}: future filename contains prohibited official chain/token name '${prohibited}'`);
    }
  }
}

const briefs = readJson(briefsPath, "production briefs");
const manifest = readJson(manifestPath, "asset manifest");

if (briefs && manifest) {
  if (briefs.phase !== "12A-0A") error("phase must be 12A-0A");
  if (briefs.status !== "brief-ready") error("status must be brief-ready");
  if (briefs.baseCommit !== expectedBaseCommit) error(`baseCommit must be ${expectedBaseCommit}`);
  if (briefs.generatedAssets !== false) error("generatedAssets must be false");
  if (briefs.integrationAllowed !== false) error("integrationAllowed must be false");

  if (!Array.isArray(briefs.targets) || briefs.targets.length !== 4) {
    error("exactly four targets are required");
  }

  const manifestIds = new Set((manifest.assets ?? []).map((asset) => asset.id));
  const targetIds = new Set();
  for (const [index, target] of (briefs.targets ?? []).entries()) {
    const context = `targets[${index}]`;
    if (!isRecord(target)) {
      error(`${context}: object required`);
      continue;
    }
    if (typeof target.id !== "string" || target.id.length === 0) {
      error(`${context}: id required`);
    } else {
      if (targetIds.has(target.id)) error(`${context}: duplicate id ${target.id}`);
      targetIds.add(target.id);
      if (!expectedTargetIds.has(target.id)) error(`${context}: unexpected target id ${target.id}`);
    }
    if (target.intakeStatus === "approved-for-integration") {
      error(`${context}: no target may be approved-for-integration`);
    }

    validateDimensions(target.masterSize, `${context}.masterSize`);
    if (!Array.isArray(target.futureDerivatives) || target.futureDerivatives.length === 0) {
      error(`${context}.futureDerivatives: non-empty array required`);
    } else {
      target.futureDerivatives.forEach((derivative, derivativeIndex) =>
        validateDimensions(derivative, `${context}.futureDerivatives[${derivativeIndex}]`));
    }

    if (!nonEmptyStrings(target.referenceAssetIds)) {
      error(`${context}.referenceAssetIds: non-empty string array required`);
    } else {
      for (const referenceId of target.referenceAssetIds) {
        if (!manifestIds.has(referenceId)) error(`${context}: unknown reference asset id ${referenceId}`);
      }
    }
    if (!nonEmptyStrings(target.requiredFeatures)) error(`${context}.requiredFeatures: non-empty string array required`);
    if (!nonEmptyStrings(target.forbiddenFeatures)) error(`${context}.forbiddenFeatures: non-empty string array required`);
    if (!nonEmptyStrings(target.acceptanceChecks)) error(`${context}.acceptanceChecks: non-empty string array required`);

    safeRelativePath(target.promptDocument, `${context}.promptDocument`, true);
    const files = futureFiles(target);
    if (files.length === 0) error(`${context}.filePlan: at least one future file path required`);
    for (const [fileIndex, file] of files.entries()) {
      safeRelativePath(file, `${context}.filePlan[${fileIndex}]`);
      filenameUsesOfficialName(file, `${context}.filePlan[${fileIndex}]`);
    }
  }

  for (const expectedId of expectedTargetIds) {
    if (!targetIds.has(expectedId)) error(`missing target ${expectedId}`);
  }

  const serialized = JSON.stringify(briefs);
  if (/https?:\/\/|www\./i.test(serialized)) error("external URLs are forbidden");
  if (serialized.includes("approved-for-integration")) error("no asset may be marked approved-for-integration");
}

if (errors.length > 0) {
  console.error(`Phase 12A production brief validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

console.log("Phase 12A production brief validation passed.");
console.log(`  Base commit: ${briefs.baseCommit}`);
console.log(`  Targets: ${briefs.targets.length}`);
console.log(`  Referenced foundation assets: ${new Set(briefs.targets.flatMap((target) => target.referenceAssetIds)).size}`);
console.log("  Generated assets: false");
console.log("  Integration allowed: false");
