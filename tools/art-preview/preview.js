const MANIFEST_URL = "../../public/assets/rushpi/asset-manifest.json";
const ASSET_BASE = "../../public/assets/rushpi/";

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

let assets = [];
let activeCategory = "all";

function assetUrl(asset) {
  return `${ASSET_BASE}${asset.file.split("/").map(encodeURIComponent).join("/")}`;
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
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

start();
