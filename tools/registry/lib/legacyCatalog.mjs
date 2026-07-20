// Reads api/_lib/tokenCatalog.ts as text and parses the entry(...) calls.
// No TS execution involved (no new dev dependency) — the file's format is
// simple and stable, so a targeted regex is a reliable, auditable way to
// read the SAME source of truth the running server uses, instead of
// maintaining a second hand-copied mirror that could silently drift.
import { readFileSync } from "node:fs";
import path from "node:path";

const ENTRY_RE = /entry\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;

export function parseLegacyCatalog(sourceText) {
  const entries = [];
  let match;
  ENTRY_RE.lastIndex = 0;
  while ((match = ENTRY_RE.exec(sourceText)) !== null) {
    entries.push({
      id: match[1],
      preferredSymbol: match[2],
      category: match[3],
      enabledForDaily: true,
      enabledForCampaign: true,
    });
  }
  return entries;
}

export function readLegacyCatalog(repoRoot) {
  const filePath = path.join(repoRoot, "api/_lib/tokenCatalog.ts");
  const sourceText = readFileSync(filePath, "utf8");
  const entries = parseLegacyCatalog(sourceText);
  return { filePath, entries };
}
