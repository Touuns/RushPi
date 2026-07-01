On lance la Phase 9E de Rush Pi : Track Drift + mécaniques légères par stage.

Contexte :
Rush Pi possède maintenant :
- Time Attack / Daily Run classé
- Training Mode
- Survival Mode local-only
- 3 vies en Survival
- récupération de vie
- orbe Pi chargée niveau 1 à 6
- absorption au niveau 6
- Shield / Magnet
- Dynamic Events
- 8 stages Survival blockchain-inspired
- leaderboard serveur pour Daily
- Pi Auth / paiement test
- badges/streaks/profil

Important :
Cette phase concerne uniquement le Mode Survie.
Ne pas modifier :
- Time Attack / Daily Run
- Daily Challenge seed
- scoring Daily
- leaderboard serveur
- Supabase endpoints
- Pi SDK
- paiement Pi
- Training Mode
- hitbox
- collisions de base
- contrôles 3 voies
- système de vies existant
- système de charge existant

Objectif :
Ajouter une sensation de virage visuel via Track Drift, et donner une légère personnalité gameplay/visuelle à chaque stage, sans changer les contrôles ni casser la lisibilité.

Partie 1 — Track Drift visuel

Ajouter un effet visuel de piste qui penche/dérive légèrement vers la gauche ou la droite.

Principe :
- Le point de fuite de la piste peut se déplacer doucement vers la gauche ou la droite.
- Les lignes de piste, chevrons, tunnel arcs et objets projetés suivent cette dérive visuelle.
- Le gameplay reste identique : 3 voies, mêmes lanes logiques, mêmes collisions.
- Le joueur ne doit pas perdre le contrôle.
- Le déplacement doit être doux, jamais brutal.

Comportement souhaité :
- Drift léger dans les premiers stages.
- Drift plus visible dans les stages avancés.
- Direction gauche/droite déterministe ou pilotée par le stage.
- Pas de drift trop fort qui rend les objets difficiles à lire.
- Pas de rotation complète de l’écran.

Paramètres recommandés :
- driftMaxX entre 0.06 et 0.14 de la largeur écran selon le stage.
- durée d’un drift : 4 à 8 secondes.
- easing doux.
- pause entre deux drifts.
- aucun drift avant 15 secondes de Survival.

Important :
Le Track Drift est visuel uniquement.
La collision ne doit pas utiliser le x visuel.
La collision continue à utiliser lane + y comme avant.

Partie 2 — Stage personality légère

Ajouter des modificateurs visuels/légers selon le stage, configurés dans stages.ts.

Ne pas faire de gros changements de difficulté.
Ne pas ajouter de nouveaux obstacles.

Proposition par stage :

1. Genesis Lane
- Aucun modificateur spécial.
- Stage de base.

2. Orange Chain
- Obstacles visuellement un peu plus massifs.
- Teinte orange plus chaude.
- Track Drift léger.

3. Smart Layer
- Lignes de piste plus géométriques / cyan.
- Patterns visuels plus techniques si possible.
- Pas de difficulté brutale.

4. Neon Speednet
- Speed Zone plus visible.
- Chevrons plus rapides visuellement.
- Drift un peu plus fréquent.

5. Stable Grid
- Ambiance plus stable et régulière.
- Moins d’effets chaotiques.
- Lisibilité maximale.

6. Meme Circuit
- Effets plus fun : particules rose/jaune plus présentes.
- Energy Zone un peu plus visible.
- Ne pas rendre l’écran confus.

7. Privacy Tunnel
- Ambiance plus sombre.
- Tunnel Pulse plus marqué.
- Objets doivent rester très lisibles.
- Drift plus lent mais plus profond.

8. Chain Storm
- Intensité visuelle plus forte.
- Mélange contrôlé d’effets.
- Track Drift plus visible, mais toujours jouable.

Architecture :
- Étendre src/game/stages.ts avec des propriétés stageModifiers.
- Si nécessaire, créer un module src/game/trackDrift.ts.
- Garder tous les réglages faciles à ajuster.
- Centraliser les couleurs/intensités dans theme.ts ou stages.ts.

HUD / UI :
- Ne pas ajouter trop d’informations.
- Le stage HUD existe déjà, le garder.
- Pas besoin d’une nouvelle chip pour Track Drift.

Tests obligatoires :
1. Survival Stage 1 : drift absent ou très léger.
2. Stage avancé : drift visible mais lisible.
3. Les objets restent sur la piste visuellement.
4. Collision logique inchangée.
5. Contrôles drag/slide toujours OK.
6. Shield/Magnet/Life Orb/charge toujours OK.
7. Stage transitions toujours OK.
8. Time Attack/Daily inchangé.
9. Training inchangé.
10. Survival reste local-only.
11. Aucun endpoint modifié.
12. Mobile 375x667, 390x844, 412x915.
13. npx tsc --noEmit OK.
14. npm run build OK.

Commit :
git add -A
git commit -m "Add survival track drift and stage personality"
git push

À la fin, donne-moi :
- résumé Track Drift
- mécaniques/variations par stage
- fichiers modifiés
- confirmation collision/hitbox inchangées
- confirmation Daily/Time Attack/leaderboard/Pi SDK/paiement inchangés
- résultats des tests