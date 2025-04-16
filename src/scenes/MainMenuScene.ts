import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Ajout d'un fond noir
        this.cameras.main.setBackgroundColor('#000000');
        
        // Titre du jeu
        const title = this.add.text(this.cameras.main.width / 2, 100, 'ZELDA-LIKE', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#ffde00',
            align: 'center'
        }).setOrigin(0.5);
        
        // Ajouter un effet de brillance au titre
        this.tweens.add({
            targets: title,
            alpha: { from: 0.8, to: 1 },
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        // Ajouter le bouton de démarrage
        const startButton = this.add.text(this.cameras.main.width / 2, 300, 'Démarrer', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => startButton.setColor('#ffde00'))
        .on('pointerout', () => startButton.setColor('#ffffff'))
        .on('pointerdown', () => this.startGame());
        
        // Faire rebondir légèrement le bouton
        this.tweens.add({
            targets: startButton,
            y: { from: 300, to: 310 },
            duration: 1000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        // Ajouter les instructions
        const instructions = this.add.text(this.cameras.main.width / 2, 400, 
            'Utilisez les flèches pour vous déplacer\nAppuyez sur ESPACE pour attaquer', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);
    }
    
    private startGame() {
        // Transition visuelle
        this.cameras.main.fade(500, 0, 0, 0, false, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress === 1) {
                this.scene.start('GameScene');
            }
        });
    }
} 