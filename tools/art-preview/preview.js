const MANIFEST_URL = "../../public/assets/rushpi/asset-manifest.json";
const ASSET_BASE = "../../public/assets/rushpi/";
const PRODUCTION_BRIEFS_URL = "../../public/data/art/phase-12a-production-briefs.json";
const HOME_CANDIDATES_URL = "../../docs/art/generated/12A_HOME_CANDIDATES_INTAKE.json";

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
