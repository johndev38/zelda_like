import Phaser from 'phaser';

export enum Direction {
    DOWN,
    UP,
    LEFT,
    RIGHT
}

export enum CharacterState {
    IDLE,
    WALKING,
    ATTACKING
}

export class VectorCharacter extends Phaser.GameObjects.Container {
    private bodySprite: Phaser.Physics.Arcade.Sprite;
    private graphics: Phaser.GameObjects.Graphics;
    private direction: Direction = Direction.DOWN;
    private _state: CharacterState = CharacterState.IDLE;
    private attackTimer: Phaser.Time.TimerEvent | null = null;
    private walkAnimTimer: number = 0;
    private walkFrame: number = 0;
    private walkSpeed: number = 150;
    private character: 'player' | 'enemy' | 'mage';
    private colors: {
        body: number,
        head: number,
        weapon: number,
        hair: number,
        feet: number,
        hands: number
    };

    constructor(scene: Phaser.Scene, x: number, y: number, character: 'player' | 'enemy' | 'mage' = 'player') {
        super(scene, x, y);
        
        this.character = character;
        
        // Définir les couleurs en fonction du type de personnage
        if (character === 'player') {
            this.colors = {
                body: 0x3366ff,  // Bleu
                head: 0xffcc99,  // Couleur chair
                weapon: 0x666666, // Gris
                hair: 0x663300,  // Brun
                feet: 0x111111,  // Noir
                hands: 0xffcc99  // Couleur chair
            };
        } else if (character === 'enemy') {
            this.colors = {
                body: 0xff3333,  // Rouge
                head: 0xffcc99,  // Couleur chair
                weapon: 0x333333, // Gris foncé
                hair: 0x000000,  // Noir
                feet: 0x222222,  // Gris foncé
                hands: 0xffcc99  // Couleur chair
            };
        } else {
            this.colors = {
                body: 0x9966ff,  // Violet
                head: 0xffcc99,  // Couleur chair
                weapon: 0x3399ff, // Bleu clair
                hair: 0x333399,  // Bleu foncé
                feet: 0x111111,  // Noir
                hands: 0xffcc99  // Couleur chair
            };
        }
        
        // Créer un sprite invisible pour la physique
        this.bodySprite = scene.physics.add.sprite(0, 0, '__DEFAULT');
        this.bodySprite.setVisible(false);
        this.bodySprite.setSize(16, 24);
        this.bodySprite.setOffset(-8, -12);
        this.add(this.bodySprite);
        
        // Lier le mouvement du sprite avec le conteneur
        this.scene.events.on('update', this.updatePosition, this);
        
        // Créer le graphique
        this.graphics = scene.add.graphics();
        this.add(this.graphics);
        
        // Dessiner le personnage au repos
        this.drawCharacter();
        
        // Ajouter à la scène
        scene.add.existing(this as any);
    }
    
    /**
     * Retourne le sprite de collision pour l'utiliser dans les appels de collision
     */
    getBody(): Phaser.Physics.Arcade.Sprite {
        return this.bodySprite;
    }
    
    /**
     * Retourne la direction actuelle du personnage
     */
    getDirection(): Direction {
        return this.direction;
    }
    
    /**
     * Retourne le type de personnage (player, enemy, mage)
     */
    getCharacterType(): 'player' | 'enemy' | 'mage' {
        return this.character;
    }
    
    /**
     * Met à jour la position du conteneur en fonction du mouvement du sprite de physique
     */
    private updatePosition() {
        if (this.bodySprite && this.bodySprite.body) {
            this.x = this.bodySprite.x;
            this.y = this.bodySprite.y;
        }
    }
    
    destroy(fromScene?: boolean) {
        // Nettoyer les événements lorsque l'objet est détruit
        this.scene.events.off('update', this.updatePosition, this);
        super.destroy(fromScene);
    }
    
    update(time: number, delta: number) {
        // Animation de marche
        if (this.characterState === CharacterState.WALKING) {
            this.walkAnimTimer += delta;
            if (this.walkAnimTimer > 125) {  // ~8 fps
                this.walkAnimTimer = 0;
                this.walkFrame = (this.walkFrame + 1) % 4;
                this.drawCharacter();
            }
        }
    }
    
    setDirection(direction: Direction) {
        if (this.direction !== direction) {
            this.direction = direction;
            this.drawCharacter();
        }
    }
    
    setCharacterState(state: CharacterState) {
        if (this._state !== state) {
            this._state = state;
            
            if (state === CharacterState.WALKING) {
                this.walkAnimTimer = 0;
                this.walkFrame = 0;
            } else if (state === CharacterState.ATTACKING) {
                this.attack();
            }
            
            this.drawCharacter();
        }
    }
    
    get characterState(): CharacterState {
        return this._state;
    }
    
    // On évite de surcharger les méthodes de Container en renommant nos méthodes
    doMoveUp() {
        console.log(`--- [VectorChar ${this.character}] APPEL doMoveUp ---`);
        this.setDirection(Direction.UP);
        this.setCharacterState(CharacterState.WALKING);
        this.bodySprite.setVelocityY(-this.walkSpeed);
        console.log(`[VectorChar ${this.character}] Vélocité Y définie à : ${-this.walkSpeed}`);
    }
    
    doMoveDown() {
        console.log(`--- [VectorChar ${this.character}] APPEL doMoveDown ---`);
        this.setDirection(Direction.DOWN);
        this.setCharacterState(CharacterState.WALKING);
        this.bodySprite.setVelocityY(this.walkSpeed);
        console.log(`[VectorChar ${this.character}] Vélocité Y définie à : ${this.walkSpeed}`);
    }
    
    doMoveLeft() {
        console.log(`--- [VectorChar ${this.character}] APPEL doMoveLeft ---`);
        this.setDirection(Direction.LEFT);
        this.setCharacterState(CharacterState.WALKING);
        this.bodySprite.setVelocityX(-this.walkSpeed);
        console.log(`[VectorChar ${this.character}] Vélocité X définie à : ${-this.walkSpeed}`);
    }
    
    doMoveRight() {
        console.log(`--- [VectorChar ${this.character}] APPEL doMoveRight ---`);
        this.setDirection(Direction.RIGHT);
        this.setCharacterState(CharacterState.WALKING);
        this.bodySprite.setVelocityX(this.walkSpeed);
        console.log(`[VectorChar ${this.character}] Vélocité X définie à : ${this.walkSpeed}`);
    }
    
    stopMoving() {
        console.log(`--- [VectorChar ${this.character}] APPEL stopMoving ---`);
        this.bodySprite.setVelocity(0, 0);
        this.setCharacterState(CharacterState.IDLE);
    }
    
    attack() {
        if (this.characterState !== CharacterState.ATTACKING) {
            this._state = CharacterState.ATTACKING;
            this.bodySprite.setVelocity(0, 0);
            
            // Animation d'attaque
            this.attackTimer = this.scene.time.delayedCall(500, () => {
                this._state = CharacterState.IDLE;
                this.attackTimer = null;
                this.drawCharacter();
            });
            
            this.drawCharacter();
        }
    }
    
    // Pour maintenir la compatibilité avec le code existant, on ajoute des alias vers les nouvelles méthodes
    moveUp() {
        this.doMoveUp();
        return this;
    }
    
    moveDown() {
        this.doMoveDown();
        return this;
    }
    
    moveLeft() {
        this.doMoveLeft();
        return this;
    }
    
    moveRight() {
        this.doMoveRight();
        return this;
    }
    
    setState(value: any) {
        if (typeof value === 'number' && Object.values(CharacterState).includes(value)) {
            this.setCharacterState(value as CharacterState);
            return this;
        }
        return super.setState(value);
    }
    
    private drawCharacter() {
        this.graphics.clear();
        
        // Selon l'état et la direction, dessiner différemment
        if (this.characterState === CharacterState.IDLE) {
            this.drawIdle();
        } else if (this.characterState === CharacterState.WALKING) {
            this.drawWalking();
        } else if (this.characterState === CharacterState.ATTACKING) {
            this.drawAttacking();
        }
    }
    
    private drawIdle() {
        // Pieds
        this.graphics.fillStyle(this.colors.feet);
        
        // Dessin différent selon la direction
        if (this.direction === Direction.DOWN) {
            // Corps
            this.graphics.fillStyle(this.colors.body);
            this.graphics.fillRect(-6, -8, 12, 14);
            
            // Tête
            this.graphics.fillStyle(this.colors.head);
            this.graphics.fillCircle(0, -14, 6);
            
            // Cheveux
            this.graphics.fillStyle(this.colors.hair);
            this.graphics.fillRect(-5, -20, 10, 3);
            
            // Yeux
            this.graphics.fillStyle(0x000000);
            this.graphics.fillRect(-3, -15, 2, 2);
            this.graphics.fillRect(1, -15, 2, 2);
            
            // Pieds
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6, 4, 4);
            this.graphics.fillRect(1, 6, 4, 4);
            
            // Mains
            this.graphics.fillStyle(this.colors.hands);
            this.graphics.fillRect(-8, -4, 3, 3);
            this.graphics.fillRect(5, -4, 3, 3);
        } 
        else if (this.direction === Direction.UP) {
            // Corps
            this.graphics.fillStyle(this.colors.body);
            this.graphics.fillRect(-6, -8, 12, 14);
            
            // Tête (de dos)
            this.graphics.fillStyle(this.colors.head);
            this.graphics.fillCircle(0, -14, 6);
            
            // Cheveux
            this.graphics.fillStyle(this.colors.hair);
            this.graphics.fillRect(-5, -20, 10, 7);
            
            // Pieds
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6, 4, 4);
            this.graphics.fillRect(1, 6, 4, 4);
            
            // Mains
            this.graphics.fillStyle(this.colors.hands);
            this.graphics.fillRect(-8, -4, 3, 3);
            this.graphics.fillRect(5, -4, 3, 3);
        }
        else if (this.direction === Direction.LEFT) {
            // Corps
            this.graphics.fillStyle(this.colors.body);
            this.graphics.fillRect(-6, -8, 12, 14);
            
            // Tête
            this.graphics.fillStyle(this.colors.head);
            this.graphics.fillCircle(-2, -14, 6);
            
            // Cheveux
            this.graphics.fillStyle(this.colors.hair);
            this.graphics.fillRect(-7, -20, 8, 3);
            
            // Un oeil
            this.graphics.fillStyle(0x000000);
            this.graphics.fillRect(-5, -15, 2, 2);
            
            // Pieds
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6, 4, 4);
            this.graphics.fillRect(1, 6, 4, 4);
            
            // Mains
            this.graphics.fillStyle(this.colors.hands);
            this.graphics.fillRect(-9, -4, 3, 3);
        }
        else if (this.direction === Direction.RIGHT) {
            // Corps
            this.graphics.fillStyle(this.colors.body);
            this.graphics.fillRect(-6, -8, 12, 14);
            
            // Tête
            this.graphics.fillStyle(this.colors.head);
            this.graphics.fillCircle(2, -14, 6);
            
            // Cheveux
            this.graphics.fillStyle(this.colors.hair);
            this.graphics.fillRect(-1, -20, 8, 3);
            
            // Un oeil
            this.graphics.fillStyle(0x000000);
            this.graphics.fillRect(3, -15, 2, 2);
            
            // Pieds
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6, 4, 4);
            this.graphics.fillRect(1, 6, 4, 4);
            
            // Mains
            this.graphics.fillStyle(this.colors.hands);
            this.graphics.fillRect(6, -4, 3, 3);
        }
    }
    
    private drawWalking() {
        // Pour simplifier, je vais réutiliser le dessin idle et ajouter un effet d'animation
        this.drawIdle();
        
        // Animation des jambes selon la frame
        const offset = this.walkFrame % 2 === 0 ? 2 : 0;
        
        this.graphics.fillStyle(this.colors.feet);
        
        if (this.direction === Direction.DOWN || this.direction === Direction.UP) {
            // Effacer les pieds statiques
            this.graphics.fillStyle(0x000000, 0);
            this.graphics.fillRect(-5, 6, 10, 4);
            
            // Dessiner les pieds en mouvement
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6 + offset, 4, 4);
            this.graphics.fillRect(1, 6 - offset, 4, 4);
        }
        else if (this.direction === Direction.LEFT || this.direction === Direction.RIGHT) {
            // Effacer les pieds statiques
            this.graphics.fillStyle(0x000000, 0);
            this.graphics.fillRect(-5, 6, 10, 4);
            
            // Dessiner les pieds en mouvement
            this.graphics.fillStyle(this.colors.feet);
            this.graphics.fillRect(-5, 6 - offset, 4, 4);
            this.graphics.fillRect(1, 6 + offset, 4, 4);
        }
        
        // Animation des bras pendant la marche
        if (this.walkFrame % 2 === 0) {
            if (this.direction === Direction.LEFT) {
                this.graphics.fillStyle(this.colors.hands);
                this.graphics.fillRect(-10, -4, 3, 3);
            } else if (this.direction === Direction.RIGHT) {
                this.graphics.fillStyle(this.colors.hands);
                this.graphics.fillRect(7, -4, 3, 3);
            }
        }
    }
    
    private drawAttacking() {
        // Dessiner le personnage de base
        this.drawIdle();
        
        // Ajouter une arme selon le type de personnage et la direction
        this.graphics.fillStyle(this.colors.weapon);
        
        if (this.character === 'player') {
            // Épée pour le joueur
            if (this.direction === Direction.DOWN) {
                this.graphics.fillRect(7, -8, 2, 15);
                this.graphics.fillRect(5, 5, 6, 2);
            } else if (this.direction === Direction.UP) {
                this.graphics.fillRect(-9, -8, 2, 15);
                this.graphics.fillRect(-11, -8, 6, 2);
            } else if (this.direction === Direction.LEFT) {
                this.graphics.fillRect(-20, -4, 15, 2);
                this.graphics.fillRect(-20, -6, 2, 6);
            } else if (this.direction === Direction.RIGHT) {
                this.graphics.fillRect(5, -4, 15, 2);
                this.graphics.fillRect(18, -6, 2, 6);
            }
        } else if (this.character === 'enemy') {
            // Hache pour l'ennemi
            if (this.direction === Direction.DOWN) {
                this.graphics.fillRect(7, -8, 3, 12);
                this.graphics.fillRect(4, 2, 9, 5);
            } else if (this.direction === Direction.UP) {
                this.graphics.fillRect(-10, -8, 3, 12);
                this.graphics.fillRect(-13, -8, 9, 5);
            } else if (this.direction === Direction.LEFT) {
                this.graphics.fillRect(-20, -4, 12, 3);
                this.graphics.fillRect(-20, -9, 5, 9);
            } else if (this.direction === Direction.RIGHT) {
                this.graphics.fillRect(8, -4, 12, 3);
                this.graphics.fillRect(15, -9, 5, 9);
            }
        } else {
            // Bâton magique pour le mage avec effet magique
            if (this.direction === Direction.DOWN) {
                this.graphics.fillRect(7, -12, 2, 20);
                
                // Effet magique
                this.graphics.fillStyle(0x33ffff, 0.7);
                this.graphics.fillCircle(9, 8, 5);
            } else if (this.direction === Direction.UP) {
                this.graphics.fillRect(-9, -12, 2, 20);
                
                // Effet magique
                this.graphics.fillStyle(0x33ffff, 0.7);
                this.graphics.fillCircle(-8, -12, 5);
            } else if (this.direction === Direction.LEFT) {
                this.graphics.fillRect(-20, -4, 20, 2);
                
                // Effet magique
                this.graphics.fillStyle(0x33ffff, 0.7);
                this.graphics.fillCircle(-20, -3, 5);
            } else if (this.direction === Direction.RIGHT) {
                this.graphics.fillRect(0, -4, 20, 2);
                
                // Effet magique
                this.graphics.fillStyle(0x33ffff, 0.7);
                this.graphics.fillCircle(20, -3, 5);
            }
        }
    }
} 