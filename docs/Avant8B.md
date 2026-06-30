Phase 8A-Balance Check

Objectif :
Vérifier que l’ajout de Shield et Magnet ne casse pas l’équilibrage serveur, le scoring plausible et le leaderboard.

À tester :
- faire plusieurs Daily Runs avec Magnet bien utilisé
- noter les meilleurs scores possibles
- vérifier que le submit-score serveur accepte les scores légitimes
- vérifier que l’anti-cheat ne refuse pas un score élevé mais normal
- vérifier que le Daily Leaderboard affiche correctement ces scores
- vérifier que le score max plausible côté serveur reste cohérent avec les nouveaux power-ups

Ne pas modifier le gameplay sauf si nécessaire.
Ne pas toucher à Pi SDK, paiement, Supabase schema ou UI.
Si une limite anti-cheat est trop basse, l’ajuster prudemment avec commentaire clair.
Lancer npx tsc --noEmit et npm run build.
Commit si modification.