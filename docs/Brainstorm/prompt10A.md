On lance la Phase 10A de Rush Pi : audit polish, UX, lisibilité mobile et équilibrage.

Contexte :
Rush Pi possède maintenant :
- Time Attack / Daily Run classé
- Survival Mode avec zones, vies, charge, Life Orbs, Track Drift
- Campaign / Chain Journey complète Saison 1 avec 8 niveaux
- objectifs 1★ / 2★ / 3★
- badges Campaign
- profil avec Chain Journey Progress
- leaderboard serveur uniquement pour Daily
- Pi Auth / paiement test

Objectif de cette phase :
Faire un audit complet de l’expérience utilisateur sans ajouter de grosse fonctionnalité.

Important :
Ne pas coder de grosse feature.
Ne pas modifier le gameplay tant qu’un diagnostic clair n’est pas fait.
Ne pas toucher :
- Pi SDK
- paiement
- Supabase endpoints
- leaderboard serveur
- Daily seed
- scoring serveur
- logique de collision
- hitbox
- contrôles

À analyser :

1. Home Screen
- Est-ce que les 3 modes sont clairs ?
- Time Attack / Daily est-il bien distingué de Survival et Campaign ?
- Est-ce que Campaign est assez visible ?
- Est-ce que le joueur comprend quoi choisir ?

2. Campaign
- Level Select lisible sur mobile ?
- Les niveaux verrouillés/déverrouillés sont-ils clairs ?
- Les étoiles sont-elles compréhensibles ?
- Les objectifs sont-ils visibles avant de lancer ?
- Le bouton Next Level est-il clair ?
- La fin de Saison 1 est-elle assez satisfaisante ?

3. Campaign balance
Analyser les 8 niveaux :
- durée
- objectif 2★
- objectif 3★
- difficulté réelle
- risque de frustration
- objectifs trop faciles ou trop durs

Vérifier notamment :
- Level 3 : 25 énergies + charge 4
- Level 6 : 35 énergies + charge 5
- Level 8 : 40 énergies + 2 vies + charge 5

4. Survival
- Les zones sont-elles compréhensibles maintenant qu’elles ne sont plus appelées stages ?
- Le joueur comprend-il la charge ?
- Le HUD est-il trop chargé ?
- Les Life Orbs sont-elles reconnaissables ?
- Le Track Drift reste-t-il lisible ?

5. Profile
- Chain Journey Progress est-il lisible ?
- Trop dense ou correct ?
- Les étoiles X/24 motivent-elles ?
- Les badges sont-ils compréhensibles ?

6. Mobile readability
Tester / inspecter en formats :
- 375x667
- 390x844
- 412x915

Vérifier :
- boutons
- HUD
- texte
- overlays
- result screens
- level cards
- profile cards

7. Textes / onboarding
Identifier les endroits où le joueur risque de ne pas comprendre :
- charge level
- Shield
- Life Orb
- étoiles Campaign
- différence entre Survival zones et Campaign levels
- Daily classé vs Campaign local-only

Livrable attendu :
Ne fais pas encore de gros changements.
Donne-moi d’abord un rapport structuré avec :
- problèmes critiques
- problèmes moyens
- petits polish
- recommandations d’équilibrage
- fichiers probablement concernés
- changements rapides à faire en 10B

Tu peux proposer quelques micro-corrections si elles sont vraiment évidentes, mais ne les applique pas encore sans les lister.

Tests :
- npm run build
- npx tsc --noEmit
- vérifier qu’aucune erreur console critique n’apparaît

À la fin, donne-moi :
- audit UX
- audit équilibrage Campaign
- audit lisibilité mobile
- recommandations de textes/onboarding
- liste priorisée des corrections 10B