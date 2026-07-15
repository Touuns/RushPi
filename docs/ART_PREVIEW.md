# Rush Pi — Galerie artistique locale

La galerie affiche directement `public/assets/rushpi/asset-manifest.json`. Elle ne dépend ni de React, ni de Vite, ni de Phaser, et ne charge aucune logique de jeu.

## Lancer

Depuis la racine du dépôt :

```bash
node tools/art-preview/server.mjs
```

Puis ouvrir :

```text
http://127.0.0.1:4174/tools/art-preview/
```

Un port différent peut être passé en argument :

```bash
node tools/art-preview/server.mjs 4180
```

Le serveur écoute uniquement sur `127.0.0.1`, refuse les chemins hors dépôt et désactive le cache pour faciliter la revue. Il sert la racine du dépôt afin que la page puisse lire à la fois `tools/`, `docs/` et `public/`.

Ne pas ouvrir directement `index.html` via `file://` : la plupart des navigateurs bloquent alors le `fetch` du manifest JSON.

## Fonctions

- galerie responsive adaptée à 375 px de large ;
- filtres par catégorie issus du manifest ;
- recherche sur ID, chemin, usage et notes ;
- filtre `animation-ready` ;
- aperçu portrait spécifique pour backgrounds et zones ;
- détail plein écran avec chemin, format, dimensions et usage ;
- liens vers direction, prompts et specs d’animation ;
- fallback visible si un fichier est absent ;
- respect de `prefers-reduced-motion`.

La légère respiration CSS des assets animation-ready est seulement une indication de galerie. Elle ne représente pas les timings Phaser définitifs.

## Vérification rapide

```bash
node --check tools/art-preview/preview.js
node --check tools/art-preview/server.mjs
node tools/assets/audit-assets.mjs
```

Après lancement, vérifier :

1. le statut `Manifest v1` ;
2. le total des assets ;
3. les catégories backgrounds, concepts, portals, collectibles, fx, placeholders, ui et metadata ;
4. l’ouverture d’un fond, d’un portail, d’un collectible et d’un placeholder ;
5. le rendu à 375×667 et 414×736 ;
6. l’absence de requête vers un service externe.

## Ajouter un asset

Déposer le fichier dans la bonne catégorie, mettre à jour le manifest, lancer l’audit puis recharger la galerie. Aucun changement du preview n’est nécessaire pour un format déjà supporté.
