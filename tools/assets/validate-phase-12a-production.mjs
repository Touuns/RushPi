#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try { ({ default: sharp } = await import("sharp")); }
catch { console.error('Missing optional dependency "sharp".'); process.exit(2); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/assets/rushpi/asset-manifest.json"), "utf8"));
const productionRoot = path.join(root, "public/assets/rushpi/production");
const specs = [
  ["home-background-production-414", "backgrounds/home-background-production-414w.webp", "webp", 414, 736, 184320, false],
  ["home-background-production-828", "backgrounds/home-background-production-828w.webp", "webp", 828, 1472, 358400, false],
  ["daily-market-tunnel-production-414", "backgrounds/daily-market-tunnel-production-414w.webp", "webp", 414, 736, 204800, false],
  ["daily-market-tunnel-production-828", "backgrounds/daily-market-tunnel-production-828w.webp", "webp", 828, 1472, 358400, false],
  ["chain-block-production-32", "collectibles/chain-block-production-32w.png", "png", 32, 32, 18432, true],
  ["chain-block-production-64", "collectibles/chain-block-production-64w.png", "png", 64, 64, 35840, true],
  ["chain-block-production-128", "collectibles/chain-block-production-128w.png", "png", 128, 128, 71680, true],
  ["finish-portal-production-256", "portals/finish-portal-production-256w.png", "png", 256, 384, 92160, true],
  ["finish-portal-production-512", "portals/finish-portal-production-512w.png", "png", 512, 768, 184320, true],
];
const errors = [];
const fail = (message) => errors.push(message);
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const actual = walk(productionRoot).map((file) => path.relative(productionRoot, file).replaceAll("\\", "/")).sort();
const expected = specs.map((spec) => spec[1]).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`Production directory must contain exactly nine expected files. Found: ${actual.join(", ")}`);
if (manifest.assets?.length !== 65) fail(`Manifest must contain 65 assets, got ${manifest.assets?.length}`);
const family = manifest.families?.find((entry) => entry.id === "phase-12a-production-raster-kit");
if (!family) fail("Missing phase-12a-production-raster-kit family");

for (const [id, relative, format, width, height, budget, alphaExpected] of specs) {
  const file = path.join(productionRoot, ...relative.split("/"));
  if (!fs.existsSync(file)) { fail(`Missing ${relative}`); continue; }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|webp)$/.test(path.basename(file))) fail(`Not kebab-case: ${relative}`);
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  const bytes = fs.statSync(file).size;
  if (metadata.format !== format) fail(`${id}: expected ${format}, got ${metadata.format}`);
  if (metadata.width !== width || metadata.height !== height) fail(`${id}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  if (metadata.space !== "srgb") fail(`${id}: expected sRGB, got ${metadata.space}`);
  if (bytes > budget) fail(`${id}: ${bytes} bytes exceeds ${budget}`);
  if (Boolean(metadata.hasAlpha) !== alphaExpected) fail(`${id}: hasAlpha=${metadata.hasAlpha}, expected ${alphaExpected}`);
  if (alphaExpected) {
    const alpha = stats.channels.at(-1);
    if (!alpha || alpha.min !== 0 || alpha.max !== 255) fail(`${id}: alpha is not real full-range transparency`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const edgeAlpha = [];
    for (let x = 0; x < info.width; x++) edgeAlpha.push(data[(x * info.channels) + 3], data[(((info.height - 1) * info.width + x) * info.channels) + 3]);
    for (let y = 0; y < info.height; y++) edgeAlpha.push(data[((y * info.width) * info.channels) + 3], data[((y * info.width + info.width - 1) * info.channels) + 3]);
    if (edgeAlpha.some((value) => value !== 0)) fail(`${id}: non-transparent alpha touches a canvas edge`);
  }
  if (id.startsWith("finish-portal")) {
    const scale = width / 512;
    const opening = await sharp(file).extract({ left: Math.round(174 * scale), top: Math.round(154 * scale), width: Math.round(164 * scale), height: Math.round(430 * scale) }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < opening.data.length; i += opening.info.channels) if (opening.data[i] !== 0) opaque++;
    if (opaque !== 0) fail(`${id}: recommended portal opening contains ${opaque} non-transparent pixels`);
  }
  const entry = manifest.assets.find((asset) => asset.id === id);
  if (!entry) fail(`${id}: absent from manifest`);
  else {
    if (entry.file !== `production/${relative}` || entry.format !== format || entry.size !== `${width}x${height}`) fail(`${id}: manifest path/format/size mismatch`);
    if (entry.integratedInGameplay !== false) fail(`${id}: integratedInGameplay must be false`);
    if (entry.productionStatus !== "processed-needs-review") fail(`${id}: invalid productionStatus`);
    if (!entry.selectedSource || !entry.runtimeRole) fail(`${id}: selectedSource/runtimeRole missing`);
    else {
      const sourceMetadata = await sharp(path.join(root, ...entry.selectedSource.split("/"))).metadata();
      if (Math.abs((sourceMetadata.width / sourceMetadata.height) - (width / height)) > 1e-9) fail(`${id}: source/output proportions differ`);
    }
    if (id.startsWith("chain-block") && (entry.pivot?.x !== 0.5 || entry.pivot?.y !== 0.5)) fail(`${id}: central pivot missing`);
    if (id.startsWith("finish-portal") && (entry.pivot?.x !== 0.5 || entry.pivot?.y !== 0.88)) fail(`${id}: portal pivot missing`);
  }
  console.log(`PASS ${id} ${format} ${width}x${height} ${bytes}/${budget}B sha256=${sha256(file)}`);
}

const intakePath = path.join(root, "docs/art/generated/12A_PRODUCTION_ASSETS_INTAKE.json");
if (fs.existsSync(intakePath)) {
  const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  if (intake.integrationAllowed !== false) fail("Production intake integrationAllowed must be false");
  if (intake.assets?.some((asset) => asset.status === "approved-for-integration" || asset.integratedInGameplay !== false)) fail("Production intake authorizes integration");
  for (const [id] of specs) {
    const asset = intake.assets?.find((entry) => entry.id === id);
    if (!asset?.manifestDeclared || asset.status !== "processed-needs-review" || asset.outputSha256 !== sha256(path.join(root, ...asset.outputPath.split("/")))) fail(`${id}: intake/manifest/hash concordance failed`);
  }
} else fail("Missing 12A_PRODUCTION_ASSETS_INTAKE.json");

if (errors.length) {
  console.error(`\nPhase 12A production validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\nPhase 12A production validation passed: 9 files, 65 manifest assets, integration disabled.");
