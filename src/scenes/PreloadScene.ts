import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    private loadingText!: Phaser.GameObjects.Text;
    
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        this.load.on('loaderror', (file: Phaser.Loader.File) => {
            console.log(`Erreur de chargement: ${file.key}, path = ${file.src}`);
          });
        
        // Afficher un texte de chargement au lieu d'utiliser des images
        this.loadingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Chargement en cours...',
            {
                font: '24px Arial',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Mettre à jour le texte en fonction de la progression
        this.load.on('progress', (value: number) => {
            this.loadingText.setText(`Chargement: ${Math.floor(value * 100)}%`);
        });

        // Charger le spritesheet du personnage
        this.load.spritesheet('character', 'assets/images/character.png', {
            frameWidth: 16,  // Taille d'une frame en largeur
            frameHeight: 32  // Taille d'une frame en hauteur
        });

        this.load.spritesheet('attaquant', 'assets/images/character.png', {
            frameWidth: 32,  // Taille d'une frame en largeur
            frameHeight: 32  // Taille d'une frame en hauteur
        });
        this.load.spritesheet('mage', 'assets/images/mage.png', {
            frameWidth: 16,  // Taille d'une frame en largeur
            frameHeight: 16  // Taille d'une frame en hauteur
        });
        
        this.load.spritesheet('overworld', 'assets/images/overworld.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
    }

    create() {
        // Créer les animations du personnage
        this.createCharacterAnimations();
        
        // Attendre un peu pour simuler le chargement
        this.time.delayedCall(1000, () => {
            // Passer au menu principal
            this.scene.start('MainMenuScene');
        });
    }
    
    private createCharacterAnimations() {
        // Basé sur l'image fournie, on peut voir que:
        // - La 1ère ligne est l'animation de marche vers le bas (frames 0-3)
        // - La 2ème ligne est l'animation de marche vers la droite (frames 4-7)
        // - La 3ème ligne est l'animation de marche vers la gauche (frames 8-11)
        // - La 4ème ligne est l'animation de marche vers le haut (frames 12-15)
        
        // Animation de marche vers le bas
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('character', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Animation de marche vers la droite
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('character', { start: 17, end: 20 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Animation de marche vers la gauche
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('character', { start: 51, end: 54 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Animation de marche vers le haut
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('character', { start: 34, end: 37 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Frames statiques pour chaque direction
        this.anims.create({
            key: 'idle-down',
            frames: [{ key: 'character', frame: 0 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle-right',
            frames: [{ key: 'character', frame: 17 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle-left',
            frames: [{ key: 'character', frame: 51 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle-up',
            frames: [{ key: 'character', frame: 34 }],
            frameRate: 1
        });
        
        // Animations pour les ennemis (mêmes animations que le joueur avec préfixe "enemy-")
        // On utilise le même spritesheet que le joueur
        this.anims.create({
            key: 'enemy-walk-down',
            frames: this.anims.generateFrameNumbers('character', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        
        this.anims.create({
            key: 'enemy-walk-right',
            frames: this.anims.generateFrameNumbers('character', { start: 16, end: 20 }),
            frameRate: 6,
            repeat: -1
        });
        
        this.anims.create({
            key: 'enemy-walk-left',
            frames: this.anims.generateFrameNumbers('character', { start: 52, end: 55 }),
            frameRate: 6,
            repeat: -1
        });
        
        this.anims.create({
            key: 'enemy-walk-up',
            frames: this.anims.generateFrameNumbers('character', { start: 34, end: 37 }),
            frameRate: 6,
            repeat: -1
        });
        
        this.anims.create({
            key: 'enemy-idle-down',
            frames: [{ key: 'character', frame: 0 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'enemy-idle-right',
            frames: [{ key: 'character', frame: 17 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'enemy-idle-left',
            frames: [{ key: 'character', frame: 1 }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'enemy-idle-up',
            frames: [{ key: 'character', frame: 51 }],
            frameRate: 1
        });
    }
} 