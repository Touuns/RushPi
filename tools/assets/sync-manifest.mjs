#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const root = path.join(repoRoot, "public/assets/rushpi");
const manifestPath = path.join(root, "asset-manifest.json");
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const prune = args.has("--prune");
const supported = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg", ".json"]);

if (prune && !write) {
  console.error("--prune requires --write so deletion is always explicit.");
  process.exit(2);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function generatedId(file) {
  return file.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function svgSize(file) {
  if (path.extname(file).toLowerCase() !== ".svg") return "unknown";
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  return match ? `${Number(match[1])}x${Number(match[2])}` : "unknown";
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const discovered = walk(root)
  .filter((file) => supported.has(path.extname(file).toLowerCase()))
  .map(relative)
  .filter((file) => file !== "asset-manifest.json")
  .sort();
const known = new Set(manifest.assets.map((asset) => asset.file));
const missing = discovered.filter((file) => !known.has(file));
const absent = manifest.assets.filter((asset) => !fs.existsSync(path.join(root, asset.file)));

console.log(`Discovered: ${discovered.length}`);
console.log(`Unlisted:   ${missing.length}`);
for (const file of missing) console.log(`  + ${file}`);
console.log(`Missing:    ${absent.length}`);
for (const asset of absent) console.log(`  - ${asset.file}`);

if (!write) {
  if (missing.length || absent.length) process.exitCode = 1;
  else console.log("Manifest is synchronized. Use --write only when adding files.");
  process.exit();
}

for (const file of missing) {
  const absolute = path.join(root, file);
  const extension = path.extname(file).slice(1).toLowerCase();
  manifest.assets.push({
    id: generatedId(file),
    category: file.split("/")[0] || "metadata",
    file,
    format: extension,
    usage: "TODO: describe intended usage",
    size: svgSize(absolute),
    notes: "Generated manifest entry; review before commit",
    animationReady: false,
  });
}

if (prune) {
  manifest.assets = manifest.assets.filter((asset) => fs.existsSync(path.join(root, asset.file)));
}
manifest.generatedAt = new Date().toISOString();

const temporary = `${manifestPath}.tmp`;
fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.renameSync(temporary, manifestPath);
console.log(`Updated ${path.relative(repoRoot, manifestPath)}. Review TODO entries before commit.`);
