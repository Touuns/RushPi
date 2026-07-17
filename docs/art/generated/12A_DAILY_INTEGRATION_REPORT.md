# Phase 12A-2 — Daily production visuals integration

## Branche et base
- Branche : `phase/12a-2-daily-integration`
- Worktree : `I:\ProjetDEv\RushPi-12a-daily-integration`
- Commit de base : `1d2e5b38e56f5104852c06f3b03c77558c6d342d` (`origin/phase/12a-1-home-integration`)

Intégration **purement visuelle** des sept assets Daily (background, Chain Block, Finish Portal). Aucun changement de gameplay (durée 60s, score, combo, Magnet, Shield, collision, hitbox, lane, vitesse, spawn, RNG, séquence déterministe, token schedule, claim, leaderboard, validation serveur, résultat, Pi, Supabase).

## Fichiers modifiés
- `src/game/productionAssets.ts` (nouveau) — cache/preload/sélection/enregistrement/fallback.
- `src/components/DailyPreparationScreen.tsx` — préchargement en parallèle des logos + libellé « Preparing game assets… ».
- `src/game/scenes/MainScene.ts` — `registerDailyProductionTextures` + image de fond Daily (depth -20) dans `create()` ; `textureKey`/`textureOriginY` passés au TrackGate **daily-finish uniquement**.
- `src/game/dailyTokens.ts` — `makeChainBlock` : sprite si texture, sinon procédural (contrat inchangé).
- `src/game/zoneTransition.ts` — `TrackGate` : options `textureKey?`/`textureOriginY?` rétrocompatibles (portail image, depth 5, inclus dans le fade + destroy).

## Architecture du preloader/cache (`productionAssets.ts`)
- Clés Phaser stables, indépendantes de la résolution : `prod:daily-bg`, `prod:chain-block`, `prod:finish-portal`.
- Table des **sept chemins** runtime (bg 414/828, portal 256/512, block 32/64/128) ; `activePaths()` sélectionne **une** variante par asset logique pour l'appareil courant.
- Cache **module-level** `Map<path, HTMLImageElement>` (survit aux runs ; ne contient jamais de GameObject/texture d'une ancienne instance Phaser).
- `preloadDailyProductionAssets()` : `new Image()` (même origine, pas de CORS), `onload/onerror`, **timeout de groupe 5 s**, résout toujours ; ne charge que les variantes actives (jamais deux backgrounds).
- `registerDailyProductionTextures(scene)` : `textures.addImage(key, img)` pour chaque asset chargé, **ré-exécuté à chaque run** (le TextureManager est recréé par instance Phaser) ; texture absente → ignorée (fallback procédural). Jamais le loader Phaser, jamais de requête réseau en run.

## Règles de résolution (déterministes, aucun aléa)
Tier calculé **une fois** par appareil (`resolveDeviceTier`, mémoïsé) :
- `high` = `devicePixelRatio ≥ 2` → **828 / 512 / 128** ;
- `low` = heuristique bas de gamme (`deviceMemory ≤ 2 Go` ou `hardwareConcurrency ≤ 2`) → block **32** (bg/portal n'ont pas de fichier « low » → **414 / 256**) ;
- `normal` = sinon → **414 / 256 / 64**.

Vérifié en MCP : DPR 2 → bg 828×1472, portal 512×768, block 128×128 ; DPR 1 (hôte high-end) → bg 414×736, portal 256×384, block 64×64. Un seul background enregistré par run.

## Ordre de préparation (fonctionnel, conservé)
1. challenge ; 2. vérification d'éligibilité ranked ; 3. **chargement des ressources visuelles** (logos + production, en parallèle, `Promise.all`, toujours résolu) ; 4. claim serveur ranked ; 5. lancement Phaser. Un échec visuel ne consomme pas de tentative, n'empêche ni le claim ni une run locale, n'affiche pas d'erreur ranked, ne modifie pas le submissionId.

## Enregistrement Phaser (`MainScene.create()`)
Ordre : `computeLanes` → `registerTokenTextures` → `registerDailyProductionTextures` → image de fond Daily → `BackgroundFX` → `TrackVisuals` → reste. Aucune texture ré-ajoutée si elle existe déjà.

## Background Daily
- Affiché **uniquement** si `mode === "daily"` **et** `textures.exists("prod:daily-bg")`.
- `this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2, "prod:daily-bg").setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-20)`.
- **Profondeur -20** : sous BackgroundFX (-10), la piste (0), chevrons (1), objets (5-6), joueur (10), HUD/effets. Vérifié en MCP (image 414×736 à depth -20).
- Absent de Training/Survival/Campaign. Texture manquante → aucune image, fond procédural conservé intégralement (vérifié : fallback → pas d'image depth -20).

## Chain Block
- `makeChainBlock` retourne toujours un `Container`. Si `prod:chain-block` existe : un seul enfant `Image` centré (origin 0.5), `setDisplaySize(OBJECTS.radius*2.4)` ≈ 43 px, **pas de halo procédural additionnel** (l'image porte son glow). Sinon : fallback procédural inchangé (halo + carré + double maillon, 4 parts).
- **Hitbox NON dérivée du sprite** : MainScene collisionne sur lane + y + `OBJECTS.radius` (inchangé). Même parent container, même origin central, même position, même depth (défini par MainScene), même scale de projection, même type interne `energy`, même Magnet, même combo, même score, mêmes animations de collecte.
- **LOD 32/64/128** : choix **stable par appareil** (tier ci-dessus), purement visuel, ne recrée pas l'objet logique, ne modifie ni `this.objects` ni la collision, aucune oscillation (une seule résolution par session). Vérifié : block = `sprite:prod:chain-block` en run normal, `procedural(4)` en fallback.

## Finish Portal
- `TrackGate` étendu : `textureKey?`/`textureOriginY?`. Utilisé **uniquement** pour `daily-finish` (jamais Survival zone gates, Campaign success, autres TrackGate).
- Sprite portail : **origin (0.5, 0.88)**, **depth 5** (sous le joueur depth 10 et sous le beam/texte procéduraux depth 6 — ne masque jamais le joueur), suit le même trajet horizon→joueur via `track.roadEdges(y)`, centré entre `left` et `right`, largeur = road width × 1.25 (scale uniforme → centre transparent + aspect conservés), inclus dans le fade-out final, détruit avec TrackGate.
- **Inchangés** : `t`, quadratic ease, `horizonY`, `targetY`, `durationMs = 1300`, `onCross`, flash, texte FINISH, bannière FINISH!, delayedCall de fin, destruction, absence de collision. Le beam/posts/texte procéduraux restent présents par-dessus.
- Texture absente / non chargée / clé absente → TrackGate **procédural intégral** (vérifié : `portalOnGate=false`, FINISH présent).

## Test de déterminisme
Même Daily, production ON vs textures production retirées : les schedules seedés sont **byte-identiques** :
- powerup schedule identique ✓ ; event schedule identique ✓ ; token schedule identique ✓.
Le module ne contient aucun `Math.random`, ne consomme aucun tirage RNG, n'ajoute rien à `this.objects`. Le `git diff` ne touche ni `gameConfig`, ni `seededRandom`, ni l'ordre des tirages de `spawnObject`. Seed, ordre des tirages, lanes, types, token/power-up/event schedule, moment de fin (60s) et timing du gate (1300ms) inchangés.

## Tests de fin
- Portail créé sur le gate au `daily-finish`, depth 5, origin 0.88, sous le joueur, texte FINISH visible ; `onCross`/flash/FINISH!/endRun inchangés (capture temporaire).

## Tests responsive
- 414×736 DPR 2 → 828/512/128 ; 414×736 DPR 1 → 414/256/64. (375/480/desktop : sélection identique fondée sur le DPR ; le canvas Phaser reste en résolution logique 414×736, Scale.FIT.)

## Tests de performance
- Aucune requête réseau après le lancement Phaser (préchargement en préparation ; enregistrement depuis le cache d'`Image`).
- Trois textures production enregistrées par run (une par asset logique) ; aucun double background.
- Aucun warning TextureManager / erreur WebGL observés ; cache module-level réutilisé entre runs (les `HTMLImageElement`, pas les textures).

## Problèmes rencontrés
- `Image().src` ne passe pas par `window.fetch` → pour tester le fallback en MCP, override de `window.Image` (ou retrait des textures au démarrage).
- Le fond Daily crée son image avant tout enregistrement des autres couches — placé au tout début de `create()` (depth -20).

## Décisions humaines restantes
- **Pi Browser réel non testé ici** — dette : valider par l'utilisateur après déploiement preview (chargement WebP/PNG, FPS, absence de flash vide, portail final, plusieurs runs).
- Validation visuelle humaine finale de la run Daily (contraste des Chain Blocks/tokens sur le fond de production, lisibilité au soleil).
- Ajuster éventuellement `OBJECTS.radius*2.4` (taille du sprite Chain Block) et `PORTAL_WIDTH_FACTOR` (1.25) après revue esthétique.
