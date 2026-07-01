On lance la Phase 9D de Rush Pi : stages & univers blockchain-inspired pour le Mode Survie.

Contexte :
Rush Pi possède maintenant :
- Time Attack / Daily Run classé
- Training Mode
- Survival Mode local-only
- 3 vies en Survival
- récupération de vie
- Life Orbs
- orbe Pi chargée niveau 1 à 6
- absorption au niveau 6
- Shield / Magnet
- Dynamic Events
- leaderboard serveur pour Daily
- Pi Auth / paiement test
- badges/streaks/profil

Important :
Cette phase 9D concerne uniquement le Mode Survie.
Ne pas modifier :
- Time Attack / Daily Run
- Daily Challenge seed
- 3 tentatives classées
- leaderboard serveur
- endpoints Supabase
- Pi SDK
- paiement Pi
- scoring Daily
- Training Mode sauf bug visuel mineur

Objectif :
Ajouter une progression en stages dans le Mode Survie.
Le joueur doit avoir l’impression de traverser plusieurs réseaux/zones inspirées de l’univers crypto/blockchain, sans utiliser directement les noms ou logos officiels de Bitcoin, Ethereum, Solana, etc.

Principe :
Le joueur contrôle une orbe Pi qui traverse différentes chaînes.
Chaque stage a :
- un nom
- une couleur dominante
- une ambiance visuelle
- un seuil de temps survécu
- un badge associé
- éventuellement une variation légère d’intensité

Stages à créer :

1. Genesis Lane
Temps : 0–45s
Ambiance : violet/doré, stage de départ.
Gameplay : normal.

2. Orange Chain
Temps : 45–90s
Ambiance : orange/or/noir profond.
Inspiration : grande chaîne historique orange, sans nom/logo officiel.
Gameplay : obstacles un peu plus marqués visuellement.

3. Smart Layer
Temps : 90–135s
Ambiance : bleu-violet/cyan/argent.
Inspiration : smart contracts.
Gameplay : patterns un peu plus techniques visuellement.

4. Neon Speednet
Temps : 135–180s
Ambiance : violet/vert néon/cyan.
Inspiration : réseau rapide.
Gameplay : Speed Zone légèrement plus fréquente ou plus visible.

5. Stable Grid
Temps : 180–240s
Ambiance : vert doux/blanc/doré.
Inspiration : stable network.
Gameplay : rythme plus régulier, tension contrôlée.

6. Meme Circuit
Temps : 240–300s
Ambiance : jaune/rose/orange/fun.
Inspiration : meme coins, sans logo ou nom officiel.
Gameplay : plus fun/chaotique visuellement, mais lisible.

7. Privacy Tunnel
Temps : 300–360s
Ambiance : noir/violet sombre/bleu nuit.
Inspiration : privacy network.
Gameplay : ambiance plus sombre, glow plus marqué, sans rendre les objets illisibles.

8. Chain Storm
Temps : 360s+
Ambiance : multi-couleurs contrôlé : violet, or, rouge, cyan.
Inspiration : final multi-chain.
Gameplay : intensité visuelle plus forte, mélange d’événements.

Implémentation :
Créer une structure propre, par exemple :
src/game/stages.ts

Chaque stage doit avoir :
- id
- name
- startTimeMs
- colors/theme
- description courte
- badgeId
- optional intensity multipliers

Ajouter dans theme.ts les couleurs nécessaires si besoin.

HUD :
Afficher discrètement le stage actuel :
“Stage 1 — Genesis Lane”
ou seulement :
“Genesis Lane”

Transition :
Quand le joueur atteint un nouveau stage :
- afficher un floating text ou overlay court :
“Stage 2 — Orange Chain”
- effet visuel bref
- ne pas bloquer le gameplay
- ne pas gêner la lisibilité

Profil / résultat :
Dans le résultat Survival, afficher :
- stage atteint
- meilleur stage atteint
- temps survécu
- score
- charge max si déjà présent ou facile

Stockage local :
Ajouter :
- bestSurvivalStageReached
- bestSurvivalStageName
- stagesReached list si utile

Badges :
Ajouter un badge par stage atteint :
- Genesis Runner
- Orange Chain Runner
- Smart Layer Runner
- Neon Speedster
- Stable Grid Survivor
- Meme Circuit Rider
- Privacy Tunnel Runner
- Chain Storm Survivor

Les badges sont locaux.
Ne pas les envoyer au serveur.

Gameplay :
Garder les variations légères.
Ne pas créer de nouveaux types d’obstacles en 9D.
Ne pas changer la hitbox.
Ne pas rendre le jeu injuste.
L’objectif principal est progression + ambiance + envie de découvrir le stage suivant.

Dynamic Events :
Adapter visuellement les events au stage si simple.
Exemples :
- Neon Speednet peut rendre Speed Zone plus visible.
- Privacy Tunnel peut renforcer Tunnel Pulse.
- Chain Storm peut avoir une intensité visuelle plus forte.
Mais ne pas casser le scheduler existant.

Tests obligatoires :
1. Survival démarre au Stage 1.
2. À 45s, passage Stage 2.
3. À 90s, passage Stage 3.
4. Transition affichée sans bloquer le jeu.
5. HUD stage lisible.
6. Résultat affiche le stage atteint.
7. Best stage sauvegardé localement.
8. Badges de stage débloqués.
9. Time Attack/Daily inchangé.
10. Training inchangé.
11. Survival reste local-only.
12. Aucun endpoint Supabase modifié.
13. Pi SDK / paiement inchangés.
14. Mobile 375x667, 390x844, 412x915.
15. npx tsc --noEmit OK.
16. npm run build OK.

Commit :
git add -A
git commit -m "Add survival stages"
git push

À la fin, donne-moi :
- résumé des stages ajoutés
- fichiers modifiés
- comportement des transitions
- badges ajoutés
- données localStorage ajoutées
- confirmation que Daily/Time Attack/leaderboard/Pi SDK/paiement n’ont pas été modifiés
- résultats des tests