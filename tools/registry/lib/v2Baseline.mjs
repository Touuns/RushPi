// Pure, deterministic rank-based baseline + diversity-substitution accounting
// for the V2 proposal (Phase 12C-1B1.1). No IO, no time. Shared by
// tools/registry/build-v2.mjs and tools/registry/selftest-v2.mjs.
//
// The eligible universe is explicit: V1 + selected + recognized-eligible.
// Everything else in the capture is hard-excluded (handled by the caller). The
// baseline preserves V1, then fills the remaining slots with the highest-ranked
// eligible assets. Differences between the proposal and this baseline are the
// true diversity substitutions.

function rankOf(row) {
  return typeof row.marketCapRank === "number" ? row.marketCapRank : Number.MAX_SAFE_INTEGER;
}

function byRankThenId(a, b) {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra !== rb) return ra - rb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * @param {object} args
 * @param {Array<{id:string,marketCapRank:number|null}>} args.rows  frozen capture rows
 * @param {Set<string>} args.v1Ids  provider ids of the 36 mandatory V1 assets
 * @param {Set<string>} args.selectedNonV1  provider ids of the 214 selected new assets
 * @param {Set<string>} args.recognizedEligible  provider ids of recognizable, non-selected eligibles
 * @param {number} [args.targetCount=250]
 */
export function computeBaseline({ rows, v1Ids, selectedNonV1, recognizedEligible, targetCount = 250 }) {
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const eligibleNonV1 = rows
    .filter((r) => !v1Ids.has(r.id) && (selectedNonV1.has(r.id) || recognizedEligible.has(r.id)))
    .sort(byRankThenId);

  const fillCount = targetCount - v1Ids.size;
  const fill = eligibleNonV1.slice(0, fillCount);
  const fillIds = new Set(fill.map((r) => r.id));
  const baselineIds = new Set([...v1Ids, ...fillIds]);

  // displaced: eligible baseline members that the proposal did NOT select.
  const displaced = fill.filter((r) => !selectedNonV1.has(r.id)).map((r) => r.id);
  // extra: proposal selections that fall outside the baseline fill (the
  // lower-ranked picks kept for diversity).
  const extra = [...selectedNonV1].filter((id) => !fillIds.has(id));
  // recognized eligibles below the cutoff -> capacity, not substitutions.
  const capacityRecognized = [...recognizedEligible].filter((id) => !baselineIds.has(id));

  // Pure-rank baseline IGNORING the V1 mandate, to detect V1 kept past the
  // natural cutoff and to define the "natural cutoff rank".
  const eligibleAll = rows
    .filter((r) => v1Ids.has(r.id) || selectedNonV1.has(r.id) || recognizedEligible.has(r.id))
    .sort(byRankThenId);
  const pure = eligibleAll.slice(0, targetCount);
  const pureIds = new Set(pure.map((r) => r.id));
  const naturalCutoffRank = rankOf(pure[pure.length - 1]);
  const mandatoryV1OutsideNaturalCutoff = [...v1Ids].filter((id) => !pureIds.has(id));

  // tail fills: baseline fill members ranked beyond the nominal target count,
  // included only because higher-ranked candidates were hard-excluded.
  const hardExclusionTailFills = fill.filter((r) => rankOf(r) > targetCount).map((r) => r.id);

  const rankLookup = (id) => {
    const r = rowById.get(id);
    return r ? (typeof r.marketCapRank === "number" ? r.marketCapRank : null) : null;
  };

  return {
    baselineIds,
    displaced,
    extra,
    capacityRecognized,
    naturalCutoffRank,
    mandatoryV1OutsideNaturalCutoff,
    hardExclusionTailFills,
    rankLookup,
  };
}

// NOTE (12C-1B1.2): the previous pairSubstitutions() helper that paired the
// displaced and extra sets by sorted-rank position was REMOVED. Substitution
// pairs are now authored explicitly in data/v2-substitutions.mjs and only
// validated against these computed sets — never constructed by rank order.
