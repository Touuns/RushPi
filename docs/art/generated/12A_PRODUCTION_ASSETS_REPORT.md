# Phase 12A-0C — Processed production assets

La Phase 12A-0C transforme exclusivement les quatre masters sélectionnés en neuf dérivés runtime optimisés. La décision humaine finale approuve les neuf dérivés pour intégration : le statut global et chaque statut individuel deviennent `approved-for-integration`, avec `integrationAllowed=true`. Les fichiers ne sont pas encore intégrés : `integratedInGameplay=false` reste obligatoire et aucune intégration React, Phaser ou gameplay n’est réalisée dans cette phase.

## Sources sélectionnées

| Rôle | Master | SHA-256 |
|---|---|---|
| Home | `art-sources/phase-12a/home-background/home-background-primary-candidate-v1.png` | `6b25af2643b733301876070653752bd4962994448c66410a209415a8ca855ef9` |
| Daily | `art-sources/phase-12a/daily-market-tunnel/daily-market-tunnel-primary-candidate-v2.png` | `6c599e3aa513cb0f526317fb719d995443662ea6baf12d6d6c19414cc38927ec` |
| Chain Block | `art-sources/phase-12a/chain-block/chain-block-primary-candidate-v1.png` | `964bbd50b211324f397e0b50292c0ff565a62fe3959d0c61aad2f01fce70bb06` |
| Finish Portal | `art-sources/phase-12a/finish-portal/finish-portal-primary-candidate-v1.png` | `0384d14509ddbf15484f59df4f09a8992ffb43d1c0e3d564c0fa152b1a69869a` |

Les quatre masters ont été utilisés en lecture seule. Le script vérifie leur statut `approved-for-processing`, leur ID et leur chemin avant le traitement.

## Outil et paramètres

- Script : `tools/assets/process-phase-12a-production.mjs`.
- Moteur : `sharp`, dépendance locale optionnelle non ajoutée à `package.json` ou `package-lock.json`.
- Redimensionnement : Lanczos 3, proportions source/cible identiques, aucun étirement géométrique.
- WebP : qualité 82, effort 6, smart subsampling, métadonnées inutiles supprimées.
- PNG : lossless, compression 9, adaptive filtering, palette désactivée, alpha préservé.
- Toutes les sorties sont forcées en sRGB.

## Dérivés produits

| ID | Dimensions | Poids | Budget | SHA-256 |
|---|---:|---:|---:|---|
| `home-background-production-414` | 414×736 WebP | 17 726 o | 184 320 o | `d40286edae178261e26a9102b053cc0fef487c33079715e4e0f4506f0c7c9109` |
| `home-background-production-828` | 828×1472 WebP | 46 298 o | 358 400 o | `f9b04176e5af900695eaa572223cd2c7ce95fdfd66fdd4e9bd26261ea0fa68d0` |
| `daily-market-tunnel-production-414` | 414×736 WebP | 12 400 o | 204 800 o | `f95dda4f2993caab18a9a8bb7bea7307b3562a57fef83b06240e6c29352013d6` |
| `daily-market-tunnel-production-828` | 828×1472 WebP | 36 800 o | 358 400 o | `ed8c001d800fad29f23d8353e62368717f10a32b90beb59aff46db1f7a076289` |
| `chain-block-production-32` | 32×32 PNG | 2 040 o | 18 432 o | `4583736aed43b210d9020d4b0d48922d8b7d4fd9a08313a254a5d7e2d20b30ec` |
| `chain-block-production-64` | 64×64 PNG | 5 831 o | 35 840 o | `2413a53f31dc3297ec513e1723dd8e1aebbfd54d27000936173827daaedbcc72` |
| `chain-block-production-128` | 128×128 PNG | 18 085 o | 71 680 o | `9794b9718b39ecf129688b68cdae15078fe595a6c250f05ceeb56306ce94175b` |
| `finish-portal-production-256` | 256×384 PNG | 37 745 o | 92 160 o | `1a86d8548d5e8daa2827eb15ac6b342cf6f16941aba94c3e2cf3d6f46b035496` |
| `finish-portal-production-512` | 512×768 PNG | 122 492 o | 184 320 o | `9a5033697c764fef8cbe9d390d2dcb476cc7ba7732747061bec4cedef9f99c5c` |

Tous les budgets passent à la qualité WebP 82; aucune réduction supplémentaire n’a été nécessaire.

## Contrôles techniques et visuels

- Home et Daily : sorties opaques, sRGB, dimensions exactes; gradients, structures latérales, zones calmes, horizon et piste restent lisibles face aux masters.
- Chain Block : alpha réel 0–255, aucun pixel alpha sur les bords, pivot `(0.5,0.5)`, noyau lisible à 32 px, silhouette stable à 64 et 128 px.
- Finish Portal : alpha réel 0–255, aucun pixel alpha sur les bords, pivot `(128,338)` à 256 et `(256,676)` à 512, origin `(0.5,0.88)`.
- Ouverture Portal : la zone recommandée mise à l’échelle reste entièrement transparente, soit `82×215` à 256 et `164×430` à 512.
- Franges : contrôles sur noir pur, aubergine `#0C0717`, blanc, gris clair et magenta. Aucune frange verte, blanche ou noire involontaire; aucun halo coupé; aucune ombre rectangulaire.
- Comparaisons : les dérivés Home/Daily conservent leur composition; Chain Block conserve son noyau et ses contours; Portal conserve l’ouverture et les liserés.

Les planches documentaires se trouvent uniquement sous `tools/art-preview/generated/phase-12a/production-validation/`.

## Manifeste et intégration

La famille `phase-12a-production-raster-kit` et neuf entrées ont été ajoutées sans modifier les 56 entrées historiques. Le manifeste contient désormais 65 assets. Chaque nouvelle entrée déclare `integratedInGameplay=false`, `phase="12A"` et `productionStatus="approved-for-integration"`.

## Décision humaine finale

- Les neuf dérivés sont `approved-for-integration` et peuvent être utilisés par Claude pendant 12A-1 et 12A-2.
- Les neuf fichiers PNG/WebP restent byte-identiques aux dérivés validés.
- Aucune intégration React ou Phaser n’a encore eu lieu.
- `integratedInGameplay` reste `false` jusqu’aux futurs commits d’intégration de Claude.
- La validation finale réelle devra être effectuée dans la Home et pendant une run Daily après l’intégration.

## Galerie responsive

La section `12A Production Assets` charge l’intake de production et présente les tailles, comparaisons master/runtime et simulations documentaires Home, Daily, Chain Block et Finish Portal. L’indicateur `document.documentElement.dataset.phase12aProductionReady = "true"` n’est posé qu’après chargement des JSON, création des cartes, décodage des images nécessaires, `document.fonts.ready`, deux `requestAnimationFrame` et absence d’erreur.

Résultats réels :

- `375×667` : Home et Chain Block capturés avec readiness `true`, toutes les images chargées, aucune erreur et `scrollWidth=clientWidth=375`.
- `414×736` : Daily et Finish Portal capturés avec readiness `true`, toutes les images chargées, aucune erreur et `scrollWidth=clientWidth=414`.
- Les quatre captures contiennent les assets et simulations chargés; aucun fond vide n’a été produit.

Les captures sont temporaires et ne sont pas commitées.

## Phase 12A-1 — Home integration

- **Fichiers React/CSS modifiés** : `src/App.tsx` (couche `.home-bg` avec `<img srcSet>` 1x/2x + `onError`, rendue uniquement quand `screen === "home"`) et `src/styles/global.css` (`.home { z-index:1 }`, `.home-bg`, `.home-bg__img`, `@keyframes home-bg-fade`, `@media (prefers-reduced-motion: reduce)`).
- **Intégration réelle effectuée** : le fond Home Primary de production s'affiche derrière l'interface Home réelle (pas seulement la galerie), dans le cadre non scrollant `.app-frame`, en frère du conteneur scrollant `.home`. `currentSrc` vérifié : 414w en DPR 1, 828w en DPR 2.
- **Gradients conservés comme fallback** : les `radial-gradient` de `.app-frame` restent derrière la couche ; en cas d'échec du WebP, `onError` masque l'`<img>` et seul le gradient s'affiche (aucun flash blanc, aucune icône cassée).
- **Deux assets Home marqués intégrés** : `home-background-production-414` et `home-background-production-828` passent à `productionStatus = integrated-needs-validation` et `integratedInGameplay = true` (intake + manifeste). État global de l'intake : `integration-in-progress` (`integrationAllowed = true`).
- **Sept assets restants non intégrés** : Daily (×2), Chain Block (×3) et Finish Portal (×2) restent `approved-for-integration` / `integratedInGameplay = false`.
- **Validation humaine encore requise** : contraste/lisibilité des textes sur le fond réel, rendu Pi Browser mobile, et confirmation du choix « Primary » avant validation finale. Les fichiers image restent byte-identiques (aucun réencodage).
