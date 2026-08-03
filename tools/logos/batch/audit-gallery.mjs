/**
 * Phase 13-Q1 - untracked contact sheet + automatic quality audit of every
 * released logo. Flags marks that would be unreadable or wrong at game size.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/token-logos/release-manifest.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry/tokens/v2-proposal/registry.json"), "utf8"));
const byId = new Map(registry.entries.map((e) => [e.tokenId, e]));

const flags = [], byHash = new Map(), rows = [];
for (const e of manifest.entries) {
  const reg = byId.get(e.tokenId);
  const file = path.join(ROOT, e.output128Path);
  const buf = fs.readFileSync(file);
  const h = createHash("sha256").update(buf).digest("hex");
  (byHash.get(h) ?? byHash.set(h, []).get(h)).push(e.tokenId);

  const img = sharp(buf);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0, lum = 0, minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels, a = data[i + 3];
    if (a > 24) { opaque++; lum += (0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2]) * (a/255);
      if (x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  }
  const coverage = opaque / (info.width * info.height);
  const meanLum = opaque ? lum / opaque : 0;
  const touchesEdge = minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1;
  const ar = maxX >= 0 ? (maxX - minX + 1) / (maxY - minY + 1) : 1;

  const f = [];
  if (coverage < 0.04) f.push("marque quasi invisible");
  if (coverage < 0.12) f.push("marge excessive");
  if (touchesEdge) f.push("bord touche (rognage possible)");
  if (meanLum < 26) f.push("trop sombre sur fond sombre");
  if (ar > 3 || ar < 0.33) f.push("ratio extreme");
  if (meta.width !== 128 || meta.height !== 128) f.push(`dimensions ${meta.width}x${meta.height}`);
  if (f.length) flags.push({ tokenId: e.tokenId, symbol: reg.symbol, flags: f });
  rows.push({ tokenId: e.tokenId, symbol: reg.symbol, name: reg.name,
    p64: "/" + e.output64Path.replace(/^public\//, ""), p128: "/" + e.output128Path.replace(/^public\//, ""),
    coverage: +(coverage*100).toFixed(1), lum: Math.round(meanLum) });
}
const dupes = [...byHash.entries()].filter(([, v]) => v.length > 1);

const html = `<!doctype html><meta charset=utf-8><title>Rush Pi - Q1 logo gallery</title>
<style>body{background:#0c0717;color:#eee;font:13px system-ui;margin:16px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.c{background:#1b1230;border-radius:10px;padding:8px;text-align:center}
.c img{background:#1b1230;border-radius:50%}b{color:#ffd166}</style>
<h1>Rush Pi - logos locaux publies (${rows.length}/250)</h1>
<p>Signales: ${flags.length} | doublons d'image: ${dupes.length}</p>
<div class=g>${rows.map(r=>`<div class=c><img src="${r.p128}" width=64 height=64 alt=""><br><b>${r.symbol}</b><br>
<small>${r.tokenId}<br>${r.name}<br>couv ${r.coverage}% lum ${r.lum}</small></div>`).join("")}</div>`;
fs.mkdirSync(path.join(ROOT, "tools/logos/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tools/logos/data/q1-gallery.html"), html);
fs.writeFileSync(path.join(ROOT, "tools/logos/data/q1-quality-audit.json"),
  JSON.stringify({ total: rows.length, flags, duplicateImages: dupes }, null, 2));

console.log(`  logos audites: ${rows.length}`);
console.log(`  doublons d'image: ${dupes.length}${dupes.length ? " -> " + dupes.map(d=>d[1].join("=")).join(", ") : ""}`);
console.log(`  signales: ${flags.length}`);
for (const f of flags) console.log(`    ${f.symbol.padEnd(6)} ${f.flags.join(", ")}`);
