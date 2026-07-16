# Phase 12A — Plan de fichiers futurs

Ce document propose les chemins d’une phase ultérieure. **Aucun de ces fichiers n’est créé dans 12A-0A.**

## Principes

- Les sources de travail lourdes ne vont pas dans `public/`.
- Les fichiers réellement chargés par React ou Phaser sont des dérivés optimisés.
- Les masters de référence et les dérivés runtime ont des noms distincts.
- L’ajout au manifest se fait seulement lorsque le fichier réel existe et a passé l’intake.
- Chaque intégration conserve un fallback procédural.

## Arborescence proposée

```text
art-sources/
  phase-12a/
    README.md
    home-background-production-master.png
    daily-market-tunnel-production-master.png
    chain-block-production-master.png
    finish-portal-production-master.png

public/assets/rushpi/production/
  backgrounds/
    home-background-production@2x.webp
    home-background-production.webp
    daily-market-tunnel-production@2x.webp
    daily-market-tunnel-production.webp

  collectibles/
    chain-block-production-128.png
    chain-block-production-64.png
    chain-block-production-32.png

  portals/
    finish-portal-production-256x384.png
    finish-portal-production-halo-256x384.png
```

`art-sources/` est un chemin proposé hors de `public/`. Son inclusion dans Git devra être décidée selon le poids, la licence et la reproductibilité. Une source propriétaire ou un fichier géant peut rester dans un stockage d’assets contrôlé avec hash et registre, plutôt que dans le repository.

## Plan par production

### Home Background

| Fichier | Rôle | Chargé dans le jeu ? | Budget |
|---|---|---:|---:|
| `art-sources/phase-12a/home-background-production-master.png` | Master opaque 828×1472 et référence de traitement | Non | ≤4 MiB conseillé |
| `public/assets/rushpi/production/backgrounds/home-background-production@2x.webp` | Dérivé haute densité 828×1472 | Conditionnel | ≤350 KiB |
| `public/assets/rushpi/production/backgrounds/home-background-production.webp` | Runtime 414×736 | Oui, après phase d’intégration | ≤180 KiB |

Fallback : gradients CSS `.app-frame`.

### Daily Market Tunnel

| Fichier | Rôle | Chargé dans le jeu ? | Budget |
|---|---|---:|---:|
| `art-sources/phase-12a/daily-market-tunnel-production-master.png` | Master opaque 828×1472 | Non | ≤4 MiB conseillé |
| `public/assets/rushpi/production/backgrounds/daily-market-tunnel-production@2x.webp` | Dérivé haute densité | Conditionnel | ≤350 KiB |
| `public/assets/rushpi/production/backgrounds/daily-market-tunnel-production.webp` | Runtime 414×736 | Oui, après test piste/FX | ≤200 KiB |

Fallback : `PALETTE.bg`, `BackgroundFX` et `TrackVisuals`.

### Chain Block

| Fichier | Rôle | Chargé dans le jeu ? | Budget |
|---|---|---:|---:|
| `art-sources/phase-12a/chain-block-production-master.png` | Master transparent 512×512 | Non | ≤750 KiB conseillé |
| `public/assets/rushpi/production/collectibles/chain-block-production-128.png` | Haute densité / future source atlas | Conditionnel | ≤70 KiB |
| `public/assets/rushpi/production/collectibles/chain-block-production-64.png` | Runtime standard probable | Oui, après test Phaser | ≤35 KiB |
| `public/assets/rushpi/production/collectibles/chain-block-production-32.png` | Petit fallback ou UI | Conditionnel | ≤18 KiB |

Fallback : `makeChainBlock()`. Le fichier 64×64 est le candidat runtime initial ; le 128×128 n’est chargé que si le rendu haute densité le justifie.

### Finish Portal

| Fichier | Rôle | Chargé dans le jeu ? | Budget |
|---|---|---:|---:|
| `art-sources/phase-12a/finish-portal-production-master.png` | Master transparent 512×768 | Non | ≤1.2 MiB conseillé |
| `public/assets/rushpi/production/portals/finish-portal-production-256x384.png` | Structure runtime statique | Oui, après test de pivot | ≤180 KiB |
| `public/assets/rushpi/production/portals/finish-portal-production-halo-256x384.png` | Halo séparé optionnel | Conditionnel | ≤80 KiB |

Fallback : `TrackGate`, son label runtime et ses effets Phaser. Le halo séparé n’est créé que si sa séparation réduit réellement l’overdraw ou permet une animation sobre.

## Futurs IDs du manifest

Proposition à confirmer lors de l’ajout réel :

| ID | Fichier |
|---|---|
| `production-home-background-2x` | `production/backgrounds/home-background-production@2x.webp` |
| `production-home-background` | `production/backgrounds/home-background-production.webp` |
| `production-daily-market-tunnel-2x` | `production/backgrounds/daily-market-tunnel-production@2x.webp` |
| `production-daily-market-tunnel` | `production/backgrounds/daily-market-tunnel-production.webp` |
| `production-chain-block-128` | `production/collectibles/chain-block-production-128.png` |
| `production-chain-block-64` | `production/collectibles/chain-block-production-64.png` |
| `production-chain-block-32` | `production/collectibles/chain-block-production-32.png` |
| `production-finish-portal` | `production/portals/finish-portal-production-256x384.png` |
| `production-finish-portal-halo` | `production/portals/finish-portal-production-halo-256x384.png` |

Ces IDs ne sont pas ajoutés au manifest pendant 12A-0A.

## Chaîne de traitement future

1. réception dans un espace d’intake hors runtime ;
2. provenance, hash, dimensions et profil vérifiés ;
3. statut manuel `approved-for-processing` ;
4. dérivés produits vers un dossier temporaire avec `tools/assets/process-images.mjs` ou une commande documentée équivalente ;
5. inspection alpha/contraste ;
6. ajout des seuls dérivés retenus sous `public/assets/rushpi/production/` ;
7. ajout des IDs réels au manifest ;
8. galerie et audit ;
9. intégration React/Phaser dans une branche séparée avec fallback ;
10. mesure mémoire, FPS et temps de décodage avant `approved-for-integration`.

## Ce qui sera réellement chargé

- Home : normalement le WebP 414×736, avec sélection 2× seulement si la stratégie responsive le justifie.
- Daily : le WebP 414×736 derrière la piste procédurale.
- Chain Block : probablement le PNG 64×64 ; le 128 sert aux écrans haute densité ou atlas.
- Finish Portal : le PNG 256×384 ; le halo séparé reste optionnel.

Les masters ne sont jamais importés par le code runtime.
