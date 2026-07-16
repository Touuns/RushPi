# Phase 12A-0B-P1 — Home Background Candidates

Statut global : `needs-review`

Branche : `phase/12a-0b-generated-art`

Base : `e252af5a79ae67d7212194421be7357a5b906cfd`

Aucune candidate n'est déclarée prête pour intégration. Les fichiers de cette phase sont des sources et previews documentaires ; ils ne sont pas chargés par React ou Phaser et ne sont pas ajoutés au manifest runtime.

## Méthode

- Génération : trois appels indépendants à l'outil OpenAI intégré `image_gen`, sans image d'entrée et sans reprise d'une génération ChatGPT antérieure.
- Sortie native de chaque appel : PNG opaque RGB `941×1672`.
- Traitement : ImageMagick 7.1.2, recadrage géométrique contrôlé vers un rectangle 9:16, redimensionnement uniforme Lanczos, conversion explicite en sRGB TrueColor opaque et suppression des métadonnées non nécessaires.
- Master final : PNG `828×1472`.
- Preview : WebP `414×736`, qualité 82, méthode WebP 6.
- Guides : ajoutés uniquement aux previews ; aucune ligne de contrôle n'est dessinée dans les masters.
- Mesure d'obscurité : proportion de pixels dont le niveau de gris est inférieur à 30 %. Cette mesure est un indicateur technique, pas une validation artistique suffisante.

## Résumé des fichiers

| Candidate | Master | Master bytes | Preview | Preview bytes | Guides bytes | Horizon détecté | Obscurité | Recommandation |
|---|---|---:|---|---:|---:|---:|---:|---|
| Primary | `home-background-primary-candidate-v1.png` | 1,048,094 | `home-background-primary-candidate-v1.webp` | 15,758 | 16,656 | y=265 | 97.73 % | `shortlist` |
| Calm | `home-background-calm-candidate-v1.png` | 907,776 | `home-background-calm-candidate-v1.webp` | 7,624 | 8,510 | y=244 | 98.43 % | `shortlist` |
| Spectacular | `home-background-spectacular-candidate-v1.png` | 1,335,936 | `home-background-spectacular-candidate-v1.webp` | 30,038 | 30,974 | y=1071 | 94.35 % | `reject` |

Planche comparative :

- `public/assets/rushpi/previews/phase-12a/home-background-candidates-v1-comparison.webp`
- `1242×792`
- 52,842 bytes
- étiquettes ajoutées pendant la composition de la planche, jamais dans les masters.

## Candidate 1 — Primary

### Prompt réellement utilisé

```text
Use case: stylized-concept
Asset type: portrait mobile game Home background candidate — Primary
Primary request: Create a premium portrait mobile game home background, exactly 828 by 1472 pixels, opaque sRGB, for an arcade blockchain neon adventure.
Scene/backdrop: A deep nocturnal digital environment with a compact glowing horizon near 16 percent of the image height. Layered abstract architecture only on the far left and far right, subtle data conduits and chain-like structural rhythms, strong depth through large clean planes.
Style/medium: polished stylized game environment concept, crisp geometric forms, refined dark glass, anodized metal, controlled volumetric glow; not photorealistic.
Composition/framing: portrait. Keep the central 46 percent of the width calm, dark, low-frequency and completely free of focal objects for translucent scrolling interface cards. Keep the top quiet behind a logo and connection control. The lower area must remain calm without a bright floor, explicit road, or strong perspective lines. Put visual richness on the sides only. Horizon must visually sit between 15 and 18 percent of image height. No essential detail at the extreme top or bottom.
Lighting/mood: premium, nocturnal, inviting, controlled depth; center darker than sides.
Color palette: black aubergine and midnight violet for at least 70 percent of the image; neon violet as the main identity light; cyan as secondary signal; rare gold and orange accents.
Constraints: opaque image; no embedded interface; no text; no pseudo-text; no typography; no letters; no numbers; no logos; no official emblems; no currency symbols; no coins; no tokens; no circular collectibles; no trading interface; no price chart; no candlesticks; no ticker; no casino imagery; no human; no face; no character; no mascot; no central portal; no vehicle; no explicit three-lane road; no obstacle; no giant central object; no white burned-out center; no heavy central fog; no watermark; no signature.
Avoid: photorealism, childish cartoon, dirty cyberpunk clutter, graffiti, dense stars, micro-detail noise, high-frequency textures, uniform brightness, architecture entering the central safe zone.
```

### Traitement

- Dimension originale : `941×1672`.
- Recadrage : `819×1456`, origine `(61,205)`.
- Dimension intermédiaire strictement 9:16.
- Redimensionnement uniforme : facteur `1.010989`.
- Dimension finale : `828×1472`.
- Le recadrage supérieur repositionne le pic lumineux natif de y=467 vers y=265 sans étirement.

### Contrôles

- PNG exact, sRGB TrueColor, opaque : conforme.
- Horizon : conforme, à la limite basse de la plage autorisée, y=265.
- Centre calme x=223–605 : conforme ; luminance moyenne `0.0393364`, inférieure aux deux zones latérales.
- Safe area supérieure : fonctionnelle, mais des structures lumineuses et motifs de chaîne restent visibles sur les bords.
- Safe area inférieure : calme, luminance moyenne `0.0298968`.
- Tons sombres : 97.73 % selon le seuil instrumenté.
- Texte, pseudo-texte, logo, token, visage ou interface financière : aucun élément observé.
- Simulation UI à 375×667 : header, profil, Daily, Survival, Campaign et boutons More restent lisibles.

### Défauts et décision

Les détails latéraux supérieurs sont un peu plus présents que le brief Calm et devront être vérifiés avec le vrai header. Le centre reste néanmoins très stable, les cartes dominent clairement et la profondeur ne se transforme pas en piste.

Recommandation : `shortlist`, candidate préférée par Codex pour la prochaine revue humaine.

## Candidate 2 — Calm

### Prompt réellement utilisé

```text
Use case: stylized-concept
Asset type: portrait mobile game Home background candidate — Calm
Primary request: Create a calm premium portrait mobile game home background, exactly 828 by 1472 pixels, opaque sRGB, for an arcade blockchain neon adventure.
Scene/backdrop: A deep black-aubergine digital night, a small violet-gold horizon near 16 percent of image height, very restrained abstract digital side architecture, broad dark planes, minimal particles.
Style/medium: polished stylized game environment concept with large clean geometric surfaces and subtle controlled glow; technological and abstract, not natural terrain and not photorealistic.
Composition/framing: portrait. Preserve an uninterrupted calm central 46 percent width from the quiet top safe area through the entire lower scrolling region. Side structures must be subtle and confined to the outer areas. Horizon must visually sit between 15 and 18 percent of image height. Keep the extreme top and bottom quiet. No explicit playable road and no dominant portal.
Lighting/mood: subdued, elegant, premium, stable behind translucent interface cards; at least 75 percent dark values.
Color palette: black aubergine and midnight violet dominant; gentle violet and lavender identity; only a few distant cyan signals; gold and orange accents extremely rare.
Constraints: opaque image; no interface; no text; no pseudo-text; no logo; no numbers; no coin; no token; no human; no landscape; no mountain valley; no rocky canyon; no natural horizon; no ocean; no water; no desert; no road; no race track; no portal; no central city skyline; no financial interface; no chart; no bright central object; no watermark; no signature.
Avoid: dense particles, noisy texture, photorealism, childish cartoon, strong perspective rails, natural geology, central focal objects, burned-out glow.
```

### Traitement

- Dimension originale : `941×1672`.
- Recadrage : `864×1536`, origine `(38,101)`.
- Redimensionnement uniforme : facteur `0.958333`.
- Dimension finale : `828×1472`.
- Le pic lumineux natif de y=355 arrive à y=244 dans le master.

### Contrôles

- PNG exact, sRGB TrueColor, opaque : conforme.
- Horizon : conforme, y=244.
- Centre calme : conforme en fréquence de détail ; il reste presque vide sur toute la hauteur.
- Safe area supérieure : calme, luminance moyenne `0.0429562`.
- Safe area inférieure : calme, luminance moyenne `0.0229674`.
- Tons sombres : 98.43 % selon le seuil instrumenté.
- Texte, logo, token, personnage, paysage naturel ou interface financière : aucun élément observé.
- Simulation UI à 414×736 : tous les blocs restent très lisibles.

### Défauts et décision

Le trait d'horizon or-violet est très net et atteint un pic de luminance d'environ 91.95 %. Il traverse visuellement le bas de la zone profil et mérite un test avec l'opacité exacte du vrai composant. La candidate offre en revanche la meilleure réserve de contraste pour une Home très dense.

Recommandation : `shortlist`, alternative calme à conserver.

## Candidate 3 — Spectacular

### Prompt réellement utilisé

```text
Use case: stylized-concept
Asset type: portrait mobile game Home background candidate — Spectacular
Primary request: Create a spectacular but interface-safe portrait mobile game home background, exactly 828 by 1472 pixels, opaque sRGB, for an arcade blockchain neon adventure.
Scene/backdrop: A deep digital night with layered violet crystal-inspired technological architecture and partial warm geometric arches confined strictly to the outer left and right edges, a compact luminous horizon near 16 percent height, and subtle upward energy.
Style/medium: premium stylized game environment concept, crisp abstract technology, large geometric crystal-like dark-glass facets and anodized metal; not fantasy and not photorealistic.
Composition/framing: portrait. Preserve the entire central 46 percent as a dark readable low-detail corridor and keep the header area quiet. Increase depth, scale, and lateral richness rather than central brightness. All rich architecture stays in the outer side zones. Keep the extreme bottom free of essential detail. Center must remain darker than both sides.
Lighting/mood: energetic and spectacular yet controlled, polished and readable behind translucent interface cards.
Color palette: black aubergine and midnight violet base; neon violet main identity; cyan secondary signal; controlled gold accents and rare warm orange.
Constraints: opaque image; technological geometric abstraction only; no fantasy castle; no medieval temple; no magical kingdom; no vegetation; no fantasy crystals growing from the ground; no ornamental cathedral; no text; no pseudo-text; no logo; no token; no coin; no financial interface; no road; no playable track; no portal; no character; no human; no bright central beam; no watermark; no signature.
Avoid: excessive particles, noisy micro-detail, burned-out center, architecture invading the central safe zone, central focal object, casino lighting, fantasy ornament.
```

### Traitement

- Dimension originale : `941×1672`.
- Recadrage minimal : `936×1664`, origine `(2,4)`.
- Redimensionnement uniforme : facteur `0.884615`.
- Dimension finale : `828×1472`.
- Aucun recadrage correctif majeur n'a été appliqué : déplacer l'horizon vers la plage requise aurait supprimé l'essentiel de l'architecture latérale et fortement agrandi une petite zone.

### Contrôles

- PNG exact, sRGB TrueColor, opaque : conforme.
- Horizon : non conforme, pic détecté à y=1071.
- Centre calme : conforme dans la moitié supérieure, non conforme dans la partie basse à cause de la convergence et de l'avenue.
- Safe areas extrêmes : sombres et sans détail essentiel.
- Tons sombres : 94.35 % selon le seuil instrumenté.
- Texte, logo, token, humain, fantasy explicite ou interface financière : aucun élément observé.
- Simulation UI à 375×667 : les cartes restent lisibles, mais une route lumineuse reste visible entre elles et sous Campaign.

### Défauts et décision

La composition se lit comme une avenue ou une piste jouable. L'horizon est près des trois quarts de la hauteur au lieu de 15–18 %. La richesse latérale est réussie, mais ces deux défauts sont structurels et ne peuvent pas être corrigés par le recadrage autorisé sans détruire l'image.

Recommandation : `reject`.

## Guides de contrôle

Les versions `*-guides.webp` utilisent :

- cyan : safe area supérieure, y=0–44 logique ;
- corail : safe area inférieure, y=702–736 logique ;
- lavande : centre calme, x=111–302 et y=44–686 logique ;
- or : ligne d'horizon cible à y=121 logique.

Ces guides ne sont présents dans aucun master PNG.

## Galerie et simulation mobile

La section `12A Home Candidates` charge le registre d'intake local et affiche :

- trois previews simples ;
- trois previews avec guides ;
- la planche comparative ;
- dimensions, poids, statut et recommandation ;
- une simulation HTML/CSS du header, du profile strip, des cartes Daily, Survival et Campaign, ainsi que des boutons More.

Résultats :

| Viewport | Débordement horizontal | Candidates | Images chargées | Statuts | Manifest historique |
|---|---|---:|---|---|---|
| 375×667 | aucun | 3 | 7/7 | uniquement `needs-review` | 56/56 |
| 414×736 | aucun | 3 | 7/7 | uniquement `needs-review` | 56/56 |

Les trois simulations possèdent chacune cinq blocs UI visibles. Les quatre captures temporaires autorisées ont servi à inspecter la comparaison puis Primary, Calm et Spectacular sous l'UI ; elles ne sont pas destinées au commit.

## Décision proposée

1. Faire examiner **Primary** en premier : meilleur compromis entre profondeur premium, calme central et caractère de marque générique.
2. Conserver **Calm** comme alternative pour une UI dense, sous réserve d'atténuer ou valider son horizon très net lors d'une future itération.
3. Rejeter **Spectacular v1** comme background Home ; ses idées de matière latérale peuvent seulement informer un futur prompt, sans réutiliser ce fichier comme base runtime.

Une validation humaine reste nécessaire pour :

- choisir entre Primary et Calm ;
- confirmer la tolérance des détails latéraux sous le vrai header ;
- confirmer l'intensité de l'horizon Calm sous le vrai profile strip ;
- décider si une nouvelle Spectacular indépendante doit être générée ;
- valider provenance, usage et qualité artistique avant toute phase de processing ou d'intégration.
