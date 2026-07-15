Tu travailles sur Rush Pi.

Repository :
https://github.com/Touuns/RushPi.git

Branche :
main

Derniers commits importants :
- d5e44f8 — Add intuitive back navigation
- b583612 — Add secure CoinGecko market data service
- 6dc268e — Add daily market snapshots and preview

La migration Phase 11A créant public.daily_market_snapshots a normalement été appliquée manuellement dans Supabase.

On lance maintenant :

PHASE 11B — DAILY TOKEN RUSH

Objectif général :
Transformer Daily Run en un mode immédiatement reconnaissable dans lequel l’orbe Pi collecte des tokens réels uniques, avec leurs vrais logos et leurs prix issus du snapshot quotidien immuable.

La partie reste une course de 60 secondes sur trois voies.

Cette phase concerne uniquement Daily Run.

Ne pas modifier le gameplay de :
- Training ;
- Survival ;
- Campaign.

============================================================
VISION DU MODE
============================================================

Daily Run devient “Daily Token Rush”.

Pendant une partie :

- l’orbe contrôlé par le joueur représente Pi ;
- des Chain Blocks simples et répétables remplacent visuellement les orbes d’énergie ordinaires dans Daily ;
- 15 tokens réels et uniques apparaissent pendant les 60 secondes ;
- Bitcoin et Ethereum sont garantis une fois chacun ;
- aucun token ne peut apparaître deux fois ;
- les autres tokens sont choisis de manière déterministe dans le catalogue approuvé ;
- tous les joueurs du même jour obtiennent exactement :
  - les mêmes tokens ;
  - les mêmes prix de référence ;
  - les mêmes points ;
  - le même ordre ;
  - les mêmes horaires d’apparition ;
  - les mêmes voies ;
- le Magnet attire uniquement les Chain Blocks ;
- le Magnet n’attire jamais les tokens ;
- les tokens doivent être collectés manuellement en changeant de voie ;
- les prix sont affichés à titre informatif ;
- le classement utilise des points de jeu normalisés et non le prix USD brut.

Aucun appel CoinGecko ne doit être effectué pendant une partie.

============================================================
RÈGLES IMPORTANTES
============================================================

Un token spécial :

- apparaît exactement une fois ;
- possède un vrai logo fourni par le snapshot CoinGecko ;
- possède une voie et un horaire déterministes ;
- rapporte un nombre fixe de points ;
- ne bénéficie pas du multiplicateur de combo ;
- ne modifie pas le combo ;
- ne remet pas le combo à zéro ;
- n’est pas attiré par le Magnet ;
- est marqué comme manqué s’il sort de l’écran sans être collecté.

Un Chain Block :

- peut apparaître plusieurs fois ;
- utilise le scoring actuel des énergies ;
- continue à alimenter le combo ;
- peut être attiré par le Magnet ;
- reste comptabilisé dans l’ancien champ interne energiesCollected pour préserver la compatibilité ;
- doit être présenté au joueur comme “Chain Block” ou “Block”, et non comme un token.

============================================================
BLOC 1 — MANIFESTE DAILY TOKEN RUSH CÔTÉ SERVEUR
============================================================

Ne pas laisser le navigateur sélectionner ou valoriser lui-même les tokens.

Créer un manifeste serveur déterministe construit à partir du snapshot UTC persisté dans daily_market_snapshots.

Endpoint recommandé :

GET /api/market/daily-challenge

Créer les types nécessaires côté serveur et client.

Structure proposée :

interface DailyTokenSpec {
  order: number;
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  referencePriceUsd: number;
  marketCapRank: number | null;
  points: number;
  spawnTimeMs: number;
  lane: number;
}

interface DailyTokenChallenge {
  challengeDate: string;
  challengeId: string;
  rulesVersion: 2;
  tokenChallengeVersion: 1;
  snapshotCreatedAt: string;
  providerUpdatedAt: string | null;
  status: "live" | "stale" | "fallback";
  rankedEligible: boolean;
  tokens: DailyTokenSpec[];
  totalTokenPointsPossible: number;
  attribution: string;
}

Challenge ID :

RUSHPI-YYYY-MM-DD-TOKEN-V1

Important :
- challengeDate est calculé côté serveur en UTC ;
- rulesVersion = 2 pour distinguer le nouveau scoring de l’ancien Daily ;
- tokenChallengeVersion = 1 ;
- le manifeste doit être identique à chaque appel pendant toute la journée ;
- ne jamais accepter une date arbitraire envoyée par le client ;
- ne jamais accepter une liste d’IDs envoyée par le client ;
- ne jamais appeler CoinGecko directement depuis cet endpoint si le snapshot du jour existe déjà ;
- utiliser la ligne persistée dans daily_market_snapshots ;
- rankedEligible = true uniquement si un snapshot valable du jour est réellement persisté ;
- un fallback non persisté ne doit pas être considéré comme rankedEligible.

Refactoriser proprement la logique existante de /api/market/daily afin que :
- la lecture/création du snapshot soit réutilisable ;
- /api/market/daily continue de fonctionner comme avant ;
- /api/market/daily-challenge et submit-score puissent réutiliser la même source de vérité ;
- aucune logique importante ne soit copiée dans trois fichiers différents.

============================================================
BLOC 2 — SÉLECTION DÉTERMINISTE DES 15 TOKENS
============================================================

Nombre de tokens par Daily :

15

Tokens garantis :
- bitcoin
- ethereum

Les 13 autres sont sélectionnés dans le catalogue approuvé parmi les entrées :
- enabledForDaily = true ;
- présentes dans le snapshot ;
- avec ID valide ;
- avec prix fini et non négatif ;
- avec logo HTTPS valide.

Utiliser un PRNG seedé séparé :

`${challengeDate}:daily-token-rush:v1`

Ne pas utiliser Math.random() pour le manifeste.

La sélection doit :
- ne contenir aucun doublon d’ID ;
- toujours placer Bitcoin et Ethereum ;
- être stable quel que soit l’ordre de retour de CoinGecko ;
- trier d’abord les candidats selon leur ID avant le shuffle seedé ;
- rechercher une diversité de catégories ;
- contenir au maximum 2 stablecoins ;
- contenir au maximum 2 meme tokens ;
- contenir au maximum 1 privacy token ;
- éviter de remplir la sélection uniquement avec les plus grosses capitalisations.

Si moins de 15 actifs valides sont disponibles :
- utiliser autant d’actifs uniques que possible ;
- rankedEligible doit rester false si le nombre devient insuffisant pour garantir le challenge attendu ;
- ne jamais dupliquer un token pour atteindre 15.

============================================================
BLOC 3 — FORMULE DE POINTS NORMALISÉE
============================================================

Le prix réel doit influencer les points, mais ne doit jamais être ajouté directement au score.

Utiliser exactement une formule centrale et partagée côté serveur :

pricePart =
  min(
    360,
    round(80 * log10(1 + referencePriceUsd))
  )

rankPart =
  marketCapRank valide
    ? max(40, 260 - ((marketCapRank - 1) * 4))
    : 40

tokenPoints =
  clamp(
    150 + pricePart + rankPart,
    200,
    750
  )

Contraintes :
- résultat entier ;
- minimum 200 ;
- maximum 750 ;
- prix du snapshot uniquement ;
- aucune donnée live récupérée après la création du snapshot ;
- le client reçoit les points déjà calculés ;
- le serveur recalcule toujours les points lors de la soumission du score ;
- ne jamais faire confiance à tokenPoints envoyé par le client.

Exemples approximatifs attendus :
- BTC proche du maximum ;
- ETH élevé ;
- token de prix faible mais correctement classé : valeur intermédiaire ;
- fallback sans prix : minimum contrôlé, mais non classable.

Créer une fonction pure testable, par exemple :

computeDailyTokenPoints(coin)

Cette fonction doit avoir une seule source de vérité côté serveur.

============================================================
BLOC 4 — HORAIRES ET VOIES DÉTERMINISTES
============================================================

Les 15 tokens doivent être répartis entre environ 4 secondes et 54 secondes.

Utiliser des slots régulièrement espacés avec un léger jitter seedé.

Contraintes :
- premier token : pas avant 4 000 ms ;
- dernier token : pas après 54 000 ms ;
- minimum environ 2 200 ms entre deux tokens ;
- aucun chevauchement visuel important ;
- lanes uniquement 0, 1 ou 2 ;
- pas plus de deux tokens consécutifs sur la même lane ;
- le planning est construit côté serveur et inclus dans le manifeste.

Le RNG des tokens doit rester entièrement séparé du RNG historique des obstacles/blocks.

Ne pas modifier l’ordre des tirages du RNG principal Daily plus que nécessaire.

------------------------------------------------------------
SÉCURITÉ DE LA LANE DU TOKEN
------------------------------------------------------------

Éviter qu’un token soit impossible à collecter à cause d’un obstacle exactement superposé.

Créer une fenêtre de sécurité autour de chaque token :

- environ 800 ms avant le spawn ;
- environ 1 200 ms après le spawn.

Si un obstacle Daily doit apparaître dans la même lane pendant cette fenêtre :
- déplacer l’obstacle de manière déterministe vers une autre lane ;
- continuer à consommer les tirages RNG dans le même ordre ;
- ne pas utiliser Math.random() ;
- ne pas supprimer tous les obstacles ;
- ne jamais modifier Survival, Campaign ou Training.

Cette règle doit être identique pour tous les joueurs.

============================================================
BLOC 5 — PRÉPARATION DE LA PARTIE AVANT CONSOMMATION
============================================================

Problème actuel :
beginRun() consomme immédiatement une tentative locale lorsque rankState === "ranked".

Objectif :
Une tentative Daily ne doit être consommée que lorsque :
- le manifeste est chargé ;
- les données sont valides ;
- les 15 logos ont été préchargés ou remplacés par un fallback ;
- Phaser est prêt à démarrer.

Créer un flux de préparation Daily.

État ou écran recommandé :

DailyPreparationScreen
ou
DailyPreparationModal

Étapes visibles :

1. “Loading today’s token challenge…”
2. “Preparing token logos…”
3. “Starting run…”

Comportement :

- le joueur peut annuler pendant le chargement ;
- annuler retourne à la Home ;
- aucune tentative n’est consommée ;
- aucune partie n’est enregistrée ;
- aucun score n’est créé ;
- les erreurs réseau affichent Retry ;
- ne pas lancer plusieurs préparations en parallèle ;
- utiliser AbortController ;
- ignorer proprement un résultat async après démontage ;
- revalider le nombre de tentatives juste avant le démarrage ;
- revalider la présence du Pi user pour une partie classée ;
- consommer la tentative locale exactement une fois, au moment réel du lancement.

Refactoriser App.tsx proprement :

- beginRun générique peut rester pour Training/Survival/Campaign ;
- créer un chemin spécifique prepareAndStartDaily ;
- transmettre le DailyTokenChallenge à GameScreen ;
- conserver le challenge en mémoire pour ResultScreen ;
- Play Again doit réutiliser le challenge si :
  - même date UTC ;
  - même version ;
  - challenge valide ;
- sinon, le recharger ;
- revalider les tentatives avant chaque nouvelle run.

Ne pas modifier la limite de 3 tentatives.

Quitter une partie après son démarrage conserve la tentative consommée, comme actuellement.

============================================================
BLOC 6 — CAS D’ERREUR ET FALLBACK
============================================================

Partie classée :

Elle ne peut démarrer que si :
- Pi est connecté ;
- il reste une tentative ;
- rankedEligible = true ;
- challengeDate correspond à la date UTC actuelle ;
- le manifeste est complet ;
- tous les token IDs sont uniques ;
- les points sont valides.

Si ce n’est pas le cas :
- ne pas consommer la tentative ;
- afficher Retry ;
- afficher “Play locally” ;
- ne pas soumettre le score local au leaderboard.

Partie locale :

Elle peut utiliser :
- challenge live ;
- challenge stale ;
- challenge fallback.

Pour un prix indisponible :
- afficher “Price unavailable” ;
- ne jamais afficher “$0.00” comme si la valeur réelle était zéro ;
- utiliser les points fallback déjà présents dans le manifeste ;
- indiquer clairement “Local market fallback”.

Ne jamais présenter une partie fallback comme classée.

============================================================
BLOC 7 — PRÉCHARGEMENT DES LOGOS
============================================================

Précharger uniquement les logos des tokens sélectionnés, donc 15 maximum.

Contraintes :
- aucune requête d’image ne doit démarrer pendant la run ;
- timeout global raisonnable, environ 5 secondes ;
- un logo cassé ne doit pas empêcher la partie de démarrer ;
- les chargements réussis doivent être réutilisés pendant les replays du même jour ;
- éviter les téléchargements multiples du même logo ;
- utiliser des clés de texture stables fondées sur le CoinGecko ID ;
- nettoyer les éventuelles object URLs lors d’un changement de challenge/jour ;
- gérer CORS proprement ;
- ne pas charger les 36 logos du catalogue dans Phaser.

Créer un cache dédié si nécessaire, par exemple :

src/market/tokenAssetCache.ts

Fallback visuel :
- disque coloré ;
- symbole en lettres majuscules ;
- maximum 4 caractères ;
- aucune image cassée visible.

Ne pas copier ou commiter les logos CoinGecko dans le repository.
Utiliser les URLs du snapshot.

============================================================
BLOC 8 — IDENTITÉ VISUELLE DU JOUEUR PI
============================================================

L’orbe du joueur doit clairement représenter Pi.

Ajouter un symbole typographique “π” au centre de l’orbe.

Contraintes :
- conserver exactement la même hitbox ;
- conserver exactement la même taille de collision ;
- le symbole reste lisible pendant les changements de lane ;
- le symbole ne doit pas être un logo officiel approximativement redessiné ;
- ne pas importer un asset officiel non autorisé ;
- utiliser un glyph “π” original dans le style Rush Pi ;
- préserver les auras Shield, Magnet et Charge.

Cette modification peut être cosmétique dans tous les modes afin que le joueur reste le même personnage.

============================================================
BLOC 9 — CHAIN BLOCKS DANS DAILY
============================================================

Dans Daily uniquement, les anciennes énergies ordinaires deviennent visuellement des Chain Blocks.

Design procédural recommandé :
- petit bloc carré ou hexagonal ;
- couleur or/violet ;
- halo léger ;
- trait intérieur évoquant un maillon ou un bloc de chaîne ;
- très distinct des tokens ronds avec logo ;
- très distinct des obstacles rouges.

Ne pas utiliser d’asset externe.

Comportement :
- scoring énergie existant inchangé ;
- combo existant inchangé ;
- champ energiesCollected continue à compter les Chain Blocks ;
- les bonus Energy Zone Daily créent également des Chain Blocks ;
- le Magnet attire seulement les Chain Blocks ;
- Training garde ses orbes d’énergie actuelles ;
- Survival et Campaign restent inchangés.

Dans les textes Daily :
- remplacer “Energy Collected” par “Blocks Collected” ;
- ne pas renommer les champs backend historiques si cela casse la compatibilité.

============================================================
BLOC 10 — OBJETS TOKEN DANS PHASER
============================================================

Étendre proprement FallingObject.

Architecture possible :

type FallingType =
  | "energy"
  | "block"
  | "token"
  | "obstacle"
  | "life"
  | PowerupKind;

interface FallingObject {
  container: Phaser.GameObjects.Container;
  type: FallingType;
  lane: number;
  alive: boolean;
  token?: DailyTokenSpec;
}

Créer :
- spawnDueDailyTokens()
- spawnToken()
- makeTokenCollectible()
- collectToken()

Ne pas ajouter toutes les règles dans update() sans helpers.

Visuel d’un token :
- disque/jeton circulaire ;
- logo centré ;
- contour lumineux ;
- symbole court sous le logo ou intégré ;
- taille lisible mais pas plus grande qu’un obstacle au point de masquer une lane ;
- fallback procédural si texture absente ;
- légère rotation/pulse ;
- hitbox conservée selon la logique lane + y existante.

Collecte :
- même logique lane + distance verticale ;
- pas de Magnet ;
- logo qui grossit et disparaît ;
- burst léger de la couleur Rush Pi ;
- texte flottant :
  “BTC +750”
- seconde ligne compacte :
  prix formaté ou “Price unavailable” ;
- aucun effet agressif plein écran ;
- token ID ajouté une seule fois dans la liste collectée ;
- protection contre toute double collision.

Token manqué :
- le marquer comme manqué ;
- détruire proprement son objet ;
- aucun point ;
- aucun changement de combo.

============================================================
BLOC 11 — HUD DAILY TOKEN RUSH
============================================================

Le HUD principal reste lisible.

Ajouter une information compacte dans Daily :

“Tokens 4/15”

Ne pas ajouter une quatrième grosse carte dans le HUD si cela surcharge l’écran.

Utiliser une petite ligne/chip sous le HUD ou près du timer.

Lors de la collecte :
- afficher brièvement le symbole et les points ;
- ne pas laisser une liste permanente ;
- une seule notification visible à la fois ;
- la nouvelle notification remplace ou enchaîne proprement la précédente.

Conserver :
- Score ;
- Time ;
- Combo ;
- Shield ;
- Magnet ;
- Event ;
- Finish sequence.

Mettre à jour le modal “How to play” Daily :

- 60-second ranked token race
- Collect unique market tokens
- Each token appears once
- Collect Chain Blocks to build combo
- Magnet attracts Chain Blocks only
- Token prices come from today’s market snapshot
- 3 ranked attempts per day

Légende :
- Token logo = unique token collectible
- Chain Block = repeatable combo collectible
- Red diamond = hazard
- Shield = absorbs one hit
- Magnet = attracts Chain Blocks only

Ajouter l’attribution CoinGecko dans ce modal ou dans les détails du résultat :
“Market data by CoinGecko”

============================================================
BLOC 12 — SCORING ET GAME RESULT
============================================================

Le score final Daily contient :

- scoring actuel des Chain Blocks ;
- scoring passif actuel ;
- pénalités obstacles actuelles ;
- clean-run bonus actuel ;
- points fixes des tokens collectés.

Les points token ne sont jamais multipliés par le combo.

Ajouter à GameResult les données nécessaires, par exemple :

rulesVersion: number;
dailyChallengeId: string;
dailyTokenChallengeVersion: number;
dailyTokensTotal: number;
dailyTokenIdsCollected: string[];
dailyTokenPoints: number;
dailyTokenMarketValueUsd: number;
dailyBlockPoints: number;

Pour les modes non Daily :
- valeurs neutres ;
- ou champs optionnels correctement typés.

Ne pas stocker des objets CoinGecko complets dans GameResult.
Le challenge conservé dans App/ResultScreen sert à reconstruire l’affichage.

dailyTokenMarketValueUsd :
- somme des referencePriceUsd des tokens collectés ;
- purement informative ;
- jamais utilisée pour classer ;
- jamais considérée fiable côté serveur ;
- afficher “Unavailable” si les prix sont fallback.

dailyBlockPoints :
- somme des points gagnés en collectant les Chain Blocks avant bonus/pénalités ;
- utile uniquement pour le détail du résultat.

============================================================
BLOC 13 — ÉCRAN DE RÉSULTAT DAILY
============================================================

Adapter uniquement la branche Daily de ResultScreen.

Toujours visible :
- Score final ;
- New Best si applicable ;
- Tokens Collected : X / 15 ;
- Token Points ;
- Market Value Collected ;
- sync serveur ;
- streak.

Trois statistiques principales maximum :
- Tokens Collected ;
- Blocks Collected ;
- Max Combo.

Dans “View details” :
- grille/liste des 15 tokens ;
- logo ;
- symbole ;
- prix snapshot ;
- points ;
- état collecté ✓ ou manqué ✕ ;
- Token Points ;
- Block Points ;
- Obstacles Hit ;
- End Bonus ;
- Best Score.

La liste doit :
- être scrollable ;
- rester compacte ;
- utiliser les logos déjà chargés ou leurs URLs en lazy loading ;
- utiliser un placeholder si une image échoue ;
- ne pas afficher 15 énormes cartes ;
- être lisible sur 375×667.

Exemple :

TOKENS 11/15

✓ BTC   $…       +750
✓ ETH   $…       +690
✕ SOL   $…       +520
✓ XLM   $…       +330

Market value est un indicateur spectaculaire, mais pas le score classé.

Afficher :
“Prices fixed from today’s UTC market snapshot”
et
“Market data by CoinGecko”

Training Result reste inchangé.

============================================================
BLOC 14 — SERVEUR : VALIDATION DES SCORES TOKEN RUSH
============================================================

Étendre SubmitScorePayload avec :

rules_version: 2;
daily_token_challenge_version: 1;
daily_challenge_id: string;
token_ids_collected: string[];
token_points: number;
tokens_collected_count: number;

Ne pas faire confiance à :
- challenge date client ;
- challenge ID client ;
- points client ;
- count client ;
- prix client ;
- ordre client.

Dans submit-score côté serveur :

1. Calculer la date UTC courante.
2. Charger le snapshot persistant du jour.
3. Reconstruire le manifeste DailyTokenChallenge avec le même helper serveur.
4. Vérifier rules_version === 2.
5. Vérifier daily_token_challenge_version === 1.
6. Vérifier que le challenge actuel est rankedEligible.
7. Vérifier que token_ids_collected est un tableau de strings.
8. Refuser tout doublon.
9. Vérifier que chaque ID appartient aux 15 tokens du manifeste.
10. Recalculer token_points depuis les IDs.
11. Vérifier que le total recalculé correspond exactement au token_points soumis.
12. Vérifier que tokens_collected_count correspond à la longueur du tableau.
13. Vérifier token_points <= totalTokenPointsPossible.
14. Vérifier score >= token_points.
15. Conserver les contrôles existants :
    - durée ;
    - score maximal ;
    - énergie ;
    - combo ;
    - obstacles ;
    - 3 tentatives serveur par jour.
16. Utiliser le challenge_id serveur :
    RUSHPI-YYYY-MM-DD-TOKEN-V1
17. Ne jamais faire confiance au challenge_id client.
18. Insérer uniquement les données vérifiées.

Ne pas prétendre créer une protection anti-cheat cryptographique.
Il s’agit d’une validation serveur cohérente et d’un contrôle de plausibilité.

Le score maximal actuel de 50 000 possède encore assez de marge :
- ne pas l’augmenter sans nécessité ;
- vérifier que le maximum théorique Token Rush reste largement inférieur.

Si le snapshot ou manifeste serveur est indisponible :
- ne pas accepter le score classé ;
- retourner une erreur propre ;
- le score reste sauvegardé localement côté client.

============================================================
BLOC 15 — MIGRATION SUPABASE 11B
============================================================

Créer :

supabase/migration_11b.sql

Migration non destructive :

alter table public.rushpi_scores
  add column if not exists rules_version integer not null default 1,
  add column if not exists token_challenge_version integer null,
  add column if not exists token_points integer not null default 0,
  add column if not exists tokens_collected_count integer not null default 0,
  add column if not exists token_ids_collected jsonb not null default '[]'::jsonb;

Ajouter des contraintes prudentes si compatibles :

- rules_version >= 1 ;
- token_points >= 0 ;
- tokens_collected_count >= 0 ;
- token_ids_collected doit être un array JSON.

Ajouter un index utile :

(challenge_date, rules_version, is_valid, score desc)

Ne supprimer ou modifier aucune ancienne ligne.
Les anciennes lignes gardent rules_version = 1.

Ne pas prétendre que la migration a été exécutée.
Dans le rapport final, fournir clairement le SQL à exécuter manuellement avant le déploiement du nouveau submit-score.

============================================================
BLOC 16 — VERSIONNER LES LEADERBOARDS
============================================================

Le nouveau score Token Rush ne doit pas être mélangé avec les anciens scores Daily v1.

Daily leaderboard :
- filtrer sur rules_version = 2 ;
- filtrer sur challenge_id du Token Rush du jour ;
- retourner également :
  - token_points ;
  - tokens_collected_count.

Global leaderboard :
- filtrer sur rules_version = 2 ;
- ne pas supprimer les anciens scores ;
- simplement ne plus les comparer au nouveau mode.

Adapter ServerScore et l’UI Leaderboard :
- score ;
- username ;
- tokens collectés ;
- token points ;
- blocks collectés si le champ historique energy_collected est utilisé.

Affichage compact :
“12/15 tokens · 6,300 token pts”

Ne pas surcharger chaque ligne.

------------------------------------------------------------
DONNÉES LOCALES / ANCIENS RECORDS
------------------------------------------------------------

Ne pas supprimer les anciennes données locales.

Les anciens scores v1 ne doivent pas être présentés comme directement comparables aux scores Token Rush v2.

Ajouter une version aux nouvelles entrées locales si nécessaire.

Créer un meilleur score spécifique, non destructif, par exemple :

bestDailyTokenRushScore: number

Les anciens champs restent présents pour compatibilité.

Home et Result du nouveau Daily doivent afficher le meilleur score Token Rush v2.

Ne pas réinitialiser :
- XP ;
- streak ;
- badges ;
- historique ;
- ancien best score ;
- anciennes entrées.

Si une migration de localStorage est nécessaire :
- utiliser des valeurs par défaut ;
- la rendre rétrocompatible ;
- ne jamais effacer le profil existant.

============================================================
BLOC 17 — FINISH SEQUENCE
============================================================

Conserver exactement la Finish sequence Daily validée :

- gel exact à 60 secondes ;
- gate FINISH ;
- ralentissement ;
- FINISH!;
- résultat après la transition ;
- GameOver une seule fois.

Pendant la phase finishing :
- aucune collecte de block ;
- aucune collecte de token ;
- aucun point ;
- aucune modification de la liste collected/missed ;
- score final figé.

Les tokens encore à l’écran à 60 secondes sont considérés comme manqués.

============================================================
BLOC 18 — À NE PAS MODIFIER
============================================================

Ne pas modifier :

- durée Daily : 60 secondes ;
- limite : 3 tentatives ;
- connexion Pi ;
- paiement Pi ;
- Survival ;
- Campaign ;
- Training ;
- vies ;
- charge ;
- Life Orbs ;
- objectifs Campaign ;
- étoiles Campaign ;
- zones Survival ;
- collisions lane + y ;
- hitbox ;
- contrôles drag/slide ;
- finish Daily ;
- règles existantes des badges ;
- Supabase leaderboard v1 historique ;
- snapshot CoinGecko déjà persisté ;
- clé CoinGecko ;
- endpoints Pi.

Ne pas ajouter :
- nouveaux sons ;
- nouveaux mini-jeux ;
- refonte Campaign ;
- assets générés par IA ;
- logos copiés dans le repo ;
- polling CoinGecko ;
- appels CoinGecko depuis le navigateur ;
- prix live changeant pendant une run ;
- token répété ;
- token attiré par le Magnet.

============================================================
ARCHITECTURE ATTENDUE
============================================================

MainScene doit orchestrer, mais ne doit pas contenir toute la logique du challenge.

Créer des modules propres selon l’architecture existante, par exemple :

Serveur :
- api/_lib/dailySnapshot.ts
- api/_lib/dailyTokenChallenge.ts
- api/market/daily-challenge.ts

Client :
- src/market/dailyTokenTypes.ts
- src/market/tokenAssetCache.ts
- src/components/DailyPreparationScreen.tsx

Jeu :
- src/game/dailyTokens.ts
ou un module équivalent pour les helpers visuels et de planning.

Éviter :
- une énorme fonction update() ;
- la duplication de la formule de points ;
- la duplication de l’algorithme de sélection côté client ;
- les types any ;
- les valeurs magiques dispersées.

============================================================
ORDRE DES COMMITS
============================================================

Faire trois commits séparés.

Commit 1 :

git add -A
git commit -m "Add deterministic daily token challenge"

Contenu :
- helper snapshot réutilisable ;
- manifeste serveur ;
- sélection déterministe ;
- formule de points ;
- endpoint daily-challenge ;
- types client ;
- écran de préparation ;
- tentative consommée seulement au démarrage.

Commit 2 :

git add -A
git commit -m "Add token collectibles to Daily Run"

Contenu :
- cache/préchargement logos ;
- Chain Blocks ;
- tokens Phaser ;
- Magnet blocks-only ;
- HUD token ;
- joueur π ;
- collecte/missed ;
- résultats bruts dans GameResult ;
- onboarding Daily mis à jour.

Commit 3 :

git add -A
git commit -m "Add token results and ranked validation"

Contenu :
- ResultScreen Daily ;
- validation serveur ;
- versionnement leaderboard ;
- migration SQL 11B ;
- meilleur score local v2 ;
- affichage leaderboard Token Rush.

Puis :

git push

============================================================
TESTS AUTOMATIQUES
============================================================

Exécuter :

npx tsc --noEmit
npx tsc -p api/tsconfig.json
npm run build

Tester les fonctions pures avec des scripts temporaires ou l’infrastructure existante :

1. Même date + même snapshot → manifeste strictement identique.
2. Ordre CoinGecko différent → même manifeste.
3. 15 IDs uniques.
4. BTC exactement une fois.
5. ETH exactement une fois.
6. Aucun stablecoin au-delà du cap.
7. Aucun meme token au-delà du cap.
8. Tous les spawnTimeMs entre 4 000 et 54 000.
9. Écart minimal respecté.
10. Lanes entre 0 et 2.
11. Pas plus de deux mêmes lanes consécutives.
12. Points toujours entre 200 et 750.
13. Token points total = somme exacte.
14. Fallback → rankedEligible false.
15. Doublon de token collecté → rejet serveur.
16. Token absent du manifeste → rejet serveur.
17. Mauvais total de points → rejet serveur.
18. Payload valide → accepté par la fonction de validation.

Ne pas ajouter un gros framework de test s’il n’existe pas déjà.
Ne pas laisser les scripts temporaires dans les commits.

============================================================
MCP DEVTOOLS — TESTS CIBLÉS ET COURTS
============================================================

Ne fais pas d’audit général.
Ne joue pas trois parties de 60 secondes.
Ne parcours pas Campaign ou Survival.
Ne teste pas les 36 tokens.
Maximum deux captures utiles.

TEST 1 — Préparation et tentative
Viewport : 375×667

Cas succès :
- cliquer Daily ;
- vérifier écran Loading challenge / Preparing logos ;
- vérifier que la tentative n’est pas consommée pendant le chargement ;
- vérifier qu’elle est consommée exactement une fois au démarrage réel.

Cas annulation :
- relancer préparation ;
- annuler avant démarrage ;
- vérifier aucune tentative consommée.

Cas erreur :
- simuler une erreur de challenge ;
- vérifier Retry + Play locally ;
- vérifier aucune tentative ranked consommée.

TEST 2 — Challenge déterministe
Appeler deux fois :

/api/market/daily-challenge

Vérifier :
- même challengeDate ;
- même challengeId ;
- mêmes 15 IDs ;
- mêmes points ;
- mêmes horaires ;
- mêmes lanes ;
- BTC et ETH une fois ;
- rankedEligible true si le snapshot est persisté ;
- aucun secret dans la réponse.

TEST 3 — Gameplay injecté court
Viewport : 390×844

Ne pas attendre 60 secondes.

Injecter temporairement/runtime un planning contenant :
- 3 tokens ;
- plusieurs Chain Blocks ;
- un Magnet actif.

Vérifier :
- logos visibles ;
- tokens uniques ;
- Chain Blocks attirés ;
- token non attiré ;
- token collecté uniquement sur la bonne lane ;
- toast symbole + points ;
- compteur Tokens X/15 ;
- token manqué correctement compté ;
- score token fixe, sans combo ;
- aucune modification de Training/Survival/Campaign.

Retirer tout injecteur/mock avant commit.

TEST 4 — Résultat Daily
Viewport : 375×667

Injecter un résultat local temporaire :
- 10 tokens collectés sur 15 ;
- plusieurs prix ;
- un logo manquant ;
- token points ;
- block points.

Vérifier :
- 3 statistiques principales maximum ;
- Tokens 10/15 ;
- valeur de marché ;
- liste compacte dans View details ;
- ✓ / ✕ lisibles ;
- placeholder du logo cassé ;
- attribution CoinGecko ;
- scroll tactile.

Retirer le mock avant commit.

TEST 5 — Validation serveur
Ne pas polluer le leaderboard production avec de faux utilisateurs.

Tester localement la fonction de validation :

- liste valide → acceptée ;
- ID dupliqué → rejet ;
- ID hors challenge → rejet ;
- token_points falsifié → rejet ;
- count falsifié → rejet ;
- mauvais rulesVersion → rejet ;
- challenge fallback → rejet ranked.

Si une intégration réelle est nécessaire, utiliser uniquement un environnement de développement prévu à cet effet.

============================================================
VÉRIFICATIONS AVANT COMMIT
============================================================

Vérifier :

- aucun prix ou logo hardcodé dans MainScene ;
- aucun appel CoinGecko client ;
- aucune clé dans le bundle ;
- aucune clé dans Git ;
- aucun token dupliqué ;
- aucune utilisation de Math.random dans le manifeste ;
- aucun mock ;
- aucune durée Daily modifiée ;
- aucun seuil temporaire ;
- aucune migration prétendue appliquée ;
- git diff propre ;
- Daily seed principal encore déterministe ;
- Survival/Campaign/Training inchangés ;
- build front et API réussis.

============================================================
RAPPORT FINAL ATTENDU
============================================================

Fournir :

1. Architecture du manifeste Daily Token Rush.
2. Algorithme de sélection des 15 tokens.
3. Formule exacte des points.
4. Liste des 15 tokens obtenus lors du test du jour.
5. Horaires et lanes déterministes.
6. Fonctionnement de la préparation avant run.
7. Moment exact de consommation d’une tentative.
8. Gestion loading/error/cancel/fallback.
9. Fonctionnement du préchargement des logos.
10. Fallback visuel d’un logo cassé.
11. Nouveau visuel du joueur π.
12. Nouveau visuel des Chain Blocks.
13. Fonctionnement du Magnet.
14. Fonctionnement de la collecte et des tokens manqués.
15. Données ajoutées à GameResult.
16. Nouveau résultat Daily.
17. Validation serveur des token points.
18. Versionnement du Daily leaderboard.
19. Gestion non destructive des anciens scores.
20. Contenu complet de migration_11b.sql.
21. Action manuelle Supabase requise avant déploiement.
22. Fichiers créés et modifiés.
23. Confirmation Daily 60 s / Finish / seed / 3 tentatives.
24. Confirmation Survival/Campaign/Training inchangés.
25. Confirmation Pi SDK/paiement inchangés.
26. Résultats des cinq tests MCP ciblés.
27. Résultats tsc API/front et build.
28. Hash des trois commits.