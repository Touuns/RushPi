# Rush Pi — Prompts de génération d’images

Ces prompts produisent des concepts et sources raster destinés à la fondation artistique. Ils ne demandent aucune intégration gameplay. Après génération, conserver la provenance, vérifier les droits d’usage, retirer les métadonnées inutiles, puis passer les fichiers dans `tools/assets/`.

## Suffixe global recommandé

Ajouter à chaque prompt si le générateur l’accepte :

> premium stylized mobile game art, arcade blockchain neon adventure, portrait composition, strong perspective, clean silhouette, high contrast but controlled bloom, non-photorealistic, no embedded text, no letters, no numbers, no typography, no watermark, no signature, no official blockchain logo, no token logo, no brand, no copyrighted character, no UI mockup

Negative prompt global :

> text, caption, word, letters, numbers, ticker, watermark, signature, brand logo, coin logo, cryptocurrency symbol, official emblem, readable chart, phone frame, HUD, interface, photorealism, childish cartoon, mascot, human, face, cluttered center, low contrast track, excessive bloom, noisy texture, jpeg artifacts

Pour les fonds, demander une image **opaque**. Pour les objets et FX, demander **transparent background / isolated asset / straight alpha**. Un damier rendu dans l’image n’est pas une transparence valide.

---

## 1. Home background

- **Objectif** : installer immédiatement l’identité Rush Pi derrière l’UI Home, avec une profondeur spectaculaire mais une zone centrale calme.
- **Format conseillé** : WebP opaque après validation ; PNG maître pour archivage.
- **Dimensions** : 828×1472 (portrait 9:16 proche), recadrage sûr vers 414×736.
- **Niveau de détail** : élevé sur les bords, moyen à l’horizon, faible dans les 46 % centraux.
- **Style** : architecture numérique abstraite, arcade premium, métal sombre et lumière stylisée.
- **Couleurs** : `#0C0717`, `#160D2A`, `#8B5CF6`, `#FFD166`, `#FF7A3D`, touches `#38BDF8`.
- **Fond** : opaque.

Prompt principal :

> A premium portrait background for a mobile futuristic runner, a vast abstract digital-night corridor made of dark aubergine glass and anodized geometric architecture, violet and warm-gold energy flowing toward a small luminous horizon at about sixteen percent of image height, subtle orange rails and sparse cyan data sparks, strong symmetrical perspective, the central forty-six percent remains calm and dark for readable mobile UI and a future three-lane track, richer crystal structures only along both side edges, adventurous and fast but elegant, no objects crossing the center, non-photorealistic, no text, no logos, no symbols, no UI, 828 by 1472

Variantes :

1. **Crystal** — remplacer les architectures latérales par de grands cristaux cyan-violet translucides et réduire l’orange.
2. **Arc** — utiliser des arches orange-or répétées, plus chaleureuses, avec rails violets.
3. **Calm** — réduire de 60 % particules et bloom ; surfaces lisses pour un écran chargé en UI.
4. **Spectacular** — vortex multicolore concentré à l’horizon et premier plan latéral plus monumental, centre toujours vide.

À éviter : planète réaliste, ville cyberpunk remplie d’enseignes, tunnel occupant tout le centre, personnage, logo en forme de pièce, typographie pseudo-technique.

---

## 2. Daily Token Rush — Market tunnel

- **Objectif** : évoquer un challenge de marché quotidien par des flux et blocs abstraits, sans graphiques lisibles ni tokens réels.
- **Format conseillé** : WebP opaque ; plans parallax PNG si la composition est retenue.
- **Dimensions** : 828×1472 ; prévoir une version calme 414×736.
- **Niveau de détail** : moyen-élevé sur les côtés ; horizon net ; piste centrale sombre.
- **Style** : tunnel de data, blocs, impulsions financières abstraites, vitesse contrôlée.
- **Couleurs** : nuit bleu-violet, cyan `#22D3EE`, violet `#8B5CF6`, or `#FFD166`.
- **Fond** : opaque.

Prompt principal :

> Portrait mobile runner background, an abstract daily market data tunnel with luminous packets, beveled generic blocks and flowing cyan-violet-gold lines converging toward a bright horizon, visual rhythm suggests changing markets without any readable graph, candle, currency, token or number, deep navy and aubergine architecture on the side walls, clean dark central three-lane corridor, speed and daily challenge energy, premium stylized arcade game environment, no logos, no letters, no UI, no branded coin, 828 by 1472

Variantes :

1. **Cyan session** — refroidir la palette, carrés data bleus, halo blanc-cyan, très analytique.
2. **Amber session** — blocs orange ambre, conduits chauds, violet seulement en profondeur.
3. **Storm session** — flux plus tendus et quelques arcs électriques latéraux, sans basculer dans le danger rouge.

À éviter : bougies de trading reconnaissables, prix, ticker, symbole dollar, logos ronds, écran boursier, lignes au centre gênant la collecte.

---

## 3. Survival backgrounds

Contraintes communes : background opaque 828×1472, horizon à 16 %, piste centrale libre, décor dans les 27 % latéraux, aucune UI. Générer aussi, si possible, trois passes séparées : `far` opaque, `side` transparent, `overlay` transparent.

### 3.1 Genesis Lane

- **Objectif** : zone d’ouverture noble, calme et immédiatement lisible.
- **Format / dimensions** : WebP opaque, 828×1472 ; couches PNG transparentes optionnelles.
- **Détail / style** : moyen, symétrique, anneaux élégants.
- **Palette** : violet `#8B5CF6`, or `#FFD166`, orange `#FF7A3D`, fond `#0C0717`.
- **Fond** : opaque.

Prompt :

> Premium abstract genesis corridor for a portrait mobile runner, concentric violet and warm-gold synchronization rings around a calm golden horizon, sparse orange energy points, dark aubergine temple-like digital side architecture, clear black-violet central three-lane perspective, sense of beginning and possibility, geometric and non-religious, refined arcade lighting, no text, no logo, no official symbol, 828 by 1472

Variantes : anneaux plus larges et calmes ; temple minimal sans colonnes ; version dawn avec halo or plus doux.

Éviter : symboles religieux, rune lisible, porte ornée au centre, saturation uniforme.

### 3.2 Orange Chain

- **Objectif** : environnement robuste construit de blocs et connexions.
- **Format / dimensions** : WebP 828×1472, side overlay PNG.
- **Détail / style** : blocs chanfreinés stylisés, masse latérale forte.
- **Palette** : `#FF7A3D`, `#FFB347`, `#FFD166`, ombres brunes/aubergine.
- **Fond** : opaque.

Prompt :

> Monumental abstract orange data-chain foundry for a portrait runner, original beveled blocks and polygon links connected by thin amber conduits, deep aubergine shadows, subtle golden sparks, heavy architecture confined to both sides, clear central track leading to a warm compact horizon, premium stylized mobile game art, no industrial brand, no coin, no letters, no logo, 828 by 1472

Variantes : cubes plus petits et nombreux ; grands maillons hexagonaux ; forge froide avec orange uniquement sur les joints.

Éviter : vraie chaîne métallique réaliste, feu opaque, usine photoréaliste, pictogramme monétaire.

### 3.3 Smart Layer

- **Objectif** : intelligence programmable abstraite et couches de réseau.
- **Format / dimensions** : WebP 828×1472, nodes overlay PNG.
- **Détail / style** : précis, verre sombre, plans superposés.
- **Palette** : bleu `#3B82F6`, cyan `#38BDF8`, lavande `#A78BFA`, nuit marine.
- **Fond** : opaque.

Prompt :

> Layered programmable network city transformed into a mobile runner corridor, cyan nodes and blue-violet connections suspended between dark glass planes, modular architecture at the side edges, luminous analytical horizon, uncluttered dark center for three lanes, sophisticated clean geometry, premium stylized arcade aesthetic, no code, no readable interface, no letters, no logos, 828 by 1472

Variantes : nœuds ronds et fins ; grandes plaques translucides ; réseau plus organique mais toujours géométrique.

Éviter : capture d’IDE, texte de code, cerveau, robot, logo hexagonal connu.

### 3.4 Neon Speednet

- **Objectif** : sensation de vitesse maximale sans brouiller la piste.
- **Format / dimensions** : WebP 828×1472 ; streak overlay PNG transparent.
- **Détail / style** : lignes longues, architecture aérodynamique.
- **Palette** : émeraude `#34D399`, turquoise `#2DD4BF`, cyan `#22D3EE`, violet discret.
- **Fond** : opaque.

Prompt :

> Ultra-fast emerald and cyan abstract network highway for a portrait mobile runner, long clean light streaks, open aerodynamic arches, compressed perspective and a brilliant cyan horizon, energetic elements live on the outer side walls while the central three-lane corridor remains stable, dark green-black depth, premium non-photoreal arcade art, no vehicle, no signage, no words, no logos, 828 by 1472

Variantes : streaks fins très nombreux ; arches plus espacées ; version violet-cyan nocturne.

Éviter : motion blur sur toute l’image, voiture, route réaliste, centre surexposé.

### 3.5 Stable Grid

- **Objectif** : respiration ordonnée et fiable entre deux zones intenses.
- **Format / dimensions** : WebP 828×1472 ; grid overlay PNG.
- **Détail / style** : minimal, modulaire, symétrique.
- **Palette** : menthe `#A7F3D0`, vert clair `#6EE7B7`, blanc froid, accent or.
- **Fond** : opaque.

Prompt :

> Calm precise mint-white data grid chamber for a portrait mobile runner, balanced modular panels and fine orthogonal lines, dark green-black depth, four subtle anchor lights, a small warm-gold horizon and a perfectly open central track, premium clean futuristic arcade environment, restrained bloom, no currency imagery, no stablecoin reference, no text, no logo, 828 by 1472

Variantes : grille blanche très fine ; modules menthe en verre ; version presque monochrome.

Éviter : laboratoire blanc, surbrillance clinique, damier central, symbole de monnaie.

### 3.6 Meme Circuit

- **Objectif** : énergie exubérante et originale, sans mascotte ni référence culturelle.
- **Format / dimensions** : WebP 828×1472 ; confetti overlay PNG.
- **Détail / style** : asymétrie contrôlée, formes graphiques premium.
- **Palette** : rose `#FF6EC7`, or `#FFD166`, orange `#FF7A3D`, prune sombre.
- **Fond** : opaque.

Prompt :

> Playful yet premium magenta-gold abstract circuit for a portrait runner, elegant polygon confetti, curved luminous data paths and unexpected geometric modules along the sides, energetic rhythm without childish imagery, calm dark central racing corridor, rich prune depth and warm horizon, original mobile arcade world, no mascot, no animal, no meme character, no emoji, no words, no token logo, 828 by 1472

Variantes : confettis très fins ; courbes rose-or plus fluides ; version orange-magenta plus intense.

Éviter : chien, grenouille, visage, emoji, autocollant, esthétique enfantine, texte humoristique.

### 3.7 Privacy Tunnel

- **Objectif** : mystère, profondeur et occultation partielle sans perdre la lisibilité.
- **Format / dimensions** : WebP 828×1472 ; haze overlay transparent.
- **Détail / style** : anneaux imbriqués, panneaux sombres, contraste local.
- **Palette** : violet `#4C1D95`, pourpre `#6D28D9`, indigo `#312E81`, noir.
- **Fond** : opaque.

Prompt :

> Mysterious deep indigo privacy tunnel for a portrait mobile runner, nested violet rings, layered dark panels and subtle geometric haze, sparse hidden glints and a distant purple core, strong readable silhouette of the central three-lane corridor, premium stylized game environment, tension without horror, no lock icon, no eye, no surveillance imagery, no letters, no logo, 828 by 1472

Variantes : tunnel presque noir avec rails violets ; anneaux plus organiques ; panneaux facettés.

Éviter : cadenas, œil, masque, hacker, code vert, fumée bloquant le centre.

### 3.8 Chain Storm

- **Objectif** : climax Survival spectaculaire, énergie contenue sur les côtés.
- **Format / dimensions** : WebP 828×1472 ; lightning/fragment overlays PNG.
- **Détail / style** : élevé, éclairs graphiques et blocs abstraits en tension.
- **Palette** : corail `#FF4D6D`, lavande `#A78BFA`, or `#FFD166`, cyan `#22D3EE`.
- **Fond** : opaque.

Prompt :

> Climactic abstract blockchain storm for a portrait mobile runner, coral cyan gold and violet lightning branching through suspended original geometric blocks, violent energy and fragments confined to both side walls, dark calm center preserving the three lanes, brilliant compact horizon, premium stylized arcade finale, dramatic but readable, no real chain logo, no coin, no typography, no watermark, 828 by 1472

Variantes : orage cyan-violet ; corail dominant ; blocs moins nombreux avec éclairs plus grands.

Éviter : catastrophe réaliste, nuages photo, foudre au centre, surcharge blanche, logos.

---

## 4. Portal set

- **Objectif** : produire six gates cohérentes : Finish, Zone, Validation, Success, Failure, Multichain.
- **Format conseillé** : PNG transparent par portail ; source 512×768, dérivé 256×384.
- **Détail** : moyen-élevé ; silhouette lisible à 128 px de hauteur.
- **Style** : arche/anneau géométrique, énergie stylisée, symétrie fonctionnelle.
- **Couleurs** : rôle-dépendantes, fond transparent.
- **Fond** : transparent, objet isolé, aucune ombre rectangulaire.

Prompt principal :

> A cohesive asset sheet of six original futuristic portal gates for a premium mobile arcade runner, isolated on true transparent background with generous spacing, front orthographic view, each gate has a clear open center and modular layers: outer soft glow, structural ring, vertical energy streaks and sparse particles; finish gate warm gold-violet, zone gate cyan-violet, validation gate mint-cyan with an abstract confirmation pulse but no icon, success gate brilliant gold-white, failure gate broken coral-violet segments, multichain gate intertwined cyan-violet-orange-gold generic rings, clean hard silhouettes, no text, no logo, no symbol, no environment, straight alpha, 3072 by 1024 asset sheet

Variantes : générer chaque gate seule en 512×768 ; version `static` avec glow contenu ; version `layers` en quatre exports alignés sur le même canevas.

Negative prompt spécifique : background, floor, wall, scenery, text, finish word, checkmark icon, cross icon, branded chain, coin logo, cropped glow, opaque black rectangle, perspective side view.

---

## 5. Chain Block set

- **Objectif** : collectible Rush Pi 100 % original, distinct d’une pièce/token.
- **Format conseillé** : PNG transparent et SVG redessiné ; source 512×512, exports 64/48/32.
- **Détail** : moyen, simplifiable à 32 px.
- **Style** : petit polyèdre technologique, noyau lumineux, connexions abstraites.
- **Couleurs** : or-orange-violet ; variantes cyan/menthe/rose.
- **Fond** : transparent.

Prompt principal :

> Original collectible called a Chain Block for a premium neon mobile runner, a compact beveled polyhedral data block, clearly not a coin, dark aubergine shell, warm gold and orange edges, small white-gold energy core, three abstract cyan connection nodes, front three-quarter view, centered isolated object, crisp silhouette readable at 32 pixels, controlled soft glow, stylized non-photoreal game asset, true transparent background, no letters, no number, no cryptocurrency logo, no chain brand, 512 by 512

Variantes :

1. **Prism** : pentagonal cyan-violet facets.
2. **Lattice** : square rounded frame, mint-cyan node lattice.
3. **Core** : hexagonal magenta-orange shell, larger radiant core.
4. **Energized** : rays and bright charged seams, same silhouette.
5. **Magnetized** : two translucent violet-orange attraction rings, no horseshoe magnet icon.
6. **Pickup burst** : block centered in a separate gold radial burst, 768×768.

Negative prompt spécifique : round coin, currency, bitcoin-like grooves, token logo, letter, embossed symbol, treasure chest, cube with text, photoreal metal, thick black background.

---

## 6. FX set

- **Objectif** : sources animation-ready pour collecte, énergie, portails, charge, vitesse, validation, fragments, storm, pulses et scan lines.
- **Format conseillé** : PNG transparent individuel 512×512 ; streak 256×1024 ; overlay 828×1472.
- **Détail** : formes nettes, peu de bruit, bords alpha propres.
- **Style** : énergie graphique additive, arcade premium.
- **Fond** : transparent.

Prompt principal :

> Cohesive VFX source sheet for a premium neon mobile runner on true transparent background: compact gold collection burst, cyan-violet energy ring, tall violet portal halo, blue charge discharge arc, long orange-gold speed trail, mint-white validation sparkle, orange-violet geometric block fragments, coral-cyan forked storm lightning, four concentric circular pulses, and a very subtle lavender scan-line overlay sample; every effect isolated with generous padding, centered pivot, crisp alpha, restrained bloom, stylized game VFX, no objects, no letters, no logo, no black background, 3072 by 2048

Variantes : faible/forte intensité ; version monochrome blanche tintable ; 8 frames suggérées pour burst/ring ; 6 frames pour lightning.

Negative prompt spécifique : smoke cloud, realistic explosion, fireball, blood, lens dirt, opaque background, baked checkerboard, text, icon, cropped ray.

Découpe recommandée : burst 8×`256×256`, ring 10×`256×256`, discharge 8×`256×256`, lightning 6×`256×512`, scan overlay fixe.

---

## 7. Token placeholder frame set

- **Objectif** : encadrer un logo chargé dynamiquement et fournir un fallback sans copier de marque.
- **Format conseillé** : SVG final ; PNG transparent 256×256 si raster nécessaire.
- **Dimensions** : source 512×512, export 128×128 et 64×64.
- **Détail** : faible à moyen ; centre libre de 70 % du diamètre.
- **Style** : cadre circulaire technologique cohérent avec Rush Pi.
- **Couleurs** : cyan-violet-or ; fallback aubergine.
- **Fond** : transparent.

Prompt principal :

> A set of original circular frames for dynamically loaded token images in a premium neon mobile game, isolated on true transparent background: clean cyan-violet-gold base frame with a large empty center, three rarity border treatments using only abstract dots and segmented arcs, soft gold selection halo, blank symbol plate designed for runtime text but containing no text, and a generic missing-image fallback made of an original hexagonal node pattern, crisp at 64 pixels, controlled glow, no coin logo, no letters, no currency, no official symbol, 2048 by 512 asset sheet

Variantes : bord common gris lavande, rare cyan-violet, epic or-orange ; halo selected/non-selected ; fallback monochrome tintable.

Negative prompt spécifique : existing token logo, currency sign, question mark, broken-image browser icon, letters, text placeholder, opaque disc covering the logo area.

---

## 8. Campaign exploration — rare-consensus chapter

- **Objectif** : explorer un futur chapitre inspiré par la rareté, les blocs lourds et le consensus énergétique, sans livrer une identité Bitcoin ni un asset final.
- **Format conseillé** : concept WebP/JPEG de revue, non intégré.
- **Dimensions** : 1024×1792 portrait.
- **Détail / style** : élevé, roche numérique et blocs thermiques stylisés.
- **Couleurs** : noir graphite, cuivre, ambre, or, faible violet.
- **Fond** : opaque.

Prompt :

> Exploratory concept art for a future mobile runner campaign chapter about digital rarity and heavy consensus, monumental original black-stone data blocks with copper and amber heat glowing through geometric seams, a long vault-like corridor descending toward a golden horizon, sparse crystalline dust, premium stylized arcade adventure, center kept readable for gameplay, inspired only by abstract ideas of scarcity and proof without reproducing any known logo, coin, name, letter or official visual identity, no text, portrait 1024 by 1792

Variantes : chambre forte froide ; canyon de blocs chauffés ; mine numérique abstraite sans outils humains.

Éviter : symbole B, pièce orange, mineur, ASIC réaliste, nom de réseau, drapeau, marque.

---

## 9. Campaign exploration — programmable-crystal chapter

- **Objectif** : explorer un futur chapitre inspiré par le calcul programmable et les couches modulaires, sans livrer une identité Ethereum ni un asset final.
- **Format conseillé** : concept WebP/JPEG de revue, non intégré.
- **Dimensions** : 1024×1792 portrait.
- **Détail / style** : élevé, cristaux abstraits, cité modulaire, lumière bleu-violet.
- **Couleurs** : indigo, bleu électrique, cyan, lavande, blanc froid.
- **Fond** : opaque.

Prompt :

> Exploratory concept art for a future mobile runner campaign chapter about programmable computation, a vast modular city of original translucent blue-violet crystal planes, cyan node bridges and floating execution chambers, elegant layered architecture converging toward a white-lavender horizon, adventurous premium stylized arcade world, open center for a runner track, inspired only by abstract programmability and modular layers, no diamond emblem matching any known brand, no official logo, no name, no letters, no text, portrait 1024 by 1792

Variantes : bibliothèque de calcul cristalline ; ponts de nœuds suspendus ; sanctuaire modulaire minimal.

Éviter : losange officiel, lettre grecque, code lisible, nom de réseau, carte de token, branding.

---

## Contrôle après génération

1. Rejeter toute image contenant du texte, même illisible ou décoratif.
2. Rejeter tout symbole ressemblant clairement à une marque blockchain/token.
3. Vérifier le centre à 375×667 avec un masque de piste.
4. Vérifier le glow sur fond sombre et sur transparence.
5. Conserver une source non compressée et produire un WebP/PNG dérivé.
6. Nommer en kebab-case, ajouter au manifest et noter la provenance/licence.
7. Ne pas intégrer au gameplay pendant cette phase.
