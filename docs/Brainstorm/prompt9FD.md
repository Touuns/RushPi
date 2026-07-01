On lance la Phase 9F-D de Rush Pi : ajouter les niveaux Campaign 6 à 8 pour compléter la Saison 1.

Contexte :
Rush Pi possède maintenant :
- Time Attack / Daily Run classé
- Survival Mode avec zones, vies, charge, Life Orbs, Track Drift
- Campaign / Chain Journey avec 5 niveaux
- progression Campaign locale
- objectifs multiples
- système d’étoiles 1 à 3 par niveau
- badges First 3-Star et Perfect Genesis

La Phase 9F-C a ajouté :
- starsByLevel
- computeStars
- objectifs 1★ / 2★ / 3★
- migration des anciennes saves
- UI étoiles dans Level Select et ResultScreen

Objectif 9F-D :
Ajouter les niveaux 6, 7 et 8 au Campaign Mode pour compléter la première série de niveaux blockchain-inspired.

Important :
Cette phase concerne uniquement Campaign.
Ne pas modifier :
- Time Attack / Daily
- Survival
- Training
- leaderboard serveur
- Supabase endpoints
- Pi SDK
- paiement Pi
- scoring Daily
- hitbox
- collisions
- contrôles
- système de vies/charge hors Campaign

Campaign reste local-only.
Ne jamais envoyer les scores Campaign au serveur.

Niveaux à ajouter :

Level 6 — Meme Circuit
Ambiance : rose / jaune / orange, fun, énergique.
Inspiration : univers meme coins, sans utiliser de nom/logo officiel.
Durée : 65 secondes.
Difficulté : normale+.
Objectifs :
- 1★ : Reach the finish
- 2★ : Collect at least 35 energies
- 3★ : Reach charge level 5 or higher

Personnalité :
- visuel plus fun
- particules plus visibles si déjà supporté
- ne pas rendre l’écran illisible

Level 7 — Privacy Tunnel
Ambiance : noir / violet sombre / bleu nuit.
Inspiration : réseau privé / tunnel sombre, sans nom/logo officiel.
Durée : 70 secondes.
Difficulté : difficile mais lisible.
Objectifs :
- 1★ : Reach the finish
- 2★ : Finish with at least 1 life
- 3★ : Finish with 2 lives or more

Personnalité :
- ambiance plus sombre
- glow plus marqué
- attention : les objets doivent rester clairement visibles

Level 8 — Chain Storm
Ambiance : violet / or / rouge / cyan, final multi-chain.
Inspiration : tempête finale blockchain.
Durée : 75 secondes.
Difficulté : finale de Saison 1.
Objectifs :
- 1★ : Reach the finish
- 2★ : Collect at least 40 energies
- 3★ : Finish with 2 lives or more and reach charge level 5+

Personnalité :
- intensité visuelle plus forte
- Track Drift plus visible si déjà utilisé par le niveau
- rester jouable, pas injuste

UI Level Select :
- Afficher maintenant 8 niveaux.
- Les niveaux 6 à 8 doivent être verrouillés tant que les précédents ne sont pas terminés.
- Le comportement doit rester identique :
  - finir Level 5 débloque Level 6
  - finir Level 6 débloque Level 7
  - finir Level 7 débloque Level 8
  - finir Level 8 marque la fin de la Saison 1

Fin du Level 8 :
Si Level 8 est terminé :
- afficher Level Complete normalement
- ne pas afficher Next Level si aucun niveau suivant
- afficher plutôt un message du type :
  “Season 1 Complete”
  ou
  “Chain Journey Complete”
- boutons :
  Retry
  Back to Campaign

Badges :
Ajouter si propre :
- Meme Circuit Clear
- Privacy Tunnel Clear
- Chain Storm Clear
- Season 1 Complete

Ne pas ajouter encore Campaign Collector.
Le badge Campaign Collector sera pour 9F-E, quand on fera le profil progression campagne et le total d’étoiles.

Stockage local :
Le système existant doit fonctionner automatiquement avec les nouveaux niveaux :
- completed[]
- unlockedLevel
- bestScoreByLevel
- starsByLevel

Vérifier que la migration ne casse pas les anciennes saves à 5 niveaux.

Important équilibrage :
Ne pas rendre les niveaux 6 à 8 trop longs ou impossibles.
Ils doivent être plus difficiles, mais encore testables sur mobile.
Durées recommandées :
- Level 6 : 65s
- Level 7 : 70s
- Level 8 : 75s

Tests obligatoires :
1. Level Select affiche 8 niveaux.
2. Ancienne progression à 5 niveaux ne crash pas.
3. Level 6 est verrouillé si Level 5 non terminé.
4. Terminer Level 5 débloque Level 6.
5. Terminer Level 6 débloque Level 7.
6. Terminer Level 7 débloque Level 8.
7. Terminer Level 8 affiche Season 1 Complete ou Chain Journey Complete.
8. Les étoiles fonctionnent sur Levels 6, 7 et 8.
9. Rejouer avec moins d’étoiles ne réduit pas le record.
10. Rejouer avec plus d’étoiles améliore le record.
11. Badges clear des nouveaux niveaux fonctionnent.
12. Time Attack/Daily inchangé.
13. Survival inchangé.
14. Training inchangé.
15. Campaign reste local-only.
16. Aucun POST leaderboard pour Campaign.
17. Pi SDK / paiement / Supabase endpoints inchangés.
18. Mobile 375x667, 390x844, 412x915.
19. npx tsc --noEmit OK.
20. npm run build OK.

Commit :
git add -A
git commit -m "Add final campaign season one levels"
git push

À la fin, donne-moi :
- résumé des niveaux 6 à 8
- objectifs 1★ / 2★ / 3★ par niveau
- fichiers modifiés
- badges ajoutés
- comportement de fin du Level 8
- confirmation que Time Attack/Survival/Daily/leaderboard/Pi SDK/paiement sont inchangés
- résultats des tests