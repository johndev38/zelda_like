# Zelda-like avec Phaser

Un jeu d'aventure 2D inspiré de Zelda, réalisé avec Phaser 3 et TypeScript.

## Prérequis

- Node.js (version 14 ou supérieure)
- npm (généralement installé avec Node.js)

## Installation

1. Clonez ce dépôt ou téléchargez-le
2. Ouvrez un terminal dans le dossier du projet
3. Installez les dépendances avec la commande :

```bash
npm install
```

## Utilisation

### Mode développement

Pour lancer le jeu en mode développement avec rechargement à chaud :

```bash
npm run dev
```

Le jeu sera accessible à l'adresse : http://localhost:9000

### Production

Pour construire la version de production :

```bash
npm run build
```

Les fichiers générés seront dans le dossier `dist`.

## Commandes du jeu

- Flèches directionnelles : déplacer le personnage
- Barre d'espace : attaquer

## Structure du projet

- `src/` - Code source du jeu
  - `assets/` - Ressources graphiques et audio
  - `scenes/` - Scènes du jeu (Boot, Preload, Menu, Game)
  - `index.ts` - Point d'entrée
  - `index.html` - Template HTML

## Fonctionnalités

- Déplacement du joueur dans un monde 2D
- Combat simple avec attaque à l'épée
- Ennemis avec intelligence artificielle basique
- Collecte d'objets (cœurs pour restaurer la santé)
- Interface utilisateur avec barre de santé
- Menu principal avec transition

## Personnalisation

Pour ajouter vos propres ressources graphiques, remplacez les fichiers dans le dossier `src/assets/` par vos propres images et sons.

# Jeu RPG avec IA

Ce projet utilise [Phaser](https://phaser.io/) pour créer un RPG avec des personnages non-joueurs (PNJ) alimentés par l'intelligence artificielle.

## Configuration du serveur LLM

Le jeu utilise un serveur LLM local (LM Studio) pour générer les comportements des PNJ. Pour que cela fonctionne correctement, vous devez configurer votre serveur LLM pour autoriser les requêtes CORS.

### Résolution des problèmes CORS

Si vous voyez cette erreur dans la console :
```
Access to fetch at 'http://localhost:1234/v1/models' from origin 'http://localhost:9000' has been blocked by CORS policy
```

Vous devez configurer votre serveur LLM Studio pour accepter les requêtes CORS :

1. **Configurer LM Studio**:
   - Dans LM Studio, allez dans l'onglet "Local Server"
   - Cliquez sur le bouton "Settings" (⚙️)
   - Cochez l'option "Enable CORS" ou ajoutez manuellement ces en-têtes dans les paramètres avancés :
     ```
     Access-Control-Allow-Origin: *
     Access-Control-Allow-Methods: GET, POST, OPTIONS
     Access-Control-Allow-Headers: Content-Type, Authorization
     ```
   - Redémarrez le serveur LM Studio

2. **Alternative avec extension navigateur** :
   - Installez une extension pour désactiver CORS comme "CORS Unblock" pour Chrome
   - Activez l'extension lorsque vous utilisez l'application

## Installation et démarrage

1. Clonez ce dépôt
2. Installez les dépendances avec `npm install`
3. Démarrez le serveur de développement avec `npm start`
4. Assurez-vous que votre serveur LLM (LM Studio) est en cours d'exécution sur http://localhost:1234

## Contrôles du jeu

- Flèches directionnelles : Déplacer le personnage
- Espace : Attaquer
- E : Interagir avec les PNJ
- F : Lancer une boule de feu
- Page Up/Down : Zoomer/Dézoomer
- T : Tester la connexion LLM 