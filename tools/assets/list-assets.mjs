#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(scriptDir, "../../public/assets/rushpi/asset-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const selectedCategory = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1];
const asJson = process.argv.includes("--json");
const assets = selectedCategory
  ? manifest.assets.filter((asset) => asset.category === selectedCategory)
  : manifest.assets;

if (asJson) {
  console.log(JSON.stringify(assets, null, 2));
  process.exit();
}

const rows = assets.map((asset) => ({
  id: asset.id,
  category: asset.category,
  size: asset.size,
  animated: asset.animationReady ? "yes" : "no",
  file: asset.file,
}));
console.table(rows);
console.log(`${rows.length} asset(s)${selectedCategory ? ` in ${selectedCategory}` : ""}.`);
