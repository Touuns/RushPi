# Phase 12A-0B-P2 — Daily Market Tunnel candidates

Statut corrigé après décision humaine : Primary v1 `needs-revision`, Cyan v1 et Amber v1 `rejected`, Primary v2 `needs-review`. Aucune candidate n’est approuvée pour traitement ou intégration.

## Correctif 12A-0B-P2.1 — Primary v2

- Outil : génération d’images OpenAI via le workflow Codex `imagegen`.
- Tentatives : 1 génération; 0 génération rejetée avant sélection.
- Dimension native : `941×1672`, PNG sRGB opaque.
- Recadrage : rectangle `(x=2, y=0, largeur=936, hauteur=1664)`.
- Source conservée : `99,47 %` de la largeur et `99,52 %` de la hauteur.
- Facteur uniforme final : `0,884615` vers `828×1472`; aucun étirement.
- Horizon final observé : `y≈255`, dans la plage `220–270`.
- Corridor : champ aubergine/violet atmosphérique continu, sans bordure structurelle, rail, lane, objet ou guide perspectif.
- Zone joueur : sombre, vide et calme.
- Faux rails : absents.
- Ligne horizontale concurrente à l’horizon : absente; le halo est diffus.
- Faux collectibles : aucun token, cercle, losange, obstacle ou bloc assimilable à un Chain Block dans la zone jouable.
- `falseGameplayElementsAbsent = true`.
- Différence avec Home Primary : architecture latérale plus monumentale, profondeur atmosphérique active et orientation course, tout en évitant une piste peinte.
- Simulation : la piste procédurale, les trois lanes, les chevrons et les objets de gameplay dominent clairement le fond.
- Tailles logiques : conforme à `375×667` et `414×736`.
- Recommandation : meilleure candidate Daily pour validation humaine, avec statut initial maintenu à `needs-review`.

### Comparaison Primary v1 / v2

Primary v1 conserve une profondeur tunnel plus explicitement architecturale, mais ses deux bordures convergentes imitent des rails. Primary v2 remplace cette construction par un gradient atmosphérique central et des architectures strictement périphériques. La v2 est légèrement moins démonstrative en isolation, mais nettement plus sûre derrière le rendu Phaser.

### Décision humaine appliquée aux v1

- Primary v1 : `needs-revision`, non approuvée pour processing.
- Cyan v1 : `rejected`, conservée uniquement comme référence de palette cyan.
- Amber v1 : `rejected`, conservée uniquement comme référence de palette chaude.

## Méthode

- Outil : génération d’images OpenAI via le workflow Codex `imagegen`.
- Générations : trois appels autonomes, sans image de référence transmise.
- Sortie native de chaque appel : PNG sRGB opaque `941×1672`.
- Traitement commun : recadrage central exact `648×1152` (9:16), puis redimensionnement uniforme Lanczos vers `828×1472`, suppression des métadonnées et confirmation de l’absence d’alpha.
- Recadrages verticaux : Primary `x=146, y=405`; Cyan `x=146, y=275`; Amber `x=146, y=135`.
- La différence de décalage vertical replace le point de fuite natif dans la plage fonctionnelle sans déplacer ni déformer un élément.
- Previews : WebP `414×736`, qualité 82; guides et comparaison exclusivement documentaires.

## Prompts réellement utilisés

Les prompts sont ceux de la mission, exécutés séparément. Le prompt Primary décrit un tunnel monumental blockchain nocturne, un horizon `y=220–270`, le trapèze protégé `(230,236) (598,236) (780,1280) (48,1280)`, une base aubergine/violette, du cyan périphérique et de rares accents ambre. Il interdit explicitement texte, logo, données financières, objets circulaires, losanges, obstacles, portail, route, lanes et centre brûlé.

Le prompt Cyan demande un tunnel analytique violet-noir, des infrastructures cyan/bleu électrique uniquement sur les côtés, un horizon `y=220–270`, un corridor central stable et sombre et une zone joueur `y=1080–1280` calme. Il interdit notamment wash cyan, centre blanc, tokens, portail, route, rails, lanes et interface financière.

Le prompt Amber demande un tunnel aubergine/violet avec nœuds, blocs périphériques et canaux orange/ambre restreints hors corridor, horizon `y=220–270`, corridor et zone joueur sombres. Il interdit notamment wash orange, lave, casino, tokens, portail, route, lanes, dashboard et glow excessif.

Les formulations anglaises intégrales utilisées sont conservées dans la mission `docs/Brainstorm/Codex-Prompt12A-OB-P2.md`, sections Candidate 1, 2 et 3; aucun ajout positif susceptible d’altérer ces contraintes n’a été appliqué.

## Primary

- Master : `daily-market-tunnel-primary-candidate-v1.png` — `828×1472`, 1 218 632 octets.
- Preview : 15 910 octets; guides : 20 796 octets.
- Horizon observé : `y≈248`, conforme.
- HUD : sombre, sans point brûlé ni détail critique.
- Corridor : vide, sombre et stable; aucun bloc, cercle, losange, portail ou nœud focal.
- Zone joueur : très sombre et calme.
- Faux gameplay : deux bordures architecturales convergentes peuvent être perçues comme une piste sous la piste procédurale.
- Couleur : violet/bleu dominant, cyan périphérique lisible, ambre rare.
- Différence avec Home Primary : profondeur tunnel nettement plus forte, anneaux et fuite directionnelle; aucune composition de support d’interface statique.
- Simulation : joueur, tokens, obstacles, Shield et Chain Blocks restent distincts; la piste procédurale domine, mais les bordures du fond épaississent visuellement ses rails.
- Recommandation : candidate préférée pour la revue humaine.

## Cyan

- Master : `daily-market-tunnel-cyan-candidate-v1.png` — `828×1472`, 928 286 octets.
- Preview : 15 166 octets; guides : 20 226 octets.
- Horizon observé : `y≈252`, conforme.
- HUD : lisible et sombre.
- Corridor : libre d’objets; zone centrale très calme.
- Zone joueur : la plus sombre des trois.
- Faux gameplay : ligne lumineuse horizontale au point de fuite et doubles contours violets assimilables à des rails.
- Couleur : séparation cyan latérale propre, presque aucun orange, sans wash uniforme.
- Différence avec Home Primary : perspective technique et répétition de cadres beaucoup plus dynamiques.
- Simulation : silhouettes de jeu très lisibles; le bord lointain procédural est toutefois concurrencé par la ligne cyan native.
- Recommandation : conserver pour revue, derrière Primary.

## Amber

- Master : `daily-market-tunnel-amber-candidate-v1.png` — `828×1472`, 1 049 000 octets.
- Preview : 13 944 octets; guides : 19 472 octets.
- Horizon observé : `y≈250`, conforme.
- HUD : lisible, sans source majeure.
- Corridor : sombre, stable, sans objet focal.
- Zone joueur : sombre et silencieuse.
- Faux gameplay : blocs ambrés périphériques proches de la silhouette des Chain Blocks; bordures de corridor assimilables à des rails.
- Couleur : ambre présent comme accent latéral, base violet-noir dominante, petites touches cyan; aucune ambiance casino ou lave.
- Différence avec Home Primary : infrastructure active et perspective de course, contre architecture Home calme.
- Simulation : piste, joueur, tokens et obstacles lisibles; les Chain Blocks demandent une vérification attentive près des blocs latéraux.
- Recommandation : conserver pour revue comme option chaude.

## Contrôle aux tailles logiques

- `414×736` : les trois variantes conservent horizon, corridor et zone joueur; le HUD simulé et les objets restent lisibles.
- `375×667` : la réduction ne coupe aucun élément fonctionnel; les problèmes de faux rails restent visibles et donc évaluables.
- Les guides affichent HUD, plage d’horizon, trapèze protégé, zone joueur et centres approximatifs des trois lanes.

## Décision Codex

Ordre recommandé : Primary, Amber, Cyan. Aucune candidate n’est rejetée automatiquement : toutes fournissent une base fonctionnelle et doivent rester disponibles pour la décision humaine. Primary est la plus équilibrée; Amber est la meilleure alternative chaude; Cyan est la plus analytique mais présente la concurrence la plus nette au bord lointain de la piste.

## Garde-fous

- Aucun fichier runtime n’est créé ou référencé.
- Aucun fichier sous `src/`, `api/`, `supabase/` ou `public/assets/rushpi/` n’est modifié.
- Les trois masters et tous les documents Home restent hors du périmètre de modification.
- Les trois images Daily ont le statut `needs-review`.
- `integrationAllowed` reste `false`.
