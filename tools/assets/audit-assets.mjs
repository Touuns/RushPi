#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const assetRoot = path.join(repoRoot, "public/assets/rushpi");
const manifestPath = path.join(assetRoot, "asset-manifest.json");
const requiredFields = ["id", "category", "file", "format", "usage", "size", "notes", "animationReady"];
const expectedDirectories = [
  "backgrounds", "portals", "collectibles", "fx", "ui",
  "placeholders", "concepts", "mechanics", "spritesheets", "previews",
];
const visualExtensions = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg"]);
const errors = [];
const warnings = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(absolute) {
  return path.relative(assetRoot, absolute).split(path.sep).join("/");
}

function svgDimensions(source) {
  const match = source.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + readUInt24LE(buffer, 24), height: 1 + readUInt24LE(buffer, 27) };
  if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function dimensionsFor(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".svg") return svgDimensions(fs.readFileSync(file, "utf8"));
  const buffer = fs.readFileSync(file);
  if (extension === ".png") return pngDimensions(buffer);
  if (extension === ".jpg" || extension === ".jpeg") return jpegDimensions(buffer);
  if (extension === ".webp") return webpDimensions(buffer);
  return null;
}

function expectedSize(value) {
  const match = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(value);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath}`);
  process.exit(1);
}

for (const directory of expectedDirectories) {
  if (!fs.existsSync(path.join(assetRoot, directory))) errors.push(`Missing required directory: ${directory}/`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(`Invalid manifest JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(manifest.assets)) errors.push("Manifest field 'assets' must be an array.");
if (!Array.isArray(manifest.families) || !manifest.families.some((family) => family.id === "blockchain-mechanics-foundation")) {
  errors.push("Manifest family 'blockchain-mechanics-foundation' is required.");
}
const ids = new Set();
const files = new Set();
const categoryCounts = new Map();

for (const asset of manifest.assets ?? []) {
  for (const field of requiredFields) {
    if (!(field in asset)) errors.push(`${asset.id ?? "<unknown>"}: missing field '${field}'.`);
  }
  if (ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`);
  if (files.has(asset.file)) errors.push(`Duplicate asset file: ${asset.file}`);
  ids.add(asset.id);
  files.add(asset.file);
  categoryCounts.set(asset.category, (categoryCounts.get(asset.category) ?? 0) + 1);

  if (typeof asset.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id)) {
    errors.push(`${asset.id}: id must use kebab-case ASCII.`);
  }
  if (typeof asset.animationReady !== "boolean") errors.push(`${asset.id}: animationReady must be boolean.`);

  const absolute = path.resolve(assetRoot, asset.file ?? "");
  if (!absolute.startsWith(`${assetRoot}${path.sep}`)) {
    errors.push(`${asset.id}: file escapes the asset root.`);
    continue;
  }
  if (!fs.existsSync(absolute)) {
    errors.push(`${asset.id}: missing file '${asset.file}'.`);
    continue;
  }

  const extension = path.extname(absolute).slice(1).toLowerCase();
  if (extension !== asset.format.toLowerCase()) errors.push(`${asset.id}: format '${asset.format}' does not match .${extension}.`);
  if (extension === "json") {
    try { JSON.parse(fs.readFileSync(absolute, "utf8")); }
    catch (error) { errors.push(`${asset.id}: invalid JSON (${error.message}).`); }
  }

  const actual = dimensionsFor(absolute);
  const declared = expectedSize(asset.size);
  if (declared && !actual) errors.push(`${asset.id}: unable to read declared dimensions ${asset.size}.`);
  if (declared && actual && (declared.width !== actual.width || declared.height !== actual.height)) {
    errors.push(`${asset.id}: declared ${asset.size}, actual ${actual.width}x${actual.height}.`);
  }

  const bytes = fs.statSync(absolute).size;
  const budget = asset.category === "backgrounds" || asset.category === "concepts" ? 350 * 1024 : 180 * 1024;
  if (bytes > budget) warnings.push(`${asset.id}: ${(bytes / 1024).toFixed(1)} KiB exceeds the ${budget / 1024} KiB review budget.`);

  if (extension === "svg") {
    const source = fs.readFileSync(absolute, "utf8");
    if (/<text(?:\s|>)/i.test(source)) errors.push(`${asset.id}: rendered <text> is forbidden.`);
    if (/<script(?:\s|>)/i.test(source)) errors.push(`${asset.id}: scripts are forbidden in SVG.`);
    if (/(?:href|xlink:href)\s*=\s*["'](?:https?:|data:)/i.test(source)) errors.push(`${asset.id}: embedded or remote SVG references are forbidden.`);
    if (/bitcoin|ethereum|solana|dogecoin|coingecko|binance/i.test(source)) errors.push(`${asset.id}: possible official brand reference found in visual asset.`);
  }
}

const diskVisuals = walk(assetRoot).filter((file) => visualExtensions.has(path.extname(file).toLowerCase()));
for (const file of diskVisuals) {
  const name = path.basename(file, path.extname(file));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) errors.push(`${relative(file)}: filename must use kebab-case ASCII.`);
  if (!files.has(relative(file))) errors.push(`${relative(file)}: visual file is not listed in the manifest.`);
}

const mechanicsAssets = (manifest.assets ?? []).filter((asset) => asset.category === "mechanics");
if (mechanicsAssets.length !== 6) errors.push(`Expected 6 mechanics assets in the manifest, found ${mechanicsAssets.length}.`);

for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

console.log("\nAsset summary");
for (const [category, count] of [...categoryCounts].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${category.padEnd(14)} ${count}`);
}
console.log(`  ${"total".padEnd(14)} ${manifest.assets?.length ?? 0}`);

if (errors.length > 0) {
  console.error(`\nAudit failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`\nAudit passed with ${warnings.length} warning(s).`);
