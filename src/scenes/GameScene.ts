import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  // Propriétés du joueur
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerHealth: number = 3;
  private playerAttacking: boolean = false;
  private playerDirection: string = 'down';

  // Contrôles
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;

  // Groupes d'objets
  private enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;

  // Interface utilisateur
  private healthBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Nous n'avons pas besoin de charger à nouveau ces ressources car elles sont déjà chargées dans PreloadScene
    // Mais si nécessaire, nous pouvons ajouter d'autres ressources spécifiques à GameScene ici
  }

  create(): void {
    // Initialiser les contrôles
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Créer une "carte" temporaire (à remplacer par une vraie carte Tiled plus tard)
    this.createTempMap();

    // Créer le joueur
    this.createPlayer();

    // Créer les ennemis
    this.createEnemies();

    // Créer les objets à collecter
    this.createItems();

    // Créer l'interface utilisateur
    this.createUI();

    // Configurer la caméra
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(3); // Zoom plus important pour le pixel art

    // Configurer les collisions
    this.setupCollisions();
  }

  update(): void {
    if (!this.player) return;

    // Gérer le mouvement du joueur
    this.handlePlayerMovement();

    // Gérer l'attaque du joueur
    this.handlePlayerAttack();

    // Mettre à jour l'interface utilisateur
    this.updateUI();
  }

  private createTempMap(): void {
    // Créer une carte fixe avec un fond vert
    const mapWidth = 1600;
    const mapHeight = 1200;
    
    // Fond de la carte
    this.add.rectangle(0, 0, mapWidth, mapHeight, 0x66aa55).setOrigin(0, 0);

    // Dimensions du tileset
    const spritesheetWidth = 40; // Largeur totale du tileset en tuiles
    const baseTileSize = 16;     // Taille d'une tuile en pixels
    
    // Créer les arbres
    const treePositions = [
      { x: 200, y: 200 }, { x: 250, y: 150 }, { x: 150, y: 250 },
      { x: 600, y: 400 }, { x: 650, y: 450 }, { x: 550, y: 350 },
      { x: 1000, y: 200 }, { x: 1050, y: 250 }, { x: 950, y: 150 },
      { x: 1200, y: 900 }, { x: 1250, y: 850 }, { x: 1150, y: 950 },
      { x: 400, y: 800 }, { x: 350, y: 850 }, { x: 450, y: 750 }
    ];
    
    // Pour chaque position, créer un arbre
    for (const pos of treePositions) {
      this.createTilesetObject(
        pos.x, pos.y,
        { x: 5, y: 16 }, { x: 6, y: 17 },
        spritesheetWidth,
        1,                 // Échelle de l'arbre
        { offsetY: 0 }     // Pas de décalage particulier
      );
    }

    // Créer les maisons aux positions définies
    const housePositions = [
      { x: 400, y: 300 }, { x: 800, y: 500 }, { x: 1100, y: 700 }
    ];
    
    // Pour chaque position, créer une maison
    for (const pos of housePositions) {
      this.createTilesetObject(
        pos.x, pos.y,
        { x: 6, y: 0 }, { x: 10, y: 4 }, // Coordonnées de la maison dans le tileset
        spritesheetWidth,
        1,                 // Échelle de la maison
        { offsetY: -24 }   // Décalage pour mieux positionner la maison
      );
    }

    // Définir les limites du monde
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
  }

  /**
   * Crée un objet à partir de tuiles du tileset
   * @param x Position X dans le monde
   * @param y Position Y dans le monde
   * @param topLeft Coordonnées de la tuile en haut à gauche dans le tileset
   * @param bottomRight Coordonnées de la tuile en bas à droite dans le tileset
   * @param spritesheetWidth Largeur du tileset en nombre de tuiles
   * @param scale Facteur d'échelle pour l'objet
   * @param options Options supplémentaires (décalage, etc.)
   * @returns Le conteneur créé avec toutes les tuiles
   */
  private createTilesetObject(
    x: number, y: number,
    topLeft: { x: number, y: number },
    bottomRight: { x: number, y: number },
    spritesheetWidth: number,
    scale: number = 1,
    options: { offsetY?: number } = {}
  ): Phaser.GameObjects.Container {
    // Taille d'une tuile en pixels
    const baseTileSize = 16;
    const finalTileSize = baseTileSize * scale;
    
    // Calcul des dimensions en tuiles
    const widthInTiles = bottomRight.x - topLeft.x + 1;
    const heightInTiles = bottomRight.y - topLeft.y + 1;
    
    // Créer un conteneur pour regrouper toutes les tuiles
    const container = this.add.container(x, y + (options.offsetY || 0));
    
    // Ajouter les tuiles au conteneur
    for (let dy = 0; dy < heightInTiles; dy++) {
      for (let dx = 0; dx < widthInTiles; dx++) {
        // Calculer les coordonnées de la tuile actuelle dans le tileset
        const tileX = topLeft.x + dx;
        const tileY = topLeft.y + dy;
        
        // Calculer l'index de la tuile dans le spritesheet
        const frameIndex = tileY * spritesheetWidth + tileX;
        
        // Calculer la position relative de la tuile dans le conteneur
        const tileX_pos = (dx - widthInTiles / 2 + 0.5) * finalTileSize;
        const tileY_pos = (dy - heightInTiles + 0.5) * finalTileSize;
        
        // Créer le sprite pour cette tuile
        const tileSprite = this.add.sprite(tileX_pos, tileY_pos, 'overworld', frameIndex);
        tileSprite.setScale(scale);
        tileSprite.setOrigin(0.5);
        
        // Ajouter la tuile au conteneur
        container.add(tileSprite);
      }
    }
    
    // Ajouter une hitbox pour les collisions
    const hitboxWidth = widthInTiles * finalTileSize;
    const hitboxHeight = heightInTiles * finalTileSize;
    
    this.physics.add.existing(
      new Phaser.GameObjects.Rectangle(
        this,
        x,
        y + (options.offsetY || 0),
        hitboxWidth,
        hitboxHeight
      ),
      true // Objet statique
    );
    
    // Définir la profondeur pour le tri visuel correct
    container.setDepth(y);
    
    return container;
  }

  private createPlayer(): void {
    // Créer le sprite du joueur à partir du spritesheet
    this.player = this.physics.add.sprite(400, 300, 'character');
    
    // Configuration du joueur
    this.player.setCollideWorldBounds(true);
    this.player.setSize(10, 10); // Hitbox plus petite que le sprite
    this.player.setOffset(3, 4); // Décalage pour centrer la hitbox
    this.player.setDepth(1);

    // Jouer l'animation d'inactivité par défaut (veillez à créer les animations ailleurs)
    this.player.anims.play('idle-down');
  }

  private createEnemies(): void {
    // Créer un groupe pour les ennemis
    this.enemies = this.physics.add.group();

    // Ajouter des ennemis à des positions fixes
    const enemyPositions = [
      { x: 300, y: 500 }, { x: 700, y: 300 }, { x: 900, y: 800 },
      { x: 1300, y: 400 }, { x: 500, y: 900 }
    ];

    for (const pos of enemyPositions) {
      // Créer le sprite invisible pour la physique
      const enemy = this.physics.add.sprite(pos.x, pos.y, 'enemies');
      enemy.setVisible(false);
      enemy.setSize(32, 32);
      enemy.setCollideWorldBounds(true);
      enemy.setData('health', 2);
      enemy.setData('detectionRange', 150); // Définir une portée de détection
      enemy.setData('aggroState', false); // État d'agressivité

      // Créer un rectangle rouge visible
      const enemyRect = this.add.rectangle(pos.x, pos.y, 16, 16, 0xcc0000);

      // Lier le rectangle au sprite
      enemy.setData('visual', enemyRect);

      // Mettre à jour la position du rectangle en fonction du sprite
      this.events.on('update', () => {
        if (enemy.active) {
          enemyRect.setPosition(enemy.x, enemy.y);
          
          // Vérifier si le joueur est à portée de détection
          if (this.player && enemy.getData('health') > 0) {
            const distance = Phaser.Math.Distance.Between(
              this.player.x, this.player.y,
              enemy.x, enemy.y
            );
            
            // Si le joueur est à portée, entrer en mode agression
            if (distance < enemy.getData('detectionRange')) {
              enemy.setData('aggroState', true);
              
              // Calculer la direction vers le joueur et se déplacer
              const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
              const speed = 60;
              enemy.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
              );
              
              // Faire clignoter l'ennemi quand il est agressif
              if (!enemy.getData('blinking')) {
                enemy.setData('blinking', true);
                this.tweens.add({
                  targets: enemyRect,
                  fillColor: { from: 0xcc0000, to: 0xff0000 },
                  duration: 500,
                  yoyo: true,
                  repeat: -1
                });
              }
            } else if (enemy.getData('aggroState')) {
              // Réinitialiser l'état si le joueur s'éloigne
              enemy.setData('aggroState', false);
              enemy.setVelocity(0, 0);
              
              // Arrêter le clignotement
              if (enemy.getData('blinking')) {
                enemy.setData('blinking', false);
                this.tweens.killTweensOf(enemyRect);
                enemyRect.fillColor = 0xcc0000;
              }
            }
          }
        } else {
          enemyRect.setVisible(false);
        }
      });

      // Ajouter l'ennemi au groupe
      this.enemies.add(enemy);
    }
  }

  private createItems(): void {
    // Créer un groupe pour les objets à collecter
    this.items = this.physics.add.group();

    // Ajouter quelques objets (par exemple, des cœurs pour la santé)
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(100, 1500);
      const y = Phaser.Math.Between(100, 1100);

      // Créer le sprite invisible pour la physique
      const item = this.physics.add.sprite(x, y, 'items');
      item.setVisible(false);
      item.setSize(16, 16);
      item.setData('type', 'heart');

      // Créer un cercle rose visible
      const itemCircle = this.add.circle(x, y, 8, 0xff69b4);

      // Lier le cercle au sprite
      item.setData('visual', itemCircle);

      // Mettre à jour la position du cercle en fonction du sprite
      this.events.on('update', () => {
        if (item.active) {
          itemCircle.setPosition(item.x, item.y);
        } else {
          itemCircle.setVisible(false);
        }
      });

      // Ajouter l'objet au groupe
      this.items.add(item);
    }
  }

  private createUI(): void {
    // Créer la barre de santé
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0); // Fixée à l'écran
    this.updateUI();
  }

  private setupCollisions(): void {
    // Collision entre le joueur et les ennemis
    this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // Collision entre le joueur et les objets
    this.physics.add.overlap(this.player, this.items, this.handlePlayerItemCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // Collision entre les ennemis eux-mêmes
    this.physics.add.collider(this.enemies, this.enemies);
  }

  private handlePlayerMovement(): void {
    if (this.playerAttacking) {
      // Pendant l'attaque, le joueur ne bouge pas
      this.player.setVelocity(0);
      return;
    }

    // Réinitialiser la vélocité
    this.player.setVelocity(0);

    const speed = 100;
    let moving = false;

    // Mouvement horizontal
    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      this.player.anims.play('walk-left', true);
      this.playerDirection = 'left';
      moving = true;
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.player.anims.play('walk-right', true);
      this.playerDirection = 'right';
      moving = true;
    }

    // Mouvement vertical
    if (this.cursors.up?.isDown) {
      this.player.setVelocityY(-speed);
      if (!moving) {
        this.player.anims.play('walk-up', true);
        this.playerDirection = 'up';
      }
      moving = true;
    } else if (this.cursors.down?.isDown) {
      this.player.setVelocityY(speed);
      if (!moving) {
        this.player.anims.play('walk-down', true);
        this.playerDirection = 'down';
      }
      moving = true;
    }

    // Si le joueur ne bouge pas, jouer l'animation d'inactivité
    if (!moving) {
      this.player.anims.play(`idle-${this.playerDirection}`, true);
    }
  }

  private handlePlayerAttack(): void {
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && !this.playerAttacking) {
      this.playerAttacking = true;

      // Effet visuel temporaire pour l'attaque
      const attackCircle = this.add.circle(
        this.player.x + this.getAttackOffsetX(),
        this.player.y + this.getAttackOffsetY(),
        15, 0xffff00, 0.5
      );

      // Vérifier les ennemis proches pour les attaquer
      this.attackEnemies();

      // Supprimer l'effet après un court délai
      this.time.delayedCall(300, () => {
        attackCircle.destroy();
        this.playerAttacking = false;
      });
    }
  }

  private getAttackOffsetX(): number {
    if (this.playerDirection === 'left') return -20;
    if (this.playerDirection === 'right') return 20;
    return 0;
  }

  private getAttackOffsetY(): number {
    if (this.playerDirection === 'up') return -20;
    if (this.playerDirection === 'down') return 20;
    return 0;
  }

  private attackEnemies(): void {
    // Récupérer tous les ennemis
    const enemies = this.enemies.getChildren();

    // Définir la portée de l'attaque
    const attackRange = 35;

    // Pour chaque ennemi, vérifier s'il est à portée
    enemies.forEach((enemy) => {
      const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemySprite.x, enemySprite.y
      );

      if (distance < attackRange) {
        const enemyHealth = enemySprite.getData('health') - 1;
        enemySprite.setData('health', enemyHealth);

        // Effet de recul
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemySprite.x, enemySprite.y);
        enemySprite.setVelocity(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200
        );

        // Effet de clignotement sur le visuel
        const visual = enemySprite.getData('visual') as Phaser.GameObjects.Rectangle;
        if (visual) {
          this.tweens.add({
            targets: visual,
            alpha: { from: 0.5, to: 1 },
            duration: 100,
            repeat: 2
          });
        }

        // Détruire l'ennemi s'il n'a plus de vie
        if (enemyHealth <= 0) {
          const visual = enemySprite.getData('visual') as Phaser.GameObjects.Rectangle;
          if (visual) {
            visual.destroy();
          }
          enemySprite.destroy();
        }
      }
    });
  }

  private handlePlayerEnemyCollision(player: any, enemy: any): void {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;

    // Ne pas gérer les collisions si le joueur est en train d'attaquer
    if (this.playerAttacking) return;

    // Appliquer un délai entre les dégâts (pour éviter de prendre des dégâts trop rapidement)
    if (enemySprite.getData('lastAttackTime') && 
        (this.time.now - enemySprite.getData('lastAttackTime')) < 1000) {
      return;
    }
    
    // Enregistrer le moment de l'attaque
    enemySprite.setData('lastAttackTime', this.time.now);

    // Faire clignoter le joueur pour l'effet d'impact
    this.tweens.add({
      targets: playerSprite,
      alpha: { from: 0.5, to: 1 },
      duration: 100,
      repeat: 3
    });

    // Réduire la santé du joueur
    this.playerHealth--;

    // Effet de recul pour le joueur
    const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, playerSprite.x, playerSprite.y);
    playerSprite.setVelocity(
      Math.cos(angle) * 200,
      Math.sin(angle) * 200
    );

    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  private handlePlayerItemCollision(player: any, item: any): void {
    const itemSprite = item as Phaser.Physics.Arcade.Sprite;
    const itemType = itemSprite.getData('type');

    if (itemType === 'heart') {
      // Augmenter la santé jusqu'à un maximum de 5
      this.playerHealth = Math.min(this.playerHealth + 1, 5);

      const visual = itemSprite.getData('visual') as Phaser.GameObjects.Shape;
      if (visual) {
        visual.destroy();
      }
      itemSprite.destroy();
    }
  }

  private updateUI(): void {
    // Mettre à jour la barre de santé
    this.healthBar.clear();
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(10, 10, 120, 20);
    
    this.healthBar.fillStyle(0xff0000, 1);
    this.healthBar.fillRect(10, 10, 120 * (this.playerHealth / 5), 20);
  }

  private gameOver(): void {
    // Afficher un message de game over
    const gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'GAME OVER',
      {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ff0000',
        align: 'center'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.physics.pause();

    // Après 3 secondes, revenir au menu principal
    this.time.delayedCall(3000, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
