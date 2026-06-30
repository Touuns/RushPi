Tu es mon assistant développeur dans VS Code. Je veux créer une première version MVP d’un jeu web mobile-first destiné à être intégré plus tard dans Pi Browser / Pi Network.

Nom du projet : Rush Pi

Contexte :
Rush Pi est un mini-jeu de type runner vertical en 2D. Le joueur contrôle une boule/énergie inspirée de l’univers Pi, sans utiliser officiellement le logo Pi pour l’instant. Le joueur se déplace sur 3 voies : gauche, centre, droite. Des obstacles descendent depuis le haut de l’écran. Le joueur doit les éviter et collecter des énergies. Chaque partie dure 60 secondes. À la fin, l’utilisateur voit son score, son meilleur score local, ses statistiques et un classement fictif/local pour la première version.

Objectif immédiat :
Créer une version jouable en local dans VS Code, sans backend, sans wallet, sans paiement Pi, sans connexion Pi SDK pour l’instant. L’objectif est d’avoir une base propre, testable, responsive mobile, prête à être déployée plus tard sur Vercel puis connectée au Pi SDK.

Stack souhaitée :
- React
- Vite
- TypeScript si possible
- Phaser.js pour le moteur de jeu
- CSS simple, propre et responsive
- Pas de backend pour cette première version
- Données stockées temporairement en localStorage

Si aucun projet n’existe encore dans le dossier actuel, crée un projet Vite React propre. Si un projet existe déjà, analyse-le d’abord et adapte-toi sans écraser inutilement les fichiers existants.

Fonctionnalités à créer pour le MVP :

1. Écran d’accueil
Créer une page d’accueil mobile-first avec :
- nom du jeu : Rush Pi
- sous-titre : Daily Runner Challenge
- bouton principal : Play Daily Run
- bouton secondaire : Training Mode
- affichage du meilleur score local
- affichage du streak local fictif
- accès au leaderboard
- design arcade moderne, sombre, violet/orange/doré, mais sans dépendre du logo officiel Pi

2. Mode de jeu principal
Créer un runner vertical sur 3 voies :
- le joueur commence au centre
- swipe gauche/droite sur mobile
- touches clavier gauche/droite sur desktop pour tester
- durée de partie : 60 secondes
- score affiché en temps réel
- timer affiché en haut
- combo affiché en haut
- objets collectables qui donnent des points
- obstacles à éviter
- difficulté progressive : plus la partie avance, plus les objets descendent vite
- si le joueur touche un obstacle, il ne meurt pas directement : il perd son combo et reçoit une pénalité de score ou un ralentissement court
- la partie se termine à 0 seconde

3. Système de score
Créer une logique simple :
- collecter une énergie = +10 points
- rester en vie = points progressifs
- combo de collectes successives = multiplicateur progressif
- toucher un obstacle = combo réinitialisé et pénalité
- bonus de fin si peu ou pas d’obstacles touchés

À la fin, afficher un écran de résultats avec :
- score final
- meilleur score local
- nombre d’énergies collectées
- combo maximum
- nombre d’obstacles touchés
- bouton Rejouer
- bouton Retour accueil
- bouton Voir leaderboard

4. Leaderboard local fictif
Créer un écran leaderboard avec :
- top 10 fictif
- score du joueur ajouté localement après chaque partie
- sauvegarde dans localStorage
- classement trié par score décroissant
- onglets ou filtres visuels : Daily, Weekly, Country, mais seuls Daily/local doivent fonctionner pour le moment
- message motivant du type : “You are close to the Top 10”

5. Training Mode
Créer un mode entraînement presque identique au Daily Run, mais :
- pas de sauvegarde dans le leaderboard
- texte clair : Training scores are not ranked
- parties illimitées

6. Profil local
Créer une petite page profil ou un bloc profil avec :
- pseudo temporaire : Pioneer
- niveau fictif
- XP local
- nombre de parties jouées
- meilleur score
- streak fictif
- badges fictifs : First Run, Combo Starter, Daily Challenger

7. Préparation future Pi Browser / Pi SDK
Ne pas intégrer réellement les paiements maintenant.
Préparer seulement une structure propre pour l’intégration future :
- créer un fichier src/pi/piClient.ts
- y mettre des fonctions placeholder :
  - initPi()
  - loginWithPi()
  - isPiBrowser()
- commenter clairement que l’intégration réelle du Pi SDK sera ajoutée plus tard
- prévoir que l’app tournera d’abord sur http://localhost:5173 puis sera déployée sur Vercel

8. Responsive / mobile
Le jeu doit être pensé pour mobile portrait :
- largeur type iPhone
- contrôles tactiles
- interface lisible dans Pi Browser
- boutons grands et simples
- aucun élément trop petit
- éviter les menus complexes
- l’app doit aussi être testable sur desktop

9. Qualité du code
Je veux un code propre :
- composants React bien séparés
- logique Phaser isolée dans un composant ou fichier dédié
- pas de gros fichier unique illisible
- commentaires utiles
- pas de dépendances inutiles
- pas d’API externe
- pas de clé secrète
- pas de paiement réel
- pas de demande de passphrase wallet
- pas de promesse de gain financier

10. Fichiers attendus
Organise le projet proprement, par exemple :
- src/App.tsx
- src/main.tsx
- src/styles/global.css
- src/components/HomeScreen.tsx
- src/components/GameScreen.tsx
- src/components/ResultScreen.tsx
- src/components/LeaderboardScreen.tsx
- src/components/ProfilePanel.tsx
- src/game/RushPiGame.ts
- src/game/gameConfig.ts
- src/game/scenes/MainScene.ts
- src/utils/storage.ts
- src/pi/piClient.ts

Tu peux adapter l’organisation si une meilleure structure est nécessaire, mais garde quelque chose de clair et maintenable.

11. Commandes
À la fin, donne-moi les commandes exactes pour :
- installer les dépendances
- lancer le projet en local
- vérifier que tout compile
- préparer un build de production

Je veux idéalement pouvoir lancer :
npm install
npm run dev

Puis ouvrir :
http://localhost:5173

12. Résultat attendu
À la fin de ton travail, l’application doit être jouable localement. Je dois pouvoir :
- ouvrir l’accueil
- lancer une partie
- déplacer le joueur
- collecter des énergies
- éviter des obstacles
- terminer une partie après 60 secondes
- voir mon score
- rejouer
- voir un leaderboard local
- revenir à l’accueil

Important :
Commence par analyser le dossier actuel. Explique brièvement ton plan avant de modifier les fichiers. Puis crée le projet ou modifie les fichiers nécessaires. Avance étape par étape et vérifie que l’app fonctionne.