const DATA_BASE = "/data/blockchain";
const dataFiles = {
  sources: "sources.json",
  primitives: "primitives.json",
  families: "chain-families.json",
  mapping: "mode-mapping.json",
  modules: "pi-lab-modules.json",
  survival: "survival-briefings.json",
  campaign: "campaign-chapters.json",
  mazes: "chain-maze-levels.json",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

let data;
let moduleState = { index: 0, step: 0, answered: false, tried: false };
let survivalTimer;
let mazeState;
let swipeStart;

const moduleStages = ["Learn", "See", "Try", "Check", "Recap"];
const modePresentation = [
  { id: "Daily", title: "Daily Token Rush", subtitle: "Market and competition", copy: "Short active classification, collection, ordering, scarcity, or abstract resource choices. No live prices." },
  { id: "Pi Lab", title: "Pi Lab", subtitle: "Learning and experimentation", copy: "Learn, see, try, check, and recap one sourced concept at a time." },
  { id: "Survival", title: "Blockchain Survival", subtitle: "Adaptation and evolving rules", copy: "Progressive network, finality, congestion, privacy, and interoperability rules." },
  { id: "Campaign", title: "Chain Journey", subtitle: "Application through varied gameplay", copy: "Complete routing, validation, maze, sequence, and resource missions." },
];

const editorialLabels = {
  "research-draft": "Research draft",
  "human-reviewed": "Human reviewed",
  "release-approved": "Release approved",
};

function editorialBadge(record) {
  const status = record.editorialReview?.status ?? "research-draft";
  const label = editorialLabels[status] ?? status;
  return `<span class="editorial-badge ${escapeHtml(status)}" aria-label="Editorial status: ${escapeHtml(label)}">${escapeHtml(label)}</span>`;
}

async function loadData() {
  const entries = await Promise.all(Object.entries(dataFiles).map(async ([key, file]) => {
    const response = await fetch(`${DATA_BASE}/${file}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(entries);
}

function renderModeMap() {
  $("#mode-grid").innerHTML = modePresentation.map((mode) => `
    <article class="mode-card">
      <strong>${escapeHtml(mode.subtitle)}</strong>
      <h3>${escapeHtml(mode.title)}</h3>
      <p>${escapeHtml(mode.copy)}</p>
    </article>
  `).join("");

  const primitiveById = new Map(data.primitives.primitives.map((primitive) => [primitive.id, primitive]));
  $("#mode-table-body").innerHTML = data.mapping.mappings.map((mapping) => {
    const primitive = primitiveById.get(mapping.primitiveId);
    const cells = modePresentation.map(({ id }) => {
      const compatible = mapping[id].status === "compatible";
      return `<td class="${compatible ? "compat" : "incompat"}" title="${escapeHtml(mapping[id].explanation)}">${compatible ? "Compatible" : "Incompatible"}</td>`;
    }).join("");
    return `<tr><th scope="row">${escapeHtml(primitive?.displayName ?? mapping.primitiveId)}</th>${cells}</tr>`;
  }).join("");
}

function renderPrimitiveFilters() {
  const categories = [...new Set(data.primitives.primitives.map((primitive) => primitive.category))].sort();
  $("#primitive-category").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(""));
  $("#primitive-search").addEventListener("input", renderPrimitives);
  $("#primitive-category").addEventListener("change", renderPrimitives);
  renderPrimitives();
}

function renderPrimitives() {
  const query = $("#primitive-search").value.trim().toLowerCase();
  const category = $("#primitive-category").value;
  const matches = data.primitives.primitives.filter((primitive) => {
    const haystack = [primitive.displayName, primitive.category, primitive.gameplayVerb, primitive.realFunction, ...primitive.failureCases].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!category || primitive.category === category);
  });
  $("#primitive-count").textContent = `${matches.length} of ${data.primitives.primitives.length} primitives`;
  $("#primitive-grid").innerHTML = matches.map((primitive) => `
    <article class="primitive-card">
      <span class="tag">${escapeHtml(primitive.category)}</span>
      <h3>${escapeHtml(primitive.displayName)}</h3>
      <p>${escapeHtml(primitive.realFunction)}</p>
      <dl>
        <dt>Gameplay verb</dt><dd>${escapeHtml(primitive.gameplayVerb)}</dd>
        <dt>Success</dt><dd>${escapeHtml(primitive.successCondition)}</dd>
        <dt>Failure example</dt><dd>${escapeHtml(primitive.failureCases[0])}</dd>
        <dt>Accuracy</dt><dd>${escapeHtml(primitive.accuracyStatus)} · ${escapeHtml(primitive.simplificationLevel)}</dd>
      </dl>
      <details><summary>Sources and simplification</summary><p>${escapeHtml(primitive.simplificationNotes)}</p><p class="source-ids">${escapeHtml(primitive.officialSources.join(" · "))}</p></details>
    </article>
  `).join("");
}

function setupPiLab() {
  const select = $("#module-select");
  select.innerHTML = data.modules.modules.map((module, index) => `<option value="${index}">Level ${module.level} · ${escapeHtml(module.title)}</option>`).join("");
  select.addEventListener("change", () => {
    moduleState = { index: Number(select.value), step: 0, answered: false, tried: false };
    renderPiModule();
  });
  $("#module-back").addEventListener("click", () => {
    moduleState.step = Math.max(0, moduleState.step - 1);
    renderPiModule();
  });
  $("#module-next").addEventListener("click", () => {
    moduleState.step = Math.min(moduleStages.length - 1, moduleState.step + 1);
    renderPiModule();
  });
  renderPiModule();
}

function renderPiModule() {
  const module = data.modules.modules[moduleState.index];
  $("#module-select").value = String(moduleState.index);
  $("#module-steps").innerHTML = moduleStages.map((stage, index) => `<span class="step-tab ${index === moduleState.step ? "active" : ""}" ${index === moduleState.step ? 'aria-current="step"' : ""}>${stage}</span>`).join("");
  $("#module-back").disabled = moduleState.step === 0;
  $("#module-next").disabled = moduleState.step === moduleStages.length - 1;

  let content;
  if (moduleState.step === 0) {
    content = `<p class="eyebrow">Level ${module.level} · ${escapeHtml(module.accuracyStatus)}</p><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.oneSentenceExplanation)}</p><p><strong>Goal:</strong> ${escapeHtml(module.learnerGoal)}</p>`;
  } else if (moduleState.step === 1) {
    content = `<p class="eyebrow">See</p><h3>Demonstration</h3><div class="module-demo"><div><div class="replica-demo" aria-hidden="true"><span></span><span></span><span></span></div><p>${escapeHtml(module.demonstration)}</p></div></div>`;
  } else if (moduleState.step === 2) {
    content = `<p class="eyebrow">Try</p><h3>Apply the concept</h3><p>${escapeHtml(module.interaction)}</p><button type="button" id="module-try-action">Apply the valid step</button><p class="feedback" id="module-try-feedback">${moduleState.tried ? "Valid relationship applied. Continue to the check." : ""}</p>`;
  } else if (moduleState.step === 3) {
    content = `<p class="eyebrow">Check</p><h3>${escapeHtml(module.checkQuestion.prompt)}</h3><div class="answer-list">${module.checkQuestion.answers.map((answer, index) => `<button type="button" data-answer="${index}">${escapeHtml(answer)}</button>`).join("")}</div><p class="feedback" id="module-check-feedback"></p>`;
  } else {
    content = `<p class="eyebrow">Recap</p><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.recap)}</p><p><strong>Proposed local acknowledgement:</strong> ${escapeHtml(module.proposedReward)} — no financial or transferable value.</p><p class="source-ids">Sources: ${escapeHtml(module.sources.join(" · "))}</p>`;
  }
  content = `${editorialBadge(module)}${content}`;
  const container = $("#module-content");
  container.innerHTML = content;

  $("#module-try-action")?.addEventListener("click", () => {
    moduleState.tried = true;
    $("#module-try-feedback").textContent = "Valid relationship applied. Continue to the check.";
  });
  $$("[data-answer]", container).forEach((button) => button.addEventListener("click", () => {
    const selected = Number(button.dataset.answer);
    const correct = selected === module.checkQuestion.correctIndex;
    $$("[data-answer]", container).forEach((answerButton) => {
      answerButton.disabled = true;
      if (Number(answerButton.dataset.answer) === module.checkQuestion.correctIndex) answerButton.classList.add("correct");
    });
    if (!correct) button.classList.add("incorrect");
    $("#module-check-feedback").textContent = correct ? module.correctFeedback : module.incorrectFeedback;
    moduleState.answered = true;
  }));
}

function setupSurvival() {
  const select = $("#zone-select");
  select.innerHTML = data.survival.briefings.map((briefing, index) => `<option value="${index}">${escapeHtml(briefing.zoneName)}</option>`).join("");
  select.addEventListener("change", renderSurvival);
  $("#visit-select").addEventListener("change", renderSurvival);
  $("#reduced-motion-toggle").addEventListener("change", renderSurvival);
  renderSurvival();
}

function renderSurvival() {
  clearInterval(survivalTimer);
  $("#survival-countdown").textContent = "";
  const briefing = data.survival.briefings[Number($("#zone-select").value || 0)];
  const repeat = $("#visit-select").value === "repeat";
  const reduced = $("#reduced-motion-toggle").checked;
  $("#survival-stage").classList.toggle("reduced", reduced);
  const copy = briefing.firstVisitBriefing.en;
  $("#briefing-card").innerHTML = repeat ? `
    ${editorialBadge(briefing)}
    <p class="eyebrow">Repeat visit · gameplay frozen</p>
    <h3>${escapeHtml(briefing.zoneName)}</h3>
    <p>${escapeHtml(briefing.repeatVisitBriefing.en)}</p>
    <div class="button-row"><button type="button" class="secondary" id="review-briefing">Review rule</button><button type="button" id="resume-survival">Continue</button></div>
  ` : `
    ${editorialBadge(briefing)}
    <p class="eyebrow">First visit · gameplay frozen</p>
    <h3>${escapeHtml(briefing.zoneName)}</h3>
    <dl><div><dt>Blockchain idea</dt><dd>${escapeHtml(copy.idea)}</dd></div><div><dt>New journey rule</dt><dd>${escapeHtml(copy.rule)}</dd></div><div><dt>Tip</dt><dd>${escapeHtml(copy.tip)}</dd></div></dl>
    <button type="button" id="resume-survival">${escapeHtml(briefing.resumeLabel.en)}</button>
  `;
  $("#briefing-demo").textContent = reduced ? briefing.reducedMotionVersion : briefing.demonstrationIdea;
  $("#review-briefing")?.addEventListener("click", () => {
    $("#visit-select").value = "first";
    renderSurvival();
  });
  $("#resume-survival")?.addEventListener("click", startSurvivalCountdown);
}

function startSurvivalCountdown() {
  clearInterval(survivalTimer);
  const button = $("#resume-survival");
  if (button) button.disabled = true;
  let count = 3;
  const countdown = $("#survival-countdown");
  countdown.textContent = String(count);
  survivalTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdown.textContent = String(count);
    } else {
      clearInterval(survivalTimer);
      countdown.textContent = "Resume";
      setTimeout(() => {
        countdown.textContent = "";
        if (button) button.disabled = false;
      }, 600);
    }
  }, $("#reduced-motion-toggle").checked ? 250 : 700);
}

function setupCampaign() {
  $("#season-filter").addEventListener("change", renderCampaign);
  renderCampaign();
}

function renderCampaign() {
  const seasonOnly = $("#season-filter").checked;
  const chapters = data.campaign.chapters.filter((chapter) => !seasonOnly || chapter.seasonOneRecommended)
    .sort((a, b) => (a.seasonOrder ?? 99) - (b.seasonOrder ?? 99));
  $("#campaign-grid").innerHTML = chapters.map((chapter) => `
    <article class="campaign-card">
      ${editorialBadge(chapter)}
      <span class="tag">${escapeHtml(chapter.gameplayTemplate)}</span>
      <p class="order">${chapter.seasonOneRecommended ? `Season 1 · ${chapter.seasonOrder}` : "Future candidate"}</p>
      <h3>${escapeHtml(chapter.title)}</h3>
      <p>${escapeHtml(chapter.gameplayFantasy)}</p>
      <h4>Win</h4><p>${escapeHtml(chapter.winCondition)}</p>
      ${chapter.contentWarning ? `<aside class="content-warning"><strong>Required notice</strong><span lang="en">${escapeHtml(chapter.contentWarning.en)}</span><span lang="fr">${escapeHtml(chapter.contentWarning.fr)}</span></aside>` : ""}
      <details><summary>Actions, sources, and simplification</summary><ul>${chapter.playerActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul><p>${escapeHtml(chapter.simplificationNotes)}</p><p class="source-ids">${escapeHtml(chapter.officialSources.join(" · "))}</p></details>
    </article>
  `).join("");
}

function setupMaze() {
  const select = $("#maze-select");
  select.innerHTML = data.mazes.levels.map((level, index) => `<option value="${index}">${escapeHtml(level.title)}</option>`).join("");
  select.addEventListener("change", resetMaze);
  $("#maze-reset").addEventListener("click", resetMaze);
  $("#maze-debug").addEventListener("change", renderMaze);
  $$("[data-direction]").forEach((button) => button.addEventListener("click", () => moveMaze(button.dataset.direction)));
  $("#maze-grid").addEventListener("pointerdown", (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  $("#maze-grid").addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    moveMaze(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  window.addEventListener("keydown", (event) => {
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) return;
    const keyMap = { ArrowUp: "up", w: "up", W: "up", ArrowRight: "right", d: "right", D: "right", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left" };
    if (!keyMap[event.key]) return;
    event.preventDefault();
    moveMaze(keyMap[event.key]);
  });
  resetMaze();
}

function resetMaze() {
  const level = data.mazes.levels[Number($("#maze-select").value || 0)];
  mazeState = {
    level,
    position: { ...level.start },
    moves: 0,
    status: "active",
    feedback: "Choose a direction.",
    resources: Object.fromEntries(level.resources.map((resource) => [resource.id, resource.initial])),
    resolvedTiles: new Set(),
    failedReason: "",
    failureCode: null,
  };
  renderMaze();
  announceMaze(`${level.title} reset. ${level.educationalConcept}`);
}

function mazeTileMap() {
  return new Map(mazeState.level.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
}

function mazeTaxonomy() {
  return new Map(data.mazes.tileTaxonomy.map((type) => [type.type, type]));
}

function slideDestination(directionName) {
  const vectors = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
  const vector = vectors[directionName];
  const map = mazeTileMap();
  const taxonomy = mazeTaxonomy();
  let { x, y } = mazeState.position;
  while (true) {
    const nextX = x + vector.x;
    const nextY = y + vector.y;
    if (nextX < 0 || nextY < 0 || nextX >= mazeState.level.width || nextY >= mazeState.level.height) break;
    const tile = map.get(`${nextX},${nextY}`);
    const type = tile ? taxonomy.get(tile.type) : taxonomy.get("empty");
    if (!type.walkable) break;
    x = nextX;
    y = nextY;
    if (tile && type.stopsMovement) break;
  }
  return { x, y };
}

function failMaze(reason, failureCode = "invalid-state") {
  mazeState.status = "failed";
  mazeState.failedReason = reason;
  mazeState.failureCode = failureCode;
  mazeState.feedback = reason;
}

function moveMaze(directionName) {
  if (!mazeState || mazeState.status !== "active") return;
  const currentTile = mazeTileMap().get(`${mazeState.position.x},${mazeState.position.y}`);
  if (currentTile?.type === "oneWay" && currentTile.direction !== directionName) {
    mazeState.feedback = `This one-way tile permits ${currentTile.direction} only.`;
    renderMaze();
    return;
  }
  const destination = slideDestination(directionName);
  if (destination.x === mazeState.position.x && destination.y === mazeState.position.y) {
    mazeState.feedback = "A wall or boundary blocks that direction.";
    renderMaze();
    return;
  }

  mazeState.moves += 1;
  const moveCostRule = mazeState.level.rules.find((rule) => rule.type === "cost-per-command");
  if (moveCostRule) mazeState.resources[moveCostRule.parameters.resourceId] -= moveCostRule.parameters.cost;
  mazeState.position = destination;
  checkResourceFloors();
  if (mazeState.status === "active") resolveMazeTile();
  renderMaze();
  announceMaze(mazeState.feedback);
}

function checkResourceFloors() {
  for (const resource of mazeState.level.resources) {
    if (mazeState.resources[resource.id] < resource.minimum) {
      const rule = mazeState.level.rules.find((candidate) => candidate.type === "resource-floor" && candidate.parameters.resourceId === resource.id);
      failMaze(`${resource.displayName} fell below its minimum: the abstract budget is exhausted.`, rule?.parameters.failureCode ?? "resource-floor");
    }
  }
}

function resolveMazeTile() {
  const tile = mazeTileMap().get(`${mazeState.position.x},${mazeState.position.y}`);
  if (!tile) {
    mazeState.feedback = `Stopped at ${mazeState.position.x}, ${mazeState.position.y}.`;
    return;
  }
  if (tile.type === "spentOutput") {
    const rule = mazeState.level.rules.find((candidate) => candidate.type === "spent-output-fails");
    failMaze("Invalid route: that output is already spent, so using it would be a double-spend attempt.", rule?.parameters.failureCode ?? "spent-output");
    return;
  }
  if (tile.type === "hazard") {
    failMaze("The level hazard invalidated this attempt.", "hazard");
    return;
  }
  if ((tile.type === "collectible" || tile.type === "gasCell") && !mazeState.resolvedTiles.has(tile.id)) {
    const resourceId = tile.type === "gasCell" ? "gas" : mazeState.level.rules.find((rule) => rule.type === "collect-once")?.parameters.resourceId;
    if (resourceId) mazeState.resources[resourceId] += tile.value ?? 0;
    mazeState.resolvedTiles.add(tile.id);
    mazeState.feedback = `${tile.type === "gasCell" ? "Abstract gas" : "Available output"} collected: +${tile.value}.`;
  } else if (tile.type === "contract" && !mazeState.resolvedTiles.has(tile.id)) {
    mazeState.resources.gas -= tile.cost ?? 0;
    checkResourceFloors();
    if (mazeState.status !== "active") return;
    if (tile.state === "invalid") {
      const rule = mazeState.level.rules.find((candidate) => candidate.type === "invalid-contract-fails");
      failMaze(`Contract revert: this call's fictional changes were discarded after consuming ${tile.cost} engaged gas units; earlier gas remains spent.`, rule?.parameters.failureCode ?? "revert");
      return;
    }
    mazeState.resolvedTiles.add(tile.id);
    mazeState.feedback = `${tile.id} succeeded for ${tile.cost} abstract gas units.`;
  } else if (tile.type === "transaction" && !mazeState.resolvedTiles.has(tile.id)) {
    const rule = mazeState.level.rules.find((candidate) => candidate.type === "utxo-transaction");
    const inputValue = mazeState.resources[rule.parameters.inputResourceId];
    if (inputValue < rule.parameters.minimumInput) {
      failMaze(`Transaction rejected: selected fictional input value ${inputValue} is below the required ${rule.parameters.minimumInput}.`, "insufficient-input");
      return;
    }
    mazeState.resources[rule.parameters.outputResourceId] = rule.parameters.outputValue;
    mazeState.resources[rule.parameters.feeResourceId] = rule.parameters.feeValue;
    mazeState.resources[rule.parameters.changeResourceId] = inputValue - rule.parameters.outputValue - rule.parameters.feeValue;
    mazeState.resolvedTiles.add(tile.id);
    mazeState.feedback = `Fictional transaction created output ${rule.parameters.outputValue}, reserved fee ${rule.parameters.feeValue}, and produced change ${mazeState.resources[rule.parameters.changeResourceId]}. Selected UTXOs are consumed once for this attempt.`;
  } else if (tile.type === "exit") {
    const incomplete = mazeState.level.objectives.filter((objective) => objective.type !== "reach-exit").filter((objective) => !objectiveSatisfied(objective));
    if (incomplete.length) {
      failMaze(`Exit locked: ${incomplete.map((objective) => objective.description).join(" ")}`, "exit-locked");
      return;
    }
    mazeState.status = "won";
    mazeState.feedback = `Victory in ${mazeState.moves} moves. ${mazeState.level.educationalConcept}`;
  } else {
    mazeState.feedback = `Stopped on ${tile.type}.`;
  }
}

function objectiveSatisfied(objective) {
  if (objective.type === "resource-at-least") {
    return mazeState.resources[objective.resourceId] >= objective.target;
  }
  if (objective.type === "resource-equals") return mazeState.resources[objective.resourceId] === objective.target;
  if (objective.type === "activate-tile") return mazeState.resolvedTiles.has(objective.target);
  if (objective.type === "activate-tiles") return objective.target.every((id) => mazeState.resolvedTiles.has(id));
  if (objective.type === "reach-exit") return mazeState.status === "won";
  return false;
}

function renderMaze() {
  if (!mazeState) return;
  const { level } = mazeState;
  const map = mazeTileMap();
  const debug = $("#maze-debug").checked;
  const marks = { start: "S", exit: "E", anchor: "A", collectible: "+", spentOutput: "×", transaction: "TX", contract: "C", gasCell: "+G", validator: "V", portal: "P", proofFragment: "PF", bridge: "B", checkpoint: "CP", instruction: "I", hazard: "!", oneWay: "→" };
  $("#maze-grid").style.setProperty("--maze-width", level.width);
  $("#maze-grid").style.setProperty("--maze-height", level.height);
  const cells = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = map.get(`${x},${y}`);
      const type = tile?.type ?? "empty";
      const classes = ["maze-cell", type];
      if (mazeState.resolvedTiles.has(tile?.id)) classes.push("resolved");
      if (mazeState.position.x === x && mazeState.position.y === y) classes.push("player");
      const value = tile?.value != null && ["collectible", "gasCell"].includes(type) ? tile.value : "";
      cells.push(`<div class="${classes.join(" ")}" role="gridcell" aria-label="${escapeHtml(`${x}, ${y}: ${type}${value !== "" ? ` value ${value}` : ""}${mazeState.position.x === x && mazeState.position.y === y ? ", player" : ""}`)}">${debug ? `<span class="debug-label">${x},${y}</span>` : ""}<span class="tile-mark" aria-hidden="true">${escapeHtml(`${marks[type] ?? ""}${value !== "" ? value : ""}`)}</span></div>`);
    }
  }
  $("#maze-grid").innerHTML = cells.join("");
  $("#maze-level-id").innerHTML = `${editorialBadge(level)} <span>${escapeHtml(level.id)}</span>`;
  $("#maze-level-title").textContent = level.title;
  $("#maze-concept").textContent = level.educationalConcept;
  $("#maze-moves").textContent = mazeState.moves;
  $("#maze-par").textContent = level.parMoves;
  $("#maze-resource").textContent = level.resources.map((resource) => `${resource.displayName}: ${mazeState.resources[resource.id]}`).join(" · ");
  $("#maze-status").textContent = mazeState.status === "active" ? "Active" : mazeState.status === "won" ? "Won" : `Failed · ${mazeState.failureCode}`;
  $("#maze-feedback").textContent = mazeState.feedback;
  $("#maze-objectives").innerHTML = level.objectives.map((objective) => `<li class="${objectiveSatisfied(objective) ? "done" : ""}">${objectiveSatisfied(objective) ? "Done: " : "Open: "}${escapeHtml(objective.description)}</li>`).join("");
  $("#maze-explanation").textContent = level.winCondition;
  $("#maze-simplification").textContent = level.simplificationNotes;
  $("#maze-scenarios").innerHTML = level.validationScenarios.map((scenario) => `<li><strong>${escapeHtml(scenario.label)}</strong>: ${escapeHtml(scenario.commands.join(" → "))} — expected ${escapeHtml(scenario.expectedStatus)}${scenario.expectedFailureCode ? ` (${escapeHtml(scenario.expectedFailureCode)})` : ""}</li>`).join("");
  $("#maze-sources").textContent = `Sources: ${level.officialSources.join(" · ")}`;
  $$("[data-direction]").forEach((button) => { button.disabled = mazeState.status !== "active"; });
}

function announceMaze(message) {
  $("#maze-live").textContent = "";
  requestAnimationFrame(() => { $("#maze-live").textContent = message; });
}

function renderSources() {
  const statuses = [
    ["current-official", "Supported by current official material reviewed on the recorded date."],
    ["historical-official", "Official historical evidence; not automatically current behavior."],
    ["proposed-design", "A Rush Pi design proposal, not a protocol function."],
    ["simplified-for-game", "A disclosed abstraction preserving a sourced causal relationship."],
    ["needs-verification", "Insufficient current evidence; do not assert as current fact."],
  ];
  $("#accuracy-grid").innerHTML = statuses.map(([title, copy]) => `<article class="accuracy-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`).join("");
  $("#source-list").innerHTML = data.sources.sources.map((source) => `
    <article class="source-item">
      <div><h3>${escapeHtml(source.title)}</h3><p>${escapeHtml(source.organization)} · ${escapeHtml(source.sourceType)} · reviewed ${escapeHtml(source.lastReviewedAt)}</p><p>${escapeHtml(source.notes)}</p></div>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Official source</a>
    </article>
  `).join("");
}

async function init() {
  const status = $("#load-status");
  try {
    data = await loadData();
    renderModeMap();
    renderPrimitiveFilters();
    setupPiLab();
    setupSurvival();
    setupCampaign();
    setupMaze();
    renderSources();
    status.textContent = "Local data loaded · 40 primitives · 2 playable mazes";
    status.classList.add("ready");
  } catch (cause) {
    console.error(cause);
    status.textContent = `Unable to load local data: ${cause.message}`;
    status.classList.add("error");
  }
}

init();
