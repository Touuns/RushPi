const MANIFEST_URL = "../../public/assets/rushpi/asset-manifest.json";
const ASSET_BASE = "../../public/assets/rushpi/";
const PRODUCTION_BRIEFS_URL = "../../public/data/art/phase-12a-production-briefs.json";
const HOME_CANDIDATES_URL = "../../docs/art/generated/12A_HOME_CANDIDATES_INTAKE.json";
const DAILY_CANDIDATES_URL = "../../docs/art/generated/12A_DAILY_CANDIDATES_INTAKE.json";
const CHAIN_BLOCK_CANDIDATES_URL = "../../docs/art/generated/12A_CHAIN_BLOCK_CANDIDATES_INTAKE.json";
const FINISH_PORTAL_CANDIDATES_URL = "../../docs/art/generated/12A_FINISH_PORTAL_CANDIDATES_INTAKE.json";

const gallery = document.querySelector("#gallery");
const filters = document.querySelector("#category-filters");
const search = document.querySelector("#search");
const animationOnly = document.querySelector("#animation-only");
const status = document.querySelector("#status");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const dialog = document.querySelector("#asset-dialog");
const dialogPreview = document.querySelector("#dialog-preview");
const dialogCategory = document.querySelector("#dialog-category");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const dialogNotes = document.querySelector("#dialog-notes");
const briefsStatus = document.querySelector("#briefs-status");
const briefsGrid = document.querySelector("#briefs-grid");
const homeCandidatesStatus = document.querySelector("#home-candidates-status");
const homeCandidatesGrid = document.querySelector("#home-candidates-grid");
const homeCandidatesComparison = document.querySelector("#home-candidates-comparison");
const homeUiToggle = document.querySelector("#home-ui-toggle");
const dailyCandidatesStatus = document.querySelector("#daily-candidates-status");
const dailyCandidatesGrid = document.querySelector("#daily-candidates-grid");
const dailyCandidatesComparison = document.querySelector("#daily-candidates-comparison");
const dailyGameplayToggle = document.querySelector("#daily-gameplay-toggle");
const chainBlockStatus = document.querySelector("#chain-block-status");
const chainBlockGrid = document.querySelector("#chain-block-grid");
const chainBlockComparison = document.querySelector("#chain-block-comparison");
const finishPortalStatus = document.querySelector("#finish-portal-status");
const finishPortalGrid = document.querySelector("#finish-portal-grid");
const finishPortalComparison = document.querySelector("#finish-portal-comparison");

let assets = [];
let activeCategory = "all";

function assetUrl(asset) {
  return `${ASSET_BASE}${asset.file.split("/").map(encodeURIComponent).join("/")}`;
}

function repoFileUrl(file) {
  return `../../${file.split("/").map(encodeURIComponent).join("/")}`;
}

function isVisual(asset) {
  return ["svg", "png", "webp", "jpg", "jpeg"].includes(asset.format);
}

function previewNode(asset, large = false) {
  const wrapper = document.createElement("div");
  wrapper.className = large ? "dialog-preview__inner" : "asset-preview";
  if (!large && asset.animationReady) wrapper.classList.add("is-animated");

  if (!isVisual(asset)) {
    const metadata = document.createElement("span");
    metadata.className = "metadata-preview";
    metadata.textContent = "{…}";
    wrapper.append(metadata);
    return wrapper;
  }

  const image = new Image();
  image.src = assetUrl(asset);
  image.alt = asset.usage;
  image.loading = large ? "eager" : "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    wrapper.replaceChildren();
    const message = document.createElement("span");
    message.className = "asset-preview__error";
    message.textContent = `Aperçu indisponible · ${asset.file}`;
    wrapper.append(message);
  });
  wrapper.append(image);
  return wrapper;
}

function openDetails(asset) {
  dialogPreview.replaceChildren(previewNode(asset, true));
  dialogCategory.textContent = asset.category;
  dialogTitle.textContent = asset.id;
  dialogNotes.textContent = asset.notes;
  dialogMeta.replaceChildren();
  const entries = [
    ["Fichier", asset.file],
    ["Format", asset.format.toUpperCase()],
    ["Dimensions", asset.size],
    ["Usage", asset.usage],
    ["Animation-ready", asset.animationReady ? "Oui" : "Non"],
  ];
  for (const [term, description] of entries) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    dialogMeta.append(dt, dd);
  }
  dialog.showModal();
}

function cardFor(asset) {
  const article = document.createElement("article");
  article.className = "asset-card";
  article.dataset.category = asset.category;

  const button = document.createElement("button");
  button.className = "asset-open";
  button.type = "button";
  button.setAttribute("aria-label", `Voir ${asset.id}`);
  button.addEventListener("click", () => openDetails(asset));
  button.append(previewNode(asset));

  const copy = document.createElement("div");
  copy.className = "asset-copy";
  const meta = document.createElement("p");
  meta.className = "asset-meta";
  const category = document.createElement("span");
  category.textContent = asset.category;
  const size = document.createElement("span");
  size.textContent = asset.size;
  meta.append(category, size);
  const title = document.createElement("h2");
  title.textContent = asset.id;
  const usage = document.createElement("p");
  usage.textContent = asset.usage;
  copy.append(meta, title, usage);
  if (asset.animationReady) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "animation-ready";
    copy.append(badge);
  }
  button.append(copy);
  article.append(button);
  return article;
}

function render() {
  const query = search.value.trim().toLowerCase();
  const visible = assets.filter((asset) => {
    if (activeCategory !== "all" && asset.category !== activeCategory) return false;
    if (animationOnly.checked && !asset.animationReady) return false;
    if (!query) return true;
    return [asset.id, asset.category, asset.file, asset.usage, asset.notes].join(" ").toLowerCase().includes(query);
  });
  gallery.replaceChildren(...visible.map(cardFor));
  count.textContent = `${visible.length} / ${assets.length} assets`;
  empty.hidden = visible.length !== 0;
}

function buildFilters() {
  const categories = ["all", ...new Set(assets.map((asset) => asset.category).sort())];
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter${category === activeCategory ? " is-active" : ""}`;
    button.textContent = category === "all" ? "Tous" : category;
    button.addEventListener("click", () => {
      activeCategory = category;
      for (const item of filters.querySelectorAll(".filter")) item.classList.remove("is-active");
      button.classList.add("is-active");
      render();
    });
    filters.append(button);
  }
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.round(value / 1024)} KiB`;
}

function briefCard(target) {
  const article = document.createElement("article");
  article.className = "brief-card";

  const flag = document.createElement("span");
  flag.className = "brief-card__flag";
  flag.textContent = "Brief ready · asset not generated";

  const title = document.createElement("h3");
  title.textContent = target.id;

  const meta = document.createElement("dl");
  const runtimeBudgets = Object.entries(target.budgets ?? {})
    .filter(([key, value]) => /runtime|optional/i.test(key) && Number.isFinite(value))
    .map(([, value]) => value);
  const entries = [
    ["Type", target.type],
    ["Master", `${target.masterSize.width}×${target.masterSize.height}`],
    ["Runtime budget max", formatBytes(runtimeBudgets.length ? Math.max(...runtimeBudgets) : 0)],
    ["Intake", target.intakeStatus],
  ];
  for (const [term, description] of entries) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    meta.append(dt, dd);
  }

  const criteriaTitle = document.createElement("h4");
  criteriaTitle.textContent = "Essential checks";
  const criteria = document.createElement("ul");
  for (const check of target.acceptanceChecks.slice(0, 3)) {
    const item = document.createElement("li");
    item.textContent = check;
    criteria.append(item);
  }

  const references = document.createElement("p");
  references.className = "brief-card__references";
  references.textContent = `References: ${target.referenceAssetIds.join(" · ")}`;

  article.append(flag, title, meta, criteriaTitle, criteria, references);
  return article;
}

async function loadProductionBriefs() {
  try {
    const response = await fetch(PRODUCTION_BRIEFS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    if (!Array.isArray(document.targets) || document.targets.length !== 4) {
      throw new Error("quatre targets attendues");
    }
    if (document.generatedAssets !== false || document.integrationAllowed !== false) {
      throw new Error("garde-fous de phase invalides");
    }
    briefsGrid.replaceChildren(...document.targets.map(briefCard));
    briefsStatus.textContent = `${document.phase} · ${document.targets.length} targets · integration disabled`;
  } catch (error) {
    briefsStatus.textContent = `Briefs indisponibles (${error.message}).`;
    briefsStatus.classList.add("is-error");
  }
}

function homeUiSimulation() {
  const overlay = document.createElement("div");
  overlay.className = "home-ui-simulation";
  overlay.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.className = "home-ui-simulation__header";
  header.innerHTML = "<span></span><span></span>";

  const profile = document.createElement("div");
  profile.className = "home-ui-simulation__profile";
  profile.innerHTML = "<span></span><span></span><span></span>";

  const daily = document.createElement("div");
  daily.className = "home-ui-simulation__card home-ui-simulation__card--daily";
  daily.innerHTML = "<b>DAILY</b><span></span><i>MORE</i>";

  const survival = document.createElement("div");
  survival.className = "home-ui-simulation__card";
  survival.innerHTML = "<b>SURVIVAL</b><span></span><i>MORE</i>";

  const campaign = document.createElement("div");
  campaign.className = "home-ui-simulation__card";
  campaign.innerHTML = "<b>CAMPAIGN</b><span></span><i>MORE</i>";

  overlay.append(header, profile, daily, survival, campaign);
  return overlay;
}

function candidateFigure(candidate, kind) {
  const figure = document.createElement("figure");
  figure.className = `candidate-figure candidate-figure--${kind}`;
  const stage = document.createElement("div");
  stage.className = "candidate-stage";
  const image = new Image();
  image.src = repoFileUrl(kind === "guides" ? candidate.guidesPath : candidate.previewPath);
  image.alt = `${candidate.variant} · ${kind === "guides" ? "guides de contrôle" : "preview simple"}`;
  image.loading = "lazy";
  image.decoding = "async";
  stage.append(image);
  if (kind === "plain") stage.append(homeUiSimulation());
  const caption = document.createElement("figcaption");
  caption.textContent = kind === "guides" ? "Guides de contrôle" : "Preview simple";
  figure.append(stage, caption);
  return figure;
}

function candidateCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  article.dataset.recommendation = candidate.recommendation;

  const heading = document.createElement("div");
  heading.className = "candidate-card__heading";
  const title = document.createElement("h3");
  title.textContent = candidate.variant;
  const flag = document.createElement("span");
  flag.className = "candidate-card__status";
  flag.textContent = candidate.status;
  heading.append(title, flag);

  const previews = document.createElement("div");
  previews.className = "candidate-card__previews";
  previews.append(candidateFigure(candidate, "plain"), candidateFigure(candidate, "guides"));

  const meta = document.createElement("dl");
  const entries = [
    ["Master", `${candidate.width}×${candidate.height}`],
    ["Master weight", formatBytes(candidate.bytes.master)],
    ["Preview weight", formatBytes(candidate.bytes.preview)],
    ["Recommendation", candidate.recommendation],
  ];
  for (const [term, description] of entries) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    meta.append(dt, dd);
  }

  const issues = document.createElement("ul");
  issues.className = "candidate-card__issues";
  for (const issue of candidate.issues) {
    const item = document.createElement("li");
    item.textContent = issue;
    issues.append(item);
  }

  article.append(heading, previews, meta, issues);
  return article;
}

async function loadHomeCandidates() {
  try {
    const response = await fetch(HOME_CANDIDATES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    if (!Array.isArray(document.candidates) || document.candidates.length !== 3) {
      throw new Error("trois candidates attendues");
    }
    if (document.integrationAllowed !== false || document.status !== "needs-review") {
      throw new Error("garde-fous de revue invalides");
    }
    homeCandidatesComparison.src = repoFileUrl(document.comparisonPath);
    homeCandidatesGrid.replaceChildren(...document.candidates.map(candidateCard));
    homeCandidatesStatus.textContent = `${document.phase} · processing choice recorded · integration disabled`;
  } catch (error) {
    homeCandidatesStatus.textContent = `Candidates indisponibles (${error.message}).`;
    homeCandidatesStatus.classList.add("is-error");
  }
}

function dailyGameplaySimulation() {
  const overlay = document.createElement("div");
  overlay.className = "daily-gameplay-simulation";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="daily-gameplay-simulation__hud"><span></span><span></span><span></span></div>
    <div class="daily-gameplay-simulation__track">
      <i class="lane lane--one"></i><i class="lane lane--two"></i>
      <b class="chevron chevron--one"></b><b class="chevron chevron--two"></b><b class="chevron chevron--three"></b>
    </div>
    <span class="game-object token token--one"></span><span class="game-object token token--two"></span>
    <span class="game-object chain chain--one"></span><span class="game-object chain chain--two"></span>
    <span class="game-object obstacle obstacle--one"></span><span class="game-object obstacle obstacle--two"></span>
    <span class="game-object shield"></span><span class="game-object player"></span>
    <i class="speed speed--one"></i><i class="speed speed--two"></i><i class="speed speed--three"></i>
  `;
  return overlay;
}

function dailyCandidateFigure(candidate, kind) {
  const figure = document.createElement("figure");
  figure.className = `candidate-figure candidate-figure--${kind}`;
  const stage = document.createElement("div");
  stage.className = "candidate-stage";
  const image = new Image();
  image.src = repoFileUrl(kind === "guides" ? candidate.guidesPath : candidate.previewPath);
  image.alt = `${candidate.variant} · ${kind === "guides" ? "guides de contrôle" : "simulation gameplay"}`;
  image.loading = "lazy";
  image.decoding = "async";
  stage.append(image);
  if (kind === "plain") stage.append(dailyGameplaySimulation());
  const caption = document.createElement("figcaption");
  caption.textContent = kind === "guides" ? "Guides de contrôle" : "Background / gameplay";
  figure.append(stage, caption);
  return figure;
}

function dailyCandidateCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  const heading = document.createElement("div");
  heading.className = "candidate-card__heading";
  const title = document.createElement("h3");
  title.textContent = candidate.variant;
  const flag = document.createElement("span");
  flag.className = "candidate-card__status";
  flag.textContent = candidate.status;
  heading.append(title, flag);
  const previews = document.createElement("div");
  previews.className = "candidate-card__previews";
  previews.append(dailyCandidateFigure(candidate, "plain"), dailyCandidateFigure(candidate, "guides"));
  const meta = document.createElement("dl");
  for (const [term, description] of [
    ["Master", `${candidate.width}×${candidate.height}`],
    ["Master weight", formatBytes(candidate.bytes.master)],
    ["Horizon", `y≈${candidate.horizonY}`],
    ["Recommendation", candidate.recommendation],
  ]) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    meta.append(dt, dd);
  }
  const issues = document.createElement("ul");
  issues.className = "candidate-card__issues";
  for (const issue of candidate.issues) {
    const item = document.createElement("li");
    item.textContent = issue;
    issues.append(item);
  }
  article.append(heading, previews, meta, issues);
  return article;
}

async function loadDailyCandidates() {
  try {
    const response = await fetch(DAILY_CANDIDATES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    if (!Array.isArray(document.candidates) || document.candidates.length !== 4) {
      throw new Error("quatre candidates attendues");
    }
    if (
      document.integrationAllowed !== false ||
      document.candidates.some((candidate) => candidate.status === "approved-for-integration")
    ) {
      throw new Error("garde-fous de revue invalides");
    }
    dailyCandidatesComparison.src = repoFileUrl(document.comparisonPath);
    dailyCandidatesGrid.replaceChildren(...document.candidates.map(dailyCandidateCard));
    dailyCandidatesStatus.textContent = `${document.phase} · 4 décisions enregistrées · integration disabled`;
  } catch (error) {
    dailyCandidatesStatus.textContent = `Candidates indisponibles (${error.message}).`;
    dailyCandidatesStatus.classList.add("is-error");
  }
}

function chainBlockSimulation(candidate) {
  const stage = document.createElement("div");
  stage.className = "chain-simulation";
  const background = new Image();
  background.src = repoFileUrl("tools/art-preview/generated/phase-12a/daily-market-tunnel/daily-market-tunnel-primary-candidate-v2.webp");
  background.alt = "";
  const track = document.createElement("div");
  track.className = "chain-simulation__track";
  const objects = document.createElement("div");
  objects.className = "chain-simulation__objects";
  objects.innerHTML = `
    <span class="sim-token">T</span><span class="sim-obstacle"></span>
    <span class="sim-shield"></span><span class="sim-life">+</span>
    <span class="sim-player">π</span><span class="sim-magnet"></span>
  `;
  for (const [index, position] of [[0, "left"], [1, "center"], [2, "right"]]) {
    const image = new Image();
    image.src = repoFileUrl(candidate.previewPaths["128"]);
    image.alt = "";
    image.className = `sim-chain sim-chain--${position}`;
    if (index === 1) image.classList.add("is-collecting");
    objects.append(image);
  }
  stage.append(background, track, objects);
  return stage;
}

function chainBlockCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  const heading = document.createElement("div");
  heading.className = "candidate-card__heading";
  heading.innerHTML = `<h3>${candidate.variant}</h3><span class="candidate-card__status">${candidate.status}</span>`;
  const sizes = document.createElement("div");
  sizes.className = "chain-sizes";
  for (const size of ["128", "64", "32"]) {
    const figure = document.createElement("figure");
    const image = new Image();
    image.src = repoFileUrl(candidate.previewPaths[size]);
    image.alt = `${candidate.variant} à ${size} pixels`;
    figure.append(image);
    const caption = document.createElement("figcaption");
    caption.textContent = `${size}px`;
    figure.append(caption);
    sizes.append(figure);
  }
  const meta = document.createElement("dl");
  for (const [term, value] of [
    ["Alpha bounds", `${candidate.alphaBounds.width}×${candidate.alphaBounds.height}`],
    ["Pivot", `${candidate.pivot.x}, ${candidate.pivot.y}`],
    ["Master", formatBytes(candidate.bytes.master)],
    ["Recommendation", candidate.recommendation],
  ]) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    meta.append(dt, dd);
  }
  const issues = document.createElement("ul");
  issues.className = "candidate-card__issues";
  for (const issue of candidate.issues) {
    const li = document.createElement("li");
    li.textContent = issue;
    issues.append(li);
  }
  article.append(heading, sizes, chainBlockSimulation(candidate), meta, issues);
  return article;
}

async function loadChainBlockCandidates() {
  try {
    const response = await fetch(CHAIN_BLOCK_CANDIDATES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    if (
      document.integrationAllowed !== false ||
      document.candidates?.length !== 3 ||
      document.candidates.some((candidate) => candidate.status === "approved-for-integration")
    ) {
      throw new Error("garde-fous Chain Block invalides");
    }
    chainBlockComparison.src = repoFileUrl(document.comparisonPath);
    chainBlockGrid.replaceChildren(...document.candidates.map(chainBlockCard));
    chainBlockStatus.textContent = `${document.phase} · 3 candidates · integration disabled`;
  } catch (error) {
    chainBlockStatus.textContent = `Candidates indisponibles (${error.message}).`;
    chainBlockStatus.classList.add("is-error");
  }
}

function finishPortalTrackGate(candidate) {
  const stage = document.createElement("div");
  stage.className = "finish-simulation";
  const background = new Image();
  background.src = repoFileUrl("tools/art-preview/generated/phase-12a/daily-market-tunnel/daily-market-tunnel-primary-candidate-v2.webp");
  background.alt = "";
  const track = document.createElement("div");
  track.className = "finish-simulation__track";
  track.innerHTML = '<i class="finish-lane finish-lane--left"></i><i class="finish-lane finish-lane--right"></i>';
  const objects = document.createElement("div");
  objects.className = "finish-simulation__objects";
  objects.innerHTML = `
    <span class="finish-label">FINISH</span>
    <span class="finish-flash"></span>
    <span class="finish-obstacle"></span>
    <span class="finish-player">π</span>
  `;
  for (const [depth, className] of [["horizon", "horizon"], ["mid", "mid"], ["player", "player-line"]]) {
    const image = new Image();
    image.src = repoFileUrl(candidate.previewPaths.preview512);
    image.alt = `${candidate.variant}, test ${depth}`;
    image.className = `finish-portal finish-portal--${className}`;
    objects.append(image);
  }
  const chain = new Image();
  chain.src = repoFileUrl("tools/art-preview/generated/phase-12a/chain-block/chain-block-primary-candidate-v1-128.webp");
  chain.alt = "Chain Block Primary";
  chain.className = "finish-chain";
  objects.append(chain);
  stage.append(background, track, objects);
  return stage;
}

function finishPortalCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  const heading = document.createElement("div");
  heading.className = "candidate-card__heading";
  heading.innerHTML = `<h3>${candidate.variant}</h3><span class="candidate-card__status">${candidate.status}</span>`;
  const checks = document.createElement("div");
  checks.className = "finish-checks";
  for (const key of ["preview512", "preview256", "dark", "light", "magenta", "alphaBounds", "pivot", "opening"]) {
    const image = new Image();
    image.src = repoFileUrl(candidate.previewPaths[key]);
    image.alt = `${candidate.variant} · ${key}`;
    checks.append(image);
  }
  const meta = document.createElement("dl");
  for (const [term, value] of [
    ["Alpha bounds", `${candidate.alphaBounds.width}×${candidate.alphaBounds.height}`],
    ["Opening", `${candidate.openingBounds.width}×${candidate.openingBounds.height}`],
    ["Opening alpha", `${candidate.openingTransparentPercent}% transparent`],
    ["Pivot", `${candidate.pivot.x}, ${candidate.pivot.y}`],
    ["Master", formatBytes(candidate.bytes.master)],
    ["Recommendation", candidate.recommendation],
  ]) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    meta.append(dt, dd);
  }
  const issues = document.createElement("ul");
  issues.className = "candidate-card__issues";
  for (const issue of candidate.issues) {
    const li = document.createElement("li");
    li.textContent = issue;
    issues.append(li);
  }
  article.append(heading, checks, finishPortalTrackGate(candidate), meta, issues);
  return article;
}

async function loadFinishPortalCandidates() {
  try {
    const response = await fetch(FINISH_PORTAL_CANDIDATES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    const acceptedStatuses = new Set(["needs-review", "approved-for-processing", "rejected"]);
    if (
      document.integrationAllowed !== false ||
      document.candidates?.length !== 3 ||
      document.candidates.some((candidate) => !acceptedStatuses.has(candidate.status)) ||
      document.candidates.some((candidate) => candidate.status === "approved-for-integration")
    ) {
      throw new Error("garde-fous Finish Portal invalides");
    }
    finishPortalComparison.src = repoFileUrl(document.comparisonPath);
    finishPortalGrid.replaceChildren(...document.candidates.map(finishPortalCard));
    finishPortalStatus.textContent = `${document.phase} · 3 candidates · integration disabled`;
  } catch (error) {
    finishPortalStatus.textContent = `Candidates indisponibles (${error.message}).`;
    finishPortalStatus.classList.add("is-error");
  }
}

async function start() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.assets)) throw new Error("champ assets absent");
    assets = manifest.assets;
    status.textContent = `Manifest v${manifest.schemaVersion} · ${manifest.project}`;
    buildFilters();
    render();
  } catch (error) {
    status.textContent = `Impossible de charger le manifest (${error.message}). Lancez le serveur local documenté.`;
    status.classList.add("is-error");
  }
}

search.addEventListener("input", render);
animationOnly.addEventListener("change", render);
homeUiToggle.addEventListener("change", () => {
  document.querySelector("#home-candidates").classList.toggle("is-ui-preview", homeUiToggle.checked);
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

start();
loadProductionBriefs();
loadHomeCandidates();
loadDailyCandidates();
loadChainBlockCandidates();
loadFinishPortalCandidates();
dailyGameplayToggle.addEventListener("change", () => {
  document.querySelector("#daily-candidates").classList.toggle("is-gameplay-preview", dailyGameplayToggle.checked);
});
