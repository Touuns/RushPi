#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error('Missing optional dependency "sharp". Install with: npm install --no-save --package-lock=false sharp');
  process.exit(2);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const expected = [
  {
    intake: "docs/art/generated/12A_HOME_CANDIDATES_INTAKE.json",
    id: "home-background-primary-candidate-v1",
    source: "art-sources/phase-12a/home-background/home-background-primary-candidate-v1.png",
    outputs: [
      ["public/assets/rushpi/production/backgrounds/home-background-production-414w.webp", 414, 736, "webp"],
      ["public/assets/rushpi/production/backgrounds/home-background-production-828w.webp", 828, 1472, "webp"],
    ],
  },
  {
    intake: "docs/art/generated/12A_DAILY_CANDIDATES_INTAKE.json",
    id: "daily-market-tunnel-primary-candidate-v2",
    source: "art-sources/phase-12a/daily-market-tunnel/daily-market-tunnel-primary-candidate-v2.png",
    outputs: [
      ["public/assets/rushpi/production/backgrounds/daily-market-tunnel-production-414w.webp", 414, 736, "webp"],
      ["public/assets/rushpi/production/backgrounds/daily-market-tunnel-production-828w.webp", 828, 1472, "webp"],
    ],
  },
  {
    intake: "docs/art/generated/12A_CHAIN_BLOCK_CANDIDATES_INTAKE.json",
    id: "chain-block-primary-candidate-v1",
    source: "art-sources/phase-12a/chain-block/chain-block-primary-candidate-v1.png",
    outputs: [
      ["public/assets/rushpi/production/collectibles/chain-block-production-32w.png", 32, 32, "png"],
      ["public/assets/rushpi/production/collectibles/chain-block-production-64w.png", 64, 64, "png"],
      ["public/assets/rushpi/production/collectibles/chain-block-production-128w.png", 128, 128, "png"],
    ],
  },
  {
    intake: "docs/art/generated/12A_FINISH_PORTAL_CANDIDATES_INTAKE.json",
    id: "finish-portal-primary-candidate-v1",
    source: "art-sources/phase-12a/finish-portal/finish-portal-primary-candidate-v1.png",
    outputs: [
      ["public/assets/rushpi/production/portals/finish-portal-production-256w.png", 256, 384, "png"],
      ["public/assets/rushpi/production/portals/finish-portal-production-512w.png", 512, 768, "png"],
    ],
  },
];

function absolute(relative) { return path.join(repoRoot, ...relative.split("/")); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

for (const item of expected) {
  const intakePath = absolute(item.intake);
  const sourcePath = absolute(item.source);
  if (!fs.existsSync(intakePath)) throw new Error(`Missing intake: ${item.intake}`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing selected source: ${item.source}`);
  const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  const candidate = intake.candidates?.find((entry) => entry.id === item.id);
  if (!candidate) throw new Error(`Candidate ${item.id} not found in ${item.intake}`);
  if (candidate.status !== "approved-for-processing") {
    throw new Error(`${item.id} must be approved-for-processing, got ${candidate.status}`);
  }
  if (candidate.masterPath !== item.source) {
    throw new Error(`${item.id} master path mismatch: ${candidate.masterPath}`);
  }

  const sourceMetadata = await sharp(sourcePath).metadata();
  console.log(`SOURCE ${item.source} sha256=${sha256(sourcePath)}`);
  for (const [relativeOutput, width, height, format] of item.outputs) {
    if (Math.abs((sourceMetadata.width / sourceMetadata.height) - (width / height)) > 1e-9) {
      throw new Error(`${item.id} source/output aspect ratio mismatch; stretching is forbidden`);
    }
    const output = absolute(relativeOutput);
    if (path.resolve(output) === path.resolve(sourcePath)) throw new Error(`Refusing to overwrite master: ${item.source}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    let pipeline = sharp(sourcePath, { failOn: "error" })
      .resize({ width, height, fit: "inside", kernel: sharp.kernel.lanczos3 })
      .toColourspace("srgb");
    pipeline = format === "webp"
      ? pipeline.webp({ quality: 82, effort: 6, smartSubsample: true })
      : pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false });
    await pipeline.toFile(output);
    const metadata = await sharp(output).metadata();
    const bytes = fs.statSync(output).size;
    console.log(`WRITE ${relativeOutput} ${metadata.format} ${metadata.width}x${metadata.height} ${bytes}B sha256=${sha256(output)}`);
  }
}

console.log("Created exactly 9 Phase 12A production derivatives. Masters were read-only inputs.");
