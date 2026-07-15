import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const dataDir = path.join(repoRoot, "public/data/blockchain");
const mechanicsDir = path.join(repoRoot, "public/assets/rushpi/mechanics");
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
  if (typeof chapter.winCondition !== "string" || chapter.winCondition.trim().length < 15) error(`${context}: concrete winCondition required`);
  if (!Array.isArray(chapter.failConditions) || chapter.failConditions.length === 0) error(`${context}: failConditions required`);
  if (!Array.isArray(chapter.playerActions) || chapter.playerActions.length < 3) error(`${context}: at least three playerActions required`);
}
const seasonOne = chapters.filter((chapter) => chapter.seasonOneRecommended);
if (seasonOne.length !== 8) error(`Campaign Season 1: expected 8 chapters, found ${seasonOne.length}`);
if (new Set(seasonOne.map((chapter) => chapter.seasonOrder)).size !== seasonOne.length) error("Campaign Season 1: duplicate seasonOrder");
const templateCounts = new Map();
for (const chapter of seasonOne) templateCounts.set(chapter.gameplayTemplate, (templateCounts.get(chapter.gameplayTemplate) ?? 0) + 1);
if (templateCounts.size < 4) error("Campaign Season 1: at least four gameplay templates required");
if ([...templateCounts.values()].some((count) => count > 2)) error("Campaign Season 1: a gameplay template appears more than twice");
if (seasonOne.filter((chapter) => chapter.gameplayTemplate !== "Runner Mission").length < 4) error("Campaign Season 1: at least half the chapters must be non-runners");
if (!seasonOne.some((chapter) => chapter.chainOrFamily?.includes("pi-network"))) error("Campaign Season 1: Pi must be central");

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
  if (!Array.isArray(level.objectives) || level.objectives.length === 0) error(`${context}: objectives required`);
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
const prototypeScenarios = [
  {
    levelId: "bitcoin-utxo-vault-maze",
    label: "winning route",
    commands: ["up", "right", "up", "right"],
    expectedStops: ["btc-utxo-a", "btc-utxo-b", "btc-final-transaction", "btc-exit"],
  },
  {
    levelId: "bitcoin-utxo-vault-maze",
    label: "spent-output failure route",
    commands: ["up", "right", "right"],
    expectedStops: ["btc-utxo-a", "btc-utxo-b", "btc-spent-decoy"],
  },
  {
    levelId: "ethereum-gas-labyrinth-maze",
    label: "winning route",
    commands: ["up", "right", "up", "right"],
    expectedStops: ["eth-contract-a", "eth-gas-cell", "eth-contract-b", "eth-exit"],
  },
  {
    levelId: "ethereum-gas-labyrinth-maze",
    label: "revert failure route",
    commands: ["up", "right", "right"],
    expectedStops: ["eth-contract-a", "eth-gas-cell", "eth-invalid-contract"],
  },
];

for (const scenario of prototypeScenarios) {
  const level = levels.find((candidate) => candidate.id === scenario.levelId);
  if (!level) {
    error(`Chain Maze scenario ${scenario.label}: missing level ${scenario.levelId}`);
    continue;
  }
  const tileByCoordinate = new Map((level.tiles ?? []).map((tile) => [coordinateKey(tile), tile]));
  let position = level.start;
  const actualStops = [];
  for (const command of scenario.commands) {
    position = slide(level, tileByCoordinate, position, scenarioDirections[command]);
    actualStops.push(tileByCoordinate.get(coordinateKey(position))?.id ?? coordinateKey(position));
  }
  if (actualStops.join("|") !== scenario.expectedStops.join("|")) {
    error(`Chain Maze scenario ${scenario.levelId} ${scenario.label}: expected ${scenario.expectedStops.join(" -> ")}, got ${actualStops.join(" -> ")}`);
  }
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
  console.log("Human review is still required for technical accuracy, pedagogy, accessibility, security, legal, and trademark decisions.");
}
