import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  // Propriétés du joueur
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerHealth: number = 3;
  private playerMaxHealth: number = 5;
  private playerAttacking: boolean = false;
  private playerDirection: string = 'down';
  private playerHealthBar!: Phaser.GameObjects.Graphics;

  // Contrôles
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private zoomInKey!: Phaser.Input.Keyboard.Key;
  private zoomOutKey!: Phaser.Input.Keyboard.Key;

  // Groupes d'objets
  private enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private npcs!: Phaser.Physics.Arcade.Group;

  // Interface utilisateur
  private healthBar!: Phaser.GameObjects.Graphics;
  private dialogBox!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private isDialogActive: boolean = false;
  private currentNPC: Phaser.Physics.Arcade.Sprite | null = null;

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
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.zoomInKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_UP);
    this.zoomOutKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN);

    // Créer une "carte" temporaire (à remplacer par une vraie carte Tiled plus tard)
    this.createTempMap();

    // Créer le joueur
    this.createPlayer();

    // Créer les PNJ
    this.createNPCs();

    // Créer les ennemis
    this.createEnemies();

    // Créer les objets à collecter
    this.createItems();

    // Créer l'interface utilisateur
    this.createUI();

    // Configurer la caméra
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(2); // Réactivation du zoom pour tester le dialogue

    // Configurer les collisions
    this.setupCollisions();

    // Créer la boîte de dialogue (invisible par défaut)
    this.createDialogBox();
  }

  update(): void {
    if (!this.player) return;

    // Gérer le zoom de la caméra
    this.handleCameraZoom();

    // Gérer le dialogue interactif
    if (this.isDialogActive && this.currentNPC) {
      // Si un dialogue est actif, le joueur ne peut pas bouger
      this.player.setVelocity(0, 0);
      
      // Mettre à jour la position du dialogue
      this.updateDialogPosition();
      
      // Fermer le dialogue avec la touche d'interaction
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        console.log("Touche E pressée pendant le dialogue");
        this.closeDialog();
      }
      return;
    }

    // Gérer l'interaction avec les PNJ
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      console.log("Touche E pressée pour interaction");
      this.tryInteractWithNPC();
    }

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

    // Barre de vie du joueur qui suit le joueur
    this.playerHealthBar = this.add.graphics();
    this.playerHealthBar.setDepth(2);

    // Jouer l'animation d'inactivité par défaut (veillez à créer les animations ailleurs)
    this.player.anims.play('idle-down');
  }

  private createNPCs(): void {
    // Créer un groupe pour les PNJ
    this.npcs = this.physics.add.group();

    // Positions fixes des PNJ
    const npcPositions = [
      { x: 500, y: 200, name: "Villageois", dialog: ["Bonjour voyageur!", "Comment allez-vous aujourd'hui?", "Méfiez-vous des monstres qui rôdent dans les environs."] },
      { x: 900, y: 600, name: "Marchand", dialog: ["Bienvenue dans notre village!", "J'aurais des objets à vendre, mais le système n'est pas encore implémenté.", "Revenez plus tard!"] },
      { x: 1200, y: 300, name: "Sage", dialog: ["Les secrets de ce monde sont nombreux...", "Explorez et vous découvrirez des trésors cachés."] }
    ];

    for (const pos of npcPositions) {
      // Créer le sprite du PNJ en utilisant le même spritesheet que le joueur
      const npc = this.physics.add.sprite(pos.x, pos.y, 'character');
      
      // Configuration du PNJ
      npc.setImmovable(true);
      npc.setCollideWorldBounds(true);
      npc.setSize(10, 10); // Hitbox plus petite que le sprite
      npc.setOffset(3, 4); // Décalage pour centrer la hitbox
      
      // Tinter le PNJ en bleu pour le distinguer
      npc.setTint(0x00aaff);
      
      // Stocker les données du PNJ
      npc.setData('name', pos.name);
      npc.setData('dialog', pos.dialog);
      npc.setData('dialogIndex', 0);
      
      // Animation statique
      npc.anims.play('idle-down');
      
      // Ajouter le PNJ au groupe
      this.npcs.add(npc);

      // Création d'un conteneur pour l'icône d'interaction
      const interactContainer = this.add.container(pos.x, pos.y - 25);
      interactContainer.setDepth(2);
      interactContainer.setVisible(false);
      
      // Fond pour le bouton d'interaction
      const background = this.add.circle(0, 0, 10, 0x000000, 0.7);
      background.setStrokeStyle(2, 0xffffff);
      
      // Texte
      const interactIcon = this.add.text(0, 0, "E", {
        font: 'bold 12px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      
      // Animation de pulsation pour attirer l'attention
      this.tweens.add({
        targets: background,
        scaleX: 1.2,
        scaleY: 1.2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        duration: 500
      });
      
      // Ajouter au conteneur
      interactContainer.add([background, interactIcon]);
      
      npc.setData('interactIcon', interactContainer);
    }
  }

  private createEnemies(): void {
    // Créer un groupe pour les ennemis
    this.enemies = this.physics.add.group();

    // Positions fixes des ennemis
    const enemyPositions = [
      { x: 300, y: 500 }, { x: 700, y: 300 }, { x: 900, y: 800 },
      { x: 1300, y: 400 }, { x: 500, y: 900 }
    ];

    for (const pos of enemyPositions) {
      // Créer le sprite de l'ennemi en utilisant le même spritesheet que le joueur
      const enemy = this.physics.add.sprite(pos.x, pos.y, 'character');
      
      // Configuration de l'ennemi
      enemy.setCollideWorldBounds(true);
      enemy.setSize(10, 10); // Hitbox plus petite que le sprite
      enemy.setOffset(3, 4); // Décalage pour centrer la hitbox
      
      // Tinter l'ennemi en rouge pour le distinguer du joueur
      enemy.setTint(0xff0000);
      
      // Initialiser les propriétés de l'ennemi
      enemy.setData('maxHealth', 3);
      enemy.setData('health', 3);
      enemy.setData('direction', 'down');
      enemy.setData('detectionRange', 150);
      enemy.setData('aggroState', false);
      enemy.setData('speed', 40);
      enemy.setData('lastDirectionChange', 0);
      enemy.setData('directionChangeInterval', Phaser.Math.Between(1000, 3000));
      
      // Créer une barre de vie pour l'ennemi
      const healthBar = this.add.graphics();
      healthBar.setDepth(2);
      enemy.setData('healthBar', healthBar);
      
      // Démarrer avec une animation idle
      enemy.anims.play('enemy-idle-down');
      
      // Ajouter l'ennemi au groupe
      this.enemies.add(enemy);
      
      // Mettre à jour le comportement de l'ennemi à chaque frame
      this.events.on('update', () => {
        if (enemy.active && enemy.getData('health') > 0) {
          this.updateEnemyBehavior(enemy);
          this.updateEnemyHealthBar(enemy);
        }
      });
    }
  }

  /**
   * Met à jour le comportement d'un ennemi à chaque frame
   * @param enemy L'ennemi à mettre à jour
   */
  private updateEnemyBehavior(enemy: Phaser.Physics.Arcade.Sprite): void {
    const time = this.time.now;
    const player = this.player;
    let direction = enemy.getData('direction');
    let isAggro = enemy.getData('aggroState');
    
    if (!player) return;
    
    // Calculer la distance et l'angle vers le joueur
    const distance = Phaser.Math.Distance.Between(
      enemy.x, enemy.y,
      player.x, player.y
    );
    const angle = Phaser.Math.Angle.Between(
      enemy.x, enemy.y,
      player.x, player.y
    );
    
    // Déterminer si l'ennemi doit poursuivre le joueur
    if (distance < enemy.getData('detectionRange')) {
      isAggro = true;
      enemy.setData('aggroState', true);
      
      // Déterminer la direction en fonction de l'angle vers le joueur
      const angleInDegrees = Phaser.Math.RadToDeg(angle);
      
      if (angleInDegrees >= -45 && angleInDegrees < 45) {
        direction = 'right';
      } else if (angleInDegrees >= 45 && angleInDegrees < 135) {
        direction = 'down';
      } else if (angleInDegrees >= -135 && angleInDegrees < -45) {
        direction = 'up';
      } else {
        direction = 'left';
      }
      
      enemy.setData('direction', direction);
      
      // Déplacer l'ennemi vers le joueur
      const speed = enemy.getData('speed');
      enemy.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
      
      // Jouer l'animation de marche correspondante
      enemy.anims.play(`enemy-walk-${direction}`, true);
    } 
    // Si l'ennemi n'est pas en état d'agression
    else {
      // Vérifier s'il faut changer de direction
      const lastChange = enemy.getData('lastDirectionChange');
      const changeInterval = enemy.getData('directionChangeInterval');
      
      if (isAggro) {
        // Si l'ennemi était agressif mais ne l'est plus, il s'arrête
        isAggro = false;
        enemy.setData('aggroState', false);
        enemy.setVelocity(0, 0);
        enemy.anims.play(`enemy-idle-${direction}`);
      } 
      else if (time - lastChange > changeInterval) {
        // Changer de direction de temps en temps
        const directions = ['up', 'down', 'left', 'right'];
        direction = directions[Phaser.Math.Between(0, 3)];
        enemy.setData('direction', direction);
        enemy.setData('lastDirectionChange', time);
        enemy.setData('directionChangeInterval', Phaser.Math.Between(1000, 3000));
        
        const speed = enemy.getData('speed') * 0.5; // Mouvement plus lent en mode patrouille
        
        // Déplacer l'ennemi dans la nouvelle direction
        if (direction === 'up') {
          enemy.setVelocity(0, -speed);
        } else if (direction === 'down') {
          enemy.setVelocity(0, speed);
        } else if (direction === 'left') {
          enemy.setVelocity(-speed, 0);
        } else if (direction === 'right') {
          enemy.setVelocity(speed, 0);
        }
        
        // Jouer l'animation correspondante
        enemy.anims.play(`enemy-walk-${direction}`, true);
      }
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

    // Collision entre le joueur et les PNJ
    this.physics.add.collider(this.player, this.npcs);

    // Collision entre les ennemis eux-mêmes
    this.physics.add.collider(this.enemies, this.enemies);
    
    // Collision entre les ennemis et les PNJ
    this.physics.add.collider(this.enemies, this.npcs);
  }

  private handlePlayerMovement(): void {
    if (this.playerAttacking) {
      // Pendant l'attaque, le joueur ne bouge pas
      this.player.setVelocity(0);
      return;
    }

    // Réinitialiser la vélocité
    this.player.setVelocity(0);

    // Si dialogue actif, ne pas permettre au joueur de bouger
    if (this.isDialogActive) {
      return;
    }

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

        // Effet de clignotement
        this.tweens.add({
          targets: enemySprite,
          alpha: { from: 0.5, to: 1 },
          duration: 100,
          repeat: 2
        });

        // Détruire l'ennemi et sa barre de vie s'il n'a plus de vie
        if (enemyHealth <= 0) {
          const healthBar = enemySprite.getData('healthBar') as Phaser.GameObjects.Graphics;
          if (healthBar) {
            healthBar.destroy();
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
      this.playerHealth = Math.min(this.playerHealth + 1, this.playerMaxHealth);

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
    this.healthBar.fillRect(10, 10, 120 * (this.playerHealth / this.playerMaxHealth), 20);
    
    // Dessiner les icônes de cœur
    for (let i = 0; i < this.playerMaxHealth; i++) {
      if (i < this.playerHealth) {
        // Cœur plein
        this.healthBar.fillStyle(0xff0000, 1);
      } else {
        // Cœur vide
        this.healthBar.fillStyle(0x555555, 1);
      }
      this.healthBar.fillRect(10 + i * 25, 40, 20, 20);
    }
    
    // Mettre à jour la barre de vie du joueur qui suit le joueur
    this.playerHealthBar.clear();
    
    // Position de la barre de vie (au-dessus du joueur)
    const barX = this.player.x - 15;
    const barY = this.player.y - 20;
    const barWidth = 30;
    const barHeight = 4;
    
    // Fond de la barre (gris foncé)
    this.playerHealthBar.fillStyle(0x333333, 0.8);
    this.playerHealthBar.fillRect(barX, barY, barWidth, barHeight);
    
    // Barre de vie (vert)
    const healthPercentage = this.playerHealth / this.playerMaxHealth;
    this.playerHealthBar.fillStyle(0x00ff00, 1);
    this.playerHealthBar.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
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

  private updateEnemyHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics;
    const health = enemy.getData('health');
    const maxHealth = enemy.getData('maxHealth');
    
    healthBar.clear();
    
    // Position de la barre de vie (au-dessus de l'ennemi)
    const barX = enemy.x - 15;
    const barY = enemy.y - 20;
    const barWidth = 30;
    const barHeight = 4;
    
    // Fond de la barre (gris foncé)
    healthBar.fillStyle(0x333333, 0.8);
    healthBar.fillRect(barX, barY, barWidth, barHeight);
    
    // Barre de vie (rouge)
    const healthPercentage = health / maxHealth;
    healthBar.fillStyle(0xff0000, 1);
    healthBar.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
  }

  private createDialogBox(): void {
    // Créer un container vide pour stocker les éléments de dialogue
    this.dialogBox = this.add.container(0, 0);
    this.dialogBox.setDepth(10000);
    
    // Créer l'arrière-plan de la bulle de dialogue
    const dialogBackground = this.add.graphics();
    
    // Dessiner le rectangle arrondi principal
    dialogBackground.fillStyle(0xffffff, 0.9);
    dialogBackground.lineStyle(2, 0x000000, 1);
    dialogBackground.fillRoundedRect(0, 0, 320, 100, 16);
    dialogBackground.strokeRoundedRect(0, 0, 320, 100, 16);
    
    // Dessiner le triangle de la pointe
    dialogBackground.fillStyle(0xffffff, 0.9);
    dialogBackground.lineStyle(2, 0x000000, 1);
    dialogBackground.fillTriangle(150, 100, 170, 100, 160, 115);
    dialogBackground.strokeTriangle(150, 100, 170, 100, 160, 115);
    
    // Créer une texture à partir de l'arrière-plan
    dialogBackground.generateTexture('dialogBubble', 320, 120);
    dialogBackground.destroy();
    
    // Créer le sprite d'arrière-plan
    const bubbleSprite = this.add.sprite(0, 0, 'dialogBubble');
    bubbleSprite.setOrigin(0.5, 0.95);  // Ajuster l'origine pour inclure la pointe
    bubbleSprite.setVisible(false);
    
    // Le texte sera créé dynamiquement au-dessus du PNJ lors de l'interaction
    this.dialogText = this.add.text(0, -50, "", {
      font: 'bold 18px Arial',
      color: '#000000',
      align: 'center',
      padding: { x: 15, y: 10 },
      wordWrap: { width: 280 },
      lineSpacing: 6
    });
    this.dialogText.setOrigin(0.5, 0.5);
    this.dialogText.setVisible(false);
    
    // Ajouter les éléments au container
    this.dialogBox.add([bubbleSprite, this.dialogText]);
    
    // Stocker une référence au sprite de bulle
    this.dialogText.setData('bubble', bubbleSprite);
    
    // Assurer que le texte est toujours visible et lisible
    this.dialogBox.setDepth(10000);
  }

  private updateDialogPosition(): void {
    if (!this.currentNPC || !this.isDialogActive) return;
    
    // Obtenir la position du PNJ dans le monde
    const npcX = this.currentNPC.x;
    const npcY = this.currentNPC.y - 40; // Décalage au-dessus du PNJ
    
    // Mettre à jour la position du texte pour qu'il soit au-dessus du PNJ
    this.dialogBox.setPosition(npcX, npcY);
    
    // Ajuster la taille du texte en fonction du zoom de la caméra
    // Plus le zoom est grand, plus le texte doit être petit pour être lisible
    const scale = 1 / this.cameras.main.zoom;
    this.dialogBox.setScale(scale);
  }

  private startDialog(npc: Phaser.Physics.Arcade.Sprite): void {
    this.isDialogActive = true;
    this.currentNPC = npc;
    
    // Récupérer les données de dialogue du PNJ
    const dialogLines = npc.getData('dialog') as string[];
    const dialogIndex = npc.getData('dialogIndex') as number;
    const npcName = npc.getData('name') as string;
    
    // Créer un texte de dialogue concis
    const dialogContent = `${npcName}:\n${dialogLines[dialogIndex]}\n\n[E]`;
    
    // Obtenir la bulle de dialogue
    const bubble = this.dialogText.getData('bubble') as Phaser.GameObjects.Sprite;
    
    // Positionner le dialogue au-dessus du PNJ
    this.dialogBox.setPosition(npc.x, npc.y - 40);
    
    // Mettre à jour le texte
    this.dialogText.setText(dialogContent);
    
    // Afficher la bulle et le texte
    bubble.setVisible(true);
    this.dialogText.setVisible(true);
    
    // Ajouter une animation pour faire apparaître le texte
    this.tweens.add({
      targets: this.dialogBox,
      y: npc.y - 50,
      alpha: { from: 0.7, to: 1 },
      duration: 300,
      ease: 'Sine.easeOut'
    });
    
    console.log("Dialogue démarré:", dialogContent);
  }

  private closeDialog(): void {
    if (!this.currentNPC) return;
    
    // Récupérer les données de dialogue du PNJ
    const dialogLines = this.currentNPC.getData('dialog') as string[];
    let dialogIndex = this.currentNPC.getData('dialogIndex') as number;
    
    // Passer à la ligne de dialogue suivante
    dialogIndex = (dialogIndex + 1) % dialogLines.length;
    this.currentNPC.setData('dialogIndex', dialogIndex);
    
    // Si c'est la première ligne, fermer le dialogue
    if (dialogIndex === 0) {
      // Obtenir la position actuelle pour l'animation de fermeture
      const npcY = this.currentNPC.y - 30;
      
      // Animation de fermeture
      this.tweens.add({
        targets: this.dialogBox,
        alpha: 0,
        y: npcY,
        duration: 200,
        onComplete: () => {
          // Cacher la bulle et le texte
          const bubble = this.dialogText.getData('bubble') as Phaser.GameObjects.Sprite;
          bubble.setVisible(false);
          this.dialogText.setVisible(false);
          
          this.isDialogActive = false;
          this.currentNPC = null;
        }
      });
    } else {
      // Sinon, afficher la ligne suivante
      this.startDialog(this.currentNPC);
    }
  }

  private tryInteractWithNPC(): void {
    if (this.isDialogActive) return;
    
    // Récupérer tous les PNJ
    const npcs = this.npcs.getChildren();
    
    // Distance d'interaction
    const interactRange = 50;
    
    // Cacher tous les indicateurs d'interaction
    npcs.forEach((npc) => {
      const npcSprite = npc as Phaser.Physics.Arcade.Sprite;
      const interactContainer = npcSprite.getData('interactIcon') as Phaser.GameObjects.Container;
      interactContainer.setVisible(false);
    });
    
    // Trouver le PNJ le plus proche dans la portée d'interaction
    let closestNPC: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDistance = interactRange;
    
    npcs.forEach((npc) => {
      const npcSprite = npc as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npcSprite.x, npcSprite.y
      );
      
      // Si le PNJ est à portée, afficher l'indicateur d'interaction
      if (distance < interactRange) {
        const interactContainer = npcSprite.getData('interactIcon') as Phaser.GameObjects.Container;
        interactContainer.setVisible(true);
        
        // Mise à jour du PNJ le plus proche
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNPC = npcSprite;
        }
      }
    });
    
    // Si un PNJ est à portée, démarrer le dialogue
    if (closestNPC) {
      // Debug - vérifier que l'interaction est détectée
      console.log("Interaction avec PNJ: " + (closestNPC as Phaser.Physics.Arcade.Sprite).getData('name'));
      this.startDialog(closestNPC);
    }
  }

  private handleCameraZoom(): void {
    // Zoom in (Page Up)
    if (Phaser.Input.Keyboard.JustDown(this.zoomInKey)) {
      const currentZoom = this.cameras.main.zoom;
      if (currentZoom < 4) {
        this.cameras.main.setZoom(currentZoom + 0.5);
        console.log("Zoom augmenté à:", this.cameras.main.zoom);
      }
    }
    
    // Zoom out (Page Down)
    if (Phaser.Input.Keyboard.JustDown(this.zoomOutKey)) {
      const currentZoom = this.cameras.main.zoom;
      if (currentZoom > 1) {
        this.cameras.main.setZoom(currentZoom - 0.5);
        console.log("Zoom diminué à:", this.cameras.main.zoom);
      }
    }
  }
}