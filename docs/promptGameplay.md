On lance la Phase 8A de Rush Pi : gameplay variety light.

Contexte :
Rush Pi a maintenant une vraie piste en perspective et un bon ressenti de course. Le joueur a l’impression d’avancer sur une piste, ce qui est beaucoup mieux. Le problème restant : le gameplay peut devenir répétitif, car le joueur fait surtout gauche/droite pendant 60 secondes.

Objectif :
Ajouter de la variété visuelle et deux power-ups simples, tout en conservant la simplicité du jeu, le scoring existant, le Daily Challenge seedé et l’équité du leaderboard.

Important :
Ne pas casser :
- Daily Challenge seedé
- 3 tentatives classées/jour
- leaderboard serveur
- scoring actuel
- collisions actuelles
- Pi SDK
- paiement Pi
- endpoints Supabase

Ne pas ajouter :
- nouveaux boutons de gameplay
- mécaniques trop complexes
- pay-to-win
- power-ups non déterministes
- effets lourds qui cassent la fluidité mobile

1. Background vivant léger

Ajouter un fond plus vivant derrière la piste :
- particules très légères mauves/dorées
- petites étoiles/points énergétiques
- lignes abstraites discrètes
- halos très subtils
- aucun élément ne doit gêner la lecture de la piste

Le fond doit donner une impression de vitesse/espace/tunnel énergétique, mais rester discret.

2. Phases visuelles pendant la course

Découper visuellement la run de 60 secondes en phases :
- 0–15s : normal
- 15–30s : plus de particules/lignes
- 30–45s : ambiance plus intense, premiers power-ups possibles
- 45–60s : final intense, glow plus marqué, vitesse ressentie plus forte

Ces phases sont surtout visuelles. Ne pas modifier la difficulté réelle sauf si elle existe déjà.

3. Power-up Shield / Immunity Orb

Ajouter un power-up rare : Shield Orb.

Apparence :
- orbe bleu/cyan ou doré avec anneau protecteur
- clairement différent des énergies et obstacles

Effet :
- quand collecté, le joueur reçoit un bouclier
- le bouclier absorbe un seul impact avec un obstacle
- si aucun impact ne se produit, le bouclier expire après 5 secondes
- pendant le bouclier, afficher un anneau autour du joueur
- si un obstacle est absorbé, afficher un petit effet de rupture du bouclier

Règle recommandée :
- le bouclier évite la pénalité de l’obstacle
- le bouclier peut préserver le combo, ou au minimum éviter le reset combo
- ne pas donner directement de points bonus

Important :
Le Shield doit être généré de manière déterministe via la seed du Daily Challenge. Tous les joueurs doivent avoir les mêmes opportunités.

4. Power-up Magnet / Energy Pull

Ajouter un power-up rare : Magnet Orb.

Apparence :
- orbe violet/orange avec petites particules circulaires
- différent du Shield

Effet :
- pendant 4 secondes, les énergies proches sont attirées vers le joueur
- effet visuel agréable mais léger
- ne doit pas attirer les obstacles
- ne doit pas rendre le jeu illisible

Important :
Le Magnet doit aussi être généré de manière déterministe via la seed Daily.

5. États visuels du joueur

Améliorer l’orbe joueur selon son état :
- normal : orbe violet actuel
- shield actif : anneau protecteur autour du joueur
- magnet actif : petites particules attirées vers le joueur
- combo élevé : aura légèrement plus forte
- final 15 secondes : traînée un peu plus intense

Ne pas changer la hitbox.

6. UI minimale pour power-ups

Afficher discrètement les effets actifs :
- Shield: “Shield”
- Magnet: “Magnet”
avec une petite jauge ou un timer très simple si facile.

Ne pas surcharger le HUD.

7. Déterminisme

Pour Daily Run :
- ne jamais utiliser Math.random pour les power-ups
- utiliser le générateur seedé existant
- les power-ups doivent apparaître au même moment et dans la même lane pour tous les joueurs

Pour Training Mode :
- peut utiliser une seed d’entraînement ou une seed générée proprement

8. Équilibrage initial

Shield :
- apparition possible à partir de 20 secondes
- maximum 1 ou 2 par run

Magnet :
- apparition possible à partir de 25 secondes
- maximum 1 ou 2 par run

Il ne faut pas trop en mettre. Le but est de créer de la surprise, pas de transformer le jeu.

9. Tests obligatoires

Tester :
- Daily Run : power-ups apparaissent de manière déterministe
- Training Mode fonctionne
- Shield absorbe bien un obstacle
- Shield expire correctement
- Magnet attire seulement les énergies
- score et collisions restent cohérents
- leaderboard serveur fonctionne toujours
- pas de crash mobile
- lisibilité sur 375x667, 390x844, 412x915
- npx tsc --noEmit
- npm run build

10. Commit

git add -A
git commit -m "Add light gameplay variety and powerups"
git push

À la fin, donne-moi :
- résumé des changements
- fichiers modifiés
- comportement Shield
- comportement Magnet
- impact sur scoring
- confirmation que le Daily Challenge reste déterministe
- résultats des tests