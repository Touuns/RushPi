# Rush Pi — Spécifications d’animation

Ce document prépare l’animation future des assets sans l’intégrer au gameplay. Les durées sont des recommandations visuelles ; elles ne doivent jamais modifier les timers, collisions, spawns, scoring ou transitions validées.

Le contrat machine-readable associé est `public/assets/rushpi/animation-specs.json`.

## Conventions

- Temps en millisecondes, 60 fps comme cible et 30 fps acceptable sur mobile.
- Easing exprimé avec les noms Phaser (`Sine.easeInOut`, `Cubic.easeOut`, etc.).
- Pivot par défaut : centre `0.5, 0.5`. Portail : `0.5, 0.88`.
- FX additifs : `Phaser.BlendModes.ADD`, avec fallback `NORMAL` si le coût GPU est excessif.
- Une animation `loop` est cosmétique et désactivable avec `prefers-reduced-motion` côté preview/UI.
- Une animation `one-shot` remet systématiquement alpha, scale, angle et tint avant recyclage dans un pool.
- Les spritesheets utilisent une cellule constante, 2 px de marge et une numérotation `000..N`.
- Les groupes SVG nommés servent de référence d’export ; Phaser anime les images exportées, pas le DOM interne du SVG.

## Portails

| Animation | Parties | Type | Durée | Easing | Lecture | Frames conseillées |
|---|---|---|---:|---|---|---:|
| Finish Gate pulse | glow, ring, streaks, particles | scale/alpha + vertical UV illusion | 1 200 | `Sine.easeInOut` | loop | 12 |
| Zone Gate transition | ring, streaks, halo | ouverture + flash | 700 | `Cubic.easeOut` | one-shot | 10 |
| Validation Gate flash | ring, core, confirmation stroke | trace + éclat | 620 | `Back.easeOut` | one-shot | 10 |
| Success Gate rise | streaks, particles, glow | montée + expansion | 780 | `Cubic.easeOut` | one-shot | 12 |
| Failure Gate flicker | broken ring, cross streaks | alpha irrégulier + faible shake | 540 | `Stepped` | one-shot | 8 |
| Multichain Gate rotation | three rings, nodes | rotations opposées | 2 400 | `Linear` | loop | 16 |

### Intégration Phaser suggérée

Créer un `Container` avec une image par couche exportée. Placer le halo sous la structure, les streaks dans l’ouverture et les particules au-dessus. Ne jamais attacher une collision au container artistique. Pour un portail statique, charger uniquement la structure fusionnée ; pour une version animée, conserver exactement le même pivot et canevas pour toutes les couches.

Le **Finish Gate pulse** doit rester purement cosmétique : il ne déclenche ni ne prolonge la séquence de fin. Le code de gameplay reste l’autorité du timing.

## Chain Blocks et collecte

| Animation | Parties | Type | Durée | Easing | Lecture | Frames conseillées |
|---|---|---|---:|---|---|---:|
| Chain Block idle | shell, core, nodes | flottement ±2 px + core pulse | 1 400 | `Sine.easeInOut` | loop | procédural |
| Energized idle | energy-rays, seams, core | rotation lente + respiration | 1 000 | `Sine.easeInOut` | loop | 10 |
| Magnetized glow | magnet-rings, nodes | anneaux opposés + alpha | 900 | `Linear` | loop | 12 |
| Chain Block pickup burst | block, burst-rays, fragments | pop, dispersion, fade | 360 | `Cubic.easeOut` | one-shot | 8 |
| Token collection pop | frame, logo runtime, selection halo | scale 0.82→1.18→0 + fade | 420 | `Back.easeOut` | one-shot | 8 |

Le collectible disparaît logiquement avant ou au début du one-shot ; l’animation reçoit une copie visuelle non interactive. Les fragments n’ont aucune physique gameplay. Le logo token, lorsqu’il existe, est une texture runtime et n’est jamais ajouté à l’atlas Rush Pi.

Ordre recommandé pour le pickup burst :

1. frame 0 : flash central, block à 100 % ;
2. frames 1–2 : block à 112 %, rays en apparition ;
3. frames 3–5 : block en fade, fragments vers l’extérieur ;
4. frames 6–7 : rays et fragments disparaissent complètement.

## Charge, vitesse et transitions

| Animation | Parties | Type | Durée | Easing | Lecture | Frames conseillées |
|---|---|---|---:|---|---|---:|
| Charge discharge | arcs, main bolt, branch bolts | expansion radiale + flash | 480 | `Expo.easeOut` | one-shot | 8 |
| Speed trail | long-streaks, short-streaks | translation verticale + alpha | 520 | `Linear` | loop | 8 |
| Zone transition flash | full-screen tint, circular pulse | alpha 0→0.32→0 | 680 | `Sine.easeOut` | one-shot | procédural |
| Circular pulse | four rings | scale décalée + fade | 800 | `Cubic.easeOut` | one-shot | 10 |
| Scan lines | overlay | translation 0→8 px | 3 200 | `Linear` | loop | procédural |

Les scan lines doivent rester sous 0,12 d’alpha et peuvent être entièrement statiques. Le trail de vitesse ne doit pas impliquer une modification réelle de la vitesse. Le flash plein écran est plafonné pour limiter fatigue visuelle et photosensibilité.

## Storm

| Animation | Parties | Type | Durée | Easing | Lecture | Frames conseillées |
|---|---|---|---:|---|---|---:|
| Storm lightning pulse | main bolt, branch bolts, halo | apparition 2 frames, décroissance | 260 | `Cubic.easeOut` | one-shot | 6 |
| Storm fragment drift | fragments, fragment-trails | dispersion latérale | 520 | `Quad.easeOut` | one-shot | 8 |

Ne jamais faire clignoter l’écran entier en boucle. Espacer les bolts, varier leur position avec un flux déterministe si l’équité visuelle du Daily est concernée, et limiter le flash blanc à une seule frame à 30 fps.

## Exports spritesheet

| Famille | Cellule | Grille | Frames | Ordre |
|---|---:|---:|---:|---|
| Collect burst | 256×256 | 8×1 | 8 | gauche → droite |
| Energy ring | 256×256 | 10×1 | 10 | gauche → droite |
| Portal activation | 512×768 | 5×2 | 10 | ligne 1 puis ligne 2 |
| Charge discharge | 256×256 | 8×1 | 8 | gauche → droite |
| Lightning | 256×512 | 6×1 | 6 | gauche → droite |
| Token pop | 256×256 | 8×1 | 8 | gauche → droite |

Exemple Phaser futur, volontairement non intégré :

```ts
scene.anims.create({
  key: "fx-chain-block-pickup",
  frames: scene.anims.generateFrameNumbers("fx-chain-block-pickup", { start: 0, end: 7 }),
  frameRate: 24,
  repeat: 0,
  hideOnComplete: true,
});
```

Avant toute intégration, mesurer le nombre de textures, la mémoire décompressée et le coût des blend modes sur un appareil mobile modeste. Conserver le fallback procédural actuel tant que l’asset externe n’est pas prêt.
