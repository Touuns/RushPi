# Production brief — Home Background

Target ID : `home-background-production`

Statut : brief-ready, image non générée

Références principales : `home-main`, `home-calm`

Références de soutien : `home-variant-crystal`, `home-variant-arc`

## Usage et objectif émotionnel

Fond opaque de la Home React, derrière un écran vertical scrollable, un header, un profil, des cartes de modes et des panneaux secondaires. Il ne représente aucun gameplay. Il doit installer immédiatement un sentiment de **portail premium vers une aventure arcade nocturne**, avec assez de profondeur pour donner envie d’entrer dans le jeu, mais assez de calme pour laisser l’interface dominer.

Le fond doit accepter un voile sombre adaptatif en CSS sans perdre son horizon ni sa signature latérale.

## Format de production

- Master : 828×1472 px, opaque, sRGB.
- Ratio : 9:16 approximatif.
- Alpha : absent ou entièrement opaque.
- Dérivés futurs : WebP 828×1472 et WebP 414×736.
- PNG : éventuelle copie de contrôle seulement, pas runtime par défaut.
- Budget futur : WebP 828×1472 ≤ 350 KiB ; WebP 414×736 ≤ 180 KiB.
- Fallback : gradients CSS actuels de `.app-frame`.

## Description détaillée

Un espace numérique nocturne profond, construit en quatre plans :

1. ciel aubergine presque noir, sans étoiles denses ;
2. structures lointaines et horizon lumineux à 15–18 % de la hauteur ;
3. architectures abstraites latérales, cristaux sombres, arches partielles et conduits de données ;
4. avant-plans latéraux très modérés, plus sombres que les cartes React.

Le centre ne doit pas ressembler à une piste. Quelques lignes de perspective peuvent guider le regard vers l’horizon, mais elles restent périphériques et interrompues. Aucun gros objet, portail ou collectible n’occupe l’axe.

## Carte de composition

Coordonnées master 828×1472 ; les valeurs logiques 414×736 sont indiquées entre parenthèses.

| Zone | Coordonnées | Règle |
|---|---|---|
| Safe area supérieure | y 0–88 (0–44) | Aucun détail essentiel ; valeurs sombres et stables |
| Header lisible | y 88–300 (44–150) | Faible contraste local derrière logo, titre et connexion |
| Horizon | y 221–265 (110–132) | Glow horizontal contrôlé ; aucun blanc brûlé |
| Centre calme | x 223–605 (112–302), y 88–1372 (44–686) | Environ 46 % de la largeur ; pas de détail très contrasté |
| Côté gauche riche | x 0–223 (0–112) | Architecture et conduits, sans empiéter sur le centre |
| Côté droit riche | x 605–828 (302–414) | Architecture complémentaire, non parfaitement symétrique |
| Zone de cartes principales | x 120–708, y 300–1040 | Fond sombre, fréquence de détail basse |
| Bas scrollable | y 1040–1404 (520–702) | Détail modéré, sans objet focal |
| Safe area inférieure | y 1404–1472 (702–736) | Aucun élément essentiel |

La composition doit rester cohérente si le navigateur recadre quelques pixels horizontalement. Aucun élément critique ne dépend du bord extrême.

## Palette et proportions

| Couleur | Rôle | Proportion cible |
|---|---|---:|
| `#0C0717` et noirs aubergine voisins | Fond et centre | 55–65 % |
| `#160D2A` et violets nuit | Architecture | 15–20 % |
| `#8B5CF6` / `#A78BFA` | Identité et halos | 8–12 % |
| `#38BDF8` / `#3B82F6` | Signaux secondaires | 3–6 % |
| `#FFD166` / `#FF7A3D` | Accents rares | 2–5 % |

Au moins 70 % de l’image reste sombre. L’or ne doit jamais devenir un aplat dominant.

## Détails obligatoires

- perspective centrale profonde sans piste jouable explicite ;
- horizon lumineux haut et compact ;
- plusieurs plans lisibles ;
- architecture abstraite sur les côtés ;
- centre calme compatible avec des cartes semi-opaques ;
- détails suffisamment larges pour survivre à 414×736 ;
- continuité visuelle sur toute la hauteur scrollable ;
- séparation claire entre violet identitaire, cyan technologique et or de récompense.

## Détails interdits

- texte, lettres, chiffres, symboles ou logo ;
- humain, visage, personnage ou silhouette humanoïde ;
- pièce, token, monnaie, ticker, chandelier ou courbe financière ;
- portail dominant, porte pleine ou piste centrale explicite ;
- gros objet derrière le header ou les boutons ;
- photoréalisme, cartoon enfantin, saleté cyberpunk, casino ;
- micro-grain, petites étoiles denses ou bruit haute fréquence ;
- bloom blanc brûlé au centre.

## Contrôle multi-échelle

### À 100 %

- vérifier les bords, banding, artefacts, détails incohérents et éventuels pseudo-symboles ;
- confirmer que les plans latéraux ont une logique de profondeur ;
- vérifier qu’aucune ligne ne ressemble accidentellement à une lane.

### À 50 %

- le centre doit rester calme ;
- l’horizon et deux ou trois masses latérales doivent encore structurer l’image ;
- aucun motif ne doit devenir du moiré.

### À 414×736 et 375×667

- header et cartes doivent rester prioritaires avec un voile sombre ;
- aucun contraste parasite derrière la zone x 56–358 logique ;
- les accents latéraux restent visibles sans attirer davantage que les boutons ;
- aucun détail indispensable n’est coupé par les safe areas.

## Primary Prompt

> Create a premium portrait mobile game home background, 828 by 1472 pixels, opaque sRGB, for an arcade blockchain neon adventure. Show a deep nocturnal digital environment with a compact glowing horizon near 16 percent of the image height, layered abstract architecture on the far left and far right, subtle data conduits and chain-like structural rhythms, and strong depth through large clean planes. Keep the central 46 percent of the width calm, dark, low-frequency and free of focal objects so translucent interface cards remain readable while the screen scrolls vertically. Use black aubergine and midnight violet for at least 70 percent of the image, neon violet as the main identity light, cyan as a secondary signal, and only rare gold and orange accents. The top must remain quiet behind a logo and connection control, the lower area must support scrolling content, and the sides may be richer without entering the central safe zone. Crisp stylized geometry, refined dark glass and anodized metal feeling, controlled volumetric glow, no embedded interface.

## Calm Variant Prompt

> Create a calm premium portrait mobile game home background, 828 by 1472 pixels, opaque sRGB. Use a deep black-aubergine digital night, a small violet-gold horizon near 16 percent height, very restrained side architecture, broad dark planes and minimal particles. Preserve an uninterrupted calm central 46 percent width from the top safe area through the lower scroll region. Violet and lavender provide gentle identity, cyan appears only as a few distant signals, and gold-orange accents are extremely rare. The result must remain interesting behind translucent cards without competing with text or buttons, with no explicit playable road and no dominant portal.

## Spectacular Variant Prompt

> Create a more spectacular but still interface-safe portrait mobile game home background, 828 by 1472 pixels, opaque sRGB. Build a deep digital night with layered violet crystal architecture and partial warm arches confined to the outer 27 percent on each side, a luminous horizon near 16 percent height, subtle upward energy and controlled cyan-gold highlights. Preserve the entire central 46 percent as a dark readable corridor and keep the header area quiet. Increase depth, scale and lateral richness rather than central brightness. The scene must feel premium and energetic, never noisy, never like an active race track, and never place a large focal object behind interface cards.

## Negative Prompt

> text, typography, letters, numbers, logos, currency symbols, official emblems, coins, tokens, circular collectibles, trading interface, price chart, candlesticks, ticker, casino imagery, slot machine lighting, human, face, character, mascot, photorealism, childish cartoon, dirty cyberpunk clutter, graffiti, dense stars, micro-detail noise, high-frequency texture, central portal, central vehicle, explicit three-lane road, obstacle, giant object behind buttons, white burned-out center, uniform bright background, heavy fog covering the center, asymmetrical crop of essential elements, watermark, signature

## Checklist d’acceptation

- [ ] 828×1472 exact, opaque, sRGB.
- [ ] Horizon entre y=221 et y=265.
- [ ] Centre x=223–605 calme sur la majorité de la hauteur.
- [ ] Aucun élément essentiel dans les 88 px supérieurs ou 68 px inférieurs du master.
- [ ] Au moins 70 % de tons sombres.
- [ ] Aucun texte, symbole, logo, token ou interface financière.
- [ ] Lisible derrière les composants Home à 375×667 et 414×736.
- [ ] Compatible avec un voile CSS sombre sans perdre toute profondeur.
- [ ] Pas de banding, moiré ou détail inférieur à 2 px à la taille logique.
- [ ] Dérivé 828 dans le budget 350 KiB après traitement.

## Rejet immédiat

- centre lumineux ou détaillé au point de réduire la lisibilité des cartes ;
- piste de runner explicite ;
- logo, texte, symbole monétaire ou objet assimilable à un token ;
- visage ou personnage ;
- horizon blanc brûlé ;
- esthétique casino ou trading ;
- détail essentiel coupé par une safe area ;
- composition uniquement belle en plein écran mais illisible sous l’UI.
