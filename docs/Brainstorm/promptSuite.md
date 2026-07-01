On lance la Phase 9F : Campaign Mode / Level Progression.

Contexte :
Rush Pi possède déjà :
- Time Attack / Daily Run
- Training Mode
- Survival Mode
- Survival zones actuellement appelées stages
- 3 vies en Survival
- charge levels
- Life Orbs
- Shield/Magnet
- Dynamic Events
- Track Drift
- leaderboard serveur pour Daily
- Pi Auth / paiement test

Retour utilisateur important :
Les “stages” actuels du mode Survival ne sont pas suffisamment clairs comme vrais niveaux. Ils apparaissent seulement pendant une longue run. L’objectif maintenant est d’ajouter un vrai mode de progression par niveaux : le joueur termine le niveau 1, ça se sauvegarde, il débloque le niveau 2, puis le niveau 3, etc. Il peut revenir plus tard et continuer sa progression.

Important :
Ne pas supprimer le Survival Mode.
Ne pas casser Time Attack / Daily.
Ne pas modifier leaderboard serveur.
Ne pas modifier Pi SDK / paiement.
Ne pas modifier Supabase endpoints.
Ne pas envoyer Campaign au serveur pour l’instant.
Campaign est local-only.

Partie A — Clarifier Survival
Renommer dans l’UI Survival :
- “Stage Reached” devient “Zone Reached”
- “Best Stage” devient “Farthest Zone”
Les stages actuels deviennent des zones/biomes de Survival.
Ne pas changer leur logique, seulement les libellés si nécessaire.

Partie B — Ajouter Campaign Mode MVP
Ajouter un nouveau mode :
Campaign Mode
ou
Chain Journey

Ce mode doit être accessible depuis l’accueil avec un bouton :
“Campaign”

Principe :
- Le joueur choisit un niveau.
- Au début, seul le niveau 1 est débloqué.
- Quand le joueur termine le niveau 1, le niveau 2 se débloque.
- La progression est sauvegardée en localStorage.
- Le joueur peut revenir plus tard et continuer.

Créer 5 premiers niveaux :

Level 1 — Genesis Lane
Objectif : Reach the finish
Durée cible : 45s
Ambiance : violet/doré
Difficulté : facile

Level 2 — Orange Chain
Objectif : Reach the finish with at least 1 life
Durée cible : 50s
Ambiance : orange/or
Difficulté : facile+

Level 3 — Smart Layer
Objectif : Collect 25 energies and reach the finish
Durée cible : 55s
Ambiance : bleu/cyan
Difficulté : normale

Level 4 — Neon Speednet
Objectif : Reach the finish
Durée cible : 60s
Ambiance : néon vert/cyan
Difficulté : plus rapide visuellement

Level 5 — Stable Grid
Objectif : Finish with 2 lives or more
Durée cible : 60s
Ambiance : vert doux/blanc/doré
Difficulté : normale+

Écran de sélection des niveaux :
Créer un écran Campaign / Level Select avec :
- cartes de niveaux
- niveau débloqué/verrouillé
- nom du niveau
- objectif court
- meilleur score local si terminé
- badge ou check si terminé
- bouton Back Home

Au lancement d’un niveau :
Afficher un overlay court :
“Level 1 — Genesis Lane”
“Objective: Reach the finish”

Pendant le niveau :
- HUD affiche le niveau actuel
- afficher la progression vers la fin, par exemple une barre ou “Progress 40%”
- pas de timer Daily 60s
- vies visibles
- charge visible si réutilisée

Fin de niveau :
Si le joueur atteint la durée/distance cible et remplit l’objectif :
Afficher :
“Level Complete”
Score
Objective completed
Energies collected
Lives remaining
Next Level

Si le joueur perd toutes ses vies ou échoue à l’objectif :
Afficher :
“Level Failed”
Retry
Back to Campaign

Progression :
Stocker en localStorage :
- unlockedCampaignLevel
- completedLevels
- bestScoreByLevel
- bestStarsByLevel si tu ajoutes des étoiles
- campaignBadges si nécessaire

Pour cette première version :
- pas besoin d’étoiles complexes
- un simple completed/unlocked suffit
- si simple, ajouter une étoile unique “completed”

Gameplay :
Réutiliser le moteur Survival comme base :
- vies
- Shield/Magnet
- charge
- Life Orb si compatible
Mais adapter la fin :
- le niveau se termine quand la durée cible est atteinte
- pas de run infinie

Important :
Campaign est local-only.
Ne pas envoyer les scores Campaign au serveur.
Ne pas modifier le Daily leaderboard.

Badges simples :
Ajouter si propre :
- Genesis Clear
- Orange Chain Clear
- Smart Layer Clear
- Neon Speednet Clear
- Stable Grid Clear

Tests obligatoires :
1. Home affiche Campaign.
2. Level Select affiche 5 niveaux.
3. Au début seul Level 1 est débloqué.
4. Terminer Level 1 débloque Level 2.
5. Progression persistante après refresh.
6. Niveau verrouillé non lançable.
7. Level Complete fonctionne.
8. Level Failed fonctionne.
9. Survival continue de fonctionner.
10. Time Attack/Daily continue de fonctionner.
11. Training continue de fonctionner.
12. Campaign ne poste rien au serveur.
13. Pi SDK/paiement inchangés.
14. Mobile 375x667 / 390x844 / 412x915.
15. npx tsc --noEmit OK.
16. npm run build OK.

Commit :
git add -A
git commit -m "Add campaign level progression"
git push

À la fin, donne-moi :
- fichiers modifiés
- résumé du Campaign Mode
- niveaux ajoutés
- données localStorage ajoutées
- confirmation que Survival/Time Attack/Daily/leaderboard/Pi SDK/paiement sont inchangés
- résultats des tests

Donc ma réponse claire : on ne refait pas 9E, on l’adapte légèrement en renommant les stages Survival en “zones”, puis on lance 9F avec un vrai mode Campaign par niveaux. C’est la meilleure manière de respecter ton idée sans casser tout ce qui marche déjà.