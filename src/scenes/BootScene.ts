import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Afficher un message de démarrage
        const text = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Démarrage du jeu...',
            {
                font: '24px Arial',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Attendre un court instant puis passer à la scène de préchargement
        this.time.delayedCall(500, () => {
            this.scene.start('PreloadScene');
        });
    }
} 