# Phase 12A — Checklist d’intake des futures images

Cette checklist s’applique après génération. Aucun fichier n’est approuvé automatiquement, même s’il respecte les dimensions ou provient d’un prompt validé.

## Statuts autorisés

| Statut | Sens |
|---|---|
| `received` | Fichier reçu, non contrôlé |
| `needs-review` | Contrôles en cours ou information manquante |
| `rejected` | Non conforme ; ne pas traiter ni intégrer |
| `approved-for-processing` | Source acceptée pour optimisation et dérivés, pas pour le jeu |
| `processed` | Dérivés produits, encore en attente de revue runtime |
| `approved-for-integration` | Validation humaine explicite après galerie, audit et test dans une phase d’intégration |

Le passage de statut doit être manuel, daté et attribué. `approved-for-processing` ne signifie jamais `approved-for-integration`.

## Registre d’intake

À remplir pour chaque livraison :

- Target ID :
- Nom du fichier reçu :
- Date de réception :
- Provenance et outil connus :
- Opérateur :
- Droits/licence ou conditions d’utilisation :
- Prompt/version utilisés :
- Hash SHA-256 :
- Statut initial : `received`
- Reviewer :
- Notes :

## Contrôles communs

### Provenance et sécurité

- [ ] Provenance connue et documentée.
- [ ] Droit d’utilisation compatible avec le projet.
- [ ] Aucun contenu copié d’un jeu, d’une œuvre ou d’une interface existante.
- [ ] Aucun logo, marque, emblème ou identité officielle.
- [ ] Aucun texte, watermark, signature ou métadonnée personnelle.
- [ ] Aucun secret, URL privée ou donnée personnelle.

### Fichier

- [ ] Nom en kebab-case ASCII.
- [ ] Extension conforme au plan.
- [ ] Dimensions exactes.
- [ ] Ratio exact ou explicitement accepté.
- [ ] Profil sRGB ; absence de profil exotique.
- [ ] Orientation et metadata nettoyées.
- [ ] Poids mesuré et comparé au budget.
- [ ] Hash enregistré avant traitement.

### Qualité visuelle

- [ ] Aucun détail essentiel coupé.
- [ ] Aucun artefact de génération, pseudo-texte ou forme anatomique accidentelle.
- [ ] Contraste fonctionnel conforme.
- [ ] Zones sûres respectées.
- [ ] Contrôle à 100 %, 50 % et taille runtime.
- [ ] Contrôle à luminosité réduite et en niveaux de gris.
- [ ] Aucun moiré, banding ou scintillement probable.
- [ ] Cohérence avec violet/or/cyan/orange et fond aubergine.

### Alpha, lorsque requis

- [ ] Fond réellement transparent.
- [ ] Alpha droit ou traitement documenté.
- [ ] Aucun fond noir prémultiplié.
- [ ] Aucun halo coupé.
- [ ] Aucune frange claire/sombre sur `#0C0717`.
- [ ] Pas d’ombre rectangulaire.
- [ ] Marge alpha conforme.

### Mobile et runtime

- [ ] Vérification à 375×667.
- [ ] Vérification à 414×736.
- [ ] Test avec UI, piste, joueur et FX concernés.
- [ ] Fallback existant identifié et fonctionnel.
- [ ] Aucun changement de gameplay requis.
- [ ] Optimisation reproductible.
- [ ] Dérivés comparés à la source.
- [ ] Galerie locale mise à jour dans une phase autorisée.
- [ ] Entrée future du manifest préparée, mais ajoutée seulement avec les fichiers réels.
- [ ] `node tools/assets/audit-assets.mjs` réussi après ajout futur.

## Home Background

- [ ] Master opaque 828×1472.
- [ ] Horizon entre y=221 et y=265.
- [ ] Centre x=223–605 calme.
- [ ] Aucun détail essentiel dans les 88 px supérieurs ou 68 px inférieurs.
- [ ] Header et connexion restent lisibles.
- [ ] Cartes Home lisibles avec et sans voile CSS.
- [ ] Aucun rail central assimilable à une piste.
- [ ] Aucun token, portail ou gros objet derrière les boutons.
- [ ] Au moins 70 % de tons sombres.
- [ ] WebP 828 futur ≤350 KiB ; 414 futur ≤180 KiB.
- [ ] Fallback `.app-frame` conservé.

Rejet immédiat : texte, logo, piste explicite, centre brûlé, composition incompatible avec le scroll.

## Daily Market Tunnel

- [ ] Master opaque 828×1472.
- [ ] Horizon entre y=220 et y=270.
- [ ] Trapèze protégé sans masse ni objet focal.
- [ ] Trois centres de lanes sombres et stables.
- [ ] Zone player y=1080–1280 sans lumière dominante.
- [ ] Aucun cercle/token ou losange/obstacle dans le fond.
- [ ] Aucun faux marquage de lane.
- [ ] HUD lisible.
- [ ] Test avec `TrackVisuals`, `BackgroundFX`, tokens, Chain Blocks et obstacles.
- [ ] WebP 828 futur ≤350 KiB ; 414 futur ≤200 KiB.
- [ ] Fallback procédural Phaser conservé.

Rejet immédiat : donnée financière lisible, obstacle visuel sur une lane, fond plus contrasté que la piste, centre blanc brûlé.

## Chain Block

- [ ] PNG transparent 512×512.
- [ ] Marge alpha entre 12 et 16 %.
- [ ] Pivot central `(256,256)`.
- [ ] Silhouette angulaire non circulaire.
- [ ] Noyau visible aux tailles 128, 64 et 32.
- [ ] Pas plus de trois niveaux de détail.
- [ ] Aucun trait apparent inférieur à 2 px à 32.
- [ ] Distinct du token, obstacle, Shield, Magnet, Life Orb et player.
- [ ] Alpha contrôlé sur fond sombre et clair.
- [ ] 128 ≤70 KiB ; 64 ≤35 KiB ; 32 ≤18 KiB.
- [ ] Fallback `makeChainBlock()` conservé.

Rejet immédiat : forme de pièce, symbole, losange danger, noyau perdu à 32 px, halo coupé.

## Finish Portal

- [ ] PNG transparent 512×768.
- [ ] Pivot `(256,676)` documenté.
- [ ] Ouverture minimale 164×430 au master.
- [ ] Centre transparent, pas de porte pleine.
- [ ] Structure lisible à 256×384.
- [ ] Montants ≥10 px visuels à la taille runtime.
- [ ] Base légère ne couvrant pas le joueur.
- [ ] Glow non coupé.
- [ ] Test sur fond `#0C0717`.
- [ ] Aucun texte `FINISH`, drapeau ou décor complet.
- [ ] Runtime 256×384 ≤180 KiB.
- [ ] Halo séparé éventuel ≤80 KiB.
- [ ] Fallback `TrackGate` et texte runtime conservés.

Rejet immédiat : ouverture fermée, texte intégré, base massive, alpha contaminé, portail assimilable à un obstacle.

## Approbation finale

Avant `approved-for-integration`, exiger :

1. validation artistique humaine ;
2. validation gameplay readability ;
3. validation mobile 375×667 et 414×736 ;
4. validation performance/mémoire ;
5. validation juridique et de provenance ;
6. manifest et audit réussis ;
7. fallback vérifié ;
8. commit d’intégration séparé et réversible.
