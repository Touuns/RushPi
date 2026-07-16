# Phase 12A-0A — Audit de la fondation artistique existante

Statut : audit de préparation, aucun asset de production généré

Base inspectée : `00ed0734fdc023c9ca50a3691f3e631557b90018`

Date d’inspection : 2026-07-16

## Méthode et niveau de preuve

Les 56 entrées de `public/assets/rushpi/asset-manifest.json` ont été inventoriées. Les familles Home, Daily, Chain Block, Portal, FX et blockchain mechanics ont été ouvertes dans la galerie locale. Les comparaisons Home et Chain Block ont été contrôlées à 375×667 ; les comparaisons Daily, Portal et player orb à 414×736. Les images ont toutes été chargées sans erreur et la galerie n’a présenté aucun débordement horizontal.

Ce document distingue :

- **Vu dans la galerie** : composition, silhouette, contraste relatif, densité et lisibilité apparente.
- **Vérifié dans le code ou le manifest** : dimensions, groupes SVG, logique de piste, couleurs, pivots et budgets existants.
- **Inféré pour la production** : comportement attendu d’un futur raster texturé, qui devra être vérifié après génération.

Les SVG actuels sont des concepts directionnels. Leur bonne lecture dans la galerie ne constitue ni une validation de production, ni une preuve de performance après conversion raster.

## Résumé des 56 assets

| Catégorie | Nombre | Rôle actuel |
|---|---:|---|
| Backgrounds | 8 | 5 concepts Home et 3 concepts Daily |
| Concepts | 8 | Kits visuels des zones Survival |
| Portals | 6 | Structures de gates génériques |
| Collectibles | 8 | Chain Blocks, états et burst |
| FX | 10 | Effets additifs et overlays |
| Placeholders | 5 | Cadres et fallbacks de tokens |
| UI | 4 | Décors répétables ou latéraux |
| Mechanics | 6 | Formes pédagogiques blockchain et coque joueur |
| Metadata | 1 | Contrat d’animation |
| **Total** | **56** | Fondation indépendante du gameplay |

Les 56 entrées sont présentes, mais seuls quatre nouveaux assets sont visés par 12A : Home Background, Daily Market Tunnel, Chain Block et Finish Portal. Les autres familles restent utiles pour contrôler le vocabulaire visuel, les collisions de silhouette et les futurs effets.

## Familles pertinentes pour 12A

- `home-backgrounds` : composition UI, profondeur et niveau d’intensité.
- `daily-market-tunnel` : perspective, centre jouable et ambiance de course.
- `chain-block-kit` : silhouette du collectible et états secondaires.
- `portal-gate-kit` : structure, ouverture et différenciation avec les obstacles.
- `fx-kit` : halo, validation, vitesse et réception du portail.
- `blockchain-mechanics-foundation` : cohérence du joueur et vocabulaire générique sans marque.

## Forces de la fondation actuelle

1. La palette violet/or/cyan/orange est déjà cohérente entre React, Phaser et les concepts.
2. Les backgrounds partagent un horizon haut, une perspective centrale et une zone médiane sombre.
3. Les Chain Blocks sont angulaires et ne ressemblent pas aux tokens circulaires du Daily.
4. Les portails possèdent une ouverture claire et des groupes animation-ready.
5. Les assets sont sans texte rendu, sans image externe et sans logo officiel.
6. La galerie permet une comparaison rapide aux dimensions mobiles.
7. Les fallbacks Phaser décrivent déjà les distinctions fonctionnelles : rond = token/power-up, losange = danger, bloc angulaire = Chain Block.

## Limites des SVG conceptuels

- Les backgrounds sont volontairement plats : grandes surfaces, peu de matière et faible richesse des plans.
- La profondeur repose surtout sur quelques lignes convergentes ; elle ne suffit pas encore à un rendu premium.
- Certains éléments sont trop fins ou trop proches en valeur pour survivre à une réduction ou à un écran peu lumineux.
- Les halos sont symboliques et ne préjugent pas du comportement d’un bloom raster.
- Les objets 64×64 démontrent une silhouette, mais pas encore un alpha de production, un éclairage cohérent ou une hiérarchie de micro-détails.
- L’animation de respiration de la galerie est une aide de présentation, pas une spécification d’animation du jeu.
- Les SVG ne démontrent ni compression WebP, ni franges alpha, ni coût mémoire GPU.

## Éléments réutilisables tels quels

- Le manifest, la galerie, l’audit et les concepts restent réutilisables comme outils de direction et de comparaison.
- La palette technique de `src/game/theme.ts` reste la référence de cohérence.
- Le player orb procédural avec le glyphe typographique `π` reste l’identité runtime actuelle.
- Les systèmes Phaser de piste, BackgroundFX, TrackGate, halos, particules et fallbacks procéduraux doivent rester disponibles lors de toute intégration future.

Aucun SVG de cette fondation n’est déclaré prêt à remplacer directement le rendu runtime pendant 12A-0A.

## Éléments utilisables uniquement comme références

- Tous les Home et Daily SVG : références de composition et de palette.
- Les Chain Blocks : références de silhouette, de noyau et d’états.
- Les portails et FX : références de structure et de séparation des couches.
- `mechanics-player-orb-shell` : référence de contour joueur et d’effets optionnels, pas remplacement du glyphe `π`.

## Audit des assets pertinents

### Home

| Asset | Rôle | Qualité conceptuelle observée | Lisibilité mobile observée | Valeur comme référence | Faiblesse principale | Recommandation |
|---|---|---|---|---|---|---|
| `home-main` | Base Home équilibrée | Bonne : perspective nette, rails latéraux violet/or, architecture discrète | Bonne ; centre très sombre et calme | Très élevée pour structure et horizon | Plans encore plats et peu texturés | **keep as reference** |
| `home-variant-crystal` | Variante froide | Bonne identité cyan/violet, côtés reconnaissables | Bonne au centre ; cristaux latéraux lisibles | Élevée pour richesse latérale froide | Dominante froide moins liée à la récompense or | keep as reference |
| `home-variant-arc` | Variante chaude | Arche répétée et accent orange/or chaleureux | Bonne ; ouverture centrale conservée | Élevée pour rythme architectural | Les arcs peuvent devenir trop présents derrière le scroll | keep as reference |
| `home-calm` | Variante UI dense | Très sobre, faible bloom et centre extrêmement stable | Excellente sous des cartes | Très élevée pour niveau de contraste minimal | Manque de spectacle et de signature latérale | **use as fallback** |
| `home-spectacular` | Variante forte | Horizon et lignes colorées plus expressifs | Centre encore libre, mais contraste latéral supérieur | Moyenne pour une variante événementielle | Peut concurrencer le header et les cartes | not selected for 12A |

### Daily Market Tunnel

| Asset | Rôle | Qualité conceptuelle observée | Lisibilité mobile observée | Valeur comme référence | Faiblesse principale | Recommandation |
|---|---|---|---|---|---|---|
| `daily-market-tunnel-main` | Base Daily | Meilleure sensation de tunnel grâce aux anneaux et au motif distant | Bonne ; corridor central sombre | Très élevée pour perspective et profondeur | Motif de fond potentiellement trop régulier après texturage | **keep as reference** |
| `daily-market-tunnel-cyan` | Variante analytique | Lecture froide et technologique claire | Excellente séparation du centre | Élevée pour signaux cyan et géométrie latérale | Uniformité cyan, récompense or peu présente | keep as reference |
| `daily-market-tunnel-amber` | Variante chaude | Bonne identité récompense/vitesse sur les côtés | Bonne ; centre protégé | Élevée pour accents ambre/orange | Profondeur moins monumentale que `main` | keep as reference |

### Chain Blocks

| Asset | Rôle | Qualité conceptuelle observée | Lisibilité mobile observée | Valeur comme référence | Faiblesse principale | Recommandation |
|---|---|---|---|---|---|---|
| `chain-block-base-sm` | Silhouette 32 px | Très simple, hexagone épais et centre clair | Excellente à petite taille | Très élevée pour simplification | Trop plat pour le master | **use as fallback** |
| `chain-block-base-md` | Design standard | Hexagone, noyau lumineux et trois connexions bien identifiables | Très bonne à 64 px | Maximale pour le futur standard | Noyau et traits fins à simplifier en 32 px | **keep as reference** |
| `chain-block-prism` | Variante facettée | Polyèdre distinct, lecture de profondeur convaincante | Bonne à 64 px | Élevée pour facettes | Silhouette pentagonale plus proche d’un bouclier | keep as reference |
| `chain-block-lattice` | Variante réseau | Connexions et nœuds immédiatement visibles | Bonne, mais contour irrégulier | Moyenne pour le langage de réseau | Cyan/menthe proche d’un power-up technologique | not selected for 12A |
| `chain-block-core` | Variante noyau | Noyau radial fort, silhouette hexagonale stable | Très bonne à 64 px | Élevée pour éclairage interne | Magenta/corail trop proche du danger si surutilisé | keep as reference |
| `chain-block-energized` | État chargé | Énergie et rays lisibles | Bonne à 64 px | Élevée pour un futur état/FX | Éclair central en forme de symbole trop dominant pour le standard | not selected for 12A |
| `chain-block-magnetized` | État Magnet | Anneaux orbitaux distincts et noyau stable | Bonne à 64 px | Élevée pour un état temporaire | Trop chargé pour le collectible standard | not selected for 12A |
| `chain-block-pickup-burst` | FX de collecte | Burst très lisible, fragments et rayons séparables | Bonne à 96 px | Élevée pour réception, pas pour le sprite | Ce n’est pas une silhouette persistante | rasterize later |

### Finish Portal et FX associés

| Asset | Rôle | Qualité conceptuelle observée | Lisibilité mobile observée | Valeur comme référence | Faiblesse principale | Recommandation |
|---|---|---|---|---|---|---|
| `portal-finish` | Structure finish | Arche ouverte, asymétrie violet/orange, centre traversable | Très bonne à 256×384 | Maximale pour structure et ouverture | Base visuelle encore très légère | **keep as reference** |
| `portal-success` | État de réussite | Montée or/blanc et étincelles lisibles | Très bonne | Maximale pour lumière ascendante | Valeur blanche à contenir pour éviter le burn-out | keep as reference |
| `fx-portal-halo` | Halo arrière | Anneau doux avec centre libre | Bonne sur damier sombre | Élevée pour couche séparée | Trop diffus seul, risque de découpe aux bords | rasterize later |
| `fx-validation-spark` | Accent de réussite | Spark très lisible et immédiatement positif | Excellente à 128 px | Moyenne comme accent ponctuel | Ne doit pas devenir un objet central concurrent | rasterize later |
| `fx-speed-trail` | Vitesse verticale | Traits bleus subtils | Faible à moyenne dans la capture | Moyenne pour énergie ascendante secondaire | Trop fin et sombre à petite taille | not selected for 12A |

### Joueur

| Asset | Rôle | Qualité conceptuelle observée | Lisibilité mobile observée | Valeur comme référence | Faiblesse principale | Recommandation |
|---|---|---|---|---|---|---|
| `mechanics-player-orb-shell` | Coque générique et groupes d’états | Anneaux violets propres, centre transparent | Très bonne à 128 px | Élevée pour vérifier la séparation avec Chain Block/Portal | Ne porte pas le glyphe typographique `π` et n’est pas intégré | keep as reference |

## Risques de performance mobile

- Un background 828×1472 non compressé peut dépasser plusieurs mégaoctets en mémoire décodée ; le WebP runtime doit rester sous 350 KiB.
- Les grands halos transparents augmentent l’overdraw, surtout avec les particules Phaser déjà actives.
- L’ajout d’un fond Daily très lumineux aux chevrons, à la piste, aux tokens et aux événements additifs peut saturer le fill-rate.
- Des sprites avec de grandes marges alpha consomment texture et bande passante sans améliorer la silhouette.
- Les états animés doivent privilégier les effets Phaser existants ou de petites couches séparées, pas une succession de grandes frames.

## Risques de lisibilité

- Une ligne de fond convergeant comme une boundary de lane peut être interprétée comme une piste.
- Un objet circulaire lumineux dans le Daily peut être confondu avec un token.
- Un losange ou pentagone agressif peut être confondu avec l’obstacle.
- Une forte lumière autour de y=80 % masque le joueur et ses auras.
- Les détails de Chain Block inférieurs à 2 px à 32 px disparaîtront ou scintilleront.
- Un portail trop plein ou trop bas masquera le player orb au moment du passage.

## Cohérence Home / Daily

La cohérence doit venir de la nuit aubergine, du violet identitaire, de l’horizon lumineux et des accents or/cyan. La distinction doit venir de la fonction :

- **Home** : architecture posée, centre UI stable, pas de piste explicite, mouvement seulement suggéré.
- **Daily** : tunnel monumental, convergence forte, signaux latéraux, vitesse et profondeur, mais corridor jouable protégé.

Réutiliser exactement le même rail central ou le même niveau de glow dans les deux écrans créerait une confusion. Le Home doit être plus calme et plus architectural ; le Daily plus directionnel et cinétique.

## Fallbacks procéduraux à conserver

- Le fond CSS aubergine et ses deux gradients radiaux dans `.app-frame`.
- Le fond caméra `PALETTE.bg`.
- `BackgroundFX` et son émetteur de particules à densité progressive.
- `TrackVisuals` : surface, trois lanes, horizon, chevrons, drift et projection.
- `makeChainBlock()` : carré arrondi or/violet et liens internes.
- `TrackGate` : beam, posts, arche, label runtime et callback de franchissement.
- Le player orb procédural, le glyphe `π`, les auras Shield/Magnet/Charge et le trail.

Une future intégration doit charger les nouveaux fichiers derrière une clé stable et revenir à ces systèmes si un asset manque, échoue au décodage, dépasse le budget ou nuit à la lisibilité.

## Conclusion

La fondation est suffisamment cohérente pour lancer une production contrôlée, mais pas pour une intégration directe. Les quatre productions doivent combiner plusieurs références plutôt que reproduire un SVG unique. La priorité absolue est la lisibilité fonctionnelle aux tailles mobiles, suivie de la cohérence palette, puis du niveau de finition.
