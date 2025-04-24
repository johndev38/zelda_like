import Phaser from 'phaser';

export class DebugDisplay {
    private scene: Phaser.Scene;
    private debugText: Phaser.GameObjects.Text[] = [];
    private debugBackground: Phaser.GameObjects.Rectangle | null = null;
    private maxLines: number = 10;
    private fontSize: number = 14;
    private yOffset: number = 10;
    private xOffset: number = 10;
    private lineHeight: number = 16;
    private enabled: boolean = true;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createDebugPanel();
    }

    private createDebugPanel() {
        if (!this.enabled) return;

        // Créer un fond semi-transparent
        this.debugBackground = this.scene.add.rectangle(
            this.xOffset, 
            this.yOffset, 
            300, 
            this.maxLines * this.lineHeight + 10,
            0x000000,
            0.7
        );
        this.debugBackground.setOrigin(0, 0);
        this.debugBackground.setScrollFactor(0); // Fixe à l'écran

        // Préparer les lignes de texte
        for (let i = 0; i < this.maxLines; i++) {
            const text = this.scene.add.text(
                this.xOffset + 5,
                this.yOffset + 5 + (i * this.lineHeight),
                '',
                { fontFamily: 'Arial', fontSize: `${this.fontSize}px`, color: '#ffffff' }
            );
            text.setScrollFactor(0); // Fixe à l'écran
            this.debugText.push(text);
        }
    }

    public log(message: string) {
        if (!this.enabled || !this.debugText.length) return;

        // Décaler tous les textes vers le haut
        for (let i = 0; i < this.maxLines - 1; i++) {
            this.debugText[i].setText(this.debugText[i+1].text);
        }

        // Ajouter le nouveau message en bas
        this.debugText[this.maxLines - 1].setText(message);
    }

    public clear() {
        if (!this.enabled) return;

        for (let text of this.debugText) {
            text.setText('');
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (this.debugBackground) {
            this.debugBackground.setVisible(enabled);
        }
        for (let text of this.debugText) {
            text.setVisible(enabled);
        }
    }

    public toggleVisibility() {
        this.setEnabled(!this.enabled);
    }
} 