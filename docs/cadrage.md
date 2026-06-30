Voici le **document de cadrage adapté** à ta situation actuelle : app déjà créée dans Pi Browser sous le nom **Rush Pi**, développement prévu dans **VS Code**, première version hors Pi SDK, puis intégration Pi Browser après déploiement.

# Document de cadrage — Rush Pi

## 1. Présentation du projet

**Nom du projet :** Rush Pi
**Type :** mini-jeu web mobile-first
**Format :** runner vertical 2D sur 3 voies
**Plateforme cible :** Pi Browser à terme, mais développement initial dans VS Code
**Stack recommandée :** React + Vite + TypeScript + Phaser.js
**État actuel :** application créée dans Pi Browser en **Pi Testnet**, visibilité privée, hébergement prévu en **Self Hosted**
**Objectif court terme :** créer une version jouable en local avant toute intégration Pi réelle.

Rush Pi est un mini-jeu rapide dans lequel le joueur contrôle une boule, une énergie ou un avatar abstrait inspiré de l’univers Pi. Le joueur doit éviter des obstacles, collecter des énergies, faire le meilleur score possible et grimper dans un classement.

L’idée n’est pas de créer un gros jeu complexe, mais une expérience simple, addictive et communautaire. Une partie doit pouvoir être lancée rapidement, jouée en moins d’une minute, puis donner envie de rejouer.

## 2. Objectif du jeu

Le but du joueur est de faire le meilleur score possible pendant une partie de **60 secondes**.

Il gagne des points en collectant des énergies, en évitant les obstacles, en maintenant un combo et en terminant la partie avec peu d’erreurs.

Le joueur doit ressentir trois choses :

Il comprend le jeu immédiatement.

Il sent qu’il aurait pu faire mieux.

Il a envie de rejouer pour battre son score ou améliorer son classement.

## 3. Positionnement

Rush Pi doit être un jeu simple, accessible et international.

Il ne faut pas le présenter comme une application pour “gagner de l’argent” ou “gagner du Pi”. Le positionnement doit être plus propre :

**“A fast daily runner challenge for Pioneers.”**

L’objectif principal est l’engagement : score, compétition, streak, badges, classement, progression personnelle.

La monétisation viendra plus tard, seulement si le jeu est réellement utilisé.

## 4. Version actuelle visée

La première version ne doit pas intégrer directement les paiements Pi, le wallet ou le vrai classement serveur.

La v1 doit être un **prototype jouable localement** :

lancement dans VS Code ;

ouverture via `http://localhost:5173` ;

jeu fonctionnel ;

résultat de partie ;

leaderboard local fictif ;

stockage en `localStorage` ;

structure prête pour intégration Pi plus tard.

## 5. Gameplay principal

Le joueur est placé en bas de l’écran sur une grille de **3 voies** :

voie gauche ;

voie centrale ;

voie droite.

Les obstacles et les objets collectables descendent depuis le haut de l’écran vers le joueur.

Le joueur peut se déplacer :

par swipe gauche/droite sur mobile ;

avec les flèches gauche/droite sur ordinateur.

La partie dure **60 secondes**.

Pendant la partie, la vitesse augmente progressivement. Le début est simple, la fin devient plus intense.

Le joueur ne meurt pas directement lorsqu’il touche un obstacle. Pour éviter la frustration, l’obstacle provoque plutôt :

perte du combo ;

pénalité de score ;

petit effet visuel ;

éventuellement ralentissement très court.

Cela permet au joueur de terminer sa partie même s’il fait une erreur.

## 6. Objets du jeu

Les premiers objets à prévoir sont simples.

**Énergies collectables**

Elles donnent des points. Elles représentent l’objectif principal du joueur.

Exemple : +10 points par énergie.

**Obstacles**

Ils doivent être évités. En cas de collision, le joueur perd son combo et reçoit une pénalité.

Exemple : -50 points ou reset du multiplicateur.

**Bonus futurs**

Pas nécessaire pour la toute première version, mais à prévoir plus tard :

bouclier ;

aimant ;

multiplicateur temporaire ;

ralentissement du temps ;

double score pendant quelques secondes.

Pour le MVP, je recommande de commencer seulement avec :

énergies ;

obstacles ;

combo.

## 7. Système de score

Le score doit être simple, mais assez motivant.

Proposition de calcul :

énergie collectée : +10 points ;

survie progressive : +1 point toutes les quelques millisecondes ou selon la distance ;

combo de collectes successives : multiplicateur progressif ;

obstacle touché : combo remis à zéro ;

fin de partie avec peu d’erreurs : bonus.

Exemple d’écran de résultat :

Score final : 8 450
Best score : 9 100
Énergies collectées : 143
Combo max : 21
Obstacles touchés : 3
Bonus final : +500

Le joueur doit comprendre pourquoi il a fait ce score. C’est important pour lui donner envie de s’améliorer.

## 8. Modes de jeu

Pour la première version, deux modes suffisent.

**Daily Run**

C’est le mode principal. Dans la version locale, il fonctionne comme une partie normale, mais les scores sont sauvegardés dans le leaderboard local.

À terme, ce mode deviendra le vrai défi quotidien avec classement serveur.

**Training Mode**

Mode entraînement illimité. Les scores ne sont pas envoyés au classement.

Le but est de permettre au joueur de s’entraîner sans pression.

Texte à afficher :

**“Training scores are not ranked.”**

## 9. Écrans nécessaires

### Écran d’accueil

Contenu :

nom du jeu : Rush Pi ;

sous-titre : Daily Runner Challenge ;

bouton : Play Daily Run ;

bouton : Training Mode ;

meilleur score local ;

streak fictif ;

accès leaderboard ;

petit bloc profil.

L’écran doit être très simple. Le joueur doit pouvoir lancer une partie immédiatement.

### Écran de jeu

Contenu :

zone de jeu verticale ;

joueur en bas ;

obstacles et énergies qui descendent ;

score en temps réel ;

timer ;

combo ;

effet visuel en cas de collision ;

contrôles tactiles et clavier.

Le jeu doit être lisible sur mobile portrait.

### Écran de résultat

Contenu :

score final ;

meilleur score ;

énergies collectées ;

combo max ;

obstacles touchés ;

bouton Rejouer ;

bouton Accueil ;

bouton Leaderboard.

Cet écran est important, car c’est là que le joueur décide s’il rejoue.

### Écran leaderboard

Version MVP :

classement local ;

top 10 fictif ;

score du joueur ajouté après chaque partie Daily Run ;

filtres visuels Daily / Weekly / Country, même si seul Daily fonctionne au début.

Message motivant :

**“You are close to the Top 10.”**

### Écran profil

Version simple :

pseudo temporaire : Pioneer ;

niveau fictif ;

XP ;

nombre de parties jouées ;

meilleur score ;

streak ;

badges fictifs.

Badges de départ :

First Run ;

Combo Starter ;

Daily Challenger.

## 10. Progression utilisateur

Même si le joueur n’est pas dans le top classement, il doit sentir qu’il progresse.

Progression locale dans le MVP :

XP gagnée après chaque partie ;

niveau fictif ;

badges ;

nombre de parties ;

meilleur score ;

streak local.

Plus tard, quand le backend sera ajouté, cette progression sera reliée à un vrai compte Pi.

## 11. Boucle addictive

La boucle principale doit être :

Le joueur ouvre Rush Pi.

Il lance une partie en un clic.

Il joue 60 secondes.

Il voit son score.

Il voit son meilleur score ou son classement.

Il se dit qu’il peut faire mieux.

Il rejoue.

Plus tard, avec Pi Browser, la boucle deviendra :

connexion Pi ;

défi du jour ;

3 tentatives classées ;

classement quotidien ;

streak ;

retour le lendemain.

## 12. Règles de classement

Pour le MVP local :

les scores du mode Daily Run sont sauvegardés localement ;

les scores du Training Mode ne sont pas classés ;

le leaderboard est stocké en `localStorage` ;

les scores sont triés du plus haut au plus bas.

Pour la future version serveur :

3 tentatives classées par jour ;

meilleur score conservé ;

classement quotidien ;

classement hebdomadaire ;

classement par pays ;

détection de scores suspects.

## 13. Monétisation prévue

Aucune monétisation dans le MVP.

Il faut d’abord valider que le jeu est agréable et que les utilisateurs reviennent.

Phase future possible :

publicité modérée via Pi Ad Network ;

récompense publicitaire optionnelle, par exemple une tentative bonus ;

skins cosmétiques ;

effets visuels ;

cadres de profil ;

pass événementiel ;

paiements Pi uniquement pour du cosmétique.

À éviter absolument :

payer pour avoir un meilleur score ;

payer pour gagner plus facilement ;

promettre des gains en Pi ;

système de hasard, loterie ou casino ;

demander la passphrase du wallet.

Rush Pi doit rester un jeu compétitif, pas une app de gain financier.

## 14. Architecture technique MVP

### Frontend

React + Vite + TypeScript.

Rôle :

écrans ;

navigation ;

interface utilisateur ;

stockage local ;

intégration Phaser.

### Moteur de jeu

Phaser.js.

Rôle :

scène de jeu ;

déplacement du joueur ;

apparition des obstacles ;

apparition des énergies ;

collisions ;

score en temps réel ;

timer ;

fin de partie.

### Stockage local

`localStorage`.

Rôle :

meilleur score ;

leaderboard local ;

nombre de parties ;

XP ;

badges fictifs ;

streak fictif.

### Backend

Pas de backend dans la première version.

Le backend viendra plus tard pour :

vrais comptes utilisateurs ;

vrais scores ;

leaderboards ;

daily challenge ;

anti-triche ;

badges serveur ;

intégration Pi plus solide.

## 15. Structure de fichiers recommandée

```text
rush-pi/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles/
│  │  └─ global.css
│  ├─ components/
│  │  ├─ HomeScreen.tsx
│  │  ├─ GameScreen.tsx
│  │  ├─ ResultScreen.tsx
│  │  ├─ LeaderboardScreen.tsx
│  │  └─ ProfilePanel.tsx
│  ├─ game/
│  │  ├─ RushPiGame.ts
│  │  ├─ gameConfig.ts
│  │  └─ scenes/
│  │     └─ MainScene.ts
│  ├─ utils/
│  │  └─ storage.ts
│  └─ pi/
│     └─ piClient.ts
├─ package.json
├─ index.html
└─ vite.config.ts
```

Le fichier `piClient.ts` doit seulement préparer l’intégration future.

Exemple de fonctions placeholder :

```ts
export function isPiBrowser() {
  return typeof window !== "undefined" && "Pi" in window;
}

export async function initPi() {
  console.log("Pi SDK integration will be added later.");
}

export async function loginWithPi() {
  console.log("Pi login placeholder.");
  return {
    username: "Pioneer",
    uid: "local-test-user"
  };
}
```

## 16. Intégration Pi future

La première version ne doit pas dépendre de Pi.

Quand l’app sera jouable, on fera ensuite :

déploiement sur Vercel ;

récupération de l’URL publique HTTPS ;

retour dans Pi Browser Develop ;

remplissage de **Your App’s URL** avec l’URL Vercel ;

remplissage de **Your App’s development URL** avec `http://localhost:5173` ;

test sandbox ;

intégration Pi SDK ;

connexion avec compte Pi ;

plus tard seulement : wallet, API key, paiements, listing.

## 17. URLs prévues

Pendant le développement local :

```text
http://localhost:5173
```

Après déploiement Vercel :

```text
https://rush-pi.vercel.app
```

Ou autre URL générée par Vercel.

À ne pas faire :

mettre `localhost` dans le champ production ;

inventer une URL qui n’existe pas ;

configurer wallet ou transaction avant d’avoir une app jouable.

## 18. Design et direction artistique

Style recommandé :

mobile-first ;

fond sombre ;

touches violet, orange, doré ;

ambiance arcade moderne ;

effets lumineux simples ;

boutons larges ;

texte court ;

pas d’interface trop chargée.

Important : ne pas utiliser le logo officiel Pi de manière risquée dans le MVP. Utiliser plutôt une énergie, une boule, une pièce abstraite ou un symbole inspiré mais non officiel.

## 19. Langue

Pour le MVP, je recommande l’anglais.

Pourquoi : la communauté Pi est internationale.

Textes principaux :

Rush Pi
Daily Runner Challenge
Play Daily Run
Training Mode
Leaderboard
Best Score
Combo
Energy Collected
Obstacles Hit
Play Again
Back Home
Training scores are not ranked

Plus tard, on pourra ajouter français, arabe et autres langues.

## 20. Roadmap MVP

### Phase 1 — Prototype jouable local

Objectif : avoir le cœur du jeu.

À faire :

créer projet React/Vite ;

installer Phaser ;

créer écran d’accueil ;

créer scène de jeu ;

ajouter joueur sur 3 voies ;

ajouter déplacement gauche/droite ;

ajouter obstacles ;

ajouter énergies ;

ajouter collisions ;

ajouter timer 60 secondes ;

afficher résultat.

### Phase 2 — Expérience complète locale

Objectif : rendre le jeu agréable.

À faire :

améliorer design mobile ;

ajouter sons simples ;

ajouter animations ;

ajouter score détaillé ;

ajouter leaderboard local ;

ajouter profil local ;

ajouter badges fictifs ;

ajouter Training Mode.

### Phase 3 — Préparation Pi

Objectif : préparer l’intégration sans l’activer complètement.

À faire :

créer `piClient.ts` ;

préparer fonctions placeholder ;

vérifier compatibilité mobile ;

vérifier que l’app tourne bien dans un navigateur mobile ;

préparer build Vercel.

### Phase 4 — Déploiement Vercel

Objectif : obtenir une URL publique.

À faire :

pousser le projet sur GitHub ;

connecter GitHub à Vercel ;

déployer ;

récupérer l’URL HTTPS ;

tester sur mobile.

### Phase 5 — Configuration Pi Browser

Objectif : connecter l’app dans le portail Pi.

À faire :

remplir `Your App’s URL` avec l’URL Vercel ;

remplir `Your App’s development URL` avec `http://localhost:5173` ;

tester sandbox ;

commencer intégration Pi SDK.

### Phase 6 — Backend et vrai leaderboard

Objectif : rendre le classement réel.

À faire :

ajouter backend Node/Supabase ;

créer table utilisateurs ;

créer table scores ;

créer table daily challenges ;

limiter tentatives ;

ajouter anti-triche simple ;

afficher classement global.

### Phase 7 — Monétisation future

Objectif : monétiser sans casser le jeu.

À faire :

tester publicité ;

ajouter cosmétiques ;

ajouter skins ;

ajouter achats Pi optionnels ;

éviter tout pay-to-win.

## 21. Critères de réussite du MVP

Le MVP est réussi si :

le jeu se lance en local ;

le joueur peut jouer sans bug majeur ;

le déplacement est fluide ;

les collisions fonctionnent ;

le score est calculé ;

la partie se termine après 60 secondes ;

le résultat s’affiche ;

le joueur peut rejouer ;

le leaderboard local fonctionne ;

l’interface est agréable sur mobile ;

le projet peut être déployé sur Vercel.

Le MVP n’a pas besoin d’avoir :

vrai wallet ;

paiements Pi ;

vrai compte Pi ;

backend ;

classement mondial ;

pubs ;

skins premium ;

listing public dans Pi Ecosystem.

## 22. Décisions importantes déjà prises

Nom actuel : **Rush Pi**.

Développement : **VS Code**.

IA de développement : utilisée côté VS Code.

Pi Browser : uniquement pour configuration, sandbox et publication.

Réseau : **Pi Testnet**.

Visibilité : **Private** pendant le développement.

Hébergement : **Self Hosted**.

URL production : à créer plus tard via Vercel.

URL développement : probablement `http://localhost:5173`.

MVP : sans paiement, sans wallet, sans backend.

## 23. Prompt court pour ton collègue ou ton IA

```text
Nous développons Rush Pi, un mini-jeu web mobile-first destiné à être intégré plus tard dans Pi Browser. La première version doit être développée dans VS Code avec React, Vite, TypeScript et Phaser.js.

Le jeu est un runner vertical 2D sur 3 voies. Le joueur se déplace à gauche ou à droite, évite des obstacles et collecte des énergies. Une partie dure 60 secondes. Le joueur marque des points grâce aux énergies collectées, au temps de survie et aux combos. Toucher un obstacle ne tue pas directement le joueur, mais réinitialise le combo et applique une pénalité.

Le MVP doit fonctionner sans backend, sans wallet, sans paiement Pi et sans vraie connexion Pi SDK. Les données doivent être stockées en localStorage : meilleur score, leaderboard local, statistiques, XP et badges fictifs.

Créer les écrans suivants : accueil, jeu, résultat, leaderboard, profil. Prévoir une structure propre pour intégrer plus tard le Pi SDK dans un fichier piClient.ts, mais ne pas activer l’intégration réelle maintenant.

L’objectif immédiat est d’avoir une app jouable localement sur http://localhost:5173, puis de la déployer plus tard sur Vercel. Après le déploiement seulement, l’URL sera ajoutée dans Pi Browser Develop.
```

Ce document est la version adaptée à ce que tu fais maintenant : **on ne configure pas encore la partie URL dans Pi Browser**, on construit d’abord une vraie app jouable, puis on reviendra brancher Rush Pi à l’écosystème Pi.
