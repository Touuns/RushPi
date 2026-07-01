On lance la Phase 9F-C de Rush Pi : objectifs multiples + système d’étoiles pour le Campaign Mode.

Contexte :
Rush Pi possède maintenant 3 piliers :
- Time Attack / Daily Run classé
- Survival Mode avec zones, vies, charge, Life Orbs, Track Drift
- Campaign / Chain Journey avec 5 niveaux, progression locale, niveaux verrouillés/débloqués

La Phase 9F a ajouté :
- Level Select
- 5 niveaux Campaign
- Level Complete / Level Failed
- progression localStorage
- badges clear-level

Objectif 9F-C :
Rendre les niveaux Campaign rejouables en ajoutant un système de 1 à 3 étoiles par niveau.

Important :
Cette phase concerne uniquement Campaign.
Ne pas modifier :
- Time Attack / Daily
- Survival
- Training
- leaderboard serveur
- Pi SDK
- paiement Pi
- Supabase endpoints
- scoring Daily
- contrôles
- hitbox/collisions

Principe :
Chaque niveau Campaign peut maintenant être complété avec 1, 2 ou 3 étoiles.

Règle générale :
- 1 étoile = terminer le niveau
- 2 étoiles = réussir un objectif secondaire
- 3 étoiles = réussir un objectif de maîtrise

Les étoiles doivent être sauvegardées localement.

Niveaux actuels et objectifs proposés :

Level 1 — Genesis Lane
- 1★ : Reach the finish
- 2★ : Collect at least 20 energies
- 3★ : Finish with 2 lives or more

Level 2 — Orange Chain
- 1★ : Reach the finish
- 2★ : Finish with at least 1 life
- 3★ : Finish with 2 lives or more

Level 3 — Smart Layer
- 1★ : Reach the finish
- 2★ : Collect at least 25 energies
- 3★ : Reach charge level 4 or higher

Level 4 — Neon Speednet
- 1★ : Reach the finish
- 2★ : Keep combo 15 or higher at least once
- 3★ : Finish with 2 lives or more

Level 5 — Stable Grid
- 1★ : Reach the finish
- 2★ : Finish with 2 lives or more
- 3★ : Finish with 3 lives

UI Level Select :
Chaque carte de niveau doit afficher :
- niveau verrouillé/déverrouillé
- nom du niveau
- objectif principal
- meilleur score local
- nombre d’étoiles obtenues : ☆☆☆ / ★☆☆ / ★★☆ / ★★★
- badge/check si terminé

Écran Level Complete :
Afficher :
- Level Complete
- score
- objectifs réussis
- étoiles obtenues cette run
- meilleur nombre d’étoiles sur ce niveau
- si nouveau record : “New best!”
- si nouvelles étoiles : “New stars earned!”
- boutons : Retry, Next Level, Back to Campaign

Écran Level Failed :
Afficher :
- Level Failed
- raison : out of lives / objective failed
- progression
- Retry
- Back to Campaign

Stockage local :
Étendre campaign localStorage :
- starsByLevel: Record<levelId, number>
- bestScoreByLevel existe déjà
- completed[] existe déjà

Important :
Si un joueur avait déjà terminé un niveau avant cette mise à jour, ne pas casser sa progression.
À la migration :
- niveau completed = au moins 1 étoile
- garder unlockedLevel
- garder bestScoreByLevel

Badges :
Ne pas ajouter trop de badges maintenant.
Ajouter seulement si simple :
- First 3-Star : obtenir 3 étoiles sur un niveau
- Perfect Genesis : obtenir 3 étoiles sur Level 1
- Campaign Collector : obtenir 10 étoiles au total

Si cela complique trop, reporter les badges à 9F-E.

Gameplay :
Ne pas changer la mécanique des niveaux.
On ajoute seulement l’évaluation des objectifs en fin de run.

Données nécessaires dans GameResult :
Vérifie que le résultat Campaign contient déjà :
- score
- energies collected
- lives remaining
- max combo
- max charge level reached
- level completed / failed

Si max charge level ou max combo ne sont pas disponibles, les ajouter proprement sans toucher au scoring.

Tests obligatoires :
1. Terminer Level 1 donne au moins 1 étoile.
2. Réussir les objectifs Level 1 donne 2 ou 3 étoiles.
3. Les étoiles s’affichent dans Level Select.
4. Rejouer un niveau avec moins d’étoiles ne réduit pas le record d’étoiles.
5. Rejouer avec plus d’étoiles améliore le record.
6. Progression existante migrée sans crash.
7. Level 2 reste débloqué si Level 1 déjà complété.
8. Level Failed ne donne pas d’étoile.
9. Campaign reste local-only.
10. Time Attack/Daily inchangé.
11. Survival inchangé.
12. Aucun POST leaderboard pour Campaign.
13. Mobile 375x667, 390x844, 412x915.
14. npx tsc --noEmit OK.
15. npm run build OK.

Commit :
git add -A
git commit -m "Add campaign star objectives"
git push

À la fin, donne-moi :
- résumé du système d’étoiles
- objectifs ajoutés par niveau
- fichiers modifiés
- migration localStorage
- badges ajoutés ou reportés
- confirmation que Time Attack/Survival/Daily/leaderboard/Pi SDK/paiement sont inchangés
- résultats des tests