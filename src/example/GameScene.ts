import Phaser from 'phaser';
import { VectorCharacter } from '../characters/VectorCharacter';
import { NPCManager } from '../ai/NPCManager';
import { DebugDisplay } from '../ai/DebugDisplay';
import { LLMAgentService, NPCAction } from '../ai/LLMAgentService';

export class GameScene extends Phaser.Scene {
    public player!: VectorCharacter;
    public npcManager!: NPCManager;
    public obstaclesGroup!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    public debugDisplay!: DebugDisplay;
    private testLLMService: LLMAgentService;
    private debugKey!: Phaser.Input.Keyboard.Key;
    private testKey!: Phaser.Input.Keyboard.Key;
    
    constructor() {
        super({ key: 'GameScene' });
        this.testLLMService = new LLMAgentService();
    }
    
    create() {
        // FORCER UN MESSAGE D'ALERTE AU DÉMARRAGE
        setTimeout(() => {
            alert("DÉMARRAGE DU JEU - Vérifiez que la console est ouverte (F12)");
        }, 500);
        
        // Initialiser le système de debug
        this.debugDisplay = new DebugDisplay(this);
        this.debugDisplay.log("GameScene initialisée");
        
        // FORCER UN MESSAGE DIRECT DANS LE DOM
        this.addDebugOverlay();
        
        // Créer une carte simple de démonstration
        this.createMap();
        
        // Créer le joueur
        this.player = new VectorCharacter(this, 100, 100, 'player');
        
        // Activer la physique sur le joueur
        this.physics.world.enable(this.player.getBody());
        this.player.getBody().setCollideWorldBounds(true);
        
        // Créer le gestionnaire de PNJ
        this.npcManager = new NPCManager(this);
        this.debugDisplay.log("NPCManager créé");
        
        // Ajouter quelques PNJ sur la carte
        this.npcManager.createMultipleNPCs([
            { x: 200, y: 150, type: 'enemy' },
            { x: 300, y: 200, type: 'enemy' },
            { x: 400, y: 100, type: 'mage' },
            { x: 150, y: 300, type: 'mage' }
        ]);
        this.debugDisplay.log("4 PNJs créés (2 enemy, 2 mage)");
        
        // Configurer les collisions
        this.setupCollisions();
        
        // Configurer la caméra pour suivre le joueur
        if (this.cameras.main) {
            this.cameras.main.startFollow(this.player);
        }
        
        // Initialiser les contrôles du clavier
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Ajouter touche pour activer/désactiver le debug - méthode améliorée
        this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.testKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
        
        this.debugDisplay.log("Appuyez sur D pour afficher/masquer ce panneau");
        this.debugDisplay.log("Appuyez sur T pour tester le LLM");
        
        // Ajouter la touche R pour forcer tous les PNJs à se déplacer immédiatement dans des directions aléatoires
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
            console.log("--- TOUCHE R PRESSÉE ---");
            this.addLogToOverlay("Touche R détectée");
            this.forceAllNPCsToMove();
        });
        
        // Ajouter le texte d'aide pour cette fonctionnalité
        const helpText = this.add.text(10, this.sys.game.canvas.height - 30, 
            'D: Afficher/masquer le debug | T: Tester LLM | R: Forcer mouvement PNJs', 
            { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', backgroundColor: '#000000' });
        helpText.setScrollFactor(0);
        
        // Test immédiat du LLM
        this.time.delayedCall(1000, this.testLLMConnection, [], this);
        
        // Log direct dans le DOM
        this.addLogToOverlay("GameScene.create() exécuté");
    }
    
    // Méthode pour créer une overlay de debug directement dans le DOM
    private debugOverlay: HTMLDivElement | null = null;
    private debugLogContainer: HTMLDivElement | null = null;
    
    private addDebugOverlay() {
        // Vérifier si l'élément existe déjà
        if (document.getElementById('debug-overlay')) {
            this.debugOverlay = document.getElementById('debug-overlay') as HTMLDivElement;
            this.debugLogContainer = document.getElementById('debug-logs') as HTMLDivElement;
            this.addLogToOverlay("Debug overlay existante");
            return;
        }
        
        // Créer l'overlay
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.id = 'debug-overlay';
        this.debugOverlay.style.position = 'fixed';
        this.debugOverlay.style.top = '0';
        this.debugOverlay.style.right = '0';
        this.debugOverlay.style.width = '400px';
        this.debugOverlay.style.height = '300px';
        this.debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.debugOverlay.style.color = '#fff';
        this.debugOverlay.style.padding = '10px';
        this.debugOverlay.style.zIndex = '9999';
        this.debugOverlay.style.overflow = 'auto';
        
        // Titre
        const title = document.createElement('h3');
        title.textContent = 'Logs de Debug Direct';
        title.style.color = '#ff0';
        this.debugOverlay.appendChild(title);
        
        // Conteneur de logs
        this.debugLogContainer = document.createElement('div');
        this.debugLogContainer.id = 'debug-logs';
        this.debugLogContainer.style.fontFamily = 'monospace';
        this.debugLogContainer.style.fontSize = '12px';
        this.debugLogContainer.style.whiteSpace = 'pre-wrap';
        this.debugOverlay.appendChild(this.debugLogContainer);
        
        // Bouton de test LLM
        const testButton = document.createElement('button');
        testButton.textContent = 'Test LLM';
        testButton.style.padding = '8px';
        testButton.style.margin = '10px 0';
        testButton.style.backgroundColor = '#007bff';
        testButton.style.border = 'none';
        testButton.style.color = 'white';
        testButton.style.cursor = 'pointer';
        testButton.onclick = () => {
            this.testLLMConnection();
            this.addLogToOverlay("Test LLM lancé via bouton");
        };
        this.debugOverlay.appendChild(testButton);
        
        document.body.appendChild(this.debugOverlay);
        this.addLogToOverlay("Debug overlay créée");
    }
    
    public addLogToOverlay(message: string) {
        if (!this.debugLogContainer) return;
        
        const logLine = document.createElement('div');
        logLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.debugLogContainer.appendChild(logLine);
        
        // Auto-scroll
        this.debugLogContainer.scrollTop = this.debugLogContainer.scrollHeight;
    }
    
    update(time: number, delta: number) {
        if (this.player && this.npcManager) {
            this.updatePlayerMovement();
            this.player.update(time, delta);
            
            this.npcManager.update(time, delta);
            
            this.checkDebugKeys();
        }
    }
    
    private checkDebugKeys() {
        if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
            this.debugDisplay.toggleVisibility();
            console.log("Debug display toggled");
            this.addLogToOverlay("Toggle affichage debug (touche D)");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.testKey)) {
            this.testLLMConnection();
            this.addLogToOverlay("Test LLM lancé (touche T)");
        }
    }
    
    // Mise à jour de testLLMConnection pour ajouter des logs directs
    private async testLLMConnection() {
        console.log("Test de connexion au LLM...");
        this.debugDisplay.log("Test LLM en cours...");
        this.addLogToOverlay("Test LLM démarré");
        
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
        
        try {
            this.addLogToOverlay("Appel à testLLMService.getNPCAction...");
            // Appel direct au LLM
            const action = await this.testLLMService.getNPCAction(testContext);
            console.log("Test LLM réussi, action:", action);
            this.debugDisplay.log(`Test LLM OK: ${action}`);
            this.addLogToOverlay(`Test LLM réussi! Action: ${action}`);
            
            // Afficher une notification visuelle
            const successText = this.add.text(
                this.cameras.main.centerX, 
                this.cameras.main.centerY, 
                `LLM connecté: ${action}`, 
                { fontFamily: 'Arial', fontSize: '24px', color: '#00ff00', backgroundColor: '#000000' }
            );
            successText.setOrigin(0.5);
            successText.setScrollFactor(0);
            
            // Faire disparaître le texte après 3 secondes
            this.time.delayedCall(3000, () => {
                successText.destroy();
            });
            
        } catch (error) {
            console.error("Test LLM échoué:", error);
            this.debugDisplay.log("Test LLM échoué!");
            this.addLogToOverlay(`Test LLM ÉCHOUÉ: ${error}`);
            
            // Afficher une notification d'erreur
            const errorText = this.add.text(
                this.cameras.main.centerX, 
                this.cameras.main.centerY, 
                "LLM erreur!", 
                { fontFamily: 'Arial', fontSize: '24px', color: '#ff0000', backgroundColor: '#000000' }
            );
            errorText.setOrigin(0.5);
            errorText.setScrollFactor(0);
            
            // Faire disparaître le texte après 3 secondes
            this.time.delayedCall(3000, () => {
                errorText.destroy();
            });
        }
    }
    
    private createMap() {
        const mapWidth = 800;
        const mapHeight = 600;
        
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        
        const graphics = this.add.graphics();
        graphics.fillStyle(0x222222);
        graphics.fillRect(0, 0, mapWidth, mapHeight);
        
        this.createObstacles();
    }
    
    private createObstacles() {
        this.obstaclesGroup = this.physics.add.staticGroup();
        
        this.obstaclesGroup.add(this.add.rectangle(400, 300, 100, 100, 0x666666));
        
        this.obstaclesGroup.add(this.add.rectangle(200, 200, 50, 50, 0x666666));
        this.obstaclesGroup.add(this.add.rectangle(600, 400, 50, 50, 0x666666));
        this.obstaclesGroup.add(this.add.rectangle(100, 500, 100, 50, 0x666666));
        this.obstaclesGroup.add(this.add.rectangle(700, 100, 50, 100, 0x666666));
        
        this.obstaclesGroup.getChildren().forEach((obstacle) => {
            const rect = obstacle as Phaser.GameObjects.Rectangle;
            if (rect.body) {
                const staticBody = rect.body as Phaser.Physics.Arcade.StaticBody;
                staticBody.setSize(rect.width, rect.height);
                staticBody.updateFromGameObject();
            }
        });
    }
    
    private setupCollisions() {
        this.physics.add.collider(this.player.getBody(), this.obstaclesGroup);
        
        const npcBodies = this.npcManager.getNPCBodies();
        this.physics.add.collider(npcBodies, this.obstaclesGroup);
        
        this.physics.add.collider(this.player.getBody(), npcBodies);
        
        this.physics.add.collider(npcBodies, npcBodies);
    }
    
    private updatePlayerMovement() {
        if (this.cursors.left.isDown) {
            this.player.doMoveLeft();
        } else if (this.cursors.right.isDown) {
            this.player.doMoveRight();
        } else if (this.cursors.up.isDown) {
            this.player.doMoveUp();
        } else if (this.cursors.down.isDown) {
            this.player.doMoveDown();
        } else {
            this.player.stopMoving();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
            this.player.attack();
        }
    }
    
    // Ajouter la méthode pour forcer le mouvement des PNJs
    private forceAllNPCsToMove() {
        console.log("--- APPEL forceAllNPCsToMove --- "); // Log d'entrée
        if (!this.npcManager) {
            console.error("ERREUR : npcManager n'existe pas !");
            this.addLogToOverlay("ERREUR: NPCManager absent");
            return;
        }
        
        const allNPCs = this.npcManager.getAllNPCs();
        console.log(`Trouvé ${allNPCs.length} PNJs à déplacer.`); // Log du nombre de PNJs
        this.addLogToOverlay(`Forçage du mouvement pour ${allNPCs.length} PNJs...`);
        
        // Pour chaque PNJ, on assigne une direction aléatoire
        allNPCs.forEach(npc => {
            const directions = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN"];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            console.log(`PNJ ${npc.id}: Action forcée -> ${randomDir}`); // Log de l'action
            
            // Forcer l'exécution de l'action de mouvement
            if (typeof npc.forceAction === 'function') {
                console.log(`PNJ ${npc.id}: Appel de npc.forceAction...`); // Log avant l'appel
                npc.forceAction(randomDir as NPCAction);
                this.addLogToOverlay(`PNJ ${npc.id} se déplace: ${randomDir}`);
            } else {
                console.error(`ERREUR: Méthode forceAction non disponible pour le PNJ ${npc.id}`);
                this.addLogToOverlay(`ERREUR: forceAction absent pour ${npc.id}`);
            }
        });
        console.log("--- FIN forceAllNPCsToMove --- "); // Log de sortie
    }
} 