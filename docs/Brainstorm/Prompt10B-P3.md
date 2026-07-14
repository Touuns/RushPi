Tu travailles sur Rush Pi.

Repository :
https://github.com/Touuns/RushPi.git

Branche :
main

Derniers commits importants :
- 4fb4ae7 — Campaign scroll + Home layout
- 0a1e903 — onboarding + Daily finish sequence
- c66fb7a — Survival zone gates + visual identities

On lance maintenant :

PHASE 10B-P3
Pi Connect en haut + fins fluides Campaign/Survival + résultats simplifiés.

Cette phase est une phase de polish ciblée.

Elle ne doit PAS commencer :
- l’intégration CoinGecko/CoinMarketCap ;
- les logos de tokens ;
- le nouveau Daily Token Rush ;
- la refonte blockchain de Campaign ;
- les nouveaux mini-jeux ;
- la création d’assets avancés.

Ces sujets viendront dans les phases suivantes.

============================================================
OBJECTIFS DE LA PHASE
============================================================

1. Déplacer la connexion Pi en haut à droite de la Home.
2. Retirer le bouton de connexion du bas pour éviter les doublons.
3. Donner une fin fluide et propre à Campaign.
4. Donner une fin fluide et moins agressive à Survival.
5. Simplifier les écrans de résultat.
6. Regrouper les badges débloqués au lieu de tous les afficher en grand.
7. Ne modifier aucune règle de gameplay ou de progression.

============================================================
BLOC 1 — PI CONNECT EN HAUT À DROITE
============================================================

Problème actuel :
Le composant PiPanel est rendu sous les modes et les options secondaires. Lorsqu’un utilisateur n’est pas connecté, le bouton Connect Pi est donc trop bas dans la Home.

Objectif :
Créer une connexion Pi compacte, visible immédiatement en haut à droite.

Disposition souhaitée :

[ Logo / Rush Pi ]                  [ Connect Pi ]

Une fois connecté :

[ Logo / Rush Pi ]                  [ @username ]

Comportement :

État 1 — Pi SDK disponible, utilisateur déconnecté :
- afficher un bouton compact “Connect Pi” ;
- bouton accessible et suffisamment grand au toucher ;
- pendant la connexion : “Connecting…” ;
- désactiver les clics multiples ;
- afficher proprement une erreur éventuelle sans casser la Home.

État 2 — utilisateur connecté :
- afficher une petite chip avec @username ;
- cliquer dessus peut ouvrir Profile ;
- ne pas afficher un deuxième bouton Connect Pi ailleurs.

État 3 — hors Pi Browser :
- afficher une chip discrète “Pi Browser” ou “Open in Pi Browser” ;
- ne pas simuler une connexion qui ne peut pas fonctionner.

Architecture recommandée :
Créer un composant compact, par exemple :

src/components/PiConnectChip.tsx

Le composant doit recevoir :
- sdkAvailable
- piUser
- onConnect
- onProfile

Important :
- conserver l’auto-authentification existante dans App.tsx ;
- conserver authenticatePi() ;
- ne pas modifier piClient ;
- ne pas modifier les permissions Pi ;
- ne pas modifier le flux Daily connecté ;
- ne pas modifier les tentatives classées.

PiPanel :
- supprimer sa responsabilité de connexion sur la Home ;
- garder seulement la partie paiement Testnet/support lorsqu’un utilisateur est connecté ;
- éviter tout bouton Connect Pi en double ;
- le paiement test peut rester plus bas pour cette phase ;
- ne pas modifier la logique du paiement.

UI :
- respecter env(safe-area-inset-top) ;
- éviter tout chevauchement avec le logo ou le titre sur 375 px ;
- conserver Daily / Survival / Campaign visibles rapidement ;
- ne pas rallonger fortement la Home.

============================================================
BLOC 2 — CYCLE DE FIN GÉNÉRIQUE ET SÛR
============================================================

État actuel :
MainScene possède déjà un cycle Daily :
running → finishing → endRun()

Mais Campaign et Survival appellent encore endRun() immédiatement.

Objectif :
Étendre proprement le cycle de fin afin que chaque mode ait sa propre sortie visuelle.

Architecture recommandée :

type RunState = "running" | "ending" | "finished";

type EndSequenceKind =
  | "daily-finish"
  | "campaign-success"
  | "campaign-failure"
  | "survival-gameover";

Créer des méthodes propres, par exemple :
- startEndSequence(kind)
- updateEndSequence(delta)
- finalizeRun()

Ne pas forcément reprendre exactement ces noms, mais éviter de disperser plusieurs delayedCall et booléens dans MainScene.

Contraintes critiques pendant toute séquence de fin :
- score figé ;
- statistiques figées ;
- elapsedMs figé au bon instant ;
- aucun nouveau spawn ;
- aucune collision ;
- aucun nouveau gain ;
- aucune perte de vie supplémentaire ;
- aucun changement de lane ;
- aucun double GameOver ;
- aucun callback tardif après destruction de la scène ;
- Quit ne doit produire aucune erreur ;
- GameOver doit être émis exactement une fois.

Réutiliser :
- TrackGate ;
- TrackVisuals ;
- showBanner ;
- les couleurs du niveau/de la zone ;
- l’horloge Phaser.

Ne pas utiliser un setTimeout React.

============================================================
BLOC 3 — FIN FLUIDE CAMPAIGN : SUCCÈS
============================================================

Problème :
Lorsque campaignTargetMs est atteint, le niveau passe immédiatement au résultat.

Objectif :
Créer une vraie fin de niveau.

À l’instant exact où la durée cible est atteinte, si lives > 0 :

1. Figer les statistiques au targetDuration exact.
2. Arrêter spawns, collisions et gains.
3. Bloquer les changements de lane.
4. Faire apparaître une Finish Gate liée au niveau.
5. Faire avancer la gate en perspective.
6. Faire légèrement ralentir la piste.
7. Au franchissement :
   - flash léger avec la couleur du niveau ;
   - afficher “LEVEL COMPLETE!” ;
   - petite impulsion/burst autour de l’orbe Pi.
8. Attendre environ 400 à 600 ms.
9. Appeler finalizeRun().
10. Afficher ensuite ResultScreen.

Durée totale recommandée :
1,2 à 1,7 seconde.

Important :
- reachedFinish doit rester true ;
- campaignSuccess doit rester true ;
- computeStars doit utiliser exactement les statistiques figées au moment de la fin ;
- le nombre d’énergies, la charge, les vies et le combo ne doivent plus évoluer pendant la transition ;
- Next Level doit continuer à fonctionner ;
- Level 8 doit toujours afficher Season 1 Complete.

Couleur de gate :
- utiliser le tint, la couleur dominante ou un mélange tint + gold ;
- aucune nouvelle donnée réseau ou asset externe.

============================================================
BLOC 4 — FIN FLUIDE CAMPAIGN : ÉCHEC
============================================================

Lorsque lives atteint 0 avant la fin :

1. Figer immédiatement la run.
2. Laisser le dernier impact être perceptible.
3. Stopper les spawns et collisions.
4. Ralentir visuellement la piste.
5. Réduire progressivement :
   - le glow ;
   - la traînée ;
   - les anneaux de charge ;
   - l’intensité de l’orbe.
6. Faire légèrement descendre ou rétrécir l’orbe.
7. Afficher “LEVEL FAILED”.
8. Appliquer un voile sombre/rouge léger, non agressif.
9. Attendre environ 800 à 1200 ms.
10. Afficher ResultScreen.

Ne pas afficher de Finish Gate lors d’un échec.

Contraintes :
- campaignSuccess = false ;
- campaignStars = 0 ;
- aucune progression débloquée ;
- Retry et Back to Campaign inchangés ;
- le résultat ne doit être émis qu’une seule fois.

============================================================
BLOC 5 — FIN FLUIDE SURVIVAL
============================================================

Problème :
À 0 vie, Survival affiche immédiatement Game Over / Result.

Objectif :
Créer une sortie plus douce et plus cohérente avec l’aventure.

Lorsque lives atteint 0 :

1. Figer score, temps, zone, charge et statistiques.
2. Stopper spawns/collisions/gains.
3. Bloquer les déplacements.
4. Conserver brièvement le dernier impact.
5. Ralentir progressivement la piste.
6. Désactiver progressivement :
   - charge aura ;
   - Shield/Magnet rings ;
   - trail ;
   - glow du joueur.
7. Faire un petit effet de dispersion ou décharge de particules.
8. Afficher :
   “RUN ENDED”
9. Fondu sombre léger.
10. Appeler finalizeRun après environ 1 à 1,4 seconde.

Le résultat Survival doit utiliser le titre :
“Run Ended”
plutôt que “Game Over”.

Si la limite technique maxRunMs est atteinte :
- utiliser aussi une transition fluide ;
- afficher éventuellement “SURVIVAL COMPLETE” pendant la transition ;
- ne pas modifier la limite actuelle.

Contraintes :
- timeSurvivedSecs doit rester exact ;
- stageReached et stageName inchangés ;
- best Survival inchangé ;
- aucune vie ne peut devenir négative ;
- aucun nouveau badge ne doit être calculé après le gel.

============================================================
BLOC 6 — NE PAS MODIFIER DAILY
============================================================

La séquence FINISH actuelle de Daily fonctionne et a été validée.

Ne pas modifier son comportement visuel ou son timing, sauf si une petite refactorisation interne est nécessaire pour partager l’architecture.

Garanties obligatoires :
- Daily reste exactement 60 secondes ;
- score figé à 60 secondes ;
- FINISH gate identique ;
- Daily seed identique ;
- leaderboard identique ;
- 3 tentatives identiques ;
- aucune modification serveur ;
- aucun changement de scoring.

Training peut garder son comportement actuel dans cette phase.

============================================================
BLOC 7 — SIMPLIFIER RESULTSCREEN
============================================================

Problème actuel :
Le résultat affiche trop d’informations simultanément.
Survival peut afficher jusqu’à 8 statistiques.
Les badges sont tous affichés sous forme de chips.
Cela réduit l’importance du score et des récompenses réellement intéressantes.

Objectif :
Créer une hiérarchie simple :

1. Résultat principal.
2. Trois informations clés maximum.
3. Récompenses importantes.
4. Détails optionnels repliés.
5. Actions.

Utiliser un composant réutilisable si propre, par exemple :
- ResultSummary
- ResultDetails
- BadgeUnlockSummary

Utiliser éventuellement un élément natif <details> pour éviter une gestion d’état complexe.

------------------------------------------------------------
DAILY RESULT
------------------------------------------------------------

Toujours visible :
- Score
- New Best si applicable
- XP gagnée
- sync serveur
- streak

Trois informations principales maximum :
- Energy Collected
- Max Combo
- Obstacles Hit

Dans “View details” :
- Best Score
- End Bonus
- informations secondaires restantes

------------------------------------------------------------
SURVIVAL RESULT
------------------------------------------------------------

Titre :
Run Ended

Toujours visible :
- Score
- New Best si applicable
- XP

Trois informations principales :
- Time Survived
- Zone Reached
- Max Charge

Dans “View details” :
- Farthest Zone
- Best Survival
- Lives Remaining
- Lives Recovered
- Max Combo
- autres compteurs existants utiles

------------------------------------------------------------
CAMPAIGN RESULT
------------------------------------------------------------

Toujours visible :
- Level Complete / Level Failed / Season 1 Complete
- étoiles
- score
- New Best / New stars
- les trois objectifs Campaign

Trois informations principales maximum :
- Energy Collected
- Lives Remaining
- Max Charge

Dans “View details” :
- Best score du niveau
- Max Combo
- XP / level detail si nécessaire
- autres statistiques secondaires

Les objectifs 1★/2★/3★ restent visibles car ils donnent une raison de rejouer.

------------------------------------------------------------
MOBILE
------------------------------------------------------------

ResultScreen doit :
- être scrollable au doigt ;
- utiliser touch-action: pan-y ;
- respecter les safe areas ;
- ne pas centrer verticalement une longue page ;
- rester lisible sur 375×667.

============================================================
BLOC 8 — REGROUPER LES BADGES DÉBLOQUÉS
============================================================

Ne pas modifier les conditions de déblocage dans cette phase.

Le problème de difficulté/rareté des badges sera traité après la refonte du gameplay et de Campaign.

Modifier seulement leur présentation.

Comportement :

0 badge :
- ne rien afficher.

1 badge :
- afficher une seule carte compacte et valorisante :
  “Badge unlocked”
  icône
  nom
  courte description

2 badges ou plus :
- afficher :
  “N badges unlocked”
- mettre en avant uniquement le premier badge ;
- afficher :
  “+ N other badge(s)”
- permettre d’ouvrir une section repliée pour voir les autres ;
- ne pas afficher immédiatement une longue grille de chips.

Ne supprimer aucun badge déjà obtenu.
Ne modifier :
- ni BadgeId ;
- ni ALL_BADGES ;
- ni recordRun ;
- ni les conditions ;
- ni le localStorage.

Le résultat doit devenir moins dense même lorsqu’une seule run débloque plusieurs badges faciles.

============================================================
À NE PAS MODIFIER
============================================================

Ne pas modifier :

- Daily seed ;
- scoring Daily ;
- durée Daily ;
- serveur leaderboard ;
- endpoints Supabase ;
- 3 tentatives classées ;
- Pi SDK ;
- piClient ;
- paiement Pi ;
- routes API ;
- progression Campaign ;
- étoiles Campaign ;
- objectifs Campaign ;
- durées Campaign ;
- règles Survival ;
- vies ;
- charge ;
- Life Orb ;
- Shield ;
- Magnet ;
- zones Survival ;
- seuils de zones ;
- spawn rates ;
- difficulté ;
- collisions lane + y ;
- hitbox ;
- contrôles drag/slide ;
- badges et leurs conditions ;
- assets/token logos/API marché.

============================================================
COMMITS
============================================================

Faire trois commits séparés.

Commit 1 :
git add -A
git commit -m "Move Pi connect to home header"

Commit 2 :
git add -A
git commit -m "Add smooth campaign and survival endings"

Commit 3 :
git add -A
git commit -m "Simplify result summaries and badge unlocks"

Puis :
git push

============================================================
TESTS AUTOMATIQUES
============================================================

Exécuter après chaque bloc important :

npx tsc --noEmit
npm run build

Vérifier avant commit :
- git diff ;
- aucune valeur temporaire ;
- aucun seuil réduit pour les tests ;
- aucun callback de test ;
- aucun mock commit ;
- aucune modification API/backend.

============================================================
MCP DEVTOOLS — TESTS CIBLÉS SEULEMENT
============================================================

Ne fais pas d’audit général.
Ne joue pas de longues parties.
Ne teste pas tous les badges.
Ne parcours pas tous les niveaux.
Maximum deux captures utiles au total.

TEST 1 — Home / Pi Connect
Viewport : 375×667

Vérifier :
- Connect Pi en haut à droite ;
- aucun chevauchement avec logo/titre ;
- aucune duplication du bouton Connect en bas ;
- Survival/Campaign restent lisibles ;
- état connecté simulé : @username affiché ;
- paiement test toujours accessible uniquement à son emplacement prévu.

TEST 2 — Campaign success
Viewport : 390×844

Injecter proprement un état proche de la fin :
- campaign ;
- lives > 0 ;
- elapsed proche de campaignTargetMs.

Vérifier :
- statistiques figées au target ;
- gate visible ;
- ralentissement ;
- “LEVEL COMPLETE!” ;
- Result après la transition ;
- étoiles calculées avec les stats figées ;
- GameOver émis une seule fois.

Ne pas modifier durablement la durée du niveau.

TEST 3 — Campaign failure + Survival end
Viewport : 390×844

Faire deux injections courtes, sans jouer de longues runs :

Campaign :
- lives = 1 ;
- déclencher un dernier obstacle ;
- vérifier “LEVEL FAILED” puis Result ;
- aucune gate de succès ;
- 0 étoile ;
- GameOver ×1.

Survival :
- lives = 1 ;
- déclencher un dernier obstacle ;
- vérifier ralentissement/décharge ;
- “RUN ENDED” ;
- Result après la transition ;
- temps/zone/score figés ;
- GameOver ×1.

TEST 4 — Result simplifié
Viewport : 375×667

Utiliser un résultat/mock local temporaire avec plusieurs badges :
- trois statistiques principales maximum ;
- détails secondaires repliés ;
- “N badges unlocked” ;
- premier badge mis en avant ;
- autres badges accessibles dans la section repliée ;
- scroll tactile fonctionnel.

Retirer impérativement tout mock avant commit.

============================================================
RAPPORT FINAL ATTENDU
============================================================

À la fin, fournir :

1. Nouvelle position et comportement de Pi Connect.
2. Ce qu’est devenu PiPanel.
3. Architecture du cycle de fin.
4. Séquence Campaign success.
5. Séquence Campaign failure.
6. Séquence Survival Run Ended.
7. Confirmation que Daily reste identique.
8. Nouvelle hiérarchie de ResultScreen.
9. Présentation des badges regroupés.
10. Fichiers créés/modifiés.
11. Confirmation que badges/conditions/localStorage sont inchangés.
12. Confirmation Campaign progression/étoiles/objectifs inchangés.
13. Confirmation Survival gameplay inchangé.
14. Confirmation Daily seed/scoring/leaderboard/tentatives inchangés.
15. Confirmation Pi SDK/paiement/Supabase inchangés.
16. Résultats précis des quatre tests MCP.
17. Résultats tsc/build.
18. Hash des trois commits.