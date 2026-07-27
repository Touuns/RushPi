/**
 * Phase 12C-1B2C-2D2C-A — Daily-only, presentation-only rules for the logo
 * render switch (Phase 12C-1B2C-2D2B). A rule is looked up STRICTLY by the
 * registry's canonical tokenId (e.g. "rpt-0041") — never by symbol, CoinGecko
 * id, provider name or filename — so an upstream rename/remap can never
 * silently mismatch a rule to the wrong token.
 *
 * Purely a lookup table plus the values it carries: no Phaser import, no I/O,
 * no mutation. A resolved rule only ever adjusts how a logo is drawn — it must
 * never reach challenge data, score/points payloads, RNG, replay data,
 * leaderboard submissions or any network request.
 */

/**
 * Light circular backing plate placed behind a dark/black brand mark so it
 * reads against the dark coin face. "warm-neutral" is a soft ivory, never a
 * stark #ffffff white, and is the only tone this phase defines.
 */
export interface TokenLogoBackingPlateRule {
  readonly enabled: true;
  readonly tone: "warm-neutral";
  /** Plate diameter as a fraction of the coin face diameter (0 < value <= 1). */
  readonly relativeDiameter: number;
}

export interface TokenLogoPresentationRule {
  /** Multiplies the logo's normal fit-to-box scale. 1 = exactly Phase 2D2B's behavior. */
  readonly scaleMultiplier: number;
  readonly backingPlate?: TokenLogoBackingPlateRule;
}

/** No rule for a tokenId resolves to this — byte-identical to Phase 2D2B. */
export const DEFAULT_TOKEN_LOGO_PRESENTATION_RULE: TokenLogoPresentationRule = Object.freeze({
  scaleMultiplier: 1,
});

/** Soft ivory (not stark white) — the sole warm-neutral backing-plate color. */
export const BACKING_PLATE_WARM_NEUTRAL_COLOR = 0xf5ead1;

/**
 * Canonical tokenId -> rule, confirmed against the token registry for the 11
 * Daily tokens that have a shipped logo in
 * public/data/token-logos/release-manifest.json: rpt-0001 BTC, rpt-0002 ETH,
 * rpt-0004 USDT, rpt-0012 LINK, rpt-0024 SHIB, rpt-0037 HYPE, rpt-0041 TAO,
 * rpt-0058 TIA, rpt-0070 ASI, rpt-0142 Canton, rpt-0250 GAS.
 *
 * Tokens absent from this map (BTC, USDT, LINK, SHIB, HYPE, TIA) use the
 * default rule untouched, per the initial conservative pass.
 */
const PRESENTATION_RULES: ReadonlyMap<string, TokenLogoPresentationRule> = new Map([
  ["rpt-0002", { scaleMultiplier: 1.08 }], // ETH — slight increase
  [
    "rpt-0041", // TAO (Bittensor) — official mark is black; needs a light plate to read
    {
      scaleMultiplier: 1.12,
      backingPlate: {
        enabled: true,
        tone: "warm-neutral",
        relativeDiameter: 33 / 40, // 33px inside the 40px (2x TOKEN_RADIUS) face
      },
    },
  ],
  ["rpt-0070", { scaleMultiplier: 0.94 }], // ASI — slight reduction
  ["rpt-0142", { scaleMultiplier: 1.06 }], // Canton — slight increase
  ["rpt-0250", { scaleMultiplier: 1.08 }], // GAS — slight increase
]);

/**
 * Resolve a token's presentation rule by its canonical tokenId only. An
 * unknown/absent tokenId (including null/undefined) returns the default rule
 * — never throws, never guesses from any other identifier.
 */
export function resolveTokenLogoPresentationRule(
  tokenId: string | null | undefined,
): TokenLogoPresentationRule {
  if (!tokenId) return DEFAULT_TOKEN_LOGO_PRESENTATION_RULE;
  return PRESENTATION_RULES.get(tokenId) ?? DEFAULT_TOKEN_LOGO_PRESENTATION_RULE;
}
