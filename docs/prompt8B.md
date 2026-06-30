On lance la Phase 8B de Rush Pi : Dynamic Events.

Contexte :
Rush Pi a maintenant :
- piste en perspective
- Daily Challenge seedé
- 3 tentatives classées/jour
- leaderboard serveur Supabase
- Shield + Magnet déterministes
- background vivant léger
- phases visuelles 0–15 / 15–30 / 30–45 / 45–60
- équilibre 8A vérifié : aucun ajustement nécessaire

Objectif :
Ajouter des événements dynamiques seedés pour rendre les runs moins répétitives, tout en gardant le jeu simple, lisible et équitable.

Important :
Ne pas toucher :
- scoring de base
- collisions de base
- endpoints Supabase
- Pi SDK
- paiement Pi
- 3 tentatives/jour
- leaderboard serveur
- logique de connexion Pi
- seed principale obstacles/énergies

Les événements doivent utiliser un flux RNG seedé séparé, comme les power-ups, afin de ne pas modifier la séquence existante des obstacles/énergies.

Événements à ajouter :

1. Speed Zone
But : donner une sensation d’accélération.
Effet principal : visuel.
- chevrons dorés plus rapides
- glow de piste plus fort
- traînée joueur légèrement renforcée
- message discret : “Speed Zone”
- ne pas modifier la vraie vitesse du gameplay pour l’instant

2. Energy Zone
But : moment satisfaisant de collecte.
Effet gameplay léger :
- pendant quelques secondes, augmenter légèrement la fréquence ou densité des énergies
- ne pas créer une explosion de score
- rester dans les bornes anti-cheat déjà documentées
- message discret : “Energy Zone”
- les énergies générées par cet événement doivent être déterministes

3. Danger Zone
But : créer de la tension.
Effet principal : visuel + éventuellement léger gameplay si raisonnable.
- ambiance rouge/violet
- obstacles plus mis en valeur
- glow rouge subtil
- message discret : “Danger Zone”
- ne pas augmenter brutalement la difficulté
- si ajout gameplay, rester très léger et déterministe

4. Tunnel Pulse
But : variation visuelle forte sans impact gameplay.
Effet purement visuel :
- arcs lumineux / tunnel énergétique
- pulsation de l’horizon
- lignes latérales plus visibles
- message discret : “Tunnel Pulse”
- aucun impact sur score, collisions ou vitesse

Règles générales :
- Maximum 2 ou 3 événements par run de 60 secondes.
- Pas d’événements dans les 10 premières secondes.
- Pas d’événements qui se chevauchent au début.
- Durée d’un événement : 4 à 7 secondes.
- Les événements doivent être visibles mais pas envahissants.
- Les obstacles et énergies doivent rester parfaitement lisibles.
- Les événements doivent être identiques pour tous les joueurs en Daily Run.
- Training Mode peut utiliser une seed différente par run.

UI :
Ajouter une petite chip discrète dans le HUD quand un event est actif :
- “Speed Zone”
- “Energy Zone”
- “Danger Zone”
- “Tunnel Pulse”

Si un power-up est actif en même temps, éviter de surcharger le HUD. Priorité à la lisibilité.

Architecture :
Créer si utile :
- src/game/events.ts
ou équivalent

Centraliser les réglages dans theme.ts :
- couleurs
- durées
- intensités
- activation/désactivation de chaque event
- nombre max d’events par run

Tests obligatoires :
- Daily Run : les mêmes events apparaissent au même moment sur deux runs avec la même seed.
- Le parcours obstacles/énergies existant reste déterministe.
- Les power-ups Shield/Magnet restent déterministes.
- Energy Zone ne dépasse pas les limites anti-cheat.
- Speed Zone ne change pas la vraie vitesse gameplay.
- Danger Zone reste lisible.
- Tunnel Pulse est purement visuel.
- Training Mode fonctionne.
- Leaderboard serveur fonctionne.
- Mobile 375x667 / 390x844 / 412x915.
- npx tsc --noEmit.
- npm run build.

Commit :
git add -A
git commit -m "Add seeded dynamic race events"
git push

À la fin, donne-moi :
- événements ajoutés
- comportement exact de chaque event
- fichiers modifiés
- confirmation du déterminisme Daily
- confirmation que le scoring/collisions/endpoints n’ont pas été modifiés
- résultats des tests