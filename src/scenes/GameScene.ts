import Phaser from 'phaser';
import { PlayerStats, getStatsByLevel } from '../config/PlayerStats';
import { LLMAgentService, NPCContext } from '../ai/LLMAgentService';

export class GameScene extends Phaser.Scene {
  // Propriétés du joueur
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerHealth: number = PlayerStats.health.initial;
  private playerMaxHealth: number = PlayerStats.health.maximum;
  private playerAttacking: boolean = false;
  private playerDirection: string = 'down';
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerMana: number = PlayerStats.mana.initial;
  private playerMaxMana: number = PlayerStats.mana.maximum;
  private playerManaBar!: Phaser.GameObjects.Graphics;
  private manaRegenTimer: number = 0;
  private playerLevel: number = PlayerStats.experience.initialLevel;
  private playerXp: number = 0;
  private playerNextLevelXp: number = PlayerStats.experience.baseXp;
  private playerLastDamageTime: number = 0;

  // Contrôles
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private zoomInKey!: Phaser.Input.Keyboard.Key;
  private zoomOutKey!: Phaser.Input.Keyboard.Key;
  private fireballKey!: Phaser.Input.Keyboard.Key;

  // Groupes d'objets
  private enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private npcs!: Phaser.Physics.Arcade.Group;
  private staticObjects!: Phaser.Physics.Arcade.StaticGroup; // Groupe pour les objets statiques

  // Interface utilisateur
  private healthBar!: Phaser.GameObjects.Graphics;
  private dialogBox!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;
  private isDialogActive: boolean = false;
  private currentNPC: Phaser.Physics.Arcade.Sprite | null = null;

  // Projectiles
  private fireballs!: Phaser.Physics.Arcade.Group;
  private fireballCooldown: number = 0;

  private llmService: LLMAgentService;
  
  constructor() {
    super({ key: 'GameScene' });
    // Créer une instance du service LLM pour les tests
    console.log("==== CRÉATION DU LLMSERVICE DANS GAME SCENE ====");
    this.llmService = new LLMAgentService();
  }

  preload(): void {
    // Nous n'avons pas besoin de charger à nouveau ces ressources car elles sont déjà chargées dans PreloadScene
    // Mais si nécessaire, nous pouvons ajouter d'autres ressources spécifiques à GameScene ici
  }

  create(): void {
    console.log("==== MÉTHODE CREATE DE GAME SCENE APPELÉE ====");
    alert("DÉMARRAGE DU JEU - Vérifiez la console (F12)");
    
    // Initialiser les contrôles
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.zoomInKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_UP);
    this.zoomOutKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN);
    this.fireballKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    // Créer une "carte" temporaire (à remplacer par une vraie carte Tiled plus tard)
    this.createTempMap();

    // Créer les animations d'attaque
    this.createAttackAnimations();

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

    // Initialiser les projectiles
    this.createProjectiles();

    // Configurer la caméra
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(2); // Réactivation du zoom pour tester le dialogue

    // Configurer les collisions
    this.setupCollisions();

    // Créer la boîte de dialogue (invisible par défaut)
    this.createDialogBox();
    
    // Activer le débogage visuel des hitboxes pour développement
    this.showDebugHitboxes();
    
    // Test immédiat du LLM après 1 seconde
    this.time.delayedCall(1000, this.testLLMConnection, [], this);
    
    // Texte d'aide pour montrer qu'on peut tester
    const helpText = this.add.text(10, this.sys.game.canvas.height - 60, 
        'T: Tester connexion LLM', 
        { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', backgroundColor: '#000000' });
    helpText.setScrollFactor(0);
    
    // Ajouter touche pour tester la connexion LLM
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T).on('down', () => {
      console.log("Touche T pressée - Test LLM");
      this.testLLMConnection();
    });
    
    // Ajouter la touche R pour forcer le mouvement de tous les PNJ
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      console.log("--- TOUCHE R PRESSÉE ---");
      this.forceAllNPCsToMove();
    });
  }

  update(time: number, delta: number): void {
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

    // Gérer le comportement des PNJ (version originale)
    this.updateNPCs(time);

    // Gérer le mouvement du joueur
    this.handlePlayerMovement();

    // Gérer l'attaque du joueur
    this.handlePlayerAttack();

    // Gérer les boules de feu
    this.handlePlayerFireball(time);

    // Mettre à jour les projectiles
    this.updateProjectiles();
    
    // Afficher des informations de débogage sur les boules de feu
    this.debugFireballs();

    // Mettre à jour l'interface utilisateur
    this.updateUI();

    // Régénérer le mana au fil du temps (converti en points par seconde)
    this.manaRegenTimer += delta;
    if (this.manaRegenTimer >= 1000) { // Régénérer chaque seconde
      this.manaRegenTimer = 0;
      if (this.playerMana < this.playerMaxMana) {
        this.playerMana = Math.min(this.playerMana + PlayerStats.mana.regenRate, this.playerMaxMana);
      }
    }
  }

  private createTempMap(): void {
    // Créer une carte fixe avec un fond vert
    const mapWidth = 1600;
    const mapHeight = 1200;
    
    // Créer un groupe pour les objets statiques
    this.staticObjects = this.physics.add.staticGroup();
    
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
    
    // Position visuelle Y de l'objet
    const visualY = y + (options.offsetY || 0);
    
    // Créer un conteneur pour regrouper toutes les tuiles
    const container = this.add.container(x, visualY);
    
    // Ajouter les tuiles au conteneur (pour l'aspect visuel)
    for (let dy = 0; dy < heightInTiles; dy++) {
      for (let dx = 0; dx < widthInTiles; dx++) {
        const tileX = topLeft.x + dx;
        const tileY = topLeft.y + dy;
        const frameIndex = tileY * spritesheetWidth + tileX;
        const tileX_pos = (dx - widthInTiles / 2 + 0.5) * finalTileSize;
        const tileY_pos = (dy - heightInTiles + 0.5) * finalTileSize;
        const tileSprite = this.add.sprite(tileX_pos, tileY_pos, 'overworld', frameIndex);
        tileSprite.setScale(scale);
        tileSprite.setOrigin(0.5);
        container.add(tileSprite);
      }
    }
    
    // --- Gestion de la Hitbox Physique --- 
    
    // Créer une Zone invisible pour porter le corps physique
    // Placer la Zone à la position de base (x, y) qui sert d'ancre
    const zoneWidth = widthInTiles * finalTileSize;
    const zoneHeight = heightInTiles * finalTileSize;
    const zone = this.add.zone(x, y, zoneWidth, zoneHeight);
    
    // Ajouter la zone au groupe statique
    this.staticObjects.add(zone);
    
    // Récupérer le corps physique de la zone
    const body = zone.body as Phaser.Physics.Arcade.StaticBody;
    
    // Activer le corps physique (peut être désactivé par défaut pour les zones)
    body.enable = true;
    
    // Déterminer le type d'objet
    const isTree = topLeft.y >= 16; // Les arbres commencent à y=16 dans le tileset
    const isHouse = topLeft.x === 6 && topLeft.y === 0 && bottomRight.x === 10 && bottomRight.y === 4;
    
    // Variables pour la taille et le décalage du corps physique
    let bodyWidth, bodyHeight, bodyOffsetX, bodyOffsetY;
    
    if (isTree) {
      // Arbre: Hitbox sur le tronc (bas, centré)
      bodyWidth = finalTileSize * 2; // Tronc plus étroit
      bodyHeight = finalTileSize * 2 ; // Bas du tronc
      bodyOffsetX = (zoneWidth - bodyWidth) / 2; // Centrer horizontalement par rapport à la zone
      bodyOffsetY = zoneHeight -  1.5 * bodyHeight; // Placer en bas de la zone (pas d'offset visuel)
    } else if (isHouse) {
      // Maison: Hitbox sur la base visible
      bodyWidth = zoneWidth;
      bodyHeight = zoneHeight; // 70% de la hauteur
      bodyOffsetX = 0;
      // Aligner le haut de la hitbox avec le haut du visuel (qui a un offset)
      bodyOffsetY = zoneHeight - 1.75 * bodyHeight; 
    } else {
      // Autres objets: Hitbox sur 80% de la hauteur, en bas
      bodyWidth = zoneWidth;
      bodyHeight = zoneHeight * 0.8;
      bodyOffsetX = 0;
      bodyOffsetY = zoneHeight - bodyHeight; // Placer en bas de la zone (pas d'offset visuel)
    }
    
    // Appliquer la taille et le décalage calculés au corps physique
    body.setSize(bodyWidth, bodyHeight);
    body.setOffset(bodyOffsetX, bodyOffsetY);
    
    // --- Fin Gestion Hitbox --- 
    
    // Définir la profondeur du conteneur visuel pour le tri
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

  private createAttackAnimations(): void {
    // Animation d'attaque vers le bas
    this.anims.create({
      key: 'attack-down',
      frames: this.anims.generateFrameNumbers('attaquant', { start: 32, end: 35 }),
      frameRate: 10,
      repeat: 0
    });

    // Animation d'attaque vers la gauche
    this.anims.create({
      key: 'attack-left',
      frames: this.anims.generateFrameNumbers('attaquant', { start: 56, end: 59   }),
      frameRate: 10,
      repeat: 0
    });

    // Animation d'attaque vers la droite
    this.anims.create({
      key: 'attack-right',
      frames: this.anims.generateFrameNumbers('mage', { start: 6, end: 8}),
      frameRate: 10,
      repeat: 0
    });

    // this.anims.create({
    //   key: 'attack-right',
    //   frames: this.anims.generateFrameNumbers('attaquant', { start: 48, end: 51 }),
    //   frameRate: 10,
    //   repeat: 0
    // });


    // Animation d'attaque vers le haut
    this.anims.create({
      key: 'attack-up',
      frames: this.anims.generateFrameNumbers('attaquant', {  start: 40, end: 43 }),
      frameRate: 10,
      repeat: 0
    });

    // Anims pour PNJ
    this.anims.create({
      key: 'npc-attack-down',
      frames: this.anims.generateFrameNumbers('character', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0
    });
  }

  private createNPCs(): void {
    // Créer un groupe pour les PNJ
    this.npcs = this.physics.add.group();

    // Positions fixes des PNJ
    const npcPositions = [
      { x: 500, y: 200, name: "Villageois", dialog: ["Bonjour voyageur!", "Comment allez-vous aujourd'hui?", "Méfiez-vous des monstres qui rôdent dans les environs."], canAttack: false },
      { x: 900, y: 600, name: "Marchand", dialog: ["Bienvenue dans notre village!", "J'aurais des objets à vendre, mais le système n'est pas encore implémenté.", "Revenez plus tard!"], canAttack: false },
      { x: 1200, y: 300, name: "Garde", dialog: ["Les secrets de ce monde sont nombreux...", "Explorez et vous découvrirez des trésors cachés.", "Je suis là pour protéger le village. Regardez mon épée!"], canAttack: true }
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
      // Les gardes ont une teinte différente (plus vers le violet)
      if (pos.canAttack) {
        npc.setTint(0x8844ff);
      } else {
        npc.setTint(0x00aaff);
      }
      
      // Stocker les données du PNJ
      npc.setData('name', pos.name);
      npc.setData('dialog', pos.dialog);
      npc.setData('dialogIndex', 0);
      npc.setData('canAttack', pos.canAttack);
      npc.setData('attackCooldown', 0);
      npc.setData('isAttacking', false);
      
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
    // Collision entre le joueur et les objets statiques (arbres, maisons, etc.)
    this.physics.add.collider(this.player, this.staticObjects);
    
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
    
    // Collision entre les ennemis et les objets statiques
    this.physics.add.collider(this.enemies, this.staticObjects);

    // Collision entre les boules de feu et les ennemis
    this.physics.add.overlap(this.fireballs, this.enemies, this.handleFireballEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    
    // Collision entre les boules de feu et les objets statiques
    this.physics.add.collider(this.fireballs, this.staticObjects, this.handleFireballWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
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

    const speed = PlayerStats.movement.speed;
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

      // Jouer l'animation d'attaque dans la direction actuelle
      const attackAnim = `attack-${this.playerDirection}`;
      
      // Vérifier si l'animation est déjà en cours
      if (this.player.anims.isPlaying && this.player.anims.currentAnim?.key === attackAnim) {
        return; // Ne pas redémarrer la même animation
      }
      
      this.player.anims.play(attackAnim, true);

      // Effet visuel temporaire pour l'attaque
      const attackCircle = this.add.circle(
        this.player.x + this.getAttackOffsetX(),
        this.player.y + this.getAttackOffsetY(),
        15, 0xffff00, 0.5
      );

      // Créer un effet visuel d'épée
      const swordEffect = this.add.sprite(
        this.player.x + this.getAttackOffsetX() * 1.5,
        this.player.y + this.getAttackOffsetY() * 1.5,
        'character', 66
      );
      
      // Orienter l'effet d'épée en fonction de la direction
      if (this.playerDirection === 'left') {
        swordEffect.setFlipX(true);
        swordEffect.setAngle(-90);
      } else if (this.playerDirection === 'right') {
        swordEffect.setAngle(90);
      } else if (this.playerDirection === 'up') {
        swordEffect.setAngle(0);
      } else { // down
        swordEffect.setAngle(180);
      }
      
      swordEffect.setScale(1.5);
      swordEffect.setAlpha(0.7);

      // Vérifier les ennemis proches pour les attaquer
      this.attackEnemies();

      // Attendre que l'animation d'attaque soit terminée
      this.player.once('animationcomplete', () => {
        // Supprimer les effets visuels
        attackCircle.destroy();
        swordEffect.destroy();
        
        // Permettre au joueur d'attaquer à nouveau
        this.playerAttacking = false;
        
        // Revenir à l'animation d'inactivité
        this.player.anims.play(`idle-${this.playerDirection}`);
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
    const attackRange = PlayerStats.attack.melee.range;

    // Pour chaque ennemi, vérifier s'il est à portée
    enemies.forEach((enemy) => {
      const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemySprite.x, enemySprite.y
      );

      if (distance < attackRange) {
        const enemyHealth = enemySprite.getData('health') - PlayerStats.attack.melee.damage;
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

        // Ajouter de l'expérience au joueur quand il tue un ennemi
        if (enemyHealth <= 0) {
          this.addPlayerXP(20); // 20 XP par ennemi tué
          
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
    
    // Vérifier le temps d'invincibilité
    const currentTime = this.time.now;
    if (currentTime - this.playerLastDamageTime < PlayerStats.combat.invincibilityTime) {
      return;
    }

    // Appliquer un délai entre les dégâts (pour éviter de prendre des dégâts trop rapidement)
    if (enemySprite.getData('lastAttackTime') && 
        (this.time.now - enemySprite.getData('lastAttackTime')) < 1000) {
      return;
    }
    
    // Enregistrer le moment de l'attaque
    enemySprite.setData('lastAttackTime', this.time.now);
    this.playerLastDamageTime = currentTime;

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
    
    // Mettre à jour la barre de mana
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(10, 70, 120, 10);
    
    this.healthBar.fillStyle(0x0088ff, 1);
    this.healthBar.fillRect(10, 70, 120 * (this.playerMana / this.playerMaxMana), 10);
    
    // Afficher le niveau du joueur
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(10, 90, 120, 20);
    
    // Texte pour le niveau
    const levelText = this.add.text(70, 100, `Niveau ${this.playerLevel}`, {
      font: '12px Arial',
      color: '#ffffff'
    });
    levelText.setOrigin(0.5, 0.5);
    levelText.setScrollFactor(0);
    
    // Barre d'expérience
    this.healthBar.fillStyle(0x00ff00, 1);
    const xpRatio = this.playerXp / this.playerNextLevelXp;
    this.healthBar.fillRect(10, 90, 120 * xpRatio, 20);
    
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
    
    // Récupérer les données de base du PNJ
    const npcName = npc.getData('name') as string;
    
    // Message temporaire pendant le chargement
    this.dialogText.setText(`${npcName}:\nAttente réponse LLM...`);
    const bubble = this.dialogText.getData('bubble') as Phaser.GameObjects.Sprite;
    bubble.setVisible(true);
    this.dialogText.setVisible(true);
    
    // Positionner le dialogue au-dessus du PNJ
    this.dialogBox.setPosition(npc.x, npc.y - 40);
    
    // Toujours générer un nouveau dialogue
    console.log("Demande de dialogue au LLM pour", npcName);
    
    // Préparer le contexte pour le LLM
    const dialogContext = {
      id: npcName,
      type: "dialogue_npc", // Précision sur le type de requête
      x: npc.x,
      y: npc.y,
      health: 100,
      player: {
        x: this.player.x,
        y: this.player.y,
        distance: Phaser.Math.Distance.Between(npc.x, npc.y, this.player.x, this.player.y)
      },
      nearbyNPCs: [],
      visibleObstacles: [],
      lastAction: null,
      scene: this,
      canAttack: npc.getData('canAttack') || false,
      instructions: "Génère une phrase de dialogue spontanée pour ce PNJ qui parle au joueur. Réponds UNIQUEMENT avec la phrase, sans préfixe ni format particulier."
    };
    
    // Demander un dialogue au LLM
    this.llmService.getNPCAction(dialogContext)
      .then(action => {
        console.log("Réponse brute du LLM:", action);
        
        // Utiliser directement la réponse du LLM comme dialogue
        let newDialog = action.trim();
        
        // S'assurer qu'il y a du contenu
        if (!newDialog || newDialog.length < 2) {
          newDialog = "Bonjour aventurier! Comment puis-je t'aider aujourd'hui?";
        }
        
        // Afficher le dialogue complet
        const dialogContent = `${npcName}:\n${newDialog}\n\n[E pour continuer]`;
        this.dialogText.setText(dialogContent);
        console.log("Dialogue affiché:", dialogContent);
      })
      .catch(error => {
        console.error("Erreur LLM pour dialogue:", error);
        const fallbackDialog = "Bonjour aventurier! Je suis content de te voir.";
        const dialogContent = `${npcName}:\n${fallbackDialog}\n\n[E pour continuer]`;
        this.dialogText.setText(dialogContent);
      });
    
    // Ajouter une animation pour faire apparaître le texte
    this.tweens.add({
      targets: this.dialogBox,
      y: npc.y - 50,
      alpha: { from: 0.7, to: 1 },
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  private closeDialog(): void {
    if (!this.currentNPC) return;
    
    // Animation de fermeture
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
        
        // Déclencher une nouvelle action pour le PNJ après la fin du dialogue
        this.time.delayedCall(1000, () => {
          if (this.currentNPC) {
            this.requestNewNPCAction(this.currentNPC);
          }
        });
      }
    });
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

  private createProjectiles(): void {
    // Créer un groupe pour les boules de feu
    this.fireballs = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 30  // Augmenté de 10 à 30 pour éviter d'atteindre la limite
    });
    
    // Créer une texture pour les boules de feu
    this.createFireballTexture();
  }
  
  private createFireballTexture(): void {
    // Créer une texture pour les boules de feu
    const graphics = this.add.graphics();
    
    // Dessiner le centre de la boule de feu (blanc-jaune vif)
    graphics.fillStyle(0xffffcc, 1);
    graphics.fillCircle(16, 16, 6);
    
    // Dessiner la couche intermédiaire (jaune-orange)
    graphics.fillStyle(0xffcc00, 0.9);
    graphics.fillCircle(16, 16, 10);
    
    // Dessiner la couche externe (rouge-orange)
    graphics.fillStyle(0xff7700, 0.7);
    graphics.fillCircle(16, 16, 14);
    
    // Ajouter un effet de lueur
    graphics.fillStyle(0xff3300, 0.3);
    graphics.fillCircle(16, 16, 16);
    
    // Générer la texture
    graphics.generateTexture('fireball', 32, 32);
    graphics.destroy();
  }

  private handlePlayerFireball(time: number): void {
    // Vérifier le cooldown
    if (time < this.fireballCooldown) {
      return;
    }

    // Lancer une boule de feu avec la touche F
    if (Phaser.Input.Keyboard.JustDown(this.fireballKey)) {
      if (this.playerMana >= PlayerStats.attack.fireball.manaCost) {
        // Obtenir les vecteurs de direction
        let dirX = this.getDirectionOffsetX();
        let dirY = this.getDirectionOffsetY();
        
        // Vérifier si une direction valide est détectée
        if (dirX === 0 && dirY === 0) {
          // Si aucune direction n'est détectée, utiliser la dernière direction connue du joueur
          if (this.playerDirection === 'left') {
            dirX = -1;
          } else if (this.playerDirection === 'right') {
            dirX = 1;
          } else if (this.playerDirection === 'up') {
            dirY = -1;
          } else if (this.playerDirection === 'down') {
            dirY = 1;
          }
        }
        
        // Coût en mana
        this.playerMana -= PlayerStats.attack.fireball.manaCost;
        
        // Définir le cooldown
        this.fireballCooldown = time + PlayerStats.attack.fireball.cooldown;
        
        // Position initiale de la boule de feu
        const offsetX = dirX * 20;
        const offsetY = dirY * 20;
        const x = this.player.x + offsetX;
        const y = this.player.y + offsetY;
        
        // Créer la boule de feu
        const fireball = this.fireballs.get(x, y) as Phaser.Physics.Arcade.Sprite;
        
        if (fireball) {
          fireball.setActive(true);
          fireball.setVisible(true);
          
          // Utiliser la texture de boule de feu
          fireball.setTexture('fireball');
          fireball.setDisplaySize(PlayerStats.attack.fireball.size, PlayerStats.attack.fireball.size);
          
          // Ajouter un effet de lumière
          const lightCircle = this.add.circle(0, 0, 32, 0xff8800, 0.3);
          fireball.setData('light', lightCircle);
          
          // Configurer la vitesse en fonction de la direction
          const speed = PlayerStats.attack.fireball.speed;
          const velocityX = dirX * speed;
          const velocityY = dirY * speed;
          
          // S'assurer que la boule de feu a une vélocité non nulle
          if (velocityX === 0 && velocityY === 0) {
            // Si malgré tout on n'a pas de direction, utiliser la direction par défaut (vers le bas)
            fireball.setVelocity(0, speed);
            console.log("Direction par défaut utilisée pour la boule de feu");
          } else {
            fireball.setVelocity(velocityX, velocityY);
          }
          
          // Définir la durée de vie de la boule de feu
          fireball.setData('lifespan', PlayerStats.attack.fireball.lifespan);
          fireball.setData('created', time);
          fireball.setData('lastX', x);
          fireball.setData('lastY', y);
          fireball.setData('stuckCheckTime', time + 300); // Vérifier après 300ms si la boule est bloquée
          
          // Ajouter une animation de rotation
          this.tweens.add({
            targets: fireball,
            angle: 360,
            duration: 1000,
            repeat: -1,
            ease: 'Linear'
          });
          
          // Ajouter une animation de pulsation
          this.tweens.add({
            targets: fireball,
            scale: { from: 0.8, to: 1.2 },
            duration: 300,
            yoyo: true,
            repeat: -1
          });
          
          // Effet sonore
          // this.sound.play('fireball_sound');
        }
      } else {
        // Pas assez de mana - afficher une indication visuelle
        this.showNotEnoughManaEffect();
      }
    }
  }

  private showNotEnoughManaEffect(): void {
    // Créer un texte pour indiquer le manque de mana
    const noManaText = this.add.text(
      this.player.x,
      this.player.y - 30,
      "Pas assez de mana!",
      {
        font: 'bold 12px Arial',
        color: '#0088ff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    noManaText.setOrigin(0.5);
    
    // Faire flotter le texte vers le haut puis disparaître
    this.tweens.add({
      targets: noManaText,
      y: noManaText.y - 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        noManaText.destroy();
      }
    });
    
    // Faire clignoter la barre de mana
    this.tweens.add({
      targets: this.healthBar,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true,
      repeat: 3
    });
  }

  private updateProjectiles(): void {
    // Mettre à jour la position des effets lumineux des boules de feu
    this.fireballs.getChildren().forEach((fireball) => {
      const fireballSprite = fireball as Phaser.Physics.Arcade.Sprite;
      
      if (!fireballSprite.active) return;
      
      // Mettre à jour la position de l'effet lumineux
      const light = fireballSprite.getData('light') as Phaser.GameObjects.Shape;
      if (light) {
        light.setPosition(fireballSprite.x, fireballSprite.y);
      }
      
      // Vérifier la durée de vie
      const created = fireballSprite.getData('created') as number;
      const lifespan = fireballSprite.getData('lifespan') as number;
      
      // Vérifier si la boule de feu est bloquée (ne se déplace pas)
      const stuckCheckTime = fireballSprite.getData('stuckCheckTime') as number;
      if (this.time.now > stuckCheckTime) {
        const lastX = fireballSprite.getData('lastX') as number;
        const lastY = fireballSprite.getData('lastY') as number;
        const distance = Phaser.Math.Distance.Between(lastX, lastY, fireballSprite.x, fireballSprite.y);
        
        // Si la boule de feu n'a pas bougé (ou très peu) depuis la dernière vérification
        if (distance < 5) {
          console.log("Boule de feu bloquée détectée, suppression...");
          // Forcer la destruction de la boule de feu
          if (light) {
            light.destroy();
          }
          fireballSprite.setActive(false);
          fireballSprite.setVisible(false);
          if (fireballSprite.body) {
            fireballSprite.body.enable = false;
          }
          // Supprimer complètement la boule de feu du groupe
          this.fireballs.remove(fireballSprite, true, true);
          return;
        }
        
        // Mettre à jour la dernière position connue et programmer la prochaine vérification
        fireballSprite.setData('lastX', fireballSprite.x);
        fireballSprite.setData('lastY', fireballSprite.y);
        fireballSprite.setData('stuckCheckTime', this.time.now + 300);
      }
      
      if (this.time.now > created + lifespan) {
        // Supprimer l'effet lumineux
        if (light) {
          light.destroy();
        }
        
        // Désactiver la boule de feu
        fireballSprite.setActive(false);
        fireballSprite.setVisible(false);
        if (fireballSprite.body) {
          fireballSprite.body.enable = false;
        }
        // Supprimer complètement la boule de feu du groupe
        this.fireballs.remove(fireballSprite, true, true);
      }
    });
  }

  private handleFireballEnemyCollision(fireball: any, enemy: any): void {
    const fireballSprite = fireball as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    
    // Supprimer l'effet lumineux
    const light = fireballSprite.getData('light') as Phaser.GameObjects.Shape;
    if (light) {
      light.destroy();
    }
    
    // Désactiver la boule de feu
    fireballSprite.setActive(false);
    fireballSprite.setVisible(false);
    if (fireballSprite.body) {
      fireballSprite.body.enable = false;
    }
    
    // Supprimer complètement la boule de feu du groupe
    this.fireballs.remove(fireballSprite, true, true);
    
    // Endommager l'ennemi
    const enemyHealth = enemySprite.getData('health') - PlayerStats.attack.fireball.damage;
    enemySprite.setData('health', enemyHealth);
    
    // Créer un effet d'explosion avec des cercles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 100);
      const distance = Phaser.Math.Between(5, 20);
      
      const particleX = enemySprite.x + Math.cos(angle) * distance;
      const particleY = enemySprite.y + Math.sin(angle) * distance;
      
      const particle = this.add.circle(particleX, particleY, Phaser.Math.Between(2, 5), 0xff7700);
      
      this.tweens.add({
        targets: particle,
        x: particleX + Math.cos(angle) * speed,
        y: particleY + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Effet de recul
    const angle = Phaser.Math.Angle.Between(
      fireballSprite.x, fireballSprite.y,
      enemySprite.x, enemySprite.y
    );
    enemySprite.setVelocity(
      Math.cos(angle) * PlayerStats.attack.fireball.knockbackForce,
      Math.sin(angle) * PlayerStats.attack.fireball.knockbackForce
    );
    
    // Effet de clignotement
    this.tweens.add({
      targets: enemySprite,
      alpha: { from: 0.3, to: 1 },
      duration: 100,
      repeat: 2
    });
    
    // Ajouter de l'expérience au joueur quand il tue un ennemi
    if (enemyHealth <= 0) {
      this.addPlayerXP(20); // 20 XP par ennemi tué
      
      const healthBar = enemySprite.getData('healthBar') as Phaser.GameObjects.Graphics;
      if (healthBar) {
        healthBar.destroy();
      }
      enemySprite.destroy();
    }
  }

  /**
   * Gère la collision d'une boule de feu avec un objet statique comme un mur
   */
  private handleFireballWallCollision(fireball: any, wall: any): void {
    const fireballSprite = fireball as Phaser.Physics.Arcade.Sprite;
    
    // Supprimer l'effet lumineux
    const light = fireballSprite.getData('light') as Phaser.GameObjects.Shape;
    if (light) {
      light.destroy();
    }
    
    // Désactiver la boule de feu
    fireballSprite.setActive(false);
    fireballSprite.setVisible(false);
    if (fireballSprite.body) {
      fireballSprite.body.enable = false;
    }
    
    // Supprimer complètement la boule de feu du groupe
    this.fireballs.remove(fireballSprite, true, true);
    
    // Effet visuel pour la collision avec le mur
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 60);
      const distance = Phaser.Math.Between(2, 10);
      
      const particleX = fireballSprite.x + Math.cos(angle) * distance;
      const particleY = fireballSprite.y + Math.sin(angle) * distance;
      
      const particle = this.add.circle(particleX, particleY, Phaser.Math.Between(1, 3), 0xff5500);
      
      this.tweens.add({
        targets: particle,
        x: particleX + Math.cos(angle) * speed,
        y: particleY + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: 300,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private getDirectionOffsetX(): number {
    switch (this.playerDirection) {
      case 'left': return -1;
      case 'right': return 1;
      default: return 0;
    }
  }

  private getDirectionOffsetY(): number {
    switch (this.playerDirection) {
      case 'up': return -1;
      case 'down': return 1;
      default: return 0;
    }
  }

  // Nouvelle méthode pour gérer l'expérience du joueur
  private addPlayerXP(amount: number): void {
    this.playerXp += amount;
    
    // Vérifier si le joueur monte de niveau
    if (this.playerXp >= this.playerNextLevelXp) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.playerLevel++;
    
    // Calculer l'XP nécessaire pour le niveau suivant
    this.playerNextLevelXp = PlayerStats.experience.baseXp + 
                            (this.playerLevel * PlayerStats.experience.xpPerLevel);
    
    // Obtenir les statistiques pour le nouveau niveau
    const levelStats = getStatsByLevel(this.playerLevel);
    
    // Mettre à jour les statistiques du joueur
    this.playerMaxHealth = levelStats.health.maximum;
    this.playerHealth = this.playerMaxHealth; // Soigner complètement lors d'une montée de niveau
    
    this.playerMaxMana = levelStats.mana.maximum;
    this.playerMana = this.playerMaxMana; // Restaurer complètement le mana
    
    // Afficher un message de montée de niveau
    const levelUpText = this.add.text(
      this.player.x,
      this.player.y - 50,
      "NIVEAU UP!",
      {
        font: 'bold 18px Arial',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    levelUpText.setOrigin(0.5);
    
    // Animation de montée de niveau
    this.tweens.add({
      targets: levelUpText,
      y: levelUpText.y - 30,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        levelUpText.destroy();
      }
    });
    
    // Effet visuel sur le joueur
    this.tweens.add({
      targets: this.player,
      alpha: 0.8,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
    
    // Effet sonore
    // this.sound.play('level_up_sound');
  }

  private updateNPCs(time: number): void {
    // Récupérer tous les PNJ
    const npcs = this.npcs.getChildren();
    
    // Mettre à jour chaque PNJ
    npcs.forEach((npc) => {
      const npcSprite = npc as Phaser.Physics.Arcade.Sprite;
      
      // Vérifier si le PNJ peut attaquer
      if (npcSprite.getData('canAttack')) {
        // Vérifier si le PNJ n'est pas déjà en train d'attaquer
        if (!npcSprite.getData('isAttacking')) {
          // Vérifier le cooldown
          const attackCooldown = npcSprite.getData('attackCooldown') as number;
          
          if (time > attackCooldown) {
            // Faire attaquer le PNJ aléatoirement
            if (Phaser.Math.Between(0, 100) < 1) { // 1% de chance d'attaquer à chaque frame
              this.npcAttack(npcSprite, time);
            }
          }
        }
      }
    });
  }

  private npcAttack(npc: Phaser.Physics.Arcade.Sprite, time: number): void {
    // Vérifier si le PNJ n'est pas déjà en train d'attaquer
    if (npc.getData('isAttacking')) {
      return;
    }
    
    // Marquer le PNJ comme étant en train d'attaquer
    npc.setData('isAttacking', true);
    
    // Jouer l'animation d'attaque
    npc.anims.play('npc-attack-down', true);
    
    // Créer un effet visuel d'épée
    const swordEffect = this.add.sprite(npc.x, npc.y + 20, 'character', 66);
    swordEffect.setScale(1.5);
    swordEffect.setAlpha(0.7);
    
    // Animation de l'effet d'épée
    this.tweens.add({
      targets: swordEffect,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => {
        swordEffect.destroy();
      }
    });
    
    // Vérifier si le joueur est à portée pour l'attaque
    const distance = Phaser.Math.Distance.Between(
      npc.x, npc.y,
      this.player.x, this.player.y
    );
    
    if (distance < 50) {
      // Dégâts au joueur si à portée
      const currentTime = this.time.now;
      if (currentTime - this.playerLastDamageTime > PlayerStats.combat.invincibilityTime) {
        this.playerHealth--;
        this.playerLastDamageTime = currentTime;
        
        // Effet visuel sur le joueur
        this.tweens.add({
          targets: this.player,
          alpha: 0.5,
          yoyo: true,
          duration: 100,
          repeat: 2
        });
        
        // Effet de recul
        const angle = Phaser.Math.Angle.Between(npc.x, npc.y, this.player.x, this.player.y);
        this.player.setVelocity(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200
        );
        
        // Vérifier si le joueur est mort
        if (this.playerHealth <= 0) {
          this.gameOver();
        }
      }
    }
    
    // Revenir à l'animation d'inactivité après la fin de l'attaque
    npc.once('animationcomplete', () => {
      // S'assurer que l'animation est bien terminée
      if (npc.anims.currentAnim && npc.anims.currentAnim.key === 'npc-attack-down') {
        npc.anims.play('idle-down');
        npc.setData('isAttacking', false);
        
        // Définir un cooldown aléatoire entre 3 et 6 secondes
        const newCooldown = time + Phaser.Math.Between(3000, 6000);
        npc.setData('attackCooldown', newCooldown);
      }
    });
  }

  // Méthode de débogage pour afficher l'état des boules de feu
  private debugFireballs(): void {
    // Compter le nombre de boules de feu actives et inactives
    let activeCount = 0;
    let inactiveCount = 0;
    
    this.fireballs.getChildren().forEach(fireball => {
      if (fireball.active) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });
    
    // Afficher le nombre total d'objets dans le groupe
    const totalCount = this.fireballs.getLength();
    
    // Log toutes les 60 frames (environ une fois par seconde)
    if (this.time.now % 60 === 0) {
      console.log(`Boules de feu - Total: ${totalCount}, Actives: ${activeCount}, Inactives: ${inactiveCount}`);
    }
  }

  /**
   * Affiche les hitboxes des objets pour le débogage
   */
  private showDebugHitboxes(): void {
    // Activer le débogage visuel des collisions
    this.physics.world.createDebugGraphic();
  }

  // Teste la connexion au serveur LLM
  private async testLLMConnection(): Promise<void> {
    console.log("==== TEST DE CONNEXION AU LLM ====");
    
    try {
      // Créer un contexte minimal de test
      const testContext = {
        id: "test-npc",
        type: "test",
        x: 0,
        y: 0,
        health: 100,
        nearbyNPCs: [],
        player: null,
        visibleObstacles: [],
        lastAction: null,
        canAttack: false,
        scene: this
      };
      
      // Afficher une notification que le test commence
      const testingText = this.add.text(
        this.cameras.main.centerX, 
        this.cameras.main.centerY, 
        "Test LLM en cours...", 
        { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', backgroundColor: '#000000' }
      );
      testingText.setOrigin(0.5);
      testingText.setScrollFactor(0);
      
      // Appel direct au LLM
      console.log("Appel du LLM avec contexte de test");
      const action = await this.llmService.getNPCAction(testContext as NPCContext);
      console.log("Test LLM réussi :", action);
      
      // Afficher le résultat
      testingText.setText(`LLM connecté: ${action}`);
      testingText.setStyle({ fontFamily: 'Arial', fontSize: '24px', color: '#00ff00', backgroundColor: '#000000' });
      
      // Faire disparaître le texte après 3 secondes
      this.time.delayedCall(3000, () => {
        testingText.destroy();
      });
      
    } catch (error) {
      console.error("Test LLM échoué:", error);
      
      // Afficher une notification d'erreur
      const errorText = this.add.text(
        this.cameras.main.centerX, 
        this.cameras.main.centerY, 
        `Erreur LLM: ${error}`, 
        { fontFamily: 'Arial', fontSize: '20px', color: '#ff0000', backgroundColor: '#000000' }
      );
      errorText.setOrigin(0.5);
      errorText.setScrollFactor(0);
      
      // Faire disparaître le texte après 5 secondes
      this.time.delayedCall(5000, () => {
        errorText.destroy();
      });
    }
  }

  /**
   * Force tous les PNJ à demander une action au LLM pour devenir autonomes
   */
  private forceAllNPCsToMove(): void {
    console.log("Démarrage du mouvement autonome pour tous les PNJ");
    
    this.npcs.getChildren().forEach((npc) => {
      const npcSprite = npc as Phaser.Physics.Arcade.Sprite;
      // Demander une action immédiatement pour ce PNJ
      this.requestNewNPCAction(npcSprite);
    });
    
    // Ajouter un événement qui demande des actions périodiquement pour tous les PNJ
    // Cela assure un mouvement continu même si les PNJ restent bloqués
    if (!this.time.paused) {
      this.time.addEvent({
        delay: 5000, // Vérifier toutes les 5 secondes
        callback: () => {
          this.npcs.getChildren().forEach((npc) => {
            const npcSprite = npc as Phaser.Physics.Arcade.Sprite;
            // Si le PNJ n'est pas en mouvement et n'est pas en train d'attaquer
            if (npcSprite.body && 
                npcSprite.body.velocity.x === 0 && 
                npcSprite.body.velocity.y === 0 && 
                !npcSprite.getData('isAttacking')) {
              // 50% de chance de demander une nouvelle action
              if (Phaser.Math.Between(0, 1) === 1) {
                this.requestNewNPCAction(npcSprite);
              }
            }
          });
        },
        loop: true
      });
    }
  }
  
  /**
   * Applique l'action déterminée par le LLM au PNJ
   */
  private applyNPCAction(npc: Phaser.Physics.Arcade.Sprite, action: string): void {
    // Analyser l'action renvoyée par le LLM
    if (action.includes('MOVE_UP')) {
      npc.setVelocity(0, -80);
      npc.anims.play('walk-up', true);
    } 
    else if (action.includes('MOVE_DOWN')) {
      npc.setVelocity(0, 80);
      npc.anims.play('walk-down', true);
    }
    else if (action.includes('MOVE_LEFT')) {
      npc.setVelocity(-80, 0);
      npc.anims.play('walk-left', true);
    }
    else if (action.includes('MOVE_RIGHT')) {
      npc.setVelocity(80, 0);
      npc.anims.play('walk-right', true);
    }
    else if (action.includes('ATTACK')) {
      // Déclencher une attaque
      if (!npc.getData('isAttacking') && npc.getData('canAttack')) {
        this.npcAttack(npc, this.time.now);
      }
    }
    else if (action.includes('IDLE') || action.includes('WAIT')) {
      npc.setVelocity(0, 0);
      npc.anims.play('idle-down', true);
    }
    else {
      // Action par défaut si non reconnue
      npc.setVelocity(0, 0);
    }
    
    // Extraire le dialogue de l'action si présent
    const dialogMatch = action.match(/SAY:(.*?)(?:\||$)/);
    if (dialogMatch && dialogMatch[1]) {
      const newDialog = dialogMatch[1].trim();
      if (newDialog) {
        // Mettre à jour le dialogue du PNJ
        const currentDialogs = npc.getData('dialog') || [];
        if (Array.isArray(currentDialogs)) {
          // Si c'est déjà un tableau, remplacer le premier élément
          currentDialogs[0] = newDialog;
          npc.setData('dialog', currentDialogs);
        } else {
          // Sinon créer un nouveau tableau
          npc.setData('dialog', [newDialog]);
        }
      }
    }
    
    // Arrêter le mouvement après un délai plus court pour des mouvements plus fréquents
    const stopDelay = Phaser.Math.Between(200, 800);
    this.time.delayedCall(stopDelay, () => {
      // Ne pas interrompre une attaque en cours
      if (!npc.getData('isAttacking')) {
        npc.setVelocity(0, 0);
        
        // Décider d'une nouvelle action immédiatement
        this.requestNewNPCAction(npc);
      }
    });
  }
  
  /**
   * Demande une nouvelle action au LLM pour un PNJ spécifique
   */
  private requestNewNPCAction(npc: Phaser.Physics.Arcade.Sprite): void {
    const name = npc.getData('name') || 'inconnu';
    
    // Préparer le contexte pour le LLM
    const npcContext = {
      id: name,
      type: "npc",
      x: npc.x,
      y: npc.y,
      health: 100,
      canAttack: npc.getData('canAttack') || false,
      nearbyNPCs: [], 
      player: {
        x: this.player.x,
        y: this.player.y,
        distance: Phaser.Math.Distance.Between(npc.x, npc.y, this.player.x, this.player.y)
      },
      visibleObstacles: [],
      lastAction: npc.getData('lastAction') || null,
      scene: this
    };
    
    // Appeler le LLM pour obtenir l'action
    this.llmService.getNPCAction(npcContext)
      .then(action => {
        npc.setData('lastAction', action);
        this.applyNPCAction(npc, action);
      })
      .catch(error => {
        console.error(`Erreur pour PNJ ${name}:`, error);
        // En cas d'erreur, réessayer après un délai
        this.time.delayedCall(2000, () => this.requestNewNPCAction(npc));
      });
  }
}