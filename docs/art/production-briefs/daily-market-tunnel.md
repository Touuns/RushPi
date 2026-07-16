# Production brief — Daily Market Tunnel

Target ID : `daily-market-tunnel-production`

Statut : brief-ready, image non générée

Références principales : `daily-market-tunnel-main`, `daily-market-tunnel-cyan`

Référence de soutien : `daily-market-tunnel-amber`

## Usage

Fond opaque fixe, ou ultérieurement très légèrement animé, du Daily Token Rush. Il se place derrière :

- `BackgroundFX` et ses particules ;
- la piste Phaser en trapèze ;
- les trois lanes ;
- le player orb à y≈80 % ;
- tokens circulaires, Chain Blocks, obstacles en losange et power-ups ;
- HUD, token counter et événements visuels.

Le fond ne modifie aucune collision ou règle. La piste Phaser reste le repère fonctionnel et le fallback.

## Format

- Master : 828×1472 px, opaque, sRGB.
- Dérivés futurs : WebP 828×1472 et WebP 414×736.
- Budget futur : WebP 828×1472 ≤ 350 KiB ; WebP 414×736 ≤ 200 KiB.
- Alpha : aucun.
- Fallback : fond caméra, `BackgroundFX` et `TrackVisuals`.

## Géométrie de référence

Le jeu utilise 414×736, un horizon à y≈118, un player à y≈589 et trois lanes. Sur le master 2×, ces valeurs deviennent y≈236 et y≈1178.

### Centres de lanes

| Hauteur logique | Lane gauche | Lane centre | Lane droite |
|---|---:|---:|---:|
| Horizon y=118 | x≈163 | x=207 | x≈251 |
| Mi-piste y=354 | x≈116 | x=207 | x≈298 |
| Player y=589 | x≈69 | x=207 | x≈345 |

Chaque centre de lane doit conserver une bande sombre stable de ±28 px logiques autour de son axe, soit ±56 px sur le master. Les lignes de fond ne doivent pas suivre précisément ces axes ni les boundaries de piste.

## Carte de lisibilité

| Zone | Coordonnées master | Règle |
|---|---|---|
| HUD / safe top | y 0–176 | Détail très faible, aucune lumière forte derrière les chiffres |
| Horizon | y 220–270 | Point de convergence lisible, pas de blanc brûlé |
| Corridor central haut | x 230–598, y 176–500 | Sombre, peu d’objets, aucune forme circulaire |
| Trapèze jouable protégé | polygone `(230,236) (598,236) (780,1280) (48,1280)` | Aucune masse opaque, aucun objet focal, pas de faux obstacle |
| Zone player critique | x 40–788, y 1080–1280 | Valeurs sombres et homogènes ; aucune lumière majeure |
| Architecture latérale | extérieur du trapèze protégé | Blocs, nœuds et conduits permis |
| Safe bottom | y 1404–1472 | Aucun élément essentiel |

La zone protégée est volontairement plus large que la piste visible afin d’absorber drift, projection, halos et petits recadrages.

## Danger zones visuelles

- y=0–176 : HUD et token counter ;
- les trois bandes de lanes ;
- y=1050–1290 : player, trail, auras et collisions ;
- proximité des boundaries de piste : éviter toute ligne parallèle fortement contrastée ;
- centre de l’horizon : éviter les disques, pièces ou targets.

## Distinction avec la Home

| Home | Daily |
|---|---|
| Architecture calme et scrollable | Tunnel directionnel et monumental |
| Pas de piste explicite | Forte convergence, piste Phaser superposée |
| Détail latéral posé | Blocs en transit et signaux de vitesse périphériques |
| Horizon décoratif | Horizon fonctionnel guidant la course |
| Peu de mouvement suggéré | Flux et profondeur cinétique |

La palette reste commune, mais le Daily peut employer davantage de cyan et d’orange en périphérie.

## Éléments animables plus tard

- anneaux lointains autour de l’horizon à faible vitesse ;
- quelques blocs latéraux en transit ;
- nœuds distants pulsant lentement ;
- signaux cyan ou ambre périphériques ;
- très faible parallax des structures latérales.

Ces animations doivent rester sous 25 % d’opacité moyenne et ne jamais déplacer une ligne assimilable à une lane. La piste, les chevrons, le trail et les particules Phaser restent les sources principales de mouvement.

## Palette

- 50–60 % noir aubergine / violet nuit ;
- 15–20 % violet et bleu électrique sombres ;
- 8–12 % cyan analytique ;
- 3–6 % or/ambre de récompense ;
- 1–3 % orange de vitesse ;
- corail limité à de minuscules signaux périphériques de danger.

## Primary Prompt

> Create a premium portrait mobile game background, 828 by 1472 pixels, opaque sRGB, showing a monumental abstract data tunnel for a fast three-lane arcade run. Place the vanishing horizon near 16 percent of the image height. Build strong depth with distant concentric infrastructure, large dark side structures, abstract blockchain blocks moving only along the periphery, and small network nodes far from the playable corridor. Keep the central track-shaped region darker and more stable than the sides, with no object placed on any lane and no strong line that could be mistaken for a lane boundary. Protect the lower player area from major light sources. Use black aubergine and midnight violet as the base, analytical cyan and electric blue for technology, rare gold and amber for reward signals, and subtle orange for speed. Represent market activity only as abstract luminous weather and distant data flow, never as readable financial information. Crisp stylized geometry, large shapes, controlled volumetric depth, mobile readability first.

## Cyan Variant Prompt

> Create a cool analytical portrait data tunnel background for a three-lane mobile arcade game, 828 by 1472 pixels, opaque sRGB. Use a deep violet-black environment, cyan and electric-blue side infrastructure, distant concentric rings and sparse node signals around a horizon near 16 percent height. The playable central trapezoid and the entire lower player zone must remain dark, low-detail and free of circular objects, diamonds and strong converging lines. Keep cyan concentrated on side panels and distant infrastructure, with only tiny gold reward accents. The image must feel fast and technological without becoming uniformly bright or resembling a financial dashboard.

## Amber Variant Prompt

> Create a warm reward-accented portrait data tunnel background for a three-lane mobile arcade game, 828 by 1472 pixels, opaque sRGB. Build a deep black-aubergine and violet tunnel with large dark side structures, a compact horizon near 16 percent height, restrained amber-gold nodes and orange energy channels only at the periphery. Preserve a dark stable central trapezoid and a quiet lower player area. Add depth through layered architecture and distant blocks in transit, not through bright lane-like rails. Keep cyan as a small technical counterpoint. The result must remain premium, readable and clearly different from a calm home screen.

## Negative Prompt

> text, numbers, ticker, stock chart, price chart, candlesticks, exchange interface, trading terminal, financial dashboard, logo, currency symbol, crypto symbol, coin, circular token, round collectible, central sphere, central diamond, obstacle, shield pickup, life orb, human, face, character, vehicle, readable lane markings, extra road, false lane boundary, bright object on a lane, burned white center, giant portal, uniform cyan wash, uniform orange wash, casino, slot machine, photorealism, childish cartoon, dirty cyberpunk clutter, dense particles, micro-detail noise, watermark, signature

## Checklist gameplay readability

- [ ] 828×1472 exact, opaque, sRGB.
- [ ] Horizon entre y=220 et y=270.
- [ ] Les trois bandes de lanes restent sans objet ni lumière dominante.
- [ ] Aucun cercle assimilable à un token.
- [ ] Aucun losange assimilable à un obstacle.
- [ ] Aucun trait de fond confondu avec une boundary de lane.
- [ ] Zone player y=1080–1280 sombre et stable.
- [ ] HUD supérieur lisible.
- [ ] Les accents ambre/or restent périphériques et minoritaires.
- [ ] La piste Phaser conserve plus de contraste que le background.
- [ ] Les tokens, Chain Blocks et obstacles restent lisibles en niveaux de gris.
- [ ] Aucun élément financier lisible.
- [ ] Contrôle réussi à 375×667 et 414×736.
- [ ] Dérivé 828 dans le budget 350 KiB.

## Causes de rejet

- objet circulaire, pièce ou symbole sur le corridor ;
- obstacle visuel ou masse lumineuse sur une lane ;
- background plus lisible que la piste Phaser ;
- horizon ou zone player brûlés ;
- chandeliers, courbe, ticker, prix ou interface d’exchange ;
- composition trop proche de la Home, sans caractère directionnel ;
- architecture couvrant la zone de drift ;
- détails scintillants ou moiré à 414×736.
