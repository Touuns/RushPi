# Rush Pi Art Preview

Lancer depuis la racine du repository :

```powershell
node tools/art-preview/server.mjs
```

Puis ouvrir `http://127.0.0.1:4174/tools/art-preview/`.

La galerie charge le manifest local des 56 assets existants. La section **12A Production Briefs** charge séparément `public/data/art/phase-12a-production-briefs.json` et affiche uniquement des métadonnées de préparation. Elle ne simule et ne présente aucun asset final.

La section **12A Home Candidates** charge `docs/art/generated/12A_HOME_CANDIDATES_INTAKE.json`. Elle affiche les trois previews documentaires stockées sous `tools/art-preview/generated/`, leurs guides, la planche comparative, les poids et les décisions d'intake. Le bouton de simulation superpose des blocs HTML/CSS documentaires pour tester la lisibilité du header, du profil et des cartes Home ; il ne modifie ni `HomeScreen.tsx` ni les styles du jeu. Aucune de ces images n'est un asset runtime ou `approved-for-integration`.

Validation des briefs :

```powershell
node --check tools/art-preview/validate-production-briefs.mjs
node tools/art-preview/validate-production-briefs.mjs
```

Le validateur utilise seulement les modules intégrés de Node.js. Il contrôle les quatre targets, la base Git attendue, les dimensions, chemins futurs, références au manifest, listes d’exigences, absence d’URL externe et absence de toute approbation d’intégration.
