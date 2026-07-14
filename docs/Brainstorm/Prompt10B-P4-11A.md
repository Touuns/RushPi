Tu travailles sur Rush Pi.

Repository :
https://github.com/Touuns/RushPi.git

Branche :
main

Derniers commits :
- 44c945f — Move Pi connect to home header
- 0857057 — Add smooth campaign and survival endings
- 23161e9 — Simplify result summaries and badge unlocks

On lance deux travaux successifs :

1. PHASE 10B-P4 — Navigation intuitive avec flèche retour
2. PHASE 11A — Market Data Foundation avec CoinGecko

Important :
La Phase 11A prépare les données, logos, prix, cache et snapshots.
Elle ne modifie encore aucun gameplay, aucun score et aucun objet Phaser.

============================================================
PHASE 10B-P4 — FLÈCHE RETOUR UNIVERSELLE
============================================================

Problème utilisateur :
Pour revenir à l’écran précédent, il faut souvent faire défiler toute la page jusqu’au bouton “Back Home” ou “Back to Campaign”.

Objectif :
Ajouter une flèche intuitive “←” en haut à gauche de tous les écrans secondaires.

Créer un composant réutilisable :

src/components/ScreenBackButton.tsx

Interface possible :

interface ScreenBackButtonProps {
  onBack: () => void;
  label?: string;
  disabled?: boolean;
}

Comportement visuel :
- flèche “←” ou chevron SVG simple ;
- position en haut à gauche ;
- cible tactile d’au moins 44 × 44 px ;
- respecter env(safe-area-inset-top) et env(safe-area-inset-left) ;
- suffisamment contrastée ;
- ne pas chevaucher les titres ;
- z-index correct ;
- aria-label clair ;
- pas d’emoji dépendant de la police si un SVG/CSS simple est plus stable.

Écrans concernés :

1. Campaign Level Select
Retour :
- Home.

2. Profile
Retour :
- Home.

3. Leaderboard
Retour :
- Home.

4. Result Daily
Retour :
- Home.

5. Result Training
Retour :
- Home.

6. Result Survival
Retour :
- Home.

7. Result Campaign
Retour :
- Campaign Level Select.

8. GameScreen Daily / Training / Survival
Retour :
- ouvrir une confirmation avant de quitter ;
- si confirmé : Home.

9. GameScreen Campaign
Retour :
- ouvrir une confirmation avant de quitter ;
- si confirmé : Campaign Level Select.

Ne pas mettre de flèche sur la Home.

------------------------------------------------------------
CONFIRMATION DE SORTIE EN COURS DE PARTIE
------------------------------------------------------------

Dans GameScreen, remplacer le comportement direct du bouton ✕ actuel par une flèche retour en haut à gauche.

Au clic pendant une partie active, afficher un modal léger :

Titre :
“Quit this run?”

Texte :
“Your current run progress will be lost.”

Actions :
- “Keep playing”
- “Quit run”

Pour Campaign :
“Quit level” peut être utilisé à la place de “Quit run”.

Contraintes :
- la partie Phaser doit rester figée ou ignorer les interactions tant que la confirmation est ouverte ;
- aucun objet ne doit être collecté derrière le modal ;
- aucun changement de lane pendant le modal ;
- éviter de laisser le jeu continuer silencieusement pendant que le joueur lit ;
- reprendre proprement si “Keep playing” ;
- détruire proprement Phaser si “Quit run” ;
- ne pas créer de GameResult ;
- ne pas enregistrer de score, XP, badge ou tentative supplémentaire ;
- une tentative Daily déjà consommée reste consommée, conformément au fonctionnement existant ;
- ne pas permettre de quitter deux fois ;
- si une séquence ending/finishing a déjà commencé, désactiver la flèche ou quitter proprement sans callback tardif.

Architecture :
- ne pas utiliser window.confirm ;
- utiliser un modal React accessible ;
- ajouter si nécessaire un événement centralisé Phaser pour pause/resume ;
- ou utiliser game.scene.pause()/resume() proprement ;
- vérifier que les timers Phaser reprennent correctement.

------------------------------------------------------------
BOUTONS DU BAS
------------------------------------------------------------

Ne pas forcément supprimer tous les boutons du bas.

Ils peuvent rester comme actions explicites :
- Back Home
- Back to Campaign

Mais la flèche doit toujours permettre de repartir sans scroller.

Éviter les doublons visuels excessifs :
- si le bouton inférieur n’apporte rien, il peut être retiré ;
- conserver en revanche les actions principales comme Retry, Next Level et Play Again.

------------------------------------------------------------
NAVIGATION
------------------------------------------------------------

Ne pas utiliser automatiquement window.history.back(), car Rush Pi repose sur une state-machine React interne.

La destination doit être explicite et fiable.

Dans App.tsx, créer les callbacks adaptés, par exemple :
- goHome
- goCampaign
- quitRunToHome
- quitCampaignToSelect

Ne pas modifier les routes publiques ni introduire React Router dans cette petite phase.

Commit :

git add -A
git commit -m "Add intuitive back navigation"

============================================================
PHASE 11A — MARKET DATA FOUNDATION
============================================================

But général :
Préparer une base propre et sécurisée pour les futures phases :

- Daily Token Rush ;
- tokens uniques avec logos ;
- prix de marché ;
- Campaign blockchain ;
- score Daily équitable ;
- affichage de données fraîches ;
- fonctionnement de secours si l’API tombe.

Aucun token ne doit encore apparaître dans Phaser dans cette phase.

Aucun score ne doit être modifié.

============================================================
PRINCIPE IMPORTANT : LIVE VS SNAPSHOT
============================================================

Il faut gérer deux usages distincts.

1. Données live/cachées
Utiles pour :
- afficher les prix actuels ;
- préparer les écrans ;
- futures parties locales/non classées ;
- précharger les logos.

Ces données peuvent être actualisées avec un cache de quelques minutes.

2. Snapshot Daily immuable
Utilisé plus tard pour :
- le Daily Run classé ;
- garantir que tous les joueurs ont les mêmes tokens ;
- garantir les mêmes prix de référence ;
- garantir les mêmes points ;
- éviter qu’un joueur gagne plus parce que le prix a changé dix minutes plus tard.

Une fois le snapshot UTC du jour créé, il ne doit plus changer pendant cette journée.

Le gameplay Daily n’utilise pas encore ce snapshot dans 11A.

============================================================
FOURNISSEUR
============================================================

Utiliser CoinGecko Demo API.

Base URL Demo :
https://api.coingecko.com/api/v3

Authentification serveur :
header :
x-cg-demo-api-key: process.env.COINGECKO_DEMO_API_KEY

Variable d’environnement :
COINGECKO_DEMO_API_KEY

Ne jamais :
- mettre la clé dans VITE_* ;
- exposer la clé dans le bundle client ;
- écrire la clé dans Git ;
- envoyer la clé au navigateur ;
- mettre la clé dans une query string ;
- appeler CoinGecko directement depuis React ou Phaser.

Endpoint principal :
GET /coins/markets

Paramètres recommandés :
- vs_currency=usd
- ids=<liste séparée par virgules>
- order=market_cap_desc
- sparkline=false
- price_change_percentage=24h
- locale=en
- precision=full

============================================================
CATALOGUE DE TOKENS APPROUVÉ
============================================================

Créer une liste blanche locale utilisant exclusivement les IDs CoinGecko stables.

Fichier possible :

src/market/tokenCatalog.ts

Type proposé :

interface TokenCatalogEntry {
  id: string;
  preferredSymbol: string;
  category:
    | "store-of-value"
    | "smart-contract"
    | "payments"
    | "layer-2"
    | "interoperability"
    | "stablecoin"
    | "meme"
    | "privacy"
    | "defi";
  enabledForDaily: boolean;
  enabledForCampaign: boolean;
}

Inclure initialement une sélection maîtrisée d’environ 30 à 50 actifs connus.

Exemples d’IDs CoinGecko possibles à vérifier auprès de l’API avant validation :
- bitcoin
- ethereum
- solana
- stellar
- cardano
- polkadot
- chainlink
- avalanche-2
- polygon-ecosystem-token
- arbitrum
- optimism
- cosmos
- litecoin
- dogecoin
- shiba-inu
- monero
- uniswap
- aave
- tether
- usd-coin

Important :
- ne jamais utiliser le symbole seul comme identifiant ;
- les symboles peuvent être dupliqués ;
- CoinGecko ID est la clé primaire fonctionnelle ;
- exclure les actifs sans prix ;
- exclure les logos manquants ;
- exclure les résultats ambigus ;
- ne pas accepter un ID envoyé librement par le client pour éviter un proxy CoinGecko ouvert.

Le serveur doit uniquement accepter la liste blanche interne.

============================================================
TYPES NORMALISÉS
============================================================

Créer des types partagés, par exemple :

src/market/types.ts

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  currentPriceUsd: number;
  marketCapUsd: number | null;
  marketCapRank: number | null;
  priceChange24h: number | null;
  providerUpdatedAt: string;
}

interface MarketResponse {
  source: "coingecko";
  status: "live" | "cached" | "stale" | "fallback";
  currency: "usd";
  fetchedAt: string;
  providerUpdatedAt: string | null;
  coins: MarketCoin[];
  attribution: string;
}

interface DailyMarketSnapshot {
  challengeDate: string;
  source: "coingecko";
  currency: "usd";
  createdAt: string;
  coins: MarketCoin[];
  version: 1;
}

Valider toutes les réponses externes :
- Array.isArray ;
- chaînes non vides ;
- prix finite et ≥ 0 ;
- rank nullable ;
- URL d’image HTTPS ;
- timestamps valides ;
- ignorer proprement une entrée invalide.

Ne jamais faire confiance directement au JSON CoinGecko.

============================================================
CLIENT COINGECKO SERVEUR
============================================================

Créer un module serveur isolé selon la structure actuelle du repository.

Exemple :

api/_lib/coingecko.ts
ou
src/server/market/coingecko.ts

Fonctions :
- fetchApprovedMarketCoins()
- normalizeCoinGeckoMarketResponse()
- isValidMarketCoin()
- getMarketCacheKey()

Prévoir :
- AbortController ;
- timeout de 5 à 8 secondes ;
- gestion 401 ;
- gestion 429 ;
- gestion 5xx ;
- message serveur propre ;
- ne jamais renvoyer la clé dans les erreurs ;
- logs sans secret ;
- une seule requête /coins/markets pour l’ensemble de la liste approuvée.

============================================================
ENDPOINT 1 — DONNÉES LIVE CACHÉES
============================================================

Créer un endpoint serveur selon les conventions Vercel déjà présentes :

GET /api/market/coins

Réponse :
MarketResponse

Cache recommandé :
- cache CDN/server de 5 minutes ;
- stale-while-revalidate si compatible avec l’architecture existante ;
- éviter une requête CoinGecko par utilisateur ou par partie ;
- Cache-Control adapté ;
- une réponse identique peut servir plusieurs joueurs.

Exemple conceptuel :
Cache-Control:
public, s-maxage=300, stale-while-revalidate=900

Ne pas utiliser localStorage comme cache serveur.

L’endpoint ne doit accepter aucun paramètre permettant de choisir arbitrairement des IDs.

Il retourne uniquement le catalogue approuvé.

Méthodes :
- GET autorisé ;
- autres méthodes → 405.

============================================================
ENDPOINT 2 — SNAPSHOT DAILY
============================================================

Créer :

GET /api/market/daily

Fonctionnement :

1. Déterminer la date UTC YYYY-MM-DD.
2. Chercher un snapshot existant pour cette date.
3. S’il existe :
   - le retourner sans appeler CoinGecko.
4. S’il n’existe pas :
   - récupérer les données CoinGecko ;
   - normaliser ;
   - enregistrer le snapshot ;
   - retourner exactement ce snapshot.
5. Deux requêtes simultanées ne doivent pas créer deux snapshots différents.
6. Une contrainte unique doit garantir un seul snapshot par date/version/currency.
7. Si CoinGecko est indisponible :
   - utiliser le dernier snapshot valide comme fallback stale si disponible ;
   - sinon utiliser un petit fallback local clairement identifié ;
   - ne jamais répondre avec un JSON partiellement invalide.

Ne pas choisir encore les tokens qui spawneront dans la Daily.
Le snapshot peut conserver l’ensemble du catalogue approuvé.

============================================================
PERSISTANCE SUPABASE
============================================================

Réutiliser l’architecture Supabase serveur déjà existante.

Ne pas toucher aux tables ou endpoints leaderboard existants.

Créer une migration isolée, si le repository possède déjà une convention de migrations.

Table suggérée :

daily_market_snapshots

Colonnes :
- id uuid primary key default gen_random_uuid()
- challenge_date date not null
- currency text not null default 'usd'
- version integer not null default 1
- source text not null default 'coingecko'
- coins jsonb not null
- provider_updated_at timestamptz null
- created_at timestamptz not null default now()

Contrainte unique :
(challenge_date, currency, version)

Sécurité :
- pas d’écriture directe depuis le navigateur ;
- création/lecture via endpoint serveur ;
- service role uniquement côté serveur si l’architecture actuelle l’utilise ;
- aucune clé Supabase sensible dans le bundle ;
- RLS adaptée ou table inaccessible directement au client.

Si aucune structure de migration n’existe :
- créer un fichier SQL clairement nommé ;
- ne pas prétendre que la migration a été appliquée ;
- indiquer précisément la commande ou l’action manuelle à effectuer dans Supabase.

============================================================
CONCURRENCE DU SNAPSHOT
============================================================

Éviter ce cas :
- joueur A crée un snapshot ;
- joueur B crée simultanément un snapshot légèrement différent.

Utiliser :
- contrainte unique ;
- insert/upsert contrôlé ;
- après conflit, relire la ligne gagnante ;
- toujours retourner la ligne persistée, pas une version locale différente.

============================================================
FALLBACK LOCAL
============================================================

Créer un petit fallback intégré avec quelques tokens seulement.

Par exemple :
- Bitcoin
- Ethereum
- Solana
- Stellar
- Cardano
- Chainlink

Le fallback doit contenir :
- id ;
- symbole ;
- nom ;
- image locale neutre ou imageUrl vide gérée proprement ;
- prix de secours explicitement marqué comme non live ;
- status="fallback".

Ne pas inventer silencieusement un prix en prétendant qu’il est actuel.

Pour une donnée fallback :
- currentPriceUsd peut être 0 ;
- l’UI doit afficher “Price unavailable” ;
- ne pas afficher “$0.00” comme si le token valait zéro.

============================================================
SERVICE CLIENT
============================================================

Créer :

src/market/marketClient.ts

Fonctions possibles :
- fetchMarketCoins()
- fetchDailyMarketSnapshot()

Contraintes :
- appelle uniquement les endpoints Rush Pi ;
- timeout client ;
- validation minimale de réponse ;
- erreur typée ;
- aucune connaissance de la clé CoinGecko ;
- ne pas faire de polling permanent ;
- ne pas appeler l’API à chaque render.

============================================================
MARKET DATA PREVIEW
============================================================

Pour tester la fondation sans modifier le gameplay, ajouter un aperçu compact dans le Profil.

Utiliser un <details> replié :

“Market Data”

Une fois ouvert :
- statut live/cached/stale/fallback ;
- fetchedAt ;
- six premiers tokens maximum ;
- petit logo ;
- symbole ;
- prix USD formaté ;
- variation 24h ;
- mention “Market data by CoinGecko”.

États UI :
- loading ;
- loaded ;
- stale ;
- fallback ;
- error ;
- bouton Retry.

Contraintes :
- ne pas charger les 30–50 images à l’écran ;
- afficher 6 éléments maximum ;
- lazy loading des images ;
- image cassée → placeholder propre ;
- pas de rafraîchissement automatique fréquent ;
- un appel au premier dépliage suffit ;
- ne pas modifier la Home ;
- ne pas modifier Phaser ;
- ne pas modifier Daily, Survival ou Campaign.

============================================================
ATTRIBUTION
============================================================

Le plan Demo nécessite une attribution.

Ajouter de manière visible dans Market Data Preview :
“Market data by CoinGecko”

Prévoir également une constante réutilisable pour les futurs écrans :

MARKET_DATA_ATTRIBUTION = "Market data by CoinGecko"

Ne pas utiliser le logo CoinGecko si cela nécessite un asset supplémentaire dans cette phase.
Le texte suffit pour le prototype.

============================================================
DOCUMENTATION ET ENV
============================================================

Mettre à jour :
- .env.example
- README ou documentation dédiée

Ajouter :

COINGECKO_DEMO_API_KEY=

Documenter :
1. créer une clé Demo CoinGecko ;
2. l’ajouter dans .env.local ;
3. l’ajouter dans Vercel Environment Variables ;
4. ne jamais préfixer avec VITE_ ;
5. redéployer Vercel ;
6. appliquer la migration Supabase si nécessaire.

Ne jamais modifier ni commiter un vrai .env.local.

============================================================
AUCUNE MODIFICATION GAMEPLAY
============================================================

Ne pas modifier :
- MainScene gameplay ;
- spawns ;
- sprites actuels ;
- tokens en jeu ;
- Magnet ;
- scoring ;
- Daily seed ;
- leaderboard ;
- tentatives ;
- durée Daily ;
- Campaign ;
- Survival ;
- badges ;
- progression ;
- localStorage gameplay ;
- Pi SDK ;
- paiement Pi.

Aucune donnée CoinGecko ne doit encore influencer :
- le score ;
- les objets ;
- les lanes ;
- les objectifs ;
- les résultats.

============================================================
COMMITS
============================================================

Commit 1 :
git add -A
git commit -m "Add intuitive back navigation"

Commit 2 :
git add -A
git commit -m "Add secure CoinGecko market data service"

Commit 3 :
git add -A
git commit -m "Add daily market snapshots and preview"

Puis :
git push

============================================================
TESTS AUTOMATIQUES
============================================================

Exécuter :

npx tsc --noEmit
npm run build

Tester les fonctions de normalisation avec :
- réponse valide ;
- prix null ;
- logo manquant ;
- URL non HTTPS ;
- tableau vide ;
- erreur 429 ;
- erreur 500 ;
- timeout.

Ajouter des tests unitaires uniquement si l’infrastructure de tests existe déjà.
Ne pas ajouter un gros framework de test seulement pour cette phase.

============================================================
MCP DEVTOOLS — TESTS CIBLÉS ET COURTS
============================================================

Ne fais pas d’audit général.
Ne joue aucune run complète.
Ne parcours pas tous les écrans.
Maximum deux captures.

TEST 1 — Navigation 375×667
- ouvrir Campaign ;
- vérifier flèche en haut à gauche ;
- revenir Home sans scroller ;
- ouvrir Profile ;
- revenir Home ;
- ouvrir Leaderboard ;
- revenir Home ;
- vérifier aucun chevauchement avec safe-area/titres.

TEST 2 — Quit run
- lancer une Training courte ;
- cliquer flèche ;
- vérifier modal “Quit this run?” ;
- choisir “Keep playing” et vérifier que la partie reprend ;
- rouvrir puis choisir “Quit run” ;
- vérifier retour Home ;
- vérifier aucun ResultScreen et aucun GameOver.

Faire le même test Campaign seulement si rapide :
- vérifier destination Campaign Level Select.

TEST 3 — Market endpoint
Avec clé configurée localement :
- appeler une fois /api/market/coins ;
- vérifier 200 ;
- vérifier aucun secret dans la réponse ;
- vérifier id/symbol/name/image/currentPrice ;
- appeler une deuxième fois ;
- vérifier cache ou absence d’un second appel provider si observable.

Sans clé :
- vérifier erreur/fallback propre ;
- aucun crash ;
- aucun secret.

TEST 4 — Snapshot Daily
- appeler deux fois /api/market/daily ;
- vérifier même challengeDate ;
- vérifier contenu identique ;
- vérifier même createdAt/ligne persistée ;
- vérifier un seul snapshot en base ;
- ne pas changer l’horloge système ni créer de données artificielles persistantes inutiles.

TEST 5 — Profile Preview 375×667
- ouvrir Market Data ;
- vérifier loading puis résultat ;
- maximum 6 tokens ;
- logos non déformés ;
- prix lisibles ;
- attribution visible ;
- Retry en cas d’erreur ;
- scroll tactile correct.

Ne pas effectuer d’autres tests MCP sauf blocage.

============================================================
RAPPORT FINAL
============================================================

Fournir :

1. Écrans équipés de la flèche.
2. Destination exacte par écran.
3. Fonctionnement de la confirmation en partie.
4. Fichiers créés/modifiés pour la navigation.
5. Architecture CoinGecko serveur.
6. Endpoint live et cache.
7. Endpoint snapshot Daily.
8. Stratégie Supabase et concurrence.
9. Catalogue approuvé.
10. Normalisation et validation.
11. Fallback.
12. Market Data Preview.
13. Attribution.
14. Variables Vercel nécessaires.
15. Migration Supabase éventuellement à appliquer.
16. Confirmation gameplay inchangé.
17. Confirmation Pi/leaderboard/Supabase existant inchangés.
18. Résultats des tests MCP ciblés.
19. Résultats tsc/build.
20. Hash des trois commits.