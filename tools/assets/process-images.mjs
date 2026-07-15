#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node tools/assets/process-images.mjs <input-file-or-directory> --out <directory>
    [--widths 414,828] [--formats webp,png] [--quality 82]

Requires the optional local package "sharp". The script never overwrites source files.`);
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputArg = process.argv[2];
const outputArg = option("--out", null);
if (!inputArg || inputArg.startsWith("--") || !outputArg || process.argv.includes("--help")) {
  usage();
  process.exit(process.argv.includes("--help") ? 0 : 2);
}

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error('Missing optional dependency "sharp". Install it locally with: npm install --no-save sharp');
  process.exit(2);
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
if (!fs.existsSync(input)) {
  console.error(`Input does not exist: ${input}`);
  process.exit(2);
}
if (input === output) {
  console.error("Output must differ from input; source files are never overwritten.");
  process.exit(2);
}

const widths = option("--widths", "414,828").split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0);
const formats = option("--formats", "webp,png").split(",").map((value) => value.trim().toLowerCase()).filter((value) => ["webp", "png"].includes(value));
const quality = Math.max(1, Math.min(100, Number(option("--quality", "82")) || 82));
if (!widths.length || !formats.length) {
  console.error("At least one valid width and format are required.");
  process.exit(2);
}

const supported = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const inputIsDirectory = fs.statSync(input).isDirectory();
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}
const files = inputIsDirectory
  ? walk(input).filter((file) => supported.has(path.extname(file).toLowerCase()))
  : [input];

let written = 0;
for (const file of files) {
  const relativeDirectory = inputIsDirectory ? path.relative(input, path.dirname(file)) : "";
  const destinationDirectory = path.join(output, relativeDirectory);
  fs.mkdirSync(destinationDirectory, { recursive: true });
  const stem = path.basename(file, path.extname(file));

  for (const width of widths) {
    for (const format of formats) {
      const destination = path.join(destinationDirectory, `${stem}-${width}w.${format}`);
      let pipeline = sharp(file, { density: 192 }).resize({ width, withoutEnlargement: true });
      pipeline = format === "webp"
        ? pipeline.webp({ quality, effort: 5, smartSubsample: true })
        : pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      await pipeline.toFile(destination);
      console.log(path.relative(process.cwd(), destination));
      written += 1;
    }
  }
}

console.log(`Created ${written} optimized derivative(s) from ${files.length} source file(s).`);
