# Rush Pi — Direction artistique

## 1. Contexte

Rush Pi est un runner mobile portrait construit avec React, TypeScript et Phaser. Son expérience se décline en Daily Run (course classée de 60 secondes), Survival (voyage long à travers huit zones) et Campaign (progression par niveaux). La fondation artistique décrite ici prépare des ressources interchangeables sans modifier les règles, les collisions, le scoring ou les flux Pi.

La signature retenue est **Arcade blockchain neon adventure** : une course futuriste dans une infrastructure numérique abstraite, premium, rapide et lisible. Les formes évoquent les blocs, les chaînes, les flux de données et les marchés sans reproduire de marque, de logo ou d’interface financière réelle.

## 2. Direction générale

- Silhouettes géométriques nettes, profondeur forte et perspective centrale.
- Fond nocturne très sombre, enrichi sur les bords et à l’horizon.
- Énergie lumineuse violette, dorée, cyan, orange et bleu électrique.
- Matières stylisées : verre sombre, métal anodisé, lumière volumétrique abstraite.
- Spectacle produit par le contraste, le mouvement et les couches, jamais par l’accumulation au centre.
- Aucun photoréalisme, aucun cartoon enfantin, aucune texture sale ou bruitée à l’excès.
- Aucun texte embarqué dans une image. Aucun logo officiel de blockchain ou de token.

## 3. Palette principale

| Rôle | Couleur | Hex | Usage |
|---|---|---:|---|
| Nuit digitale | Aubergine noire | `#0C0717` | Fond dominant |
| Surface élevée | Violet nuit | `#160D2A` | Panneaux, piste, profondeur |
| Identité | Violet néon | `#8B5CF6` | Joueur, portails, accents |
| Lumière douce | Lavande | `#A78BFA` | Halos, reflets secondaires |
| Récompense | Or clair | `#FFD166` | Collectibles, validation |
| Vitesse | Orange énergie | `#FF7A3D` | Trails, rails, accélération |
| Signal | Cyan | `#38BDF8` | Technologie, bouclier, data |
| Danger | Corail électrique | `#FF4D6D` | Échec, storm, obstacles |

Les fonds utilisent au moins 70 % de tons sombres. Les couleurs lumineuses servent de hiérarchie, pas de remplissage uniforme.

## 4. Palette secondaire

| Usage | Hex |
|---|---:|
| Bleu électrique | `#3B82F6` |
| Cyan profond | `#22D3EE` |
| Émeraude rapide | `#34D399` |
| Menthe stable | `#A7F3D0` |
| Rose circuit | `#FF6EC7` |
| Indigo tunnel | `#312E81` |
| Blanc froid | `#F4F1FB` |
| Gris lavande | `#B7AED0` |

Une scène emploie une dominante, une couleur de soutien et une couleur de récompense. Le rouge/corail reste réservé au danger ou à l’échec.

## 5. Lisibilité mobile

- Référence de composition : `414×736`, vérification minimale à `375×667`.
- Conserver la piste centrale et la zone du joueur dans une plage de contraste stable.
- Réserver environ 44 px en haut et 34 px en bas aux zones sûres système ; ne jamais placer un détail indispensable contre un bord.
- Les détails importants doivent rester reconnaissables à 24–48 px. Tester les collectibles à 32 px.
- Éviter les motifs à fréquence élevée, le grain fin et les traits inférieurs à 2 px à la taille cible.
- Limiter les halos superposés : une silhouette claire prime sur un bloom spectaculaire.
- Prévoir une version calme de chaque fond pour les écrans riches en UI.
- Vérifier les silhouettes en niveaux de gris et avec luminosité d’écran réduite.

## 6. Composition

La perspective converge vers un horizon situé près de 16 % de la hauteur, cohérent avec le rendu Phaser actuel. Le centre contient une piste en trapèze, un halo d’horizon et peu de décor. Les côtés portent les architectures, blocs flottants, conduits et flux. Les avant-plans latéraux peuvent être plus grands et plus contrastés, mais ne doivent jamais masquer une lane.

Les plans recommandés sont : ciel numérique sombre, architecture lointaine, horizon lumineux, piste jouable, décor latéral, FX de premier plan. Chaque plan doit pouvoir être exporté séparément lorsque du parallax est prévu.

## 7. Références de style décrites

- Tunnel d’arcade abstrait construit avec des rails de lumière et des volumes polygonaux.
- Carte mère monumentale transformée en paysage, sans composants ou marques reconnaissables.
- Autoroute de données nocturne, avec paquets lumineux circulant vers un horizon clair.
- Temple futuriste minimaliste, mélange de métal sombre, cristal et énergie.
- Visualisation de marché rendue comme une météo lumineuse abstraite, sans chiffres ni graphiques lisibles.

## 8. Backgrounds

- Format maître portrait `828×1472` (2× la résolution logique), avec dérivés `414×736` et WebP.
- Centre calme : aucun objet saillant dans les 46 % centraux sous l’horizon.
- Les variantes changent l’architecture, la palette ou l’intensité, pas la position fonctionnelle de la piste.
- Éviter étoiles denses, bougé raster, texte, logos, bougies de marché lisibles et visages.
- Pour le parallax, séparer si possible `far`, `mid`, `side` et `overlay`, avec transparence sur les trois derniers.
- Les SVG fournis sont des concepts légers ; un raster final doit préserver leurs zones sûres.

## 9. FX

- FX additifs sur fond transparent, pivots centrés et marges suffisantes pour le glow.
- Une collecte se lit en moins de 450 ms ; une validation peut durer jusqu’à 800 ms.
- Les FX persistants restent sous 25 % d’opacité moyenne.
- Les couleurs suivent le sens : or = gain, cyan = technologie/protection, violet = identité, corail = danger.
- Les spritesheets ne doivent pas dépendre d’un fond noir prémultiplié.

## 10. Collectibles

- Forme originale de **Chain Block** : polyèdre compact, noyau lumineux et connexions abstraites.
- Silhouette distincte d’un token circulaire réel ; aucun symbole monétaire ou logo.
- États : standard, variante, energized, magnetized et pickup burst.
- Lecture garantie à 32 px ; détails décoratifs simplifiés sous 48 px.
- Les tailles small et medium sont des usages d’export (`32–40 px` et `48–64 px`), pas des designs incompatibles.

## 11. Portails

- Architecture en anneau ou arche verticale, ouverture centrale nette.
- Structure en couches nommées : `glow`, `ring`, `streaks`, `particles`, plus un cœur optionnel.
- Finish/Success : or et violet, mouvement ascendant.
- Failure : corail, segments interrompus, mouvement descendant ou instable.
- Zone/Multichain : palette paramétrable et plusieurs anneaux sans identité officielle.
- La version statique doit rester complète sans animation ; la version animation-ready sépare les groupes.

## 12. Futures ressources Campaign

Les chapitres inspirés de familles technologiques restent métaphoriques. Un chapitre de rareté/consensus peut utiliser roche numérique, chaleur orange et blocs lourds. Un chapitre de calcul programmable peut utiliser cristal bleu-violet, nœuds et architectures modulaires. Aucun nom, logo, glyphe officiel ou copie d’interface ne doit apparaître.

Chaque chapitre devra fournir : background maître, trois plans parallax, portail, obstacle décoratif, collectible générique, palette, FX et vignette sans texte. Les assets conceptuels ne constituent pas une validation juridique ou une livraison finale.

## 13. Contraintes techniques

- Source vectorielle : SVG simple, `viewBox` explicite, aucun script, aucune police ni ressource externe.
- Raster final : PNG pour transparence précise ; WebP pour backgrounds et variantes optimisées.
- Alpha droit recommandé ; vérifier les franges sur `#0C0717` et sur transparent.
- Budget indicatif : background WebP ≤ 350 Ko, grand overlay ≤ 180 Ko, collectible ≤ 50 Ko, frame/FX ≤ 35 Ko.
- Puissances de deux uniquement lorsque requises par un atlas ; sinon conserver la dimension utile pour réduire la mémoire.
- Spritesheet : cellules constantes, marge de 2 px minimum entre frames, métadonnées JSON séparées.
- Nommage en kebab-case ASCII : `category-purpose-variant-state@2x.ext`.
- Origine de coordonnées documentée ; pivot centré sauf portail (`50 %`, base sur `88 %`).
- Ne jamais intégrer de secret, URL privée, profil colorimétrique exotique ou métadonnée personnelle.
- Toute intégration future doit charger les assets via une clé stable et conserver un fallback procédural.

## Critères de validation

Un asset est prêt lorsqu’il est lisible à la taille cible, sans texte ni marque, correctement nommé, référencé dans le manifest, compressé, visualisé dans la galerie et associé à une licence/origine connue. Cette fondation reste volontairement indépendante du gameplay.
