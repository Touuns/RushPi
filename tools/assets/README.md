# Outils d’assets Rush Pi

Ces scripts Node restent indépendants du build principal et n’écrivent jamais dans le gameplay. Exécuter les commandes depuis la racine du dépôt.

## Audit

```bash
node tools/assets/audit-assets.mjs
```

Vérifie :

- présence des dossiers et des fichiers du manifest ;
- IDs uniques et champs obligatoires ;
- cohérence extension/format et dimensions déclarées ;
- JSON valides ;
- `viewBox` des SVG ;
- noms en kebab-case ;
- absence de `<text>`, scripts, références distantes et noms de marques courantes dans les SVG ;
- couverture de tous les visuels par le manifest ;
- budgets de poids indicatifs.

L’audit ne peut pas certifier juridiquement l’originalité d’un dessin. Une revue humaine reste obligatoire.

## Lister

```bash
node tools/assets/list-assets.mjs
node tools/assets/list-assets.mjs --category=portals
node tools/assets/list-assets.mjs --json
```

## Synchroniser le manifest

Contrôle sans écriture :

```bash
node tools/assets/sync-manifest.mjs
```

Ajouter des entrées squelettes pour les nouveaux fichiers :

```bash
node tools/assets/sync-manifest.mjs --write
```

Les entrées produites contiennent `TODO` et doivent être relues. La suppression d’entrées absentes exige explicitement :

```bash
node tools/assets/sync-manifest.mjs --write --prune
```

## Optimiser PNG, convertir WebP et créer des tailles

Le convertisseur utilise `sharp` de façon optionnelle afin de ne pas alourdir le projet principal :

```bash
npm install --no-save sharp
node tools/assets/process-images.mjs incoming/background.png --out .tmp/assets --widths 414,828 --formats webp,png --quality 82
```

Pour un dossier complet :

```bash
node tools/assets/process-images.mjs incoming --out .tmp/derived --widths 32,48,64 --formats webp,png
```

Le script :

- accepte PNG, JPEG, WebP et SVG ;
- conserve le ratio ;
- n’agrandit pas un raster trop petit ;
- optimise le PNG avec compression maximale raisonnable ;
- encode le WebP avec qualité configurable ;
- recrée l’arborescence relative ;
- refuse d’écraser les sources.

Vérifier visuellement les sorties avant de les déplacer vers `public/assets/rushpi/`, puis mettre à jour le manifest et relancer l’audit.

## Budgets indicatifs

- background WebP : 350 Ko maximum ;
- grand overlay : 180 Ko ;
- collectible : 50 Ko ;
- frame ou FX : 35 Ko ;
- atlas : 2048×2048 maximum sans revue mémoire dédiée.

`sharp` installé avec `--no-save` ne doit pas être ajouté au lockfile pour cette fondation. Si l’équipe décide de rendre cet outil obligatoire, cette décision fera l’objet d’un changement séparé.
