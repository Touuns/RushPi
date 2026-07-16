# Production brief — Finish Portal

Target ID : `finish-portal-production`

Statut : brief-ready, image non générée

Références principales : `portal-finish`, `portal-success`

Références de soutien : `fx-portal-halo`, `fx-validation-spark`, `fx-speed-trail`

## Usage et invariants

Habillage visuel du portail de fin du Daily. Le système `TrackGate` reste responsable du déplacement, du franchissement, du callback et du texte runtime `FINISH`. Le futur asset :

- ne possède aucune collision ;
- n’embarque aucun texte ;
- conserve une ouverture traversable ;
- ne change pas le timing de fin ;
- doit pouvoir disparaître au profit du gate procédural en fallback.

## Format de production

- Master : PNG transparent 512×768, sRGB, alpha droit.
- Dérivé futur : PNG 256×384.
- Halo séparé optionnel seulement si la source permet une extraction propre.
- Aucun fond, sol opaque ou décor complet.
- Marge alpha nominale : 8 % sur les côtés et en haut ; 10–12 % pour le glow.
- Budget : master ≤ 1.2 MiB recommandé ; runtime 256×384 ≤ 180 KiB ; halo séparé ≤ 80 KiB.

## Guide de pivot

- Pivot logique normalisé : `(0.50, 0.88)`.
- Coordonnée master : `(256, 676)`.
- Coordonnée dérivée 256×384 : `(128, 338)`.
- La base structurelle doit entourer le pivot sans créer une dalle opaque.
- Le glow peut descendre sous le pivot, mais aucun détail structurel essentiel ne doit dépasser y=714.

## Zones

### Ouverture minimale

- x=174–338 au master, soit 34–66 % de la largeur ;
- y=154–584, soit environ 20–76 % de la hauteur ;
- largeur minimale utile : 164 px au master, 82 px au runtime ;
- hauteur minimale utile : 430 px au master, 215 px au runtime.

Cette zone reste majoritairement transparente. Une brume lumineuse légère est permise, jamais une porte pleine.

### Zone structurelle

- arche et montants dans x=92–420 ;
- sommet dans y=62–190 ;
- montants jusqu’à y≈676 ;
- base visuelle légère, ouverte au centre ;
- épaisseur minimale des montants au runtime : 10–14 px.

### Zone de glow

- x=40–472, y=24–704 ;
- halo arrière plus large que la structure, sans toucher les bords ;
- énergie ascendante concentrée autour des montants et du sommet ;
- maximum 2–4 sparks secondaires.

## Composition

- structure sombre en arche verticale ;
- liseré principal or et violet, asymétrie légère possible ;
- ouverture centrale grande, nette et traversable ;
- énergie ascendante, plus forte vers le sommet ;
- halo violet derrière la structure ;
- quelques accents cyan ;
- base discrète pour ne pas masquer le player orb ;
- silhouette immédiatement différente d’un obstacle.

## Primary Prompt

> Create a single isolated vertical finish portal for a portrait mobile arcade game, 512 by 768 pixels, transparent sRGB PNG with clean straight alpha. Design a dark elegant open arch with a large clearly traversable transparent center, refined gold and neon-violet structural rims, upward-moving light energy, a restrained violet halo behind the structure and a few small cyan accents. Keep the structure inside the central 64 percent of the canvas width, preserve at least 34 percent clear opening width and at least 56 percent clear opening height, and leave enough transparent margin so no glow is clipped. The logical pivot is at 50 percent width and 88 percent height. Make the lower base light and open so it cannot hide a player orb. The portal must read clearly at 256 by 384 pixels and remain complete without animation. No floor, no environment, no text.

## Technological Variant Prompt

> Create a single isolated transparent-background finish portal, 512 by 768 pixels, for a premium mobile arcade game. Use a tall open dark-metal arch made of a few large modular segments, gold-violet energy channels, restrained cyan verification nodes and subtle upward streaks. Keep a wide empty center for traversal, a soft separate-looking halo behind the ring, and a lightweight base around the pivot at 50 percent width and 88 percent height. Favor clean technology and large readable shapes over circuitry or tiny details. No floor, no scene, no text, no logo, and no closed door.

## Monumental Variant Prompt

> Create a monumental but mobile-readable isolated finish portal, 512 by 768 pixels, transparent sRGB PNG. Build a tall open arch with broad dark structural shoulders, luminous gold inner edges, violet outer energy and a compact bright crown that suggests upward success. Preserve a large transparent central opening and keep the base narrow enough for a player orb to pass visibly. Add a controlled violet halo and only a few cyan-white sparks, all contained inside generous transparent margins. The portal must remain elegant and readable at 256 by 384 pixels, with the logical pivot at 50 percent width and 88 percent height. No environment and no text.

## Negative Prompt

> FINISH text, any text, letters, numbers, logo, official emblem, flag, checkered flag, closed door, solid gate, opaque center, wall, road, full environment, floor plane, pedestal, massive base, object covering the player, coin, token, currency symbol, face, human, character, vehicle, obstacle diamond, aggressive spikes, red danger portal, white burned-out opening, excessive particles, dense circuitry, thin unreadable lines, glow clipped by canvas edge, rectangular shadow, black background baked into alpha, watermark, signature

## Checklist sur fond sombre

- [ ] Alpha propre sur `#0C0717`, sans frange noire ou claire.
- [ ] Structure distincte même avec halo désactivé.
- [ ] Ouverture centrale réellement transparente.
- [ ] Or et violet restent séparés ; cyan seulement en accent.
- [ ] La base ne masque pas une orb de 44–60 px.
- [ ] Le glow ne fusionne pas avec le fond en une tache.
- [ ] Aucun texte ou drapeau.

## Checklist à 256×384

- [ ] Ouverture minimale ≈82×215 px.
- [ ] Montants d’au moins 10 px visuels.
- [ ] Sommet et base restent distincts.
- [ ] Aucun spark ne ressemble à un collectible.
- [ ] Le contour ne devient pas un obstacle fermé.
- [ ] Pivot `(128,338)` documenté.
- [ ] Aucun halo coupé.
- [ ] Poids ≤180 KiB après optimisation.

## Séparation de couches future

Si la source le permet sans reconstruire l’image :

1. `structure` : arche sombre et liserés ;
2. `halo` : glow arrière ;
3. `streaks` : énergie ascendante ;
4. `particles` : sparks secondaires.

La version statique combinée reste obligatoire et autonome. Aucune spritesheet n’est demandée dans 12A-0A.

## Causes de rejet

- ouverture fermée, trop petite ou opaque ;
- texte `FINISH` intégré ;
- drapeau ou damier ;
- glow coupé aux bords ;
- base couvrant le joueur ;
- portail assimilable à un obstacle ;
- centre blanc brûlé ;
- dépendance à un fond noir prémultiplié ;
- détails illisibles à 256×384 ;
- composition nécessitant un changement de logique Phaser.
