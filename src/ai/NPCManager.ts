import Phaser from 'phaser';
import { NPC } from '../characters/NPC';
import { LLMAgentService } from './LLMAgentService';
import { GameScene } from '../example/GameScene';

interface NPCConfig {
    x: number;
    y: number;
    type: 'enemy' | 'mage';
}

export class NPCManager {
    private scene: Phaser.Scene;
    private npcs: NPC[] = [];
    private llmService: LLMAgentService;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.llmService = new LLMAgentService();
        console.log("NPCManager initialisé avec LLMAgentService");
    }
    
    createNPC(config: NPCConfig): NPC {
        // Création d'un NPC avec notre nouvelle classe
        const npc = new NPC(
            this.scene as GameScene,
            config.x,
            config.y,
            config.type,
            this.llmService
        );
        
        // Ajouter le PNJ à notre liste
        this.npcs.push(npc);
        
        return npc;
    }
    
    createMultipleNPCs(configs: NPCConfig[]) {
        configs.forEach(config => this.createNPC(config));
    }
    
    update(time: number, delta: number) {
        // Mettre à jour tous les PNJ
        this.npcs.forEach(npc => {
            npc.update(time, delta);
        });
    }
    
    // Récupérer tous les corps pour la détection de collision
    getNPCBodies(): Phaser.GameObjects.GameObject[] {
        return this.npcs.map(npc => npc.getBody());
    }
    
    // Récupérer un PNJ spécifique par index
    getNPC(index: number): NPC {
        return this.npcs[index];
    }
    
    // Récupérer tous les PNJ
    getAllNPCs(): NPC[] {
        return this.npcs;
    }
    
    // Obtenir tous les PNJ sauf celui qui a l'ID spécifié
    getOtherNPCs(excludeId: string): NPC[] {
        return this.npcs.filter(npc => npc.id !== excludeId);
    }
    
    // Nettoyer quand la scène est détruite
    destroy() {
        this.npcs.forEach(npc => {
            npc.destroy();
        });
        this.npcs = [];
    }
} 