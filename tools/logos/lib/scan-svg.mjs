// SVG security scanning (Phase 12C-1B2B). Pure text/regex inspection - no XML
// parser, no DOM, no execution of any kind. Runs BEFORE an approved SVG is
// ever handed to the rasterizer. An SVG that fails any check here is rejected
// outright; it is never copied into public assets and never exposed to the
// browser (only the rasterized, normalized PNG output ever ships).
import { MAX_SVG_INPUT_BYTES } from "./constants.mjs";

/**
 * @typedef {{ ok: boolean, reasons: string[] }} ScanResult
 */

const CHECKS = [
  { reason: "doctype", pattern: /<!DOCTYPE/i },
  { reason: "xml-entity", pattern: /<!ENTITY/i },
  { reason: "script-tag", pattern: /<\s*script\b/i },
  { reason: "event-handler-attribute", pattern: /\son[a-z]+\s*=/i },
  { reason: "foreign-object", pattern: /<\s*foreignObject\b/i },
  { reason: "animation-element", pattern: /<\s*(animate|animateTransform|animateMotion|animateColor|set|discard)\b/i },
  { reason: "css-animation", pattern: /@keyframes\b|animation\s*:/i },
  { reason: "remote-font", pattern: /@font-face\b/i },
  { reason: "embedded-data-url", pattern: /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64/i },
];

// Any href / xlink:href whose value is not a local fragment ("#...") is
// treated as an external reference and rejected.
const HREF_ATTR_PATTERN = /\b(?:xlink:href|href)\s*=\s*(["'])(.*?)\1/gis;

// Any url(...) reference (CSS or presentation attribute) that is not a local
// fragment is treated as external and rejected — this also covers remote
// fonts/images referenced via url(http...) or protocol-relative url(//...).
const URL_FN_PATTERN = /url\(\s*(["']?)(.*?)\1\s*\)/gis;

function isLocalFragmentReference(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("#");
}

/**
 * Scan raw SVG text for prohibited constructs. Does NOT check for visible
 * output (that requires rasterization; see inspect-raster.mjs, applied to the
 * rasterized buffer downstream).
 * @param {string} text
 * @returns {ScanResult}
 */
export function scanSvgText(text) {
  const reasons = [];

  if (typeof text !== "string" || text.length === 0) {
    return { ok: false, reasons: ["empty-source"] };
  }
  if (Buffer.byteLength(text, "utf8") > MAX_SVG_INPUT_BYTES) {
    return { ok: false, reasons: ["exceeds-max-svg-bytes"] };
  }

  for (const { reason, pattern } of CHECKS) {
    if (pattern.test(text)) reasons.push(reason);
  }

  for (const match of text.matchAll(HREF_ATTR_PATTERN)) {
    const value = match[2];
    if (!isLocalFragmentReference(value)) {
      reasons.push("external-href-reference");
      break;
    }
  }

  for (const match of text.matchAll(URL_FN_PATTERN)) {
    const value = match[2];
    if (value.length > 0 && !isLocalFragmentReference(value)) {
      reasons.push("external-url-reference");
      break;
    }
  }

  // Cheap well-formedness sanity check: exactly one root <svg ...> element,
  // opened and closed (or self-closed). A real parse failure downstream in
  // the rasterizer is treated as "malformed-svg" by the caller.
  const trimmed = text.replace(/^﻿/, "").trimStart();
  const hasXmlOrSvgStart = /^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(trimmed);
  const hasClosingOrSelfClosing = /<\/svg\s*>/i.test(text) || /<svg\b[^>]*\/>/i.test(text);
  if (!hasXmlOrSvgStart || !hasClosingOrSelfClosing) {
    reasons.push("malformed-svg");
  }

  return { ok: reasons.length === 0, reasons: dedupe(reasons) };
}

function dedupe(arr) {
  return [...new Set(arr)];
}
