import Phaser from 'phaser';
import { VectorCharacter, Direction, CharacterState } from '../characters/VectorCharacter';

// Type pour la réponse du modèle d'IA
interface AIResponse {
    action: 'move_up' | 'move_down' | 'move_left' | 'move_right' | 'stop' | 'attack';
    reasoning?: string;
}

export class AIController {
    private character: VectorCharacter;
    private scene: Phaser.Scene;
    private updateInterval: number = 1000; // Intervalle de mise à jour en ms
    private timeSinceLastUpdate: number = 0;
    private aiEndpoint: string = 'http://localhost:1234/v1/chat/completions'; // URL de l'API StudioLLM locale
    
    constructor(scene: Phaser.Scene, character: VectorCharacter, updateInterval: number = 1000) {
        this.scene = scene;
        this.character = character;
        this.updateInterval = updateInterval;
    }
    
    update(time: number, delta: number) {
        // Mettre à jour le timer
        this.timeSinceLastUpdate += delta;
        
        // Vérifier si c'est le moment de demander une action à l'IA
        if (this.timeSinceLastUpdate >= this.updateInterval) {
            this.timeSinceLastUpdate = 0;
            this.getAIDecision();
        }
    }
    
    private async getAIDecision() {
        try {
            // Collecter les informations de l'environnement pour les envoyer à l'IA
            const environmentInfo = this.getEnvironmentInfo();
            
            // Envoyer les informations à l'IA et recevoir une décision
            const aiResponse = await this.queryAI(environmentInfo);
            
            // Exécuter l'action retournée par l'IA
            this.executeAction(aiResponse);
        } catch (error) {
            console.error("Erreur lors de la communication avec l'IA:", error);
            // Comportement de secours en cas d'échec - déplacement aléatoire
            this.executeRandomAction();
        }
    }
    
    private getEnvironmentInfo() {
        // Obtenir des informations sur l'environnement pour le contexte de l'IA
        // Position du personnage, obstacles proches, autres PNJ, joueur, etc.
        
        const characterPosition = {
            x: this.character.x,
            y: this.character.y,
            direction: this.character.getDirection()
        };
        
        // Ici, vous pourriez ajouter plus d'informations comme:
        // - Distance jusqu'au joueur
        // - Obstacles sur la carte
        // - Objectifs du PNJ
        // - État actuel du jeu
        
        return {
            position: characterPosition,
            characterType: this.character.getCharacterType(),
            gameTime: this.scene.time.now,
            // Autres informations contextuelle utiles à l'IA
        };
    }
    
    private async queryAI(environmentInfo: any): Promise<AIResponse> {
        // Construire le prompt pour l'IA
        const prompt = `
        Tu es un PNJ dans un jeu 2D. Tu dois décider de ta prochaine action.
        Informations:
        - Position: x=${environmentInfo.position.x}, y=${environmentInfo.position.y}
        - Direction actuelle: ${environmentInfo.position.direction}
        - Type de personnage: ${environmentInfo.characterType}
        
        Choisis UNE action parmi:
        - move_up
        - move_down
        - move_left
        - move_right
        - stop
        - attack
        
        Réponds uniquement avec un objet JSON valide comme: {"action": "move_up", "reasoning": "Je me déplace vers le haut pour explorer"}
        `;
        
        // Requête à l'API de StudioLLM locale
        const response = await fetch(this.aiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mistral-7b",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un agent d'IA qui contrôle un PNJ dans un jeu. Réponds uniquement avec un JSON contenant une action et une explication."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            })
        });
        
        const data = await response.json();
        
        // Extraire et analyser la réponse JSON
        try {
            const content = data.choices[0].message.content;
            // Extraire l'objet JSON de la réponse (au cas où il y aurait du texte autour)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Format de réponse invalide");
        } catch (error) {
            console.error("Erreur lors du traitement de la réponse de l'IA:", error);
            // Action par défaut
            return { action: 'stop' };
        }
    }
    
    private executeAction(aiResponse: AIResponse) {
        // Exécuter l'action retournée par l'IA
        switch (aiResponse.action) {
            case 'move_up':
                this.character.doMoveUp();
                break;
            case 'move_down':
                this.character.doMoveDown();
                break;
            case 'move_left':
                this.character.doMoveLeft();
                break;
            case 'move_right':
                this.character.doMoveRight();
                break;
            case 'stop':
                this.character.stopMoving();
                break;
            case 'attack':
                this.character.attack();
                break;
            default:
                this.character.stopMoving();
        }
        
        // Optionnel: Logger le raisonnement de l'IA pour débogage
        if (aiResponse.reasoning) {
            console.log(`IA pour ${this.character.getCharacterType()} a décidé: ${aiResponse.action}. Raison: ${aiResponse.reasoning}`);
        }
    }
    
    private executeRandomAction() {
        // Comportement de secours - mouvement aléatoire
        const actions = ['move_up', 'move_down', 'move_left', 'move_right', 'stop'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        switch (randomAction) {
            case 'move_up':
                this.character.doMoveUp();
                break;
            case 'move_down':
                this.character.doMoveDown();
                break;
            case 'move_left':
                this.character.doMoveLeft();
                break;
            case 'move_right':
                this.character.doMoveRight();
                break;
            default:
                this.character.stopMoving();
        }
    }
} 