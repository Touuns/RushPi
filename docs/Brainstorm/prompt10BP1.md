On lance la Phase 10B-P1 de Rush Pi : polish clarté immédiate.

Contexte :
La Phase 10A a identifié les problèmes prioritaires suivants :
1. Home trop long sur mobile 375x667 : Campaign n’est pas visible sans scroll.
2. Les 3 modes principaux ne sont pas assez clairement groupés.
3. Daily / Time Attack peut être confus.
4. Les objectifs Campaign 1★ / 2★ / 3★ ne sont pas visibles avant ou pendant le niveau.
5. Il ne faut pas encore toucher à l’équilibrage ou au gameplay.

Objectif de cette phase :
Améliorer la clarté immédiate sans modifier le gameplay.

Important :
Ne pas modifier :
- scoring
- collisions
- hitbox
- contrôles
- Daily seed
- leaderboard serveur
- Pi SDK
- paiement Pi
- Supabase endpoints
- objectifs numériques des niveaux
- difficulté
- logique Survival
- logique Campaign
- localStorage sauf si strictement nécessaire pour l’affichage

Partie 1 — Home compact et clair

Le Home doit afficher les 3 modes principaux beaucoup plus haut, surtout sur 375x667.

Réorganiser le Home en sections :

Section principale :
“Game Modes”

Avec 3 cartes/boutons visibles rapidement :
1. Daily Run
Sous-titre :
“60s · Ranked · new course daily”

2. Survival
Sous-titre :
“Endless run · 3 lives · zones & charge”

3. Campaign
Sous-titre :
“Beat levels · earn ★ · saved progress”

Ces 3 modes doivent être visuellement plus importants que Training / Leaderboard.

Section secondaire :
“More”
Avec :
- Training
- Leaderboard
- Profile / stats si applicable
- Pi connection / payment test si déjà présent

Objectif mobile :
Sur un écran 375x667, les 3 modes principaux doivent être visibles sans devoir scroller beaucoup.
Réduire si nécessaire :
- taille du logo
- marges verticales
- hauteur du bloc profil
- hauteur du bloc best score
- hints trop longs

Ne pas supprimer les informations utiles, mais les rendre plus compactes.

Partie 2 — Clarifier Daily / Time Attack

Garder un seul vocabulaire visible principal :
“Daily Run”

Mais son sous-titre doit expliquer :
“60s · Ranked · new course daily”

Éviter que l’utilisateur pense que Daily Run et Time Attack sont deux modes différents.

Si “Time Attack” apparaît encore dans certains endroits, il peut rester comme description secondaire, mais pas comme mode séparé.

Partie 3 — Objectifs Campaign visibles avant de jouer

Dans Campaign Level Select, chaque carte de niveau doit afficher les 3 objectifs :
- 1★ objectif principal
- 2★ objectif secondaire
- 3★ objectif maîtrise

Exemple :
Level 1 — Genesis Lane
★ Reach the finish
★★ Collect 20 energies
★★★ Finish with 2 lives+

Garder la carte compacte sur mobile.
Si le texte devient trop long, utiliser des labels courts.

Afficher aussi :
- étoiles déjà obtenues
- best score
- locked/unlocked/completed
- “can improve” si terminé avec moins de 3 étoiles

Partie 4 — Objectifs Campaign visibles au lancement du niveau

La bannière d’intro Campaign doit afficher les objectifs du niveau, pas seulement “Reach the finish”.

Exemple :
Level 3 — Smart Layer
★ Reach the finish
★★ Collect 25 energies
★★★ Reach charge level 4+

L’overlay doit rester court, lisible, et ne pas bloquer trop longtemps.
S’il y a déjà une bannière, l’étendre proprement.
Ne pas créer une grosse modale lourde.

Partie 5 — Badges Ranked / Local à l’entrée des modes

Ajouter si simple des petits labels visuels :
- Daily Run : Ranked
- Survival : Local
- Campaign : Local

Le but est que le joueur comprenne que seul Daily Run est classé serveur.

Ne pas modifier la logique serveur.
Ne pas envoyer Survival ou Campaign au leaderboard.

Tests obligatoires :
1. Home 375x667 : les 3 modes principaux sont visibles rapidement.
2. Home 390x844 et 412x915 : layout propre.
3. Daily Run sous-titre clair : “60s · Ranked · new course daily”.
4. Survival sous-titre clair.
5. Campaign sous-titre clair.
6. Training/Leaderboard restent accessibles.
7. Campaign Level Select affiche les objectifs 1★/2★/3★.
8. Les objectifs restent lisibles sur 375x667.
9. Bannière de début Campaign affiche les 3 objectifs.
10. Lancer un niveau Campaign fonctionne comme avant.
11. Level Complete / Failed fonctionne comme avant.
12. Survival fonctionne comme avant.
13. Daily fonctionne comme avant.
14. Training fonctionne comme avant.
15. Aucun POST serveur pour Campaign/Survival.
16. Pi SDK / paiement / Supabase endpoints inchangés.
17. npx tsc --noEmit OK.
18. npm run build OK.

Commit :
git add -A
git commit -m "Polish home and campaign objectives"
git push

À la fin, donne-moi :
- résumé des changements Home
- résumé des changements Campaign objectives
- fichiers modifiés
- confirmation qu’aucun gameplay/équilibrage n’a été modifié
- confirmation Daily/Survival/Campaign/Training OK
- résultats des tests mobile
- tsc/build