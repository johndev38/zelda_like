import Phaser from 'phaser';
import { VectorCharacter, CharacterState } from './VectorCharacter';
import { LLMAgentService, NPCAction, NPCContext } from '../ai/LLMAgentService';
import { GameScene } from '../example/GameScene';

export class NPC {
    public id: string;
    public type: 'enemy' | 'mage';
    public scene: GameScene;
    public vectorChar: VectorCharacter;
    private llmService: LLMAgentService;
    private lastAction: NPCAction | null = null;
    private aiUpdateTimer: number = 0;
    private aiUpdateInterval: number = 5000; // Augmenter à 5 secondes pour limiter les appels et mieux déboguer
    private visionRadius: number = 200;
    private static debugCounter = 0; // Compteur statique pour limiter les logs
    private static totalNPCCount: number = 0;
    private debugMode: boolean = false;
    private currentAction: NPCAction = "IDLE"; // Action en cours d'exécution

    // Vérifier si le NPC est bloqué
    private lastPosition = { x: 0, y: 0 };
    private stuckCheckTimer = 0;
    private stuckThreshold = 500; // Vérifier après 500ms
    private isStuck = false;

    constructor(scene: GameScene, x: number, y: number, type: 'enemy' | 'mage', llmService: LLMAgentService) {
        this.id = Phaser.Utils.String.UUID();
        this.scene = scene;
        this.type = type;
        this.llmService = llmService;

        // Créer la représentation visuelle du PNJ
        this.vectorChar = new VectorCharacter(scene, x, y, type);
        
        // Activer la physique
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.enable(this.vectorChar.getBody());
            this.vectorChar.getBody().setCollideWorldBounds(true);
        }
        
        console.log(`NPC créé: ${this.id}, type: ${this.type}, position: (${x}, ${y})`);
        
        // Compter le nombre de PNJs créés pour faire un test avec un seul PNJ
        NPC.totalNPCCount++;
        
        // Si c'est le premier PNJ créé, activer un intervalle de test court
        if (NPC.totalNPCCount === 1) {
            this.aiUpdateInterval = 3000; // Réduit de 8 à 3 secondes pour le premier PNJ
            this.debugMode = true; // Activer le mode debug pour ce PNJ
            console.log(`⚠️ NPC TEST: ${this.id} va effectuer un appel IA toutes les 3 secondes`);
            // Force un premier appel rapide
            this.aiUpdateTimer = 2000;
        } else {
            // Pour tous les autres PNJs, garde un intervalle plus court
            this.aiUpdateInterval = 6000; // Réduit de 20 à 6 secondes
            this.debugMode = false;
            // Délai aléatoire pour éviter les appels simultanés
            this.aiUpdateTimer = Math.random() * 2000;
        }
    }

    update(time: number, delta: number) {
        // Mettre à jour la représentation visuelle
        this.vectorChar.update(time, delta);

        // Mettre à jour l'IA périodiquement
        this.aiUpdateTimer += delta;
        if (this.aiUpdateTimer >= this.aiUpdateInterval) {
            this.aiUpdateTimer = 0;
            this.runAIUpdate();
        }
        
        // Vérifier si le PNJ est bloqué
        this.stuckCheckTimer += delta;
        if (this.stuckCheckTimer > this.stuckThreshold) {
            this.stuckCheckTimer = 0;
            this.checkIfStuck();
        }
        
        // Continuer à exécuter l'action en cours si le PNJ n'est pas bloqué
        if (!this.isStuck) {
            this.continueCurrentAction();
        } else {
            // Essayer de débloquer le PNJ s'il est coincé
            this.tryToUnstuck();
        }
        
        // Enregistrer la position actuelle pour la prochaine vérification
        this.lastPosition = { x: this.vectorChar.x, y: this.vectorChar.y };
        
        // Mettre à jour la position de la bulle d'action
        if (this.actionBubble) {
            this.actionBubble.setPosition(this.vectorChar.x, this.vectorChar.y - 40);
            
            // Supprimer la bulle après 3 secondes
            this.actionBubbleTimer += delta;
            if (this.actionBubbleTimer >= 3000) {
                this.actionBubble.destroy();
                this.actionBubble = null;
            }
        }
    }

    getBody(): Phaser.GameObjects.GameObject {
        return this.vectorChar.getBody();
    }

    get x(): number {
        return this.vectorChar.x;
    }

    get y(): number {
        return this.vectorChar.y;
    }

    private async runAIUpdate() {
        // Numéro d'exécution unique pour suivre l'appel dans les logs
        const executionId = Math.floor(Math.random() * 10000);
        
        if (this.debugMode) {
            console.log(`[NPC:${executionId}] [${this.id}] Début de mise à jour IA`);
        }
        
        // Utiliser le système de debug visuel
        this.scene.debugDisplay?.log(`NPC ${this.type} demande action...`);
        
        try {
            // Collecte du contexte
            if (this.debugMode) {
                console.log(`[NPC:${executionId}] Rassemblement du contexte...`);
            }
            const context = this.gatherContext();
            
            // Appel à l'IA
            if (this.debugMode) {
                console.log(`[NPC:${executionId}] Appel au service LLM...`);
            }
            const action = await this.llmService.getNPCAction(context);
            
            // Exécution de l'action
            if (this.debugMode) {
                console.log(`[NPC:${executionId}] Action retournée: ${action}`);
            }
            this.executeAction(action as NPCAction);
            this.lastAction = action as NPCAction;
            
            // Afficher l'action dans le debug visuel
            this.scene.debugDisplay?.log(`NPC ${this.type} fait: ${action}`);
            
            // Afficher une bulle au-dessus du PNJ
            this.showActionBubble(action);
            
            if (this.debugMode) {
                console.log(`[NPC:${executionId}] Mise à jour terminée avec succès.`);
            }
        } catch (error) {
            console.error(`[NPC:${executionId}] ERREUR dans runAIUpdate:`, error);
            this.executeAction("IDLE");
            this.lastAction = "IDLE";
            this.scene.debugDisplay?.log(`NPC ${this.type} ERREUR!`);
        }
    }

    private gatherContext(): NPCContext {
        const currentX = this.vectorChar.x;
        const currentY = this.vectorChar.y;

        // Informations sur le joueur - maintenant la propriété player est publique
        let playerContext = null;
        if (this.scene.player) {
            const playerDist = Phaser.Math.Distance.Between(
                currentX, currentY, 
                this.scene.player.x, this.scene.player.y
            );
            
            if (playerDist <= this.visionRadius) {
                playerContext = {
                    x: this.scene.player.x,
                    y: this.scene.player.y,
                    distance: playerDist
                };
            }
        }

        // Informations sur les autres PNJ - propriété npcManager est maintenant publique
        const nearbyNPCsContext: Array<{ id: string; type: string; x: number; y: number; distance: number }> = [];
        if (this.scene.npcManager) {
            const otherNPCs = this.scene.npcManager.getOtherNPCs(this.id) || [];
            for (const npc of otherNPCs) {
                const npcDist = Phaser.Math.Distance.Between(
                    currentX, currentY, 
                    npc.x, npc.y
                );
                
                if (npcDist <= this.visionRadius) {
                    nearbyNPCsContext.push({
                        id: npc.id,
                        type: npc.type,
                        x: npc.x,
                        y: npc.y,
                        distance: npcDist
                    });
                }
            }
        }

        // Informations sur les obstacles - propriété obstaclesGroup est publique
        const visibleObstaclesContext: Array<{ x: number; y: number; width: number; height: number; distance: number }> = [];
        if (this.scene.obstaclesGroup) {
            this.scene.obstaclesGroup.getChildren().forEach((obstacle: Phaser.GameObjects.GameObject) => {
                const body = (obstacle as any).body;
                if (body) {
                    const obstacleCenterX = body.x + body.width / 2;
                    const obstacleCenterY = body.y + body.height / 2;
                    
                    const obsDist = Phaser.Math.Distance.Between(
                        currentX, currentY,
                        obstacleCenterX, obstacleCenterY
                    );
                    
                    if (obsDist <= this.visionRadius * 1.2) {
                        visibleObstaclesContext.push({
                            x: obstacleCenterX,
                            y: obstacleCenterY,
                            width: body.width,
                            height: body.height,
                            distance: obsDist
                        });
                    }
                }
            });
        }

        // Créer le contexte avec les informations recueillies
        const context = {
            id: this.id,
            type: this.type,
            x: currentX,
            y: currentY,
            health: 100,
            nearbyNPCs: nearbyNPCsContext,
            player: playerContext,
            visibleObstacles: visibleObstaclesContext,
            lastAction: this.lastAction,
            // Déterminer si le PNJ peut attaquer en fonction de son type
            canAttack: this.type === 'enemy',
            // Ajouter une référence à la scène pour le debug (ne sera pas envoyée au LLM)
            scene: this.scene
        } as NPCContext;

        return context;
    }

    private executeAction(action: NPCAction) {
        console.log(`--- [NPC ${this.id}] APPEL executeAction(${action}) ---`); // Log d'entrée
        
        // Mettre à jour l'action courante
        this.currentAction = action;
        
        // Arrêter le mouvement précédent
        this.vectorChar.stopMoving();

        // Debug visuel - montrer la direction du mouvement avec une flèche
        this.showDebugIndicator(action);

        switch (action) {
            case "MOVE_LEFT":
            case "MOVE_RIGHT":
            case "MOVE_UP":
            case "MOVE_DOWN":
                console.log(`[NPC ${this.id}] Action de mouvement détectée, appel de executeMovement...`); // Log avant executeMovement
                this.executeMovement(action);
                break;
            case "ATTACK_PLAYER":
                // Attaque non implémentée
                console.log(`[${this.id}] Attaque le joueur`);
                break;
            case "INTERACT_NPC":
                console.log(`[${this.id}] Interagit avec PNJ`);
                break;
            case "PATROL":
                // Simulation de patrouille : mouvement aléatoire
                console.log(`[NPC ${this.id}] Action PATROL, choix d'une direction aléatoire...`); // Log avant patrouille
                const directions = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN"];
                const randomDir = directions[Math.floor(Math.random() * directions.length)];
                this.executeAction(randomDir as NPCAction);
                break;
            case "IDLE":
            default:
                console.log(`[NPC ${this.id}] Action IDLE ou inconnue, arrêt du mouvement.`); // Log pour IDLE
                this.vectorChar.stopMoving();
                break;
        }
    }

    // Méthode pour exécuter les mouvements
    private executeMovement(movement: NPCAction) {
        console.log(`--- [NPC ${this.id}] APPEL executeMovement(${movement}) ---`); // Log d'entrée
        switch (movement) {
            case "MOVE_LEFT":
                console.log(`[NPC ${this.id}] Appel de vectorChar.doMoveLeft...`); // Log avant doMoveLeft
                this.vectorChar.doMoveLeft();
                break;
            case "MOVE_RIGHT":
                console.log(`[NPC ${this.id}] Appel de vectorChar.doMoveRight...`); // Log avant doMoveRight
                this.vectorChar.doMoveRight();
                break;
            case "MOVE_UP":
                console.log(`[NPC ${this.id}] Appel de vectorChar.doMoveUp...`); // Log avant doMoveUp
                this.vectorChar.doMoveUp();
                break;
            case "MOVE_DOWN":
                console.log(`[NPC ${this.id}] Appel de vectorChar.doMoveDown...`); // Log avant doMoveDown
                this.vectorChar.doMoveDown();
                break;
            default:
                // Ne rien faire pour les autres actions
                console.warn(`[NPC ${this.id}] executeMovement appelé avec une action non-mouvement: ${movement}`);
                break;
        }
    }

    destroy() {
        if (this.vectorChar) {
            this.vectorChar.destroy();
        }
    }

    // Afficher une bulle avec l'action au-dessus du PNJ
    private actionBubble: Phaser.GameObjects.Text | null = null;
    private actionBubbleTimer: number = 0;
    
    private showActionBubble(action: string) {
        // Supprimer l'ancienne bulle si elle existe
        if (this.actionBubble) {
            this.actionBubble.destroy();
            this.actionBubble = null;
        }
        
        // Créer une nouvelle bulle plus visible
        const actionText = this.formatActionText(action);
        this.actionBubble = this.scene.add.text(
            this.vectorChar.x, 
            this.vectorChar.y - 40, 
            actionText,
            { 
                fontFamily: 'Arial', 
                fontSize: '14px', 
                color: '#ffffff',
                backgroundColor: '#333333',
                padding: { x: 6, y: 3 },
                align: 'center',
                shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 4 }
            }
        );
        this.actionBubble.setOrigin(0.5, 1);
        
        // Animation pour attirer l'attention
        this.scene.tweens.add({
            targets: this.actionBubble,
            y: this.vectorChar.y - 45,
            yoyo: true,
            duration: 300,
            repeat: 1
        });
        
        // Réinitialiser le timer
        this.actionBubbleTimer = 0;
    }
    
    private formatActionText(action: string): string {
        // Rendre l'action plus lisible et plus claire
        switch(action) {
            case "MOVE_LEFT": return "◄ GAUCHE";
            case "MOVE_RIGHT": return "DROITE ►";
            case "MOVE_UP": return "▲ HAUT";
            case "MOVE_DOWN": return "▼ BAS";
            case "ATTACK_PLAYER": return "⚔️ ATTAQUE";
            case "INTERACT_NPC": return "🗣️ INTERACTION";
            case "PATROL": return "🔄 PATROUILLE";
            case "IDLE": return "💤 REPOS";
            default: return action;
        }
    }

    // Indicateur visuel de debug pour montrer la direction de mouvement
    private debugArrow: Phaser.GameObjects.Graphics | null = null;
    
    private showDebugIndicator(action: NPCAction) {
        // Supprimer l'indicateur précédent s'il existe
        if (this.debugArrow) {
            this.debugArrow.destroy();
            this.debugArrow = null;
        }
        
        // Créer un nouvel indicateur seulement pour les actions de mouvement
        if (action.startsWith("MOVE_")) {
            this.debugArrow = this.scene.add.graphics();
            
            // Définir la position de l'indicateur
            const offsetX = this.vectorChar.x;
            const offsetY = this.vectorChar.y;
            
            // Configurer le style et dessiner la flèche
            this.debugArrow.clear();
            this.debugArrow.lineStyle(2, 0xff0000, 1);
            this.debugArrow.fillStyle(0xff0000, 0.5);
            
            // Dessiner une flèche dans la direction du mouvement
            if (action === "MOVE_LEFT") {
                this.debugArrow.fillTriangle(
                    offsetX - 30, offsetY,
                    offsetX - 15, offsetY - 8,
                    offsetX - 15, offsetY + 8
                );
                this.debugArrow.lineBetween(offsetX - 15, offsetY, offsetX, offsetY);
            } else if (action === "MOVE_RIGHT") {
                this.debugArrow.fillTriangle(
                    offsetX + 30, offsetY,
                    offsetX + 15, offsetY - 8,
                    offsetX + 15, offsetY + 8
                );
                this.debugArrow.lineBetween(offsetX + 15, offsetY, offsetX, offsetY);
            } else if (action === "MOVE_UP") {
                this.debugArrow.fillTriangle(
                    offsetX, offsetY - 30,
                    offsetX - 8, offsetY - 15,
                    offsetX + 8, offsetY - 15
                );
                this.debugArrow.lineBetween(offsetX, offsetY - 15, offsetX, offsetY);
            } else if (action === "MOVE_DOWN") {
                this.debugArrow.fillTriangle(
                    offsetX, offsetY + 30,
                    offsetX - 8, offsetY + 15,
                    offsetX + 8, offsetY + 15
                );
                this.debugArrow.lineBetween(offsetX, offsetY + 15, offsetX, offsetY);
            }
            
            // Faire disparaître l'indicateur après un certain temps
            this.scene.time.delayedCall(2000, () => {
                if (this.debugArrow) {
                    this.debugArrow.destroy();
                    this.debugArrow = null;
                }
            });
        }
    }

    // Nouvelle méthode pour maintenir l'action en cours
    private continueCurrentAction() {
        // Vérifier si le personnage est arrêté mais devrait se déplacer
        if (this.currentAction.startsWith("MOVE_") && this.vectorChar.characterState !== CharacterState.WALKING) {
            console.log(`[${this.id}] Reprise du mouvement: ${this.currentAction}`);
            this.executeMovement(this.currentAction);
        }
    }

    // Vérifier si le PNJ est bloqué (n'a pas bougé malgré une action de mouvement)
    private checkIfStuck() {
        if (this.currentAction.startsWith("MOVE_")) {
            const distance = Phaser.Math.Distance.Between(
                this.lastPosition.x, this.lastPosition.y,
                this.vectorChar.x, this.vectorChar.y
            );
            
            // Si la distance est très faible, le PNJ est probablement bloqué
            if (distance < 2) {
                if (!this.isStuck) {
                    console.log(`[${this.id}] PNJ bloqué ! Tentative de déblocage...`);
                    this.isStuck = true;
                    
                    // Afficher une indication visuelle de blocage
                    this.showBlockedIndicator();
                }
            } else {
                this.isStuck = false;
            }
        } else {
            // Pas en mouvement, donc pas bloqué
            this.isStuck = false;
        }
    }
    
    // Essayer de débloquer le PNJ en changeant sa direction
    private tryToUnstuck() {
        // Options pour une nouvelle direction aléatoire
        const directions = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN"];
        
        // Filtrer la direction actuelle
        const filteredDirections = directions.filter(dir => dir !== this.currentAction);
        
        // Choisir une nouvelle direction aléatoire
        const newDirection = filteredDirections[Math.floor(Math.random() * filteredDirections.length)] as NPCAction;
        
        console.log(`[${this.id}] Tentative de déblocage avec direction: ${newDirection}`);
        
        // Mettre à jour l'action courante et essayer de se déplacer
        this.currentAction = newDirection;
        this.executeMovement(newDirection);
        
        // Afficher un indicateur de déblocage
        this.showUnstuckIndicator(newDirection);
        
        // Réinitialiser l'état de blocage pour vérifier à nouveau
        this.isStuck = false;
    }
    
    // Afficher un indicateur visuel de blocage
    private showBlockedIndicator() {
        // Crée un effet visuel pour montrer que le PNJ est bloqué
        const blockedGraphics = this.scene.add.graphics();
        blockedGraphics.lineStyle(2, 0xff0000, 1);
        blockedGraphics.strokeCircle(this.vectorChar.x, this.vectorChar.y, 15);
        
        // Ajouter une croix rouge
        blockedGraphics.lineBetween(
            this.vectorChar.x - 10, this.vectorChar.y - 10,
            this.vectorChar.x + 10, this.vectorChar.y + 10
        );
        blockedGraphics.lineBetween(
            this.vectorChar.x - 10, this.vectorChar.y + 10,
            this.vectorChar.x + 10, this.vectorChar.y - 10
        );
        
        // Faire disparaître l'indicateur après un certain temps
        this.scene.time.delayedCall(1000, () => {
            blockedGraphics.destroy();
        });
    }
    
    // Afficher un indicateur visuel de la tentative de déblocage
    private showUnstuckIndicator(newDirection: NPCAction) {
        // Crée un effet visuel pour montrer la nouvelle direction
        const unstuckGraphics = this.scene.add.graphics();
        unstuckGraphics.lineStyle(2, 0x00ff00, 1);
        unstuckGraphics.strokeCircle(this.vectorChar.x, this.vectorChar.y, 20);
        
        // Ajouter une flèche dans la nouvelle direction
        const arrowLength = 25;
        let startX = this.vectorChar.x;
        let startY = this.vectorChar.y;
        let endX = startX;
        let endY = startY;
        
        switch (newDirection) {
            case "MOVE_LEFT":
                endX -= arrowLength;
                break;
            case "MOVE_RIGHT":
                endX += arrowLength;
                break;
            case "MOVE_UP":
                endY -= arrowLength;
                break;
            case "MOVE_DOWN":
                endY += arrowLength;
                break;
        }
        
        unstuckGraphics.lineBetween(startX, startY, endX, endY);
        
        // Faire disparaître l'indicateur après un certain temps
        this.scene.time.delayedCall(1000, () => {
            unstuckGraphics.destroy();
        });
    }

    // Méthode publique pour forcer une action immédiate
    public forceAction(action: NPCAction): void {
        console.log(`--- [NPC ${this.id}] APPEL forceAction(${action}) ---`); // Log d'entrée
        
        // Mettre à jour l'action courante
        this.currentAction = action;
        
        // Exécuter l'action immédiatement
        console.log(`[NPC ${this.id}] Appel de executeAction depuis forceAction...`); // Log avant executeAction
        this.executeAction(action);
        this.lastAction = action;
        
        // Afficher une bulle pour l'action forcée avec une indication spéciale
        this.showActionBubble("⚡" + action);
        
        // Réinitialiser l'état de blocage
        this.isStuck = false;
        console.log(`--- [NPC ${this.id}] FIN forceAction ---`); // Log de sortie
    }
} 