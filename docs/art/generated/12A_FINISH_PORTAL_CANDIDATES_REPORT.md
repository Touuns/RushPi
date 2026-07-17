# Phase 12A-0B-P4 — Finish Portal candidates

Trois candidates indépendantes ont été générées avec le mode intégré OpenAI `imagegen`. Les sources natives opaques `1024×1536` ont été produites sur fond chromatique uniforme, puis extraites avec le helper officiel du workflow `imagegen`. Les masters finaux sont des PNG sRGB `512×768` à alpha réel. La décision humaine finale sélectionne Primary pour le processing de production, conserve Technological et Monumental comme alternatives non sélectionnées, et maintient `integrationAllowed` à `false`.

## Traitement commun

- Extraction : détection automatique de la couleur de bord, matte douce, despill et contraction d’un pixel.
- Normalisation : trim alpha, redimensionnement uniforme sans étirement, centrage horizontal et alignement de la base à `y=676` sur un canvas transparent `512×768`.
- Contrôles : alpha sur aubergine, gris clair et magenta; bounding box; pivot `(256,676)`; ouverture; réduction `256×384`; silhouette; Daily Primary v2; TrackGate documentaire à l’horizon, à mi-piste et sur la ligne joueur.
- La piste, les trois lanes, le joueur, Chain Block Primary, l’obstacle, le texte `FINISH` et le flash/halo restent des couches documentaires séparées.
- Aucun fichier n’a été ajouté sous `public/assets/rushpi/` et aucune logique runtime n’a été modifiée.

## Primary

- Prompt final réellement utilisé : arche technologique très haute et étroite, deux piliers violets fins, pont supérieur or peu profond, accents cyan contenus, passage central entièrement vide, largeur de structure proche de 54 % du canvas et ouverture d’au moins 32 % × 62 %.
- Outil : `imagegen` intégré; extraction chromatique locale.
- Tentatives : 2; rejet : 1. Le premier essai était trop large et trop court pour conserver une ouverture de 430 px après mise aux marges sans déformation.
- Dimension native/finale : `1024×1536` → `512×768`; redimensionnement uniforme.
- Master : 124 453 octets; preview 256 : 8 968 octets.
- Alpha bounds : `x=86, y=92, 340×585`.
- Marges : gauche/droite `16,80 %`, haut `11,98 %`, bas `11,85 %`.
- Centre de masse alpha : `(255,349;389,107)`.
- Pivot/base : `(256,676)`, base à `y=676`.
- Ouverture : `x=174, y=154, 164×430`, transparente à `100 %`.
- Alpha : propre; aucun pixel semi-transparent sur les bords; halo non coupé.
- Lisibilité : excellente à `512×768` et immédiate à `256×384`; les deux montants et le pont or restent séparés.
- Horizon / mi-piste / ligne joueur : silhouette stable; passage préservé; joueur au depth supérieur et toujours visible.
- Daily Primary v2 / Chain Block Primary : contraste violet-or clair, aucune fusion avec le décor ou le collectible.
- TrackGate : pivot compatible avec le déplacement horizon → joueur; le beam, le flash et `FINISH` restent séparés.
- Défaut : sommet moins cérémoniel que Monumental.
- Décision humaine finale : `approved-for-processing`, recommandation `selected-for-production-processing`. Primary est sélectionnée comme Finish Portal Daily de production.

## Technological

- Prompt final réellement utilisé : gate de précision très haut, deux piliers angulaires minces, pont violet étroit, joints or et petits nœuds cyan uniquement sur les surfaces externes, passage vide continu.
- Outil : `imagegen` intégré; extraction chromatique locale.
- Tentatives : 2; rejet : 1. Le premier essai ne permettait pas une ouverture haute de 430 px tout en conservant les marges latérales.
- Dimension native/finale : `1024×1536` → `512×768`; redimensionnement uniforme.
- Master : 141 092 octets; preview 256 : 10 696 octets.
- Alpha bounds : `x=105, y=27, 302×650`.
- Marges : gauche/droite `20,51 %`, haut `3,52 %`, bas `11,85 %`.
- Centre de masse alpha : `(244,174;357,386)`.
- Pivot/base : `(256,676)`, base à `y=676`.
- Ouverture : `x=174, y=154, 164×430`, transparente à `100 %`.
- Alpha : propre; aucun pixel semi-transparent sur les bords; glow contenu.
- Lisibilité : très nette à 512 et 256; meilleure finesse structurelle de la série.
- Horizon / mi-piste / ligne joueur : lisible et distinct d’un obstacle; la perspective asymétrique reste visible à proximité.
- Daily Primary v2 / Chain Block Primary : accents cyan limités, silhouette très différente du collectible compact.
- TrackGate : pivot et croissance progressive compatibles; ouverture conservée derrière le joueur et les FX.
- Défaut : centre de masse décalé de 11,8 px vers la gauche par la perspective.
- Décision humaine finale : `needs-review`, recommandation `retained-as-technical-fallback`. Technological est conservée comme fallback technique léger et n’est pas sélectionnée pour le processing principal.

## Monumental

- Prompt final réellement utilisé : arche cérémonielle futuriste très haute, tours violettes minces, rails or internes et couronne compacte, prestige obtenu par la hauteur plutôt que par la masse.
- Outil : `imagegen` intégré; extraction chromatique locale.
- Tentatives : 3; rejets : 2. Le premier essai était trop large et trop court; le second conservait des piliers trop épais et une ouverture finale inférieure à 164 px.
- Dimension native/finale : `1024×1536` → `512×768`; redimensionnement uniforme.
- Master : 176 029 octets; preview 256 : 13 840 octets.
- Alpha bounds : `x=49, y=57, 413×620`.
- Marges : gauche `9,57 %`, droite `9,77 %`, haut `7,42 %`, bas `11,85 %`.
- Centre de masse alpha : `(255,355;374,448)`.
- Pivot/base : `(256,676)`, base à `y=676`.
- Ouverture : `x=174, y=220, 164×430`, transparente à `100 %`. La couronne empiète sur la zone recommandée haute, mais pas sur l’ouverture minimale mesurée.
- Alpha : propre; aucun pixel semi-transparent sur les bords; halo non coupé.
- Lisibilité : forte à 512 et 256; la couronne donne la meilleure sensation d’accomplissement.
- Horizon / mi-piste / ligne joueur : silhouette identifiable; les pointes latérales deviennent secondaires à l’horizon; joueur visible au-dessus.
- Daily Primary v2 / Chain Block Primary : excellente séparation d’échelle et de fonction, sans ressemblance avec un token ou un obstacle.
- TrackGate : pivot compatible et centre traversable; destruction visuelle propre possible après passage, sans modifier la logique existante.
- Défaut : couronne et pointes plus décoratives, structure plus proche des limites latérales.
- Décision humaine finale : `needs-review`, recommandation `retained-as-ceremonial-alternative`. Monumental est conservée comme alternative cérémonielle ou pour un futur usage spécial et n’est pas sélectionnée pour le processing principal.

## Tests documentaires

- Horizon : les trois arches restent centrées et reconnaissables; Technological est la plus fine, Primary la plus équilibrée.
- Mi-piste : ouverture, piliers et séparation avec Chain Block Primary restent clairs.
- Ligne joueur : le joueur reste au depth supérieur; aucune base ne ferme le passage.
- Obstacle : aucune candidate n’emploie le losange corail ou une masse fermée.
- Token / Shield : les silhouettes verticales ouvertes excluent une lecture de collectible rond.
- TrackGate : pivot `(0.5,0.88)`, changement d’échelle, centre traversable, texte `FINISH`, beam/flash séparés et disparition après passage sont compatibles documentairement.
- Viewports `375×667` et `414×736` : la grille passe en une colonne; les simulations conservent leur ratio et leurs couches dans le viewport.

### Dette de validation responsive

- Les tests responsive structurels sont réussis pour `375×667` et `414×736`.
- Les captures Chrome headless ont échoué parce que l’ancre était capturée avant la fin du rendu asynchrone, produisant un fond vide non exploitable.
- Une capture visuelle entièrement chargée dans chacun de ces deux viewports devra être refaite pendant 12A-0C ou avant toute intégration.

## Conclusion

Primary est sélectionnée pour le processing de production avec le statut `approved-for-processing` et la recommandation `selected-for-production-processing`.

Technological reste `needs-review` et est conservée comme fallback technique léger avec la recommandation `retained-as-technical-fallback`. Monumental reste `needs-review` et est conservée comme alternative cérémonielle ou pour un futur usage spécial avec la recommandation `retained-as-ceremonial-alternative`.

Aucune candidate n’est `approved-for-integration`. `integrationAllowed` reste `false`; aucune intégration Phaser, React, gameplay ou runtime n’est autorisée par cette phase.
