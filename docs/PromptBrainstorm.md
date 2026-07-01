On lance la Phase 9A de Rush Pi : amélioration des contrôles mobiles.

Contexte global du projet :
Rush Pi est un runner mobile-first dans l’écosystème Pi Browser. Le joueur contrôle une orbe/jeton Pi sur une piste futuriste en 3 voies. Le jeu possède déjà :
- piste en perspective
- Daily Challenge seedé
- 3 tentatives classées par jour
- leaderboard serveur Supabase
- connexion Pi
- paiement test Pi validé
- streaks
- badges
- power-ups Shield/Magnet
- événements dynamiques seedés
- phases visuelles pendant la course

Vision future Phase 9 :
Plus tard, Rush Pi évoluera vers un jeu avec plusieurs modes :
- Course contre la montre : mode actuel 60 secondes
- Mode Survie : 3 vies, progression longue, stages, niveaux, jeton Pi qui se charge
- Stages inspirés de l’univers crypto/blockchain, sans utiliser directement les noms/logos officiels au début
- Orbe Pi qui gagne des niveaux de charge en collectant des énergies/jetons
- À haut niveau de charge, l’orbe pourra encaisser un coup en perdant un niveau plutôt qu’une vie
- Badges nombreux liés aux stages, performances, survie, collecte, streaks, etc.

Mais pour cette phase 9A :
Ne pas implémenter ces fonctionnalités.
On améliore uniquement les contrôles mobiles.

Problème actuel :
Sur mobile, le joueur peut tapoter à gauche/droite ou swiper pour changer de voie. Ça fonctionne, mais ce n’est pas encore assez fluide. Un testeur a remarqué qu’il faudrait pouvoir garder le doigt posé sur l’écran et simplement glisser à gauche ou à droite pour déplacer l’orbe.

Objectif Phase 9A :
Ajouter un contrôle tactile plus naturel :
- l’utilisateur peut poser son doigt sur l’écran
- en gardant le doigt appuyé, il peut glisser vers la gauche ou vers la droite
- l’orbe change de voie selon le déplacement du doigt
- les contrôles existants doivent rester fonctionnels

Contrôles à conserver :
- clavier ← →
- tap zone gauche/droite
- swipe gauche/droite rapide

Nouveau contrôle à ajouter :
- drag/slide continu avec le doigt maintenu sur l’écran

Comportement souhaité :
1. Si le joueur pose le doigt et glisse vers la gauche, l’orbe va vers la voie de gauche.
2. Si le joueur pose le doigt et glisse vers la droite, l’orbe va vers la voie de droite.
3. Si le joueur garde le doigt posé et continue à glisser, il peut passer de gauche → centre → droite ou droite → centre → gauche de manière fluide.
4. Le changement de voie reste discret : 3 voies uniquement.
5. Il ne faut pas que l’orbe suive librement le doigt pixel par pixel. Elle doit toujours se caler sur une voie.
6. Le contrôle doit être fiable même si le doigt bouge légèrement verticalement pendant la course.
7. Il faut éviter les changements de voie involontaires causés par de petits tremblements du doigt.
8. Le tap gauche/droite ne doit pas être cassé.
9. Le swipe rapide ne doit pas être cassé.
10. Le bouton Quit doit rester cliquable et ne pas déclencher un déplacement.

Seuil recommandé :
- Détecter un changement de voie si le doigt se déplace horizontalement d’environ 35 à 45 px depuis le dernier point de référence.
- Après chaque changement de voie, mettre à jour le point de référence pour permettre un slide continu.
Exemple :
Le doigt part au centre.
Il glisse de 40 px à droite → joueur passe centre → droite.
Le point de référence est remis à jour.
S’il glisse ensuite de 40 px à gauche → joueur passe droite → centre.

Architecture :
Implémenter cela proprement dans MainScene ou dans le module de contrôles existant.
Si le code actuel de contrôle est trop intégré à MainScene, créer un petit helper/module si c’est propre, mais ne refactorise pas trop largement.

Important :
Ne pas modifier :
- scoring
- collisions
- spawn
- Daily Challenge seed
- power-ups
- dynamic events
- leaderboard
- Pi SDK
- Supabase endpoints
- paiement Pi
- UI hors instructions de contrôle

Tests obligatoires :
1. Desktop clavier ← → fonctionne toujours.
2. Mobile tap gauche/droite fonctionne toujours.
3. Mobile swipe rapide fonctionne toujours.
4. Mobile doigt posé + slide gauche/droite fonctionne.
5. Passage continu gauche-centre-droite possible.
6. Petits mouvements involontaires ne changent pas de voie.
7. Bouton Quit fonctionne toujours.
8. La piste et les effets restent fluides.
9. Test en 375x667, 390x844, 412x915.
10. npx tsc --noEmit OK.
11. npm run build OK.

À la fin :
- résume les changements
- indique les fichiers modifiés
- confirme que les anciens contrôles fonctionnent encore
- confirme que le nouveau drag/slide fonctionne
- confirme que le gameplay/scoring/seed/leaderboard n’ont pas été modifiés
- fais un commit :
git add -A
git commit -m "Improve mobile drag controls"
git push