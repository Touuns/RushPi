Tu travailles sur le projet Rush Pi.

Repository :
https://github.com/Touuns/RushPi.git

Branche :
main

État actuel important :
- Commit récent UI : 34708b8
- Daily Run classé 60 secondes
- Survival local avec 3 vies, charge, Life Orbs, zones et Track Drift
- Campaign locale avec 8 niveaux, étoiles et progression sauvegardée
- Training, leaderboard Supabase, Pi SDK et paiement test
- Projet React + TypeScript + Phaser

On lance une nouvelle phase :

PHASE 10B-P2 / 10D-A
Corrections UX prioritaires + premières vraies transitions d’aventure.

Les retours utilisateurs à corriger sont les suivants :

1. Dans Campaign, il est impossible de scroller pour accéder aux niveaux situés plus bas.
2. La fin de Daily Run à zéro seconde est beaucoup trop brutale.
3. Les zones Survival paraissent quasiment identiques et leur passage n’est pas suffisamment visible.
4. Les trois modes donnent encore trop l’impression d’être le même jeu avec de légères modifications.
5. Chaque mode doit proposer une explication claire avant la partie.
6. Sur la Home, Daily Run doit rester en pleine largeur et Survival/Campaign doivent être placés côte à côte en dessous.
7. Rush Pi doit commencer à donner une sensation de jeu d’aventure plus spectaculaire, sans casser le gameplay existant.

Travaille en plusieurs blocs clairement séparés.

============================================================
BLOC 1 — CORRIGER LE SCROLL CAMPAIGN
============================================================

Problème actuel :
- body utilise touch-action: none
- app-frame utilise overflow: hidden
- CampaignScreen affiche 8 cartes dans une liste sans zone scrollable dédiée
- les niveaux du bas sont donc inaccessibles sur téléphone

Objectif :
Permettre un scroll vertical tactile naturel dans Campaign Level Select.

Comportement attendu :
- Le joueur peut faire défiler la liste avec son doigt.
- Il peut atteindre le Level 8.
- Les cartes restent cliquables.
- Les niveaux verrouillés restent non lançables.
- Le bouton Back Home reste facilement accessible.
- Le scroll ne doit pas déplacer ou sélectionner accidentellement une carte.
- Le scroll Campaign ne doit pas modifier les contrôles tactiles Phaser en jeu.

Implémentation recommandée :
- Garder le verrouillage tactile global nécessaire au jeu si besoin.
- Autoriser spécifiquement Campaign avec :
  - overflow-y: auto
  - touch-action: pan-y
  - overscroll-behavior: contain
  - -webkit-overflow-scrolling: touch
- Utiliser un layout Campaign aligné en haut plutôt que centré verticalement.
- Mettre éventuellement l’en-tête et/ou Back Home en position sticky.
- Respecter les safe areas mobiles :
  env(safe-area-inset-top)
  env(safe-area-inset-bottom)

Ne pas utiliser un hack avec wheel events ou des listeners manuels si le scroll CSS natif suffit.

============================================================
BLOC 2 — NOUVELLE DISPOSITION HOME
============================================================

Disposition souhaitée :

Daily Run doit rester en pleine largeur et clairement présenté comme le mode classé principal.

Sous Daily Run :
- Survival à gauche
- Campaign à droite

Exemple :

[          DAILY RUN — RANKED          ]

[      SURVIVAL      ] [     CAMPAIGN     ]
[       LOCAL        ] [       LOCAL      ]

Puis en dessous :
- Training
- Leaderboard
- Profile
- Pi Panel

Contraintes :
- Sur 375 px de largeur, Survival et Campaign doivent rester lisibles.
- Les deux cartes peuvent avoir un texte plus court que la version actuelle.
- Pas de texte qui déborde.
- Pas de carte trop étroite.
- Les deux cartes peuvent être un peu plus hautes pour afficher 2 lignes maximum.

Sous-titres recommandés :

Daily Run
“60s · ranked daily race”

Survival
“3 lives · zones · charge”

Campaign
“Levels · stars · progress”

Garder les tags RANKED et LOCAL.

Important :
Ne pas imbriquer un bouton d’information dans un autre bouton.
Si une carte contient plusieurs actions, utiliser un wrapper avec :
- bouton principal de lancement
- bouton d’information séparé

============================================================
BLOC 3 — MODAL EXPLICATIF POUR CHAQUE MODE
============================================================

Ajouter une explication légère avant le premier lancement de chaque mode.

Modes concernés :
- Daily Run
- Survival
- Campaign

Comportement :
- Le modal apparaît automatiquement uniquement lors du premier lancement de ce mode.
- Une fois fermé/validé, il ne réapparaît pas automatiquement.
- Un petit bouton “?” ou “How to play” permet de le rouvrir depuis la Home.
- Le choix est sauvegardé localement.
- Utiliser des clés versionnées, par exemple :
  rushpi:onboarding:daily:v1
  rushpi:onboarding:survival:v1
  rushpi:onboarding:campaign:v1

Important :
- Cliquer sur le mode la première fois ouvre l’explication.
- Le bouton “Play” du modal lance ensuite le flux normal existant.
- Pour Daily, il doit ensuite continuer vers la logique existante :
  connexion Pi / tentatives / ranked ou local.
- Ne pas contourner la logique de connexion Pi.
- Ne pas modifier le classement ni les tentatives.

Créer idéalement un composant réutilisable :
src/components/ModeIntroModal.tsx

Contenu Daily Run :
Titre :
Daily Run

Résumé :
- 60-second ranked race
- New course every day
- 3 ranked attempts per day
- Collect golden energy
- Avoid red hazards
- Finish before the final gate

Légende :
- Golden orb = Energy
- Red diamond = Hazard
- Cyan shield = Absorbs one hit
- Magnet = Attracts nearby energy

Contenu Survival :
Titre :
Survival

Résumé :
- Start with 3 lives
- Survive as long as possible
- Cross different blockchain-inspired zones
- Collect energy to charge the Pi orb
- Maximum charge can absorb a hit

Légende :
- Golden orb = Energy / charge
- Red diamond = Lose one life
- Green Life Orb = Recover one life
- Cyan Shield = Protects from one hit
- Magnet = Attracts energy
- Charge Lv 6 = Absorbs one hit and drops to Lv 4

Contenu Campaign :
Titre :
Campaign — Chain Journey

Résumé :
- Complete levels to unlock the next
- Earn up to 3 stars per level
- Progress is saved locally
- Complete objectives before reaching the finish

Légende :
- ★ Finish the level
- ★★ Secondary objective
- ★★★ Mastery objective
- 0 lives = Level Failed
- Finish gate = Level Complete

Le modal doit être :
- compact
- mobile-first
- scrollable si nécessaire
- fermable
- accessible
- sans grosse dépendance externe

============================================================
BLOC 4 — FIN DAILY RUN PLUS FLUIDE
============================================================

Problème actuel :
Quand le timer arrive à 0, endRun() est appelé immédiatement et React passe directement à l’écran Result.

Objectif :
Créer une véritable séquence de fin arcade.

Créer un état de fin distinct :
running → finishing → finished

À exactement 60 secondes :
- figer le score et les statistiques utiles ;
- arrêter les nouveaux spawns ;
- désactiver les collisions et gains de score supplémentaires ;
- empêcher les nouveaux changements de lane ;
- ne pas envoyer GameOver immédiatement.

Séquence visuelle recommandée, environ 1,2 à 1,6 seconde :

1. Une ligne ou un portail FINISH apparaît vers l’horizon.
2. Il avance vers le joueur en suivant la perspective de la piste.
3. La vitesse visuelle ralentit progressivement.
4. Le joueur franchit la ligne.
5. Afficher :
   “FINISH!”
6. Flash doré léger ou burst.
7. Puis seulement appeler endRun() / GameOver.

Contraintes critiques :
- Le score classé doit être exactement celui obtenu à 60 secondes.
- Aucun point après zéro seconde.
- Aucun obstacle ne peut retirer des points après zéro.
- Le Daily seed ne doit pas changer.
- Le leaderboard ne doit pas changer.
- Les 3 tentatives ne doivent pas changer.
- Aucun délai ne doit provoquer un double GameOver.
- Le bouton Quit ne doit pas créer d’erreur pendant finishing.
- La transition doit être visuelle uniquement.

Architecture suggérée :
- Ajouter un booléen ou enum runState.
- Ajouter startFinishSequence().
- Séparer éventuellement finalizeRun() de endRun().
- Réutiliser les méthodes de projection de TrackVisuals pour la finish line.
- Ne pas mettre un simple setTimeout React déconnecté de Phaser.

Cette séquence concerne Daily Run.

Ne pas modifier le scoring ou le fonctionnement de Survival/Campaign.

============================================================
BLOC 5 — SURVIVAL : ZONE GATES CLAIRS
============================================================

Problème actuel :
Les zones changent au milieu de la partie avec seulement une bannière et un changement subtil de couleur.

Objectif :
Faire ressentir que le joueur termine une zone et entre réellement dans une nouvelle partie de l’aventure.

À chaque seuil de zone Survival :

1. Faire apparaître un portail/arche/ligne de checkpoint au loin.
2. Le portail avance avec la perspective de la piste.
3. Le joueur franchit physiquement la ligne.
4. Afficher brièvement :
   “ZONE 1 COMPLETE”
5. Puis :
   “ZONE 2 — ORANGE CHAIN”
6. Appliquer le nouveau thème visuel au moment du franchissement.
7. Continuer la partie sans écran Result et sans couper la run.

Important :
- Le gameplay ne doit pas être mis en pause longtemps.
- Les contrôles doivent rester actifs.
- Le score doit continuer normalement.
- La collision reste lane + y.
- Le portail est purement visuel et ne possède aucune hitbox.
- Ne pas modifier les seuils actuels des zones.
- Ne pas modifier les vies, la charge ou les règles de score.

Pour la Zone 1 au début de la partie :
- afficher une introduction courte :
  “ZONE 1 — GENESIS LANE”
- ne pas afficher “Zone complete”.

Créer idéalement un helper/module propre :
src/game/zoneTransition.ts
ou intégrer proprement au système TrackVisuals si plus cohérent.

============================================================
BLOC 6 — IDENTITÉ VISUELLE PLUS FORTE DES ZONES SURVIVAL
============================================================

Les zones ne doivent plus se différencier uniquement par une teinte.

Faire un premier vrai passage visuel “Adventure Identity”.

Ne pas utiliser les noms, logos ou sprites officiels de cryptomonnaies.
Ne pas utiliser d’assets externes soumis à droits.
Utiliser des formes procédurales Phaser, particules, lignes, grilles, halos, arches et effets abstraits.

Chaque zone doit posséder au minimum :
- une palette visible ;
- une forme/pattern de fond identifiable ;
- une variation de piste ou de rails ;
- un type d’effet décoratif distinct ;
- une transition claire via Zone Gate.

Direction visuelle :

Zone 1 — Genesis Lane
- violet et or
- particules calmes
- anneaux ou nœuds simples
- piste de départ claire

Zone 2 — Orange Chain
- orange, or, noir profond
- silhouettes de blocs ou segments rectangulaires
- rails plus épais
- impression de réseau historique et lourd

Zone 3 — Smart Layer
- cyan, bleu, violet
- nœuds reliés par des lignes
- grilles géométriques
- impulsions façon smart network

Zone 4 — Neon Speednet
- vert néon, cyan, violet
- longues traînées lumineuses
- arches rapides
- chevrons très visibles
- impression de vitesse

Zone 5 — Stable Grid
- vert doux, blanc, doré
- grille régulière
- lignes propres et symétriques
- moins de chaos visuel

Zone 6 — Meme Circuit
- rose, jaune, orange
- bursts, confettis géométriques ou formes rebondissantes
- fun mais lisible
- ne pas transformer cela en écran surchargé

Zone 7 — Privacy Tunnel
- bleu nuit, violet sombre
- tunnel profond
- anneaux sombres
- brouillard léger
- collectibles et dangers doivent rester très lumineux

Zone 8 — Chain Storm
- violet, rouge, or, cyan
- éclairs procéduraux
- pulses rapides
- mélange contrôlé des effets précédents
- ambiance finale spectaculaire

Important :
- Les différences doivent être perceptibles immédiatement.
- Ne pas se contenter de tintAlpha/bgBoost.
- Ne pas modifier les hitboxes.
- Ne pas ajouter de nouveaux types d’obstacles gameplay dans cette phase.
- Ne pas modifier les chances de spawn.
- Ne pas modifier la difficulté.
- Ne pas modifier les objectifs Campaign.
- Ne pas ajouter de son dans cette phase.
- Les performances mobiles restent prioritaires.
- Limiter le nombre d’objets graphiques permanents.
- Réutiliser/pooler les éléments si nécessaire.

Architecture possible :
Étendre Stage avec un preset visuel, par exemple :

visualPreset: {
  trackColor
  railColor
  horizonColor
  particleColors
  pattern
  patternIntensity
  gateColor
  tunnelStrength
  lightningStrength
}

Puis ajouter des méthodes propres :
- track.applyStageVisuals(...)
- background.applyStageVisuals(...)
- zoneTransition.play(...)

Éviter d’ajouter toutes les conditions directement dans MainScene.
MainScene doit orchestrer, pas contenir tout le rendu spécifique des 8 zones.

============================================================
À NE PAS MODIFIER
============================================================

Ne pas modifier :
- Daily seed
- Daily course déterministe
- scoring Daily
- tentative ranked 3/jour
- endpoints Supabase
- leaderboard serveur
- Pi SDK
- paiement Pi
- règles de progression Campaign
- étoiles Campaign
- objectifs Campaign
- localStorage Campaign existant
- vies Survival
- niveaux de charge
- Life Orb
- Shield
- Magnet
- collisions lane + y
- hitbox
- contrôle drag/slide
- durée et seuils des zones
- durée des niveaux Campaign

Ne pas ajouter :
- nouveaux endpoints
- dépendance UI lourde
- assets crypto officiels
- audio
- vrais virages gameplay
- nouvelles mécaniques de score

============================================================
ORDRE D’IMPLÉMENTATION ET COMMITS
============================================================

Faire des commits séparés pour faciliter un rollback.

Commit 1 :
git add -A
git commit -m "Fix campaign scrolling and home mode layout"

Contenu :
- scroll Campaign
- Home Daily pleine largeur
- Survival/Campaign côte à côte

Commit 2 :
git add -A
git commit -m "Add mode onboarding and daily finish sequence"

Contenu :
- modals explicatifs
- sauvegarde onboarding locale
- finish sequence Daily

Commit 3 :
git add -A
git commit -m "Add survival zone gates and visual identities"

Contenu :
- Zone Gates
- transitions
- presets visuels des 8 zones

À la fin :
git push

============================================================
TESTS AUTOMATIQUES
============================================================

Exécuter :
npx tsc --noEmit
npm run build

Vérifier aussi :
- aucune erreur TypeScript ;
- aucun warning critique nouveau ;
- aucune modification backend accidentelle ;
- git diff propre ;
- aucune valeur temporaire de test laissée dans le commit.

============================================================
MCP DEVTOOLS — TESTS CIBLÉS UNIQUEMENT
============================================================

Ne fais pas un audit général.
Ne navigue pas longtemps dans tous les écrans.
Ne lance pas de longues runs réelles.
Ne gaspille pas de tokens dans des tests exploratoires.

Effectue seulement ces tests ciblés :

TEST 1 — Home
Viewport : 375×667
- ouvrir la Home ;
- vérifier Daily pleine largeur ;
- vérifier Survival et Campaign côte à côte ;
- vérifier que les textes ne débordent pas ;
- prendre au maximum une capture si utile.

TEST 2 — Campaign scroll
Viewport : 375×667
- ouvrir Campaign ;
- effectuer un scroll vertical ;
- vérifier que Level 8 est atteignable ;
- vérifier qu’une carte déverrouillée reste cliquable ;
- vérifier que Back Home fonctionne.

TEST 3 — Daily finish
Viewport : 390×844
Pour éviter d’attendre 60 secondes :
- modifier temporairement en local la durée Daily à 5 secondes OU injecter temporairement l’état elapsed proche de la fin ;
- vérifier :
  - score figé à zéro ;
  - finish gate visible ;
  - FINISH affiché ;
  - Result apparaît après la transition ;
  - GameOver émis une seule fois ;
- restaurer impérativement la durée réelle de 60 secondes avant commit.

TEST 4 — Survival Zone Gate
Viewport : 390×844
Pour éviter d’attendre 45/90 secondes :
- modifier temporairement uniquement dans l’environnement local les seuils Zone 2/3 à quelques secondes OU invoquer directement la transition depuis DevTools ;
- vérifier :
  - portail visible ;
  - “ZONE COMPLETE” ;
  - nom de la nouvelle zone ;
  - changement visuel évident ;
  - contrôle gauche/droite toujours actif ;
- restaurer impérativement tous les seuils réels avant commit.

Ne pas effectuer d’autres tests MCP, sauf erreur bloquante.

============================================================
RAPPORT FINAL ATTENDU
============================================================

À la fin, donne un rapport avec :

1. Résumé des corrections Campaign.
2. Nouvelle disposition Home.
3. Fonctionnement des modals explicatifs.
4. Fonctionnement exact de la finish sequence Daily.
5. Fonctionnement des Zone Gates Survival.
6. Différences visuelles ajoutées pour chacune des 8 zones.
7. Fichiers créés et modifiés.
8. Confirmation que collisions/hitbox/contrôles sont inchangés.
9. Confirmation que Daily seed/scoring/leaderboard/tentatives sont inchangés.
10. Confirmation que Campaign progression/étoiles/objectifs sont inchangés.
11. Confirmation que Pi SDK/paiement/Supabase sont inchangés.
12. Résultats des 4 tests MCP ciblés.
13. Résultats tsc/build.
14. Hash des 3 commits.