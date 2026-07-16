# Production brief — Chain Block

Target ID : `chain-block-production`

Statut : brief-ready, image non générée

Références principales : `chain-block-base-md`, `chain-block-base-sm`

Références de soutien : `chain-block-prism`, `chain-block-core`

## Usage et invariants

Collectible standard du Daily Token Rush. Dans le code, il reste un objet technique de type `energy` :

- combo inchangé ;
- Magnet inchangé ;
- `energiesCollected` inchangé ;
- points et collisions inchangés ;
- projection de piste et hitbox inchangées.

Le futur sprite est un remplacement visuel uniquement. Le Chain Block procédural actuel reste le fallback.

## Format de production

- Master : PNG transparent 512×512, sRGB.
- Objet centré, alpha droit et propre.
- Marge alpha : 12–16 % sur chaque bord ; cible nominale 14 %.
- Pivot : `(0.5, 0.5)`, soit `(256,256)` au master.
- Aucun sol, environnement, cadre rectangulaire ou ombre portée coupée.
- Dérivés futurs : PNG 128×128, 64×64 et 32×32.
- WebP transparent : seulement après comparaison de décodage et d’alpha dans Phaser.

## Silhouette map

| Zone master | Fonction |
|---|---|
| x/y 0–61 et 451–512 | Marge alpha minimale de 12 % |
| x/y 72–440 | Silhouette nominale à 14 % de marge |
| x/y 112–400 | Polyèdre principal et facettes |
| x/y 174–338 | Noyau lumineux |
| rayon 150–190 autour du centre | Deux ou trois connexions abstraites intégrées à la silhouette |

La silhouette doit être un polyèdre compact, proche d’un hexagone facetté mais pas parfaitement plat. Les connexions ne doivent pas créer une forme ronde globale.

## Relation avec les autres objets

| Objet runtime | Silhouette actuelle | Le Chain Block doit éviter |
|---|---|---|
| Token Daily | Disque circulaire avec logo et label | cercle, pièce, médaillon, face monétaire |
| Obstacle | Carré tourné à 45°, losange corail | diamant pointu, angles agressifs, corail dominant |
| Shield | Orbe cyan avec anneau protecteur | anneau circulaire externe et cyan dominant |
| Magnet | Orbe orange avec aura violette | orbites permanentes et noyau orange rond |
| Life Orb | Cercle vert avec `+` | vert dominant et croix |
| Player | Orbe violet avec glyphe `π` | cercle violet, lettre ou symbole central |

Le Chain Block doit rester immédiatement collectable : forme angulaire stable, noyau or et halo modéré, sans signaux de danger.

## Hiérarchie des détails

1. **Niveau 1 — silhouette** : polyèdre compact à contour épais.
2. **Niveau 2 — noyau** : source lumineuse simple, non symbolique.
3. **Niveau 3 — connexions/facettes** : deux ou trois liens abstraits et quelques plans.

Aucun quatrième niveau de micro-gravure. À 32 px, seul le niveau 1, le noyau et une indication des connexions doivent rester.

## Palette

| Rôle | Couleur |
|---|---|
| Corps principal | violet `#8B5CF6` et violet nuit `#2A1C4D` |
| Bord récompense | or `#FFD166` |
| Accent chaud | orange `#FF7A3D`, limité |
| Noyau | blanc chaud vers or |
| Accent optionnel | cyan `#38BDF8`, très faible |
| Interdit comme dominante | corail danger `#FF4D6D`, vert Life Orb |

## Éclairage

- lumière interne provenant du noyau ;
- facettes externes plus sombres que le contour ;
- liseré or clairement visible ;
- halo extérieur limité à environ 8 % de la largeur de l’objet ;
- aucun bloom jusqu’aux bords du canvas ;
- pas d’ombre au sol.

## Primary Prompt

> Create a single isolated game collectible on a transparent background, 512 by 512 pixels, sRGB PNG, centered orthographic or slightly isometric view. Design a compact angular blockchain-inspired polyhedral block with a strong non-circular silhouette, a thick violet outer body, a refined gold reward rim, a simple warm luminous core, and two or three abstract connection elements integrated into the facets. Use only three visual detail levels: bold silhouette, readable core, and a few large facet or connection shapes. Keep the object recognizable at 32 pixels, with no line that would become thinner than about 2 pixels at the target size. Leave 12 to 16 percent clean transparent margin on every side, keep the pivot at the exact center, use a moderate contained halo, and provide clean straight alpha. No floor, no environment, no text, no logo, no currency symbol, no coin shape.

## Prism Variant Prompt

> Create a single isolated transparent-background mobile game collectible, 512 by 512 pixels, centered and slightly isometric. Use a compact six-sided violet polyhedron with a gold outer rim, a small warm luminous core, and three broad internal prism facets using restrained lavender and cyan reflections. Preserve an unmistakably angular block silhouette at 32 pixels and keep all secondary details large and sacrificial. Include two abstract chain-like connection points without creating a circular outline. Maintain 14 percent transparent margin, clean alpha, no floor, no environment, no text, no logo, no currency symbol and no coin shape.

## Core Variant Prompt

> Create a single isolated transparent-background mobile game collectible, 512 by 512 pixels, centered orthographic view. Design a compact angular violet block with a thick gold contour and a bright but contained warm core visible through a few large dark-glass facets. Add two or three simple abstract connections that imply linked data blocks. The core must remain readable at 32 pixels, while the silhouette stays more important than the glow. Use restrained orange and optional tiny cyan reflections, clean straight alpha and 12 to 16 percent transparent margin. No floor, no environment, no text, no logo, no currency symbol, no coin shape.

## Negative Prompt

> background, floor, platform, pedestal, environment, rectangular canvas shadow, opaque backdrop, coin, circular token, medallion, currency symbol, letter, number, logo, official emblem, Greek letter, shield icon, lightning symbol, plus sign, heart, face, character, eye, sharp danger diamond, aggressive spikes, coral-red dominant palette, green dominant palette, large circular aura, orbit rings, excessive bloom, glow clipped by image edge, tiny engraving, thin wires, more than three detail levels, photorealism, childish cartoon, dirty texture, watermark, signature

## Checklist de réduction

### 512×512

- [ ] Alpha propre et marge de 12–16 %.
- [ ] Pivot visuel au centre.
- [ ] Facettes cohérentes et aucune pseudo-lettre.
- [ ] Halo non coupé.

### 128×128

- [ ] Contour, noyau et connexions restent séparés.
- [ ] Pas de frange sombre ou claire.
- [ ] Le collectible ne ressemble pas à un token.

### 64×64

- [ ] Silhouette identifiable en moins d’une seconde.
- [ ] Noyau visible sans saturer.
- [ ] Les détails internes ne fusionnent pas en bruit.

### 32×32

- [ ] Contour angulaire continu.
- [ ] Noyau d’au moins 5–7 px visible.
- [ ] Au moins une indication de connexion lisible.
- [ ] Aucun trait apparent inférieur à 2 px.
- [ ] Différent du losange obstacle et du cercle token en niveaux de gris.

## Budgets futurs

- Master source PNG 512 : ≤ 750 KiB recommandé, hors dépôt public si source de travail lourde.
- Runtime PNG 128 : ≤ 70 KiB.
- Runtime PNG 64 : ≤ 35 KiB.
- Runtime PNG 32 : ≤ 18 KiB.

## Causes de rejet

- forme circulaire ou assimilable à une pièce ;
- silhouette de losange agressif ;
- symbole, lettre, logo ou motif monétaire ;
- noyau illisible à 32 px ;
- lignes fines qui scintillent ;
- halo ou ombre coupés ;
- marge alpha excessive au-delà de 20 % ;
- contour principalement corail ou vert ;
- besoin d’une animation pour comprendre l’objet.
