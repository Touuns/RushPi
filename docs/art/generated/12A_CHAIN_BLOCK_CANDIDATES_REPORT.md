# Phase 12A-0B-P3 — Chain Block candidates

Trois candidates indépendantes ont été générées avec OpenAI `imagegen`, sur fond chromatique uniforme puis extraites avec le helper officiel du workflow `imagegen`. Les masters sont des PNG sRGB `512×512` à alpha réel. La décision humaine finale sélectionne Primary pour le processing, conserve Core comme fallback robuste et rejette Prism. `integrationAllowed` reste `false`.

## Traitement commun

- Sources natives : `1254×1254`, opaques sur fond uniforme `#00ff00`.
- Extraction : détection de la couleur de bord, matte douce, despill et contraction de bord d’un pixel.
- Normalisation : trim alpha, mise à l’échelle uniforme, centrage sur canvas transparent `512×512`; aucune déformation.
- Contrôles : fond aubergine `#0C0717`, fond gris clair, bounding box, pivot, réductions 128/64/32, silhouette monochrome et simulation Daily Primary v2.
- Aucun dérivé n’est placé dans l’arbre runtime.

## Primary

- Prompt : polyèdre blockchain violet compact, facettes sombres, bord or, noyau chaud et trois connexions intégrées; maximum trois niveaux de détail; aucune forme circulaire ou symbolique.
- Tentatives : 1; rejet : 0.
- Master : 169 893 octets.
- Alpha bounds : `x=81, y=63, 350×385`.
- Marges : gauche/droite `15,82 %`, haut `12,30 %`, bas `12,50 %`.
- Centre de masse alpha : `(251,557; 257,163)`; pivot logique `(256;256)`.
- Alpha : propre, pixels transparents aux quatre bords, aucun glow coupé ni ombre rectangulaire.
- 128 px : silhouette, noyau et connexions parfaitement séparés.
- 64 px : lecture immédiate; le noyau conserve sa structure.
- 32 px : silhouette et noyau lisibles; les extensions deviennent secondaires mais restent angulaires.
- Comparaison : nettement différent du token circulaire, du losange corail, du Shield cyan, de la Life Orb verte et du joueur rond.
- Daily Primary v2 : fort contraste or/violet sans fusion avec l’architecture.
- Magnet/collecte : les halos simulés restent extérieurs à la silhouette et ne la transforment pas en pièce.
- Défaut : légère complexité des trois extensions à 32 px.
- Décision finale : `approved-for-processing`, sélectionnée comme futur Chain Block de production.

## Prism

- Prompt : polyèdre violet à six côtés, bord or, trois grandes facettes prismatiques, noyau chaud et deux connexions intégrées.
- Tentatives : 2; rejet : 1, première génération trop haute pour respecter les quatre marges sans déformation.
- Master : 210 753 octets.
- Alpha bounds : `x=72, y=72, 368×368`.
- Marges : `14,06 %` sur chaque côté.
- Centre de masse alpha : `(255,427;255,039)`.
- Alpha : propre et parfaitement centré; glow contenu.
- 128/64 px : facettes très lisibles.
- 32 px : noyau visible et contour continu.
- Comparaison : distinct de l’obstacle, du Shield, de la Life Orb et du joueur; risque face au token, car l’octogone cerclé d’or peut évoquer un médaillon.
- Daily/Magnet/collecte : lisible, mais plusieurs exemplaires simultanés renforcent le risque “pluie de monnaie”.
- Défaut : silhouette trop proche d’un badge ou d’une pièce.
- Décision finale : `rejected`, conservée uniquement comme référence historique. Elle ne doit jamais être utilisée comme collectible Daily.

## Core

- Prompt : bloc violet compact, contour or épais, noyau chaud contenu derrière de grandes facettes sombres et connexions en creux.
- Tentatives : 2; rejet : 1, première génération trop horizontale avec des cubes satellites.
- Master : 198 378 octets.
- Alpha bounds : `x=65, y=81, 381×350`.
- Marges : gauche `12,70 %`, droite `12,89 %`, haut/bas `15,82 %`.
- Centre de masse alpha : `(254,653;252,820)`.
- Alpha : propre, sans frange visible sur fond sombre ou clair.
- 128 px : volume et noyau très nets.
- 64 px : meilleure lecture volumétrique des trois.
- 32 px : noyau le plus visible; silhouette rectangulaire angulaire stable.
- Comparaison : très distinct du token, du losange, des orbes et du joueur.
- Daily/Magnet/collecte : excellente stabilité, halos lisibles.
- Défaut : volume visuellement plus lourd, proche d’un coffre technique.
- Décision finale : `needs-review`, conservée comme fallback robuste, notamment à 32 px; non sélectionnée pour le processing principal.

## Conclusion finale

- Primary est sélectionnée pour le processing de production avec le statut `approved-for-processing`.
- Core reste `needs-review` et est conservée comme fallback robuste, particulièrement pour sa lisibilité à 32 px.
- Prism est `rejected` à cause du risque de confusion avec une pièce, un médaillon ou un token. Elle reste une référence historique uniquement.
- Aucune candidate n’est `approved-for-integration` et aucune intégration runtime n’est autorisée.
- `integrationAllowed` reste `false`.

La transparence des trois masters a été obtenue par extraction chromatique contrôlée : fond uniforme, détection de couleur de bord, matte douce, despill et contraction de bord. Pendant la Phase 12A-0C, un contrôle final des franges devra être réalisé sur fonds noir, blanc et magenta avant tout traitement destiné au runtime.
