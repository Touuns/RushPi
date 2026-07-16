# Phase 12A-0A — Matrice de sélection des références

Les scores sont qualitatifs : `excellent`, `bon`, `moyen`, `faible`. Ils résultent de l’inspection réelle dans la galerie locale aux viewports 375×667 et 414×736, complétée par les dimensions et notes du manifest.

## Home Background

| candidateAssetId | composition | palette | centerReadability | sideDetail | depth | smallSizeReadability | animationPotential | technicalRisk | strengths | weaknesses | selectedElements | rejectedElements | finalRecommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `home-main` | Axe central équilibré, horizon haut | Violet, or, orange | Excellent | Bon | Bon | Bon | Faible | Faible | Meilleur équilibre général | Plans plats | Perspective, horizon, centre calme | Traits trop fins | **Primary reference** |
| `home-calm` | Très dégagée | Violet nuit, or rare | Excellent | Faible | Moyen | Excellent | Faible | Très faible | Fonctionne derrière une UI dense | Manque de spectacle | Valeurs sombres, glow réduit | Vide latéral excessif | **Secondary reference** |
| `home-variant-crystal` | Architecture latérale verticale | Cyan, violet | Bon | Excellent | Bon | Bon | Moyen | Moyen | Signature froide nette | Peut dominer les cartes latérales | Cristaux et volumes latéraux contrôlés | Pics trop proches du centre | Support reference |
| `home-variant-arc` | Arches chaudes répétées | Orange, or, violet | Bon | Bon | Bon | Bon | Moyen | Moyen | Rythme architectural premium | Répétition derrière le scroll | Quelques arcs périphériques | Arche centrale dominante | Support reference |
| `home-spectacular` | Horizon et rails intenses | Violet, cyan, or | Moyen | Bon | Bon | Bon | Moyen | Élevé | Impact immédiat | Contraste trop fort pour la Home | Quelques accents de variante B | Intensité centrale et bloom large | Rejected as base |

**Recommandation finale :** construire le master sur la profondeur et le calme de `home-main`, régler les valeurs sur `home-calm`, puis ajouter une quantité limitée d’architecture crystal ou arc sur les 27 % latéraux de chaque côté. `home-spectacular` sert seulement de plafond d’intensité pour la variante spectaculaire.

## Daily Market Tunnel

| candidateAssetId | composition | palette | centerReadability | sideDetail | depth | smallSizeReadability | animationPotential | technicalRisk | strengths | weaknesses | selectedElements | rejectedElements | finalRecommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `daily-market-tunnel-main` | Tunnel concentrique et perspective forte | Violet nuit, cyan, or | Bon | Bon | Excellent | Bon | Excellent | Moyen | Meilleure monumentalité | Motifs lointains potentiellement bruyants | Horizon, anneaux lointains, profondeur | Grille répétitive au centre | **Primary reference** |
| `daily-market-tunnel-cyan` | Corridor central très propre | Cyan, bleu, violet | Excellent | Bon | Bon | Bon | Bon | Faible | Séparation lane/background claire | Uniformité froide | Signaux cyan, panneaux latéraux | Aplat cyan uniforme | **Secondary reference** |
| `daily-market-tunnel-amber` | Architecture chaude par paliers | Ambre, orange, violet | Bon | Bon | Moyen | Bon | Bon | Faible | Accent récompense/vitesse | Moins profond | Nœuds et accents or/ambre rares | Dominante orange généralisée | Support reference |

**Recommandation finale :** conserver la profondeur et l’horizon de `daily-market-tunnel-main`, emprunter la discipline cyan de `daily-market-tunnel-cyan` et réserver l’ambre de `daily-market-tunnel-amber` à moins de 10 % de l’image.

## Chain Block

| candidateAssetId | composition | palette | centerReadability | sideDetail | depth | smallSizeReadability | animationPotential | technicalRisk | strengths | weaknesses | selectedElements | rejectedElements | finalRecommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `chain-block-base-md` | Hexagone compact, trois nœuds | Or, violet, cyan | Excellent | Bon | Bon | Bon | Excellent | Faible | Identité complète et non circulaire | Traits internes fragiles à 32 px | Silhouette, noyau, connexions | Traits secondaires trop fins | **Primary reference** |
| `chain-block-base-sm` | Hexagone épais simplifié | Or, orange, blanc | Excellent | Faible | Faible | Excellent | Faible | Meilleure lecture à 32 px | Trop plat au master | Épaisseur, hiérarchie simple | Face pleine sans profondeur | **Secondary reference** |
| `chain-block-prism` | Polyèdre pentagonal | Bleu, violet, or | Bon | Bon | Excellent | Bon | Bon | Moyen | Facettes convaincantes | Proche d’un bouclier | Quelques facettes internes | Silhouette pentagonale dominante | Support reference |
| `chain-block-core` | Hexagone radial | Magenta, orange, blanc | Excellent | Moyen | Bon | Excellent | Excellent | Moyen | Noyau très lisible | Corail proche du danger | Éclairage du noyau | Dominante magenta/corail | Support reference |
| `chain-block-lattice` | Carré arrondi et réseau | Menthe, cyan | Bon | Bon | Moyen | Bon | Bon | Moyen | Réseau immédiatement visible | Proche d’un power-up | Logique de connexions | Contour mou et palette principale | Rejected as base |
| `chain-block-energized` | Badge avec éclair | Or, violet | Excellent | Bon | Bon | Excellent | Excellent | Moyen | État chargé lisible | Symbole trop explicite | Rayons comme FX séparé | Éclair dans le standard | State-only reference |
| `chain-block-magnetized` | Hexagone avec orbites | Orange, violet, cyan | Bon | Excellent | Bon | Bon | Excellent | Moyen | État Magnet clair | Trop chargé au repos | Orbites comme état | Orbites permanentes | State-only reference |
| `chain-block-pickup-burst` | Burst radial | Or, orange, blanc | Excellent | Bon | Faible | Bon | Excellent | Faible | Réception immédiate | Pas un sprite persistant | Fragments/rayons de collecte | Burst dans le master | FX-only reference |

**Recommandation finale :** silhouette et connexions de `chain-block-base-md`, réduction de détail dictée par `chain-block-base-sm`, facettes limitées inspirées de `chain-block-prism` et noyau lumineux inspiré de `chain-block-core`. Le résultat ne doit jamais devenir une pièce ou un disque.

## Finish Portal

| candidateAssetId | composition | palette | centerReadability | sideDetail | depth | smallSizeReadability | animationPotential | technicalRisk | strengths | weaknesses | selectedElements | rejectedElements | finalRecommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `portal-finish` | Arche verticale ouverte | Orange, violet, or | Excellent | Bon | Bon | Excellent | Excellent | Faible | Meilleure structure traversable | Base trop légère | Arche, ouverture, asymétrie | Épaisseur uniforme | **Primary reference** |
| `portal-success` | Arche ouverte avec énergie ascendante | Or, blanc, violet | Excellent | Bon | Bon | Excellent | Excellent | Moyen | Signal de réussite évident | Blanc potentiellement brûlé | Montée lumineuse, étincelles rares | Centre blanc opaque | **Secondary reference** |
| `fx-portal-halo` | Halo elliptique séparé | Violet, lavande | Excellent | Faible | Bon | Bon | Excellent | Moyen | Couche arrière propre | Ne structure rien seul | Glow arrière séparé | Halo coupé ou opaque | Support reference |
| `fx-validation-spark` | Spark ponctuel | Blanc, menthe | Excellent | Faible | Faible | Excellent | Excellent | Faible | Accent final net | Trop fort s’il est central | 2–4 accents secondaires | Gros spark central | Support reference |
| `fx-speed-trail` | Traits verticaux | Bleu électrique | Bon | Faible | Bon | Faible | Excellent | Faible | Mouvement ascendant | Trop sombre et fin | Quelques streaks épais | Multiplication de traits fins | Limited support |

**Recommandation finale :** structure `portal-finish`, lumière ascendante `portal-success`, halo arrière séparé `fx-portal-halo`, quelques accents inspirés de `fx-validation-spark`. L’ouverture reste vide et le texte `FINISH` demeure un élément runtime Phaser.

## Décision synthétique

| Production | Référence principale | Référence secondaire | Références de soutien |
|---|---|---|---|
| Home Background | `home-main` | `home-calm` | `home-variant-crystal`, `home-variant-arc` |
| Daily Market Tunnel | `daily-market-tunnel-main` | `daily-market-tunnel-cyan` | `daily-market-tunnel-amber` |
| Chain Block | `chain-block-base-md` | `chain-block-base-sm` | `chain-block-prism`, `chain-block-core` |
| Finish Portal | `portal-finish` | `portal-success` | `fx-portal-halo`, `fx-validation-spark`, `fx-speed-trail` |
