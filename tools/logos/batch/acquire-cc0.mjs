/**
 * Phase 13-Q1 - deterministic batch acquisition of community CC0 token icons.
 *
 * Downloads ONLY the entries the audit pass classified `community-cc0-token-icon`
 * (exact symbol+name match against the registry). Every byte is verified before
 * it is kept: real PNG magic, non-empty, not the collection's generic icon.
 * The source commit is PINNED so a rerun is byte-identical.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const REPO = "spothq/cryptocurrency-icons";
const PIN = process.argv[2];                       // pinned commit sha
const APPROVED_AT = process.argv[3];               // real decision timestamp
if (!PIN || !APPROVED_AT) { console.error("usage: acquire-cc0.mjs <commit> <approvedAt>"); process.exit(2); }

const LICENCE = `https://github.com/${REPO}/blob/${PIN}/LICENSE.md`;
const COLLECTION = `https://github.com/${REPO}/tree/${PIN}`;
const raw = (f) => `https://raw.githubusercontent.com/${REPO}/${PIN}/128/color/${f}.png`;

const audit = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/logos/data/q1-source-audit.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry/tokens/v2-proposal/registry.json"), "utf8"));
const byId = new Map(registry.entries.map((e) => [e.tokenId, e]));
const targets = audit.rows.filter((r) => r.category === "community-cc0-token-icon");

const sha = (b) => createHash("sha256").update(b).digest("hex");
const isPng = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(url);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status === 404) return null;              // definitively absent
    await new Promise((s) => setTimeout(s, 400 * attempt));
  }
  return null;
}

// The collection ships a `generic` icon for coins it has no art for. Any file
// whose bytes equal it is a placeholder, never a token identity.
const genericBytes = await get(raw("generic"));
const genericHash = genericBytes ? sha(genericBytes) : null;

const intakeRoot = path.join(ROOT, "tools/logos/intake");
const entries = [];
const rejected = [];
let done = 0;

for (const t of targets) {
  const asset = (t.source.split("::")[1] || "").trim();
  const reg = byId.get(t.tokenId);
  const bytes = await get(raw(asset));
  done++;
  if (!bytes)               { rejected.push({ ...t, why: "telechargement impossible (404 ou reseau)" }); continue; }
  if (!isPng(bytes))        { rejected.push({ ...t, why: "signature PNG invalide (HTML/erreur renvoye)" }); continue; }
  if (bytes.length < 200)   { rejected.push({ ...t, why: "fichier vide ou tronque" }); continue; }
  const h = sha(bytes);
  if (genericHash && h === genericHash) { rejected.push({ ...t, why: "icone generique de la collection" }); continue; }

  const rel = path.posix.join("q1-cc0", t.tokenId, "icon.png");
  const abs = path.join(intakeRoot, "q1-cc0", t.tokenId, "icon.png");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, bytes);

  entries.push({
    tokenId: t.tokenId,
    catalogVersion: registry.catalogVersion,
    providerId: reg.providerIds.coingecko,
    canonicalName: reg.name,
    symbol: reg.symbol,
    pilotInclusionReason: "Phase 13-Q1 batch: exact registry identity match against a CC0 community icon collection.",
    expectedSourceClass: "community-cc0-token-icon",
    anticipatedRisk: "low",
    humanApprovalRequired: false,
    sourceReviewStatus: "source-approved",
    permissionReviewStatus: "permission-confirmed",
    sourceType: "community-cc0-token-icon",
    sourceReference: raw(asset),
    sourcePageReference: COLLECTION,
    permittedVariant: `Community CC0 colour token icon (128x128 PNG) for ${reg.symbol}; symbol-only mark.`,
    variantType: "icon",
    cropMode: "preserve-canvas",
    expectedMimeClass: "image/png",
    approvedBy: "product-owner",
    approvedAt: APPROVED_AT,
    permissionEvidenceReference: LICENCE,
    providerFallbackApproved: false,
    allowExtremeAspectRatio: false,
    notes: "Community-created CC0 token icon used as an in-game visual identifier. This record does not claim official project endorsement or ownership of the underlying trademark. Approved under the Phase 13-Q1 automated batch policy (exact registry name+symbol identity, pinned CC0 licence); the product owner approved the policy, not a manual inspection of each individual image.",
    intakePath: rel,
    expectedLogoVersion: 1,
    approvedSourceContentHash: h,
  });
}

fs.writeFileSync(path.join(ROOT, "tools/logos/data/q1-cc0-source-plan.json"), JSON.stringify({
  schemaVersion: 1, catalogVersion: registry.catalogVersion,
  description: `Phase 13-Q1 batch source plan: community CC0 token icons from ${REPO} pinned at ${PIN}.`,
  entries,
}, null, 2));
fs.writeFileSync(path.join(ROOT, "tools/logos/data/q1-cc0-rejected.json"), JSON.stringify(rejected, null, 2));
console.log(`  cibles: ${targets.length} | acquis: ${entries.length} | rejetes: ${rejected.length}`);
if (rejected.length) for (const r of rejected) console.log(`    REJETE ${r.symbol}: ${r.why}`);
