# Phase 12A-1 — Home production background integration

## Branche et base
- Branche : `phase/12a-1-home-integration`
- Worktree : `I:\ProjetDEv\RushPi-12a-home-integration`
- Commit de base : `ba95da21f54cda7d19dfbf00588fbabc8383d887` (`origin/phase/12a-0c-processed-assets` — "Approve Phase 12A assets for integration")

Seul le **fond Home de production** est intégré. Daily, Chain Block et Finish Portal ne sont **pas** intégrés ; aucun asset Phaser, aucune modification de gameplay.

## Architecture choisie
- L'audit a établi que `.home` (= `.screen.home`) est le conteneur **scrollant** (`overflow-y:auto`) et que `.app-frame` est le cadre **non scrollant** (`overflow:hidden`, `max-width:480px`, centré).
- Un `background-image` sur `.home` défilerait avec son contenu ; `position:fixed` depuis `.home` ne serait pas fiable (pas de bloc conteneur transformé). La couche fond est donc placée **dans `.app-frame`, en frère de `.home`**, uniquement quand `screen === "home"`.
- Empilement explicite : `.home-bg` `z-index:0`, contenu `.home` `z-index:1`. Le fond ne peut pas passer au-dessus des modales (`.modal-overlay` `z-index:20`, rendues à l'intérieur de `.home`).
- Le fond utilise un `<img srcSet>` (1x/2x). Les gradients de `.app-frame` restent **derrière** la couche comme fallback permanent.

## Fichiers modifiés
- `src/App.tsx` — couche `<div className="home-bg"><img …/></div>` insérée dans `.app-frame`, gardée par `screen === "home"`, avec `onError` masquant l'img si le WebP échoue.
- `src/styles/global.css` — `.home { z-index:1 }`, `.home-bg`, `.home-bg__img`, `@keyframes home-bg-fade`, `@media (prefers-reduced-motion: reduce)`.

Aucun fichier sous `src/game/`, `api/`, `supabase/` ; aucun fichier image ; `package.json`/`package-lock.json` inchangés.

## Chemins des deux assets Home
- 1x : `public/assets/rushpi/production/backgrounds/home-background-production-414w.webp` (414×736, sha256 `d40286ed…`)
- 2x : `public/assets/rushpi/production/backgrounds/home-background-production-828w.webp` (828×1472, sha256 `f9b04176…`)

## Comportement responsive (mesuré)

Sélection initiale (12A-1) : descripteurs **DPR** (`414w.webp 1x, 828w.webp 2x`).
Limite : à 480 CSS px et DPR 1, le navigateur choisissait la 414 px et l'agrandissait à 480 px.

Correction (12A-1, source responsive affinée) : descripteurs de **largeur** + `sizes`.
- `src="…-414w.webp"`
- `srcSet="…-414w.webp 414w, …-828w.webp 828w"`
- `sizes="(max-width: 480px) 100vw, 480px"`

Le navigateur choisit désormais selon la largeur de slot (issue de `sizes`) × DPR, au lieu du seul DPR.

`currentSrc` réellement observé (Chromium, navigation fraîche par configuration) :

| Viewport CSS | DPR | currentSrc | Attendu |
|---|---:|---|---|
| 375×667 | 1 | `home-background-production-414w.webp` | 414w ✓ |
| 375×667 | 2 | `home-background-production-828w.webp` | 828w ✓ |
| 414×736 | 1 | `home-background-production-414w.webp` | 414w ✓ |
| 414×736 | 2 | `home-background-production-828w.webp` | 828w ✓ |
| 480×800 | 1 | `home-background-production-828w.webp` | 828w ✓ (était 414w avant) |
| 1280×800 (cadre 480) | 1 | `home-background-production-828w.webp` | 828w ✓ |

Le choix exact reste sous contrôle du navigateur ; les valeurs ci-dessus sont les `currentSrc` réels mesurés, non falsifiés.

## Fallback
- Les gradients `.app-frame` restent visibles avant décodage, si le WebP échoue, si la requête est bloquée ou sur un navigateur ne chargeant pas l'asset.
- `.home-bg` est transparent ; en cas d'échec, `onError` met l'`<img>` en `display:none` → seul le gradient s'affiche (pas d'icône image cassée, pas de flash blanc).
- Vérifié : image cassée → `img.style.display === "none"`, `naturalWidth === 0`, gradient présent, cartes/boutons lisibles.

## Accessibilité
- `aria-hidden="true"` sur la couche et l'`<img>`, `alt=""` (décoratif, aucune annonce, aucun focus).
- `pointer-events:none` + `user-select:none` : aucune interception clavier/tactile.
- Fondu d'apparition (opacité uniquement, aucun déplacement) désactivé sous `prefers-reduced-motion: reduce`.

## Scroll
- Le fond est hors du conteneur scrollant → il reste **fixe** pendant le scroll de la Home (mesuré : `bgTop` inchangé après `scrollTop`). Le scroll de `.home` est inchangé.

## Interactions
- `pointer-events:none` sur `.home-bg` ; `elementFromPoint` au centre du bouton "Daily Run" renvoie le bouton ; au coin haut-gauche renvoie `.screen` (la couche est traversée). Boutons/cartes entièrement cliquables.

## Autres écrans
- La couche n'est rendue que si `screen === "home"`. Navigation vers Profile → aucune `.home-bg` (`bgOnOtherScreen === false`). Idem pour les autres écrans.

## Tests visuels et responsive (viewport × DPR → currentSrc, couverture, overflow)
- **375×667 @2×** → 828w ; img couvre 375×667 ; pas d'overflow ; UI lisible haut/milieu/bas. (capture temporaire, non commitée)
- **414×736 @2×** → 828w ; img couvre 414×736 ; pas d'overflow.
- **480×800 @1×** → 414w ; cadre 480 rempli (left 0) ; pas d'overflow.
- **1280×800 desktop @1×** → 414w ; `.app-frame` centré (left=400, right=400, w=480) ; côtés en `--bg` `#0c0717` ; le fond ne déborde pas du cadre ; pas d'overflow horizontal.

## Test de chargement
- `<img>` `loading="eager"`, `fetchPriority="high"`, `decoding="async"` (Home = écran initial). Le gradient couvre la phase de décodage → pas de flash blanc. Aucun spinner.

## Test d'échec simulé de l'image
- Source réécrite vers un chemin inexistant → `onError` masque l'img → gradient `.app-frame` visible, layout intact, aucune zone blanche, aucune icône cassée.

## Problèmes rencontrés
- Une image cassée laissait initialement l'icône « broken » du navigateur → résolu par `onError` masquant l'`<img>`.

## Décisions humaines restantes
- Validation visuelle humaine finale de la Home réelle (contraste des textes sur le fond choisi, lisibilité au soleil / luminosité réduite, rendu Pi Browser).
- Confirmer que le fond « Primary » est le choix définitif avant la validation finale.
- Les sept autres assets (Daily, Chain Block, Finish Portal) restent non intégrés — intégration en Phase 12A-2.
