# Rush Pi — Guide du manifest d’assets

## Arborescence

`public/assets/rushpi/` est la racine publique réservée à la fondation artistique. Aucun fichier de ce dossier n’est chargé automatiquement par le jeu.

| Dossier | Contenu | Formats préférés | Cibles |
|---|---|---|---|
| `backgrounds/` | Fonds Home et Daily, variantes calmes/spectaculaires | SVG concept, WebP final, PNG source | maître 828×1472, dérivé 414×736 |
| `portals/` | Gates statiques et groupes animation-ready | SVG, PNG/WebP, JSON atlas | 256×384 ou 512×768 |
| `collectibles/` | Chain Blocks originaux et états | SVG, PNG transparent | 64×64 maître, exports 32/48/64 |
| `fx/` | Bursts, rings, halos, trails et overlays | SVG, PNG transparent, WebP animé si validé | 64–512 px selon effet |
| `ui/` | Cadres et décor UI génériques | SVG, PNG transparent | 48–256 px |
| `placeholders/` | Frames token, fallbacks, gabarits temporaires | SVG | 64×64 et 128×128 |
| `concepts/` | Explorations et kits de zones non intégrés | SVG/WebP, Markdown associé | 414×736 ou 828×1472 |
| `spritesheets/` | Atlases futurs et métadonnées | PNG/WebP + JSON | cellules constantes, max 2048×2048 |
| `previews/` | Montages de revue uniquement, jamais chargés en jeu | WebP/PNG | largeur max 1440 px |

## Conventions de nommage

- Utiliser le kebab-case ASCII, sans espace ni date implicite.
- Ordre : `famille-sujet-variante-etat-resolution.ext`.
- Suffixes de taille : `-sm`, `-md`, `-lg`, ou `@2x` pour une densité exacte.
- États réservés : `static`, `layers`, `energized`, `magnetized`, `burst`, `fallback`.
- Une nouvelle itération remplace ou ajoute une variante explicite ; ne pas créer `final-final-2`.
- Les clés du manifest restent stables même si le fichier est remplacé.

Exemples :

```text
backgrounds/home-main-calm.svg
portals/finish-gate-layers.svg
collectibles/chain-block-core-energized.svg
fx/collect-burst-gold.svg
placeholders/token-frame-fallback.svg
```

## Formats et compression

- **SVG** : formes simples, `viewBox`, IDs de groupes utiles, sans `<text>`, script, filtre distant ou image embarquée.
- **WebP** : défaut pour un background raster opaque ; qualité visuelle cible 78–86.
- **PNG** : transparence, spritesheets et sources nécessitant une fidélité alpha maximale.
- **JPEG** : à éviter, sauf concept photo sans alpha (non recommandé pour cette direction).
- Conserver les sources lourdes hors de `public/` si elles dépassent le budget de production.

## Schéma machine-readable

Le fichier `asset-manifest.json` contient :

- `schemaVersion` : version du contrat du manifest ;
- `basePath` : chemin public futur ;
- `families` : lots planifiés et règles communes ;
- `assets` : fichiers réels inspectables par la galerie et les outils.

Chaque entrée d’asset utilise au minimum :

| Champ | Description |
|---|---|
| `id` | clé stable, unique, en kebab-case |
| `category` | dossier/famille principale |
| `file` | chemin relatif à `public/assets/rushpi/` |
| `format` | `svg`, `png`, `webp` ou `json` |
| `usage` | contexte prévu, jamais une activation automatique |
| `size` | dimensions intrinsèques ou `various` |
| `notes` | contrainte, état ou origine |
| `animationReady` | groupes/frames exploitables séparément |

Les champs facultatifs `variant`, `palette`, `safeCenterPercent` et `layers` enrichissent la galerie sans modifier ce contrat minimal.

## Cycle d’ajout

1. Créer l’asset dans le bon dossier et vérifier son nom.
2. Lancer `node tools/assets/audit-assets.mjs`.
3. Ajouter ses métadonnées ou lancer `node tools/assets/sync-manifest.mjs` pour détecter les entrées manquantes.
4. Vérifier l’asset aux tailles 375×667 et 414×736 dans la galerie.
5. Produire les dérivés raster seulement après validation visuelle.
6. Relancer l’audit avant commit.

Le manifest décrit une disponibilité ; il ne doit pas être importé par le gameplay tant qu’une phase d’intégration dédiée n’a pas validé mémoire, fallback et chargement.
