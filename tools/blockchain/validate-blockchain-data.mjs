import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const dataDir = path.join(repoRoot, "public/data/blockchain");
const mechanicsDir = path.join(repoRoot, "public/assets/rushpi/mechanics");
const assetManifestPath = path.join(repoRoot, "public/assets/rushpi/asset-manifest.json");
const reviewCeiling = "2026-07-15";

const expectedFiles = [
  "sources.json",
  "primitives.json",
  "chain-families.json",
  "mode-mapping.json",
  "pi-lab-modules.json",
  "survival-briefings.json",
  "campaign-chapters.json",
  "chain-maze-levels.json",
  "visual-mechanics.json",
];

const expectedSchemas = [
  "primitive.schema.json",
  "chain-family.schema.json",
  "pi-lab-module.schema.json",
  "survival-briefing.schema.json",
  "campaign-chapter.schema.json",
  "chain-maze-level.schema.json",
  "source.schema.json",
];

const accuracyStatuses = new Set([
  "current-official",
  "historical-official",
  "proposed-design",
  "simplified-for-game",
  "needs-verification",
]);
const simplificationLevels = new Set(["none", "low", "moderate", "high"]);
const editorialStatuses = new Set(["research-draft", "human-reviewed", "release-approved"]);
const errors = [];
const warnings = [];
const documents = new Map();

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function loadJson(relativePath) {
  const absolutePath = path.join(dataDir, relativePath);
  try {
    const value = JSON.parse(readFileSync(absolutePath, "utf8"));
    documents.set(relativePath, value);
    return value;
  } catch (cause) {
    error(`${relativePath}: invalid or unreadable JSON (${cause.message})`);
    return null;
  }
}

function requireFields(record, fields, context) {
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) error(`${context}: missing ${field}`);
  }
}

function requireUnique(records, context) {
  const seen = new Set();
  for (const record of records ?? []) {
    if (!record || typeof record.id !== "string" || record.id.length === 0) {
      error(`${context}: record without a non-empty id`);
      continue;
    }
    if (seen.has(record.id)) error(`${context}: duplicate id ${record.id}`);
    seen.add(record.id);
  }
  return seen;
}

function validDate(value, context) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    error(`${context}: lastReviewedAt/accessedAt must use YYYY-MM-DD`);
    return false;
  }
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    error(`${context}: invalid date ${value}`);
    return false;
  }
  if (value > reviewCeiling) warn(`${context}: review date ${value} is after validator review ceiling ${reviewCeiling}`);
  return true;
}

function validateAccuracy(record, context, simplificationRequired = false) {
  if (!accuracyStatuses.has(record.accuracyStatus)) {
    error(`${context}: invalid accuracyStatus ${String(record.accuracyStatus)}`);
  }
  if (Object.hasOwn(record, "simplificationLevel") && !simplificationLevels.has(record.simplificationLevel)) {
    error(`${context}: invalid simplificationLevel ${String(record.simplificationLevel)}`);
  }
  const simplified = simplificationRequired || record.accuracyStatus === "simplified-for-game" || ["moderate", "high"].includes(record.simplificationLevel);
  if (simplified && (typeof record.simplificationNotes !== "string" || record.simplificationNotes.trim().length < 10)) {
    error(`${context}: simplified content requires simplificationNotes`);
  }
  validDate(record.lastReviewedAt, context);
}

function validateEditorialReview(record, context) {
  const review = record.editorialReview;
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    error(`${context}: editorialReview object required`);
    return;
  }
  requireFields(review, ["status", "reviewedBy", "contentVerifiedAt", "reviewNotes", "releaseApproved"], `${context} editorialReview`);
  if (!editorialStatuses.has(review.status)) error(`${context}: invalid editorialReview status ${String(review.status)}`);
  if (review.reviewedBy !== null && (typeof review.reviewedBy !== "string" || review.reviewedBy.trim().length === 0)) error(`${context}: reviewedBy must be null or a non-empty string`);
  if (review.contentVerifiedAt !== null) validDate(review.contentVerifiedAt, `${context} contentVerifiedAt`);
  if (!Array.isArray(review.reviewNotes) || review.reviewNotes.some((note) => typeof note !== "string" || note.trim().length === 0)) error(`${context}: reviewNotes must contain non-empty strings`);
  if (typeof review.releaseApproved !== "boolean") error(`${context}: releaseApproved must be boolean`);
  if (review.status === "release-approved") {
    if (!review.reviewedBy || !review.contentVerifiedAt || review.reviewNotes.length === 0 || review.releaseApproved !== true) error(`${context}: release-approved requires reviewer, verification date, review note, and releaseApproved=true`);
  } else if (review.releaseApproved !== false) {
    error(`${context}: only release-approved status may set releaseApproved=true`);
  }
  if (record.accuracyStatus === "needs-verification" && (review.status === "release-approved" || review.releaseApproved)) error(`${context}: needs-verification content cannot be release-approved`);
  if (record.accuracyStatus === "historical-official" && !/historical|historique/i.test(JSON.stringify(record))) error(`${context}: historical content must retain an explicit warning`);
  if (review.status !== "research-draft" || review.reviewedBy !== null || review.contentVerifiedAt !== null || review.reviewNotes.length !== 0 || review.releaseApproved !== false) {
    error(`${context}: CHAIN-0.1 player-facing content must remain an unapproved research-draft`);
  }
}

function walk(value, visitor, key = "", context = "root") {
  visitor(value, key, context);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, key, `${context}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      walk(child, visitor, childKey, `${context}.${childKey}`);
    }
  }
}

function listFiles(root) {
  if (!statSafe(root)) return [];
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(absolute));
    else result.push(absolute);
  }
  return result;
}

function statSafe(target) {
  try {
    return statSync(target);
  } catch {
    return null;
  }
}

for (const file of expectedFiles) loadJson(file);
for (const schema of expectedSchemas) loadJson(path.join("schema", schema));

const sourcesDoc = documents.get("sources.json");
const sources = sourcesDoc?.sources ?? [];
const sourceIds = requireUnique(sources, "sources");
const sourceById = new Map(sources.map((source) => [source.id, source]));

if (sources.length === 0) error("sources.json: at least one source is required");
for (const source of sources) {
  const context = `source ${source.id ?? "<missing>"}`;
  requireFields(source, ["id", "title", "organization", "url", "sourceType", "official", "accessedAt", "lastReviewedAt", "relevantTopics", "notes"], context);
  if (source.org) error(`${context}: use organization, not org`);
  if (source.official !== true) error(`${context}: source catalog accepts official primary sources only`);
  if (typeof source.url !== "string" || !source.url.startsWith("https://")) error(`${context}: source URL must be HTTPS`);
  validDate(source.accessedAt, `${context} accessedAt`);
  validDate(source.lastReviewedAt, `${context} lastReviewedAt`);
  if (!Array.isArray(source.relevantTopics) || source.relevantTopics.length === 0) error(`${context}: relevantTopics is required`);
}

function validateSourceRefs(record, fields, context, requireOfficial = true) {
  const referenced = [];
  for (const field of fields) {
    if (!Array.isArray(record[field]) || record[field].length === 0) {
      error(`${context}: ${field} must contain at least one source id`);
      continue;
    }
    for (const id of record[field]) {
      referenced.push(id);
      if (!sourceIds.has(id)) error(`${context}: unknown source id ${id}`);
    }
  }
  if (requireOfficial && referenced.length > 0 && !referenced.some((id) => sourceById.get(id)?.official === true)) {
    error(`${context}: at least one official source is required`);
  }
}

const primitivesDoc = documents.get("primitives.json");
const primitives = primitivesDoc?.primitives ?? [];
const primitiveIds = requireUnique(primitives, "primitives");
if (primitives.length !== 40) error(`primitives.json: expected 40 primitives, found ${primitives.length}`);
const primitiveFields = [
  "id", "displayName", "category", "realFunction", "whatProblemItSolves", "inputs", "outputs", "actors", "stateTransitions",
  "failureCases", "securityAssumptions", "gameplayVerb", "potentialPlayerAction", "successCondition", "failureCondition", "visualLanguage",
  "animationStates", "suitableModes", "suitableGameTemplates", "educationalDifficulty", "simplificationLevel", "simplificationNotes",
  "officialSources", "sourceType", "lastReviewedAt", "accuracyStatus", "unresolvedQuestions",
];
for (const primitive of primitives) {
  const context = `primitive ${primitive.id ?? "<missing>"}`;
  requireFields(primitive, primitiveFields, context);
  validateSourceRefs(primitive, ["officialSources"], context);
  validateAccuracy(primitive, context);
  if (!Array.isArray(primitive.failureCases) || primitive.failureCases.length === 0) error(`${context}: failureCases required`);
  if (!Array.isArray(primitive.securityAssumptions) || primitive.securityAssumptions.length === 0) error(`${context}: securityAssumptions required`);
  if (!primitive.successCondition || !primitive.failureCondition) error(`${context}: success and failure conditions required`);
}

const families = documents.get("chain-families.json")?.families ?? [];
requireUnique(families, "chain families");
if (families.length !== 22) error(`chain-families.json: expected 22 profiles, found ${families.length}`);
for (const family of families) {
  const context = `chain family ${family.id ?? "<missing>"}`;
  validateSourceRefs(family, ["officialSources"], context);
  validateAccuracy(family, context);
  if (!Array.isArray(family.unsuitableSimplifications) || family.unsuitableSimplifications.length === 0) error(`${context}: unsuitableSimplifications required`);
  for (const layer of family.statusLayers ?? []) {
    if (!accuracyStatuses.has(layer.status)) error(`${context}: invalid status layer ${layer.status}`);
    validateSourceRefs(layer, ["sourceIds"], `${context} status layer`, false);
  }
}

const piFamily = families.find((family) => family.id === "pi-network");
if (!piFamily) {
  error("chain-families.json: pi-network profile required");
} else {
  const statuses = new Set((piFamily.statusLayers ?? []).map((layer) => layer.status));
  for (const status of ["current-official", "historical-official", "proposed-design", "simplified-for-game", "needs-verification"]) {
    if (!statuses.has(status)) error(`pi-network: missing ${status} status layer`);
  }
}

const modeDoc = documents.get("mode-mapping.json");
const mappings = modeDoc?.mappings ?? [];
if (mappings.length !== primitives.length) error(`mode-mapping.json: expected ${primitives.length} mappings, found ${mappings.length}`);
const mappedIds = new Set();
for (const mapping of mappings) {
  const context = `mode mapping ${mapping.primitiveId ?? "<missing>"}`;
  if (!primitiveIds.has(mapping.primitiveId)) error(`${context}: unknown primitive`);
  if (mappedIds.has(mapping.primitiveId)) error(`${context}: duplicate mapping`);
  mappedIds.add(mapping.primitiveId);
  for (const mode of ["Daily", "Pi Lab", "Survival", "Campaign"]) {
    if (!mapping[mode] || !["compatible", "incompatible"].includes(mapping[mode].status)) error(`${context}: invalid ${mode} status`);
    if (typeof mapping[mode]?.explanation !== "string" || mapping[mode].explanation.trim().length < 10) error(`${context}: ${mode} explanation required`);
  }
}
for (const id of primitiveIds) if (!mappedIds.has(id)) error(`mode-mapping.json: missing primitive ${id}`);

const modules = documents.get("pi-lab-modules.json")?.modules ?? [];
requireUnique(modules, "Pi Lab modules");
if (new Set(modules.map((module) => module.level)).size !== 4) error("pi-lab-modules.json: all four levels are required");
const moduleFields = ["learnerGoal", "verifiedConcept", "oneSentenceExplanation", "demonstration", "interaction", "checkQuestion", "correctFeedback", "incorrectFeedback", "recap", "estimatedSeconds", "PiSpecific", "sources", "simplificationNotes", "proposedReward", "futureAssetNeeds"];
for (const module of modules) {
  const context = `Pi Lab module ${module.id ?? "<missing>"}`;
  requireFields(module, moduleFields, context);
  validateSourceRefs(module, ["sources"], context);
  validateAccuracy(module, context, true);
  validateEditorialReview(module, context);
  const check = module.checkQuestion;
  if (!check || typeof check.prompt !== "string" || !Array.isArray(check.answers) || check.answers.length < 2 || !Number.isInteger(check.correctIndex) || check.correctIndex < 0 || check.correctIndex >= check.answers.length) {
    error(`${context}: valid checkQuestion with answers and correctIndex required`);
  }
  if (!Number.isInteger(module.estimatedSeconds) || module.estimatedSeconds < 45 || module.estimatedSeconds > 180) error(`${context}: estimatedSeconds must be 45–180`);
}

const survivalDoc = documents.get("survival-briefings.json");
const briefings = survivalDoc?.briefings ?? [];
requireUnique(briefings, "Survival briefings");
if (briefings.length !== 8) error(`survival-briefings.json: expected 8 zones, found ${briefings.length}`);
const expectedZones = new Set(["Genesis Lane", "Orange Chain", "Smart Layer", "Neon Speednet", "Stable Grid", "Meme Circuit", "Privacy Tunnel", "Chain Storm"]);
for (const briefing of briefings) {
  const context = `Survival briefing ${briefing.id ?? "<missing>"}`;
  expectedZones.delete(briefing.zoneName);
  validateSourceRefs(briefing, ["officialSources"], context);
  validateAccuracy(briefing, context, true);
  validateEditorialReview(briefing, context);
  for (const locale of ["fr", "en"]) {
    const first = briefing.firstVisitBriefing?.[locale];
    if (!first) {
      error(`${context}: missing ${locale} first visit copy`);
      continue;
    }
    if (first.idea.length > 150) error(`${context}: ${locale} concept exceeds 150 characters`);
    if (first.rule.length > 150) error(`${context}: ${locale} rule exceeds 150 characters`);
    if (first.tip.length > 120) error(`${context}: ${locale} tip exceeds 120 characters`);
    if (first.idea.length > 100) warn(`${context}: ${locale} concept exceeds the recommended ~90 characters`);
    if (first.rule.length > 130) warn(`${context}: ${locale} rule exceeds the recommended ~120 characters`);
    if (first.tip.length > 110) warn(`${context}: ${locale} tip exceeds the recommended ~100 characters`);
    if (typeof briefing.repeatVisitBriefing?.[locale] !== "string" || briefing.repeatVisitBriefing[locale].length > 120) error(`${context}: ${locale} repeat copy missing or too long`);
  }
}
if (expectedZones.size) error(`survival-briefings.json: missing zones ${[...expectedZones].join(", ")}`);
for (const requiredPhrase of ["freeze score", "timer", "collisions", "no score"]) {
  const ux = JSON.stringify(survivalDoc?.briefingUx ?? {}).toLowerCase();
  if (!ux.includes(requiredPhrase)) error(`survival briefing UX: missing safety concept "${requiredPhrase}"`);
}

const campaignDoc = documents.get("campaign-chapters.json");
const chapters = campaignDoc?.chapters ?? [];
requireUnique(chapters, "Campaign chapters");
if (chapters.length < 12) error(`campaign-chapters.json: at least 12 proposals required, found ${chapters.length}`);
for (const chapter of chapters) {
  const context = `Campaign chapter ${chapter.id ?? "<missing>"}`;
  validateSourceRefs(chapter, ["officialSources"], context);
  validateAccuracy(chapter, context, true);
  validateEditorialReview(chapter, context);
  if (typeof chapter.winCondition !== "string" || chapter.winCondition.trim().length < 15) error(`${context}: concrete winCondition required`);
  if (!Array.isArray(chapter.failConditions) || chapter.failConditions.length === 0) error(`${context}: failConditions required`);
  if (!Array.isArray(chapter.playerActions) || chapter.playerActions.length < 3) error(`${context}: at least three playerActions required`);
}
const seasonOne = chapters.filter((chapter) => chapter.seasonOneRecommended);
if (seasonOne.length !== 8) error(`Campaign Season 1: expected 8 chapters, found ${seasonOne.length}`);
if (new Set(seasonOne.map((chapter) => chapter.seasonOrder)).size !== seasonOne.length) error("Campaign Season 1: duplicate seasonOrder");
const templateFamily = (template) => template?.startsWith("Hybrid Runner") ? "Hybrid Runner" : template;
const templateCounts = new Map();
for (const chapter of seasonOne) {
  const family = templateFamily(chapter.gameplayTemplate);
  templateCounts.set(family, (templateCounts.get(family) ?? 0) + 1);
}
const requiredTemplateCounts = new Map([
  ["Network Routing", 2],
  ["Chain Maze", 2],
  ["Sequence/Atomic Mission", 1],
  ["Validation Challenge", 1],
  ["Hybrid Runner", 2],
]);
for (const [template, expectedCount] of requiredTemplateCounts) {
  if (templateCounts.get(template) !== expectedCount) error(`Campaign Season 1: expected ${expectedCount} ${template} chapter(s), found ${templateCounts.get(template) ?? 0}`);
}
for (const template of templateCounts.keys()) if (!requiredTemplateCounts.has(template)) error(`Campaign Season 1: unexpected template family ${template}`);
if ([...templateCounts.values()].some((count) => count > 2)) error("Campaign Season 1: a gameplay template appears more than twice");
if (seasonOne.filter((chapter) => templateFamily(chapter.gameplayTemplate) !== "Hybrid Runner" && chapter.gameplayTemplate !== "Runner Mission").length !== 6) error("Campaign Season 1: exactly six chapters must be non-runners");
const orderedSeason = [...seasonOne].sort((a, b) => a.seasonOrder - b.seasonOrder);
if (orderedSeason[0]?.id !== "pi-ecosystem-gateway") error("Campaign Season 1: Pi Ecosystem Gateway must be first");
if (orderedSeason[7]?.id !== "multichain-finale") error("Campaign Season 1: Multichain Finale must be eighth");
const gateway = chapters.find((chapter) => chapter.id === "pi-ecosystem-gateway");
if (!gateway?.chainOrFamily?.includes("pi-network") || gateway.officialSources?.includes("pi-whitepaper-original")) error("Campaign: Pi Ecosystem Gateway must use current documented Pi developer workflows, not the historical whitepaper");
const archive = chapters.find((chapter) => chapter.id === "federated-trust-archive");
if (!archive || archive.seasonOneRecommended || archive.seasonOrder !== null) error("Campaign: Federated Trust Archive must remain outside Season 1");
if (archive && (!/historical\/general consensus concept/i.test(archive.briefing) || !archive.contentWarning?.en || !archive.contentWarning?.fr)) error("Campaign: Federated Trust Archive needs explicit bilingual historical/general warning copy");
const finale = chapters.find((chapter) => chapter.id === "multichain-finale");
if (finale?.contentWarning?.en !== "This fictional multichain simulation does not imply that Pi Network natively implements every protocol family represented." || !finale?.contentWarning?.fr) error("Campaign: Multichain Finale requires the explicit English warning and a French version");

const mazeDoc = documents.get("chain-maze-levels.json");
const levels = mazeDoc?.levels ?? [];
const taxonomy = new Map((mazeDoc?.tileTaxonomy ?? []).map((entry) => [entry.type, entry]));
requireUnique(levels, "Chain Maze levels");
if (levels.length < 2) error("chain-maze-levels.json: two complete prototypes required");
for (const expectedType of ["wall", "empty", "anchor", "start", "exit", "collectible", "hazard", "oneWay", "portal", "validator", "transaction", "spentOutput", "contract", "gasCell", "instruction", "proofFragment", "bridge", "checkpoint"]) {
  if (!taxonomy.has(expectedType)) error(`Chain Maze taxonomy: missing ${expectedType}`);
}

function coordinateKey(position) {
  return `${position.x},${position.y}`;
}

function slide(level, tileByCoordinate, position, direction) {
  let x = position.x;
  let y = position.y;
  let moved = false;
  while (true) {
    const nextX = x + direction.x;
    const nextY = y + direction.y;
    if (nextX < 0 || nextY < 0 || nextX >= level.width || nextY >= level.height) break;
    const tile = tileByCoordinate.get(`${nextX},${nextY}`);
    const tileType = tile ? taxonomy.get(tile.type) : taxonomy.get("empty");
    if (!tileType?.walkable) break;
    x = nextX;
    y = nextY;
    moved = true;
    if (tile && tileType.stopsMovement) break;
  }
  return moved ? { x, y } : position;
}

function baseReachable(level, tileByCoordinate) {
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const queue = [level.start];
  const visited = new Set([coordinateKey(level.start)]);
  while (queue.length) {
    const position = queue.shift();
    if (position.x === level.exit.x && position.y === level.exit.y) return true;
    for (const direction of directions) {
      const next = slide(level, tileByCoordinate, position, direction);
      const key = coordinateKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
  return false;
}

for (const level of levels) {
  const context = `Chain Maze level ${level.id ?? "<missing>"}`;
  validateSourceRefs(level, ["officialSources"], context);
  validateAccuracy(level, context, true);
  validateEditorialReview(level, context);
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 3 || level.height < 3) error(`${context}: rectangular dimensions required`);
  const inBounds = (position) => Number.isInteger(position?.x) && Number.isInteger(position?.y) && position.x >= 0 && position.y >= 0 && position.x < level.width && position.y < level.height;
  if (!inBounds(level.start)) error(`${context}: invalid start coordinate`);
  if (!inBounds(level.exit)) error(`${context}: invalid exit coordinate`);
  const tileIds = new Set();
  const tileByCoordinate = new Map();
  for (const tile of level.tiles ?? []) {
    if (tileIds.has(tile.id)) error(`${context}: duplicate tile id ${tile.id}`);
    tileIds.add(tile.id);
    if (!inBounds(tile)) error(`${context}: tile ${tile.id} out of bounds`);
    const key = coordinateKey(tile);
    if (tileByCoordinate.has(key)) error(`${context}: duplicate tile coordinate ${key}`);
    tileByCoordinate.set(key, tile);
    if (!taxonomy.has(tile.type)) error(`${context}: unknown tile type ${tile.type}`);
    if ((Object.hasOwn(tile, "value") && tile.value < 0) || (Object.hasOwn(tile, "cost") && tile.cost < 0)) error(`${context}: tile ${tile.id} has a negative value or cost`);
  }
  const startTiles = (level.tiles ?? []).filter((tile) => tile.type === "start");
  const exitTiles = (level.tiles ?? []).filter((tile) => tile.type === "exit");
  if (startTiles.length !== 1 || coordinateKey(startTiles[0] ?? {}) !== coordinateKey(level.start)) error(`${context}: one matching start tile required`);
  if (exitTiles.length !== 1 || coordinateKey(exitTiles[0] ?? {}) !== coordinateKey(level.exit)) error(`${context}: one matching exit tile required`);
  requireUnique(level.rules ?? [], `${context} rules`);
  requireUnique(level.resources ?? [], `${context} resources`);
  requireUnique(level.objectives ?? [], `${context} objectives`);
  requireUnique(level.validationScenarios ?? [], `${context} validation scenarios`);
  if (!Array.isArray(level.objectives) || level.objectives.length === 0) error(`${context}: objectives required`);
  if (!Array.isArray(level.validationScenarios) || level.validationScenarios.length < 4) error(`${context}: at least four validation scenarios required`);
  const resourceIds = new Set((level.resources ?? []).map((resource) => resource.id));
  for (const objective of level.objectives ?? []) {
    if (objective.resourceId && !resourceIds.has(objective.resourceId)) error(`${context}: objective ${objective.id} references unknown resource ${objective.resourceId}`);
  }
  for (const scenario of level.validationScenarios ?? []) {
    if (!Array.isArray(scenario.commands) || scenario.commands.length === 0 || scenario.commands.some((command) => !["up", "right", "down", "left"].includes(command))) error(`${context}: scenario ${scenario.id} has invalid commands`);
    for (const resourceId of Object.keys(scenario.expectedResources ?? {})) if (!resourceIds.has(resourceId)) error(`${context}: scenario ${scenario.id} expects unknown resource ${resourceId}`);
  }
  for (const resource of level.resources ?? []) {
    if (![resource.initial, resource.minimum, resource.target].filter((value) => value !== undefined).every((value) => Number.isInteger(value) && value >= 0)) error(`${context}: resource ${resource.id} must be non-negative`);
  }
  if (!baseReachable(level, tileByCoordinate)) error(`${context}: exit is not reachable under base directional movement`);
}

const scenarioDirections = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function scenarioObjectiveSatisfied(objective, state) {
  if (objective.type === "resource-at-least") return state.resources[objective.resourceId] >= objective.target;
  if (objective.type === "resource-equals") return state.resources[objective.resourceId] === objective.target;
  if (objective.type === "activate-tile") return state.resolvedTiles.has(objective.target);
  if (objective.type === "activate-tiles") return objective.target.every((id) => state.resolvedTiles.has(id));
  if (objective.type === "reach-exit") return state.status === "won";
  return false;
}

function failScenario(state, failureCode) {
  state.status = "failed";
  state.failureCode = failureCode;
}

function checkScenarioFloors(level, state) {
  for (const resource of level.resources ?? []) {
    if (state.resources[resource.id] < resource.minimum) {
      const rule = level.rules.find((candidate) => candidate.type === "resource-floor" && candidate.parameters.resourceId === resource.id);
      failScenario(state, rule?.parameters.failureCode ?? "resource-floor");
      return;
    }
  }
}

function resolveScenarioTile(level, state, tile) {
  if (!tile) return;
  if (tile.type === "spentOutput") {
    const rule = level.rules.find((candidate) => candidate.type === "spent-output-fails");
    failScenario(state, rule?.parameters.failureCode ?? "spent-output");
    return;
  }
  if (tile.type === "hazard") {
    failScenario(state, "hazard");
    return;
  }
  if ((tile.type === "collectible" || tile.type === "gasCell") && !state.resolvedTiles.has(tile.id)) {
    const resourceId = tile.type === "gasCell" ? "gas" : level.rules.find((rule) => rule.type === "collect-once")?.parameters.resourceId;
    if (resourceId) state.resources[resourceId] += tile.value ?? 0;
    state.resolvedTiles.add(tile.id);
    return;
  }
  if (tile.type === "contract" && !state.resolvedTiles.has(tile.id)) {
    state.resources.gas -= tile.cost ?? 0;
    checkScenarioFloors(level, state);
    if (state.status !== "active") return;
    if (tile.state === "invalid") {
      const rule = level.rules.find((candidate) => candidate.type === "invalid-contract-fails");
      failScenario(state, rule?.parameters.failureCode ?? "revert");
      return;
    }
    state.resolvedTiles.add(tile.id);
    return;
  }
  if (tile.type === "transaction" && !state.resolvedTiles.has(tile.id)) {
    const rule = level.rules.find((candidate) => candidate.type === "utxo-transaction");
    if (!rule) {
      failScenario(state, "missing-transaction-rule");
      return;
    }
    const inputValue = state.resources[rule.parameters.inputResourceId];
    if (inputValue < rule.parameters.minimumInput) {
      failScenario(state, "insufficient-input");
      return;
    }
    state.resources[rule.parameters.outputResourceId] = rule.parameters.outputValue;
    state.resources[rule.parameters.feeResourceId] = rule.parameters.feeValue;
    state.resources[rule.parameters.changeResourceId] = inputValue - rule.parameters.outputValue - rule.parameters.feeValue;
    state.resolvedTiles.add(tile.id);
    return;
  }
  if (tile.type === "exit") {
    const incomplete = level.objectives.filter((objective) => objective.type !== "reach-exit" && !scenarioObjectiveSatisfied(objective, state));
    if (incomplete.length) failScenario(state, "exit-locked");
    else state.status = "won";
  }
}

function simulateScenario(level, scenario) {
  const tileByCoordinate = new Map((level.tiles ?? []).map((tile) => [coordinateKey(tile), tile]));
  const state = {
    position: { ...level.start },
    moves: 0,
    status: "active",
    failureCode: null,
    resources: Object.fromEntries((level.resources ?? []).map((resource) => [resource.id, resource.initial])),
    resolvedTiles: new Set(),
  };
  for (const command of scenario.commands) {
    if (state.status !== "active") break;
    const currentTile = tileByCoordinate.get(coordinateKey(state.position));
    if (currentTile?.type === "oneWay" && currentTile.direction !== command) continue;
    const destination = slide(level, tileByCoordinate, state.position, scenarioDirections[command]);
    if (coordinateKey(destination) === coordinateKey(state.position)) continue;
    state.moves += 1;
    const moveCostRule = level.rules.find((rule) => rule.type === "cost-per-command");
    if (moveCostRule) state.resources[moveCostRule.parameters.resourceId] -= moveCostRule.parameters.cost;
    state.position = destination;
    checkScenarioFloors(level, state);
    if (state.status === "active") resolveScenarioTile(level, state, tileByCoordinate.get(coordinateKey(state.position)));
  }
  return state;
}

for (const level of levels) {
  for (const scenario of level.validationScenarios ?? []) {
    const context = `Chain Maze scenario ${level.id}/${scenario.id}`;
    const actual = simulateScenario(level, scenario);
    if (actual.status !== scenario.expectedStatus) error(`${context}: expected status ${scenario.expectedStatus}, got ${actual.status}`);
    if (actual.failureCode !== scenario.expectedFailureCode) error(`${context}: expected failure ${scenario.expectedFailureCode}, got ${actual.failureCode}`);
    if (actual.moves !== scenario.expectedMoves) error(`${context}: expected ${scenario.expectedMoves} moves, got ${actual.moves}`);
    for (const [resourceId, expectedValue] of Object.entries(scenario.expectedResources ?? {})) {
      if (actual.resources[resourceId] !== expectedValue) error(`${context}: expected ${resourceId}=${expectedValue}, got ${actual.resources[resourceId]}`);
    }
  }
}

const bitcoinLevel = levels.find((level) => level.id === "bitcoin-utxo-vault-maze");
const ethereumLevel = levels.find((level) => level.id === "ethereum-gas-labyrinth-maze");
if (!bitcoinLevel || !ethereumLevel) {
  error("Chain Maze: Bitcoin and Ethereum v2 levels are both required");
} else {
  if (bitcoinLevel.width === ethereumLevel.width && bitcoinLevel.height === ethereumLevel.height) error("Chain Maze: Bitcoin and Ethereum must have different dimensions");
  if (coordinateKey(bitcoinLevel.start) === coordinateKey(ethereumLevel.start) && coordinateKey(bitcoinLevel.exit) === coordinateKey(ethereumLevel.exit)) error("Chain Maze: Bitcoin and Ethereum cannot share both start and exit coordinates");
  const wallSignature = (level) => level.tiles.filter((tile) => tile.type === "wall").map(coordinateKey).sort().join("|");
  if (wallSignature(bitcoinLevel) === wallSignature(ethereumLevel)) error("Chain Maze: Bitcoin and Ethereum cannot share the same wall coordinates");
  const bitcoinPrimary = bitcoinLevel.validationScenarios.find((scenario) => scenario.routeRole === "optimal");
  const ethereumPrimary = ethereumLevel.validationScenarios.find((scenario) => scenario.routeRole === "short-costly");
  if (bitcoinPrimary?.commands.join("|") === ethereumPrimary?.commands.join("|")) error("Chain Maze: Bitcoin and Ethereum cannot share the same primary winning command list");

  const bitcoinUtxos = bitcoinLevel.tiles.filter((tile) => tile.type === "collectible" && tile.state === "available");
  if (bitcoinLevel.width < 10 || bitcoinLevel.height < 9) error("Bitcoin UTXO Vault v2: minimum dimensions are 10x9");
  if (bitcoinUtxos.length < 3) error("Bitcoin UTXO Vault v2: at least three available UTXOs required");
  for (const value of [2, 3, 5]) if (!bitcoinUtxos.some((tile) => tile.value === value)) error(`Bitcoin UTXO Vault v2: missing available UTXO value ${value}`);
  if (!bitcoinLevel.tiles.some((tile) => tile.type === "spentOutput")) error("Bitcoin UTXO Vault v2: an already spent output is required");
  const bitcoinWins = bitcoinLevel.validationScenarios.filter((scenario) => scenario.expectedStatus === "won");
  if (bitcoinWins.length < 2 || bitcoinWins.some((scenario) => scenario.commands.length <= 4)) error("Bitcoin UTXO Vault v2: two winning routes longer than four commands are required");
  for (const role of ["optimal", "alternate", "insufficient", "spent-output"]) if (!bitcoinLevel.validationScenarios.some((scenario) => scenario.routeRole === role)) error(`Bitcoin UTXO Vault v2: missing ${role} scenario`);
  for (const scenario of bitcoinWins) {
    const result = simulateScenario(bitcoinLevel, scenario);
    if (result.resources.createdOutputValue !== 6 || result.resources.abstractFee !== 1 || result.resources.abstractChange !== result.resources.selectedInputValue - 7) error(`Bitcoin UTXO Vault v2: incoherent output/fee/change in ${scenario.id}`);
  }

  const validContracts = ethereumLevel.tiles.filter((tile) => tile.type === "contract" && tile.state !== "invalid" && tile.required);
  const invalidContracts = ethereumLevel.tiles.filter((tile) => tile.type === "contract" && tile.state === "invalid");
  if (validContracts.length < 2) error("Ethereum Gas Labyrinth v2: at least two required valid contracts are required");
  if (invalidContracts.length < 1) error("Ethereum Gas Labyrinth v2: an invalid contract is required");
  if (!ethereumLevel.tiles.some((tile) => tile.type === "gasCell")) error("Ethereum Gas Labyrinth v2: a gas cell is required");
  const ethereumWins = ethereumLevel.validationScenarios.filter((scenario) => scenario.expectedStatus === "won");
  if (ethereumWins.length < 2) error("Ethereum Gas Labyrinth v2: at least two winning routes are required");
  for (const role of ["short-costly", "long-efficient", "out-of-gas", "revert", "premature-exit"]) if (!ethereumLevel.validationScenarios.some((scenario) => scenario.routeRole === role)) error(`Ethereum Gas Labyrinth v2: missing ${role} scenario`);
  const shortRoute = ethereumLevel.validationScenarios.find((scenario) => scenario.routeRole === "short-costly");
  const efficientRoute = ethereumLevel.validationScenarios.find((scenario) => scenario.routeRole === "long-efficient");
  const shortResult = shortRoute && simulateScenario(ethereumLevel, shortRoute);
  const efficientResult = efficientRoute && simulateScenario(ethereumLevel, efficientRoute);
  if (!shortRoute || !efficientRoute || shortRoute.commands.length >= efficientRoute.commands.length || shortResult.resources.gas >= efficientResult.resources.gas) error("Ethereum Gas Labyrinth v2: the longer gas-cell route must retain more gas than the short costly route");
  if (ethereumLevel.resources.find((resource) => resource.id === "gas")?.initial !== 16) error("Ethereum Gas Labyrinth v2: initial abstract gas budget must be 16");
  if (!validContracts.some((tile) => tile.cost === 3) || !validContracts.some((tile) => tile.cost === 5)) error("Ethereum Gas Labyrinth v2: required contract costs 3 and 5 are missing");
  if (!ethereumLevel.tiles.some((tile) => tile.type === "gasCell" && tile.value === 4)) error("Ethereum Gas Labyrinth v2: optional gas cell must add 4 abstract units");
}

const visualMechanics = documents.get("visual-mechanics.json")?.mechanics ?? [];
requireUnique(visualMechanics, "visual mechanics");
const visualFields = ["idleVisual", "activeVisual", "warningVisual", "successVisual", "failureVisual", "hudIndicator", "portalStyle", "collectibleStyle", "obstacleStyle", "animationAnticipation", "animationSuccess", "animationFailure", "reducedMotionFallback"];
for (const visual of visualMechanics) requireFields(visual, visualFields, `visual mechanic ${visual.id ?? "<missing>"}`);

for (const [file, document] of documents) {
  if (file === "sources.json" || file.startsWith("schema")) continue;
  walk(document, (value, key, context) => {
    if (typeof value !== "string") return;
    if (/^https?:\/\//i.test(value)) error(`${file} ${context}: content must reference source IDs instead of URLs`);
    if (/^https?:\/\/.*\.(?:png|jpe?g|gif|webp|svg)(?:[?#]|$)/i.test(value)) error(`${file} ${context}: external image URL forbidden`);
  });
}

const scopedContent = expectedFiles.filter((file) => file !== "sources.json").map((file) => JSON.stringify(documents.get(file) ?? {})).join("\n");
const unsafePromotionPatterns = [
  /guaranteed\s+(?:profit|return|income|gain)/i,
  /earn\s+(?:money|cash|tokens?|rewards?)/i,
  /invest\s+now/i,
  /(?:buy|sell)\s+(?:this\s+)?token/i,
  /\b\d+(?:\.\d+)?%\s*(?:apy|apr|yield)\b/i,
  /price\s+prediction/i,
];
for (const pattern of unsafePromotionPatterns) if (pattern.test(scopedContent)) error(`content safety: promotional investment pattern ${pattern}`);

const obviousConfusions = [
  /a stablecoin is (?:a )?consensus/i,
  /an amm is (?:a )?blockchain/i,
  /a bridge is always (?:a )?blockchain/i,
  /a token represents every technical property/i,
  /zk automatically means private/i,
  /daily (?:app )?tap directly validates blocks/i,
];
const confusionExampleContexts = /(?:unsuitableSimplifications|failConditions|failureCondition|incorrectFeedback|checkQuestion|simplificationNotes|unresolvedQuestions)/i;
for (const [file, document] of documents) {
  if (file === "sources.json" || file.startsWith("schema")) continue;
  walk(document, (value, _key, context) => {
    if (typeof value !== "string" || confusionExampleContexts.test(context)) return;
    const normalized = value.toLowerCase();
    if (/\b(?:not|never|no|does not|must not|cannot)\b/.test(normalized)) return;
    for (const pattern of obviousConfusions) {
      if (pattern.test(value)) error(`${file} ${context}: obvious token/blockchain confusion ${pattern}`);
    }
  });
}

const svgFiles = listFiles(mechanicsDir).filter((file) => file.toLowerCase().endsWith(".svg"));
let mechanicsManifestAssets = [];
try {
  const assetManifest = JSON.parse(readFileSync(assetManifestPath, "utf8"));
  if (!assetManifest.families?.some((family) => family.id === "blockchain-mechanics-foundation")) {
    error("asset-manifest.json: blockchain-mechanics-foundation family required");
  }
  mechanicsManifestAssets = (assetManifest.assets ?? []).filter((asset) => asset.category === "mechanics");
  if (mechanicsManifestAssets.length !== 6) error(`asset-manifest.json: expected 6 mechanics assets, found ${mechanicsManifestAssets.length}`);
  const listedMechanics = new Set(mechanicsManifestAssets.map((asset) => path.resolve(path.join(repoRoot, "public/assets/rushpi"), asset.file)));
  for (const svg of svgFiles) if (!listedMechanics.has(path.resolve(svg))) error(`${path.relative(repoRoot, svg).replaceAll("\\", "/")}: missing mechanics manifest entry`);
} catch (cause) {
  error(`asset-manifest.json: invalid or unreadable (${cause.message})`);
}
const brandPattern = /(?:pi[\s_-]*network|bitcoin|ethereum|solana|stellar|avalanche|polkadot|cosmos|cardano|zcash|monero|algorand|near|sui|aptos|xrp|hedera|filecoin|arweave|chainlink)/i;
for (const file of listFiles(mechanicsDir)) {
  const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
  if (/logo/i.test(path.basename(file)) || brandPattern.test(path.basename(file))) error(`${relative}: logo or protocol-branded filename forbidden`);
}
for (const file of svgFiles) {
  const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
  const content = readFileSync(file, "utf8");
  if (/<image\b/i.test(content) || /(?:href|xlink:href)\s*=/i.test(content)) error(`${relative}: embedded or external SVG image forbidden`);
  if (/<text\b/i.test(content)) error(`${relative}: visible SVG text forbidden; use runtime labels`);
  if (brandPattern.test(content)) error(`${relative}: protocol brand reference forbidden in visual SVG`);
}

const requiredPlayerShell = path.join(mechanicsDir, "player/player-orb-shell.svg");
if (!statSafe(requiredPlayerShell)) {
  error("player/player-orb-shell.svg is required");
} else {
  const shell = readFileSync(requiredPlayerShell, "utf8");
  for (const group of ["orb-shell", "shield-effect", "magnet-effect", "charge-effect"]) if (!shell.includes(`id="${group}"`)) error(`player-orb-shell.svg: missing ${group} group`);
}

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.forEach((message) => console.log(`  - ${message}`));
}

if (errors.length) {
  console.error(`Blockchain data validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exitCode = 1;
} else {
  console.log("Blockchain data validation passed.");
  console.log(`  Sources: ${sources.length}`);
  console.log(`  Primitives: ${primitives.length}`);
  console.log(`  Chain/family profiles: ${families.length}`);
  console.log(`  Mode mappings: ${mappings.length}`);
  console.log(`  Pi Lab modules: ${modules.length}`);
  console.log(`  Survival briefings: ${briefings.length}`);
  console.log(`  Campaign chapters: ${chapters.length} (${seasonOne.length} in Season 1)`);
  console.log(`  Chain Maze levels: ${levels.length}`);
  console.log(`  Visual mechanic families: ${visualMechanics.length}`);
  console.log(`  Lightweight SVG templates: ${svgFiles.length}`);
  console.log(`  Editorial research drafts: ${modules.length + briefings.length + chapters.length + levels.length}`);
  console.log(`  Mechanics manifest assets: ${mechanicsManifestAssets.length}`);
  console.log("Human review is still required for technical accuracy, pedagogy, accessibility, security, legal, and trademark decisions.");
}
