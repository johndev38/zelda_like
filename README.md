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