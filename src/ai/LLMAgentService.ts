import { VectorCharacter } from '../characters/VectorCharacter';

// Définition des types pour le contexte et les actions
export type NPCAction = 
    | "MOVE_LEFT" 
    | "MOVE_RIGHT" 
    | "MOVE_UP" 
    | "MOVE_DOWN" 
    | "ATTACK_PLAYER" 
    | "INTERACT_NPC" 
    | "IDLE"
    | "PATROL";

export interface NPCContext {
    id: string;
    type: string;
    x: number;
    y: number;
    health: number;
    nearbyNPCs: { id: string; type: string; x: number; y: number; distance: number }[];
    player: { x: number; y: number; distance: number } | null;
    visibleObstacles: { x: number; y: number; width: number; height: number; distance: number }[];
    lastAction: NPCAction | null;
    canAttack: boolean;
}

export class LLMAgentService {
    private apiUrl = 'http://localhost:1234/v1/chat/completions';
    private apiKey = 'lm-studio'; // Clé API nécessaire
    private debugMode = true; // Activer le mode debug
    private offlineMode = true; // Utiliser le mode hors-ligne avec réponses prédéfinies

    constructor() {
        console.log("======== LLMAgentService créé en MODE HORS-LIGNE ========");
        // Test direct à la création
        setTimeout(() => {
            this.testDirectConnection();
        }, 2000);
    }

    async testDirectConnection() {
        console.log("======== TEST DIRECT DE CONNEXION LLM ========");
        
        const url = 'http://localhost:1234/v1/models';
        
        try {
            // Test direct avec fetch
            console.log(`Appel direct à ${url}...`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                mode: 'cors',
                credentials: 'omit'
            });
            
            console.log(`Réponse reçue avec statut ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log("Données reçues:", data);
                console.log("TEST DIRECT RÉUSSI ✅");
                
                // Créer un élément DOM pour afficher le résultat
                this.createStatusElement("CONNEXION LLM OK ✅", "green");
            } else {
                console.error(`Erreur ${response.status}: ${response.statusText}`);
                console.log("TEST DIRECT ÉCHOUÉ ❌");
                
                // Créer un élément DOM pour afficher l'erreur
                this.createStatusElement(`ERREUR LLM: ${response.status} ❌`, "red");
            }
        } catch (error) {
            console.error("Erreur de test direct:", error);
            console.log("TEST DIRECT ÉCHOUÉ ❌");
            
            // Créer un élément DOM pour afficher l'erreur
            this.createStatusElement(`ERREUR CORS: Vérifiez que le serveur LLM a les bons en-têtes CORS ❌`, "red");
            
            // Essayer une approche alternative pour vérifier si le serveur répond
            this.testWithProbe();
        }
        
        console.log("======== FIN TEST DIRECT ========");
    }
    
    // Méthode alternative pour tester si le serveur est en cours d'exécution
    private async testWithProbe() {
        console.log("Tentative de sonde simple vers le serveur LLM...");
        try {
            // Mode no-cors - ne peut pas lire la réponse mais peut détecter si le serveur répond
            const probeResponse = await fetch('http://localhost:1234/', {
                method: 'GET',
                mode: 'no-cors'
            });
            
            console.log("Le serveur semble répondre mais a besoin de configuration CORS");
            this.createStatusElement("SERVEUR LLM DÉTECTÉ MAIS CONFIGURATION CORS REQUISE", "orange");
        } catch (error) {
            console.error("Le serveur LLM n'est pas accessible:", error);
            this.createStatusElement("SERVEUR LLM NON ACCESSIBLE", "red");
        }
    }
    
    // Affiche un élément de statut à l'écran
    private createStatusElement(message: string, color: string) {
        const existingStatus = document.getElementById('llm-status');
        if (existingStatus) {
            existingStatus.textContent = message;
            existingStatus.style.color = color;
            return;
        }
        
        const statusElement = document.createElement('div');
        statusElement.id = 'llm-status';
        statusElement.textContent = message;
        statusElement.style.position = 'fixed';
        statusElement.style.bottom = '10px';
        statusElement.style.left = '10px';
        statusElement.style.padding = '5px 10px';
        statusElement.style.backgroundColor = 'black';
        statusElement.style.color = color;
        statusElement.style.fontWeight = 'bold';
        statusElement.style.fontFamily = 'Arial, sans-serif';
        statusElement.style.zIndex = '10000';
        statusElement.style.border = `2px solid ${color}`;
        statusElement.style.borderRadius = '5px';
        
        document.body.appendChild(statusElement);
    }

    // Méthode pour obtenir la prochaine action d'un PNJ via l'API LLM
    async getNPCAction(context: NPCContext): Promise<string> {
        console.log(`[LLM 🤖] Requête pour ${context.id} (${context.type})`);
        
        // Si en mode hors-ligne, générer une réponse locale
        if (this.offlineMode) {
            return this.getOfflineResponse(context);
        }
        
        // Log très visible dans la console
        console.log("====================================================");
        console.log(`[LLM 🤖] DÉBUT REQUÊTE POUR ${context.id} (${context.type})`);
        console.log("====================================================");
        
        const prompt = this.buildPrompt(context);
        
        // Essayer de récupérer la scène pour afficher des infos de debug
        const gameScene = this.getGameScene(context);
        
        if (this.debugMode) {
            console.log(`[LLM 🤖] Prompt envoyé: 
----- DÉBUT PROMPT -----
${prompt}
----- FIN PROMPT -----`);
        }

        // Paramètres exacts comme dans le script Python fonctionnel
        const requestBody = {
            model: "TheBloke/Mistral-7B-Instruct-v0.1-GGUF",
            messages: [
                { role: "system", content: this.getSystemPrompt() },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        };

        if (this.debugMode) {
            console.log(`[LLM 🤖] Envoi requête à: ${this.apiUrl}`);
            console.log(`[LLM 🤖] Avec API key: ${this.apiKey}`);
            console.log('[LLM 🤖] Contenu de la requête:', JSON.stringify(requestBody, null, 2));
        }

        try {
            // 1. TEST DE CONNEXION
            console.log(`[LLM 🤖] TEST DE CONNEXION au serveur...`);
            gameScene?.debugDisplay?.log(`Connexion LLM...`);
            
            const testUrl = 'http://localhost:1234/v1/models';
            const testOptions = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                mode: 'cors' as RequestMode,
                credentials: 'omit' as RequestCredentials
            };
            
            console.log(`[LLM 🤖] Requête de test:`, testUrl, testOptions);
            
            let serverAccessible = false;
            
            try {
                const testResponse = await fetch(testUrl, testOptions);
                if (testResponse.ok) {
                    const models = await testResponse.json();
                    console.log(`[LLM 🤖] ✅ Serveur accessible, modèles disponibles:`, models.data ? models.data.map((m: any) => m.id).join(', ') : 'Aucun');
                    gameScene?.debugDisplay?.log(`LLM connecté ✅`);
                    serverAccessible = true;
                } else {
                    console.log(`[LLM 🤖] ⚠️ Serveur accessible mais erreur ${testResponse.status} sur /models`);
                    gameScene?.debugDisplay?.log(`Erreur LLM: ${testResponse.status}`);
                }
            } catch (e) {
                console.error(`[LLM 🤖] ❌ ERREUR lors du test de connexion:`, e);
                gameScene?.debugDisplay?.log(`Erreur connexion LLM`);
                
                // Tentative alternative avec no-cors pour voir si le serveur répond
                try {
                    await fetch('http://localhost:1234/', {
                        method: 'GET',
                        mode: 'no-cors'
                    });
                    console.log(`[LLM 🤖] ⚠️ Le serveur semble répondre mais problème CORS`);
                    gameScene?.debugDisplay?.log(`Problème CORS avec LLM`);
                    
                    // On renvoie une action valide avec un message dans la console
                    console.error(`[LLM 🤖] ⚠️ CORS bloqué - vérifiez la configuration du serveur LLM.`);
                    return "IDLE";
                } catch (probeError) {
                    console.error(`[LLM 🤖] ❌ Le serveur à ${testUrl} n'est pas accessible!`);
                    gameScene?.debugDisplay?.log(`LLM non accessible!`);
                    return "IDLE";
                }
            }
            
            // Si le serveur n'est pas accessible, on retourne une action par défaut
            if (!serverAccessible) {
                return "IDLE";
            }
            
            // 2. ENVOI DE LA REQUÊTE AU LLM
            console.log(`[LLM 🤖] ENVOI de la requête chat/completions...`);
            gameScene?.debugDisplay?.log(`Requête LLM envoyée...`);
            
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                mode: 'cors' as RequestMode,
                credentials: 'omit' as RequestCredentials
            };
            
            console.log(`[LLM 🤖] Options de requête:`, JSON.stringify(requestOptions, null, 2));

            const response = await fetch(this.apiUrl, requestOptions);
            
            console.log(`[LLM 🤖] Statut de réponse reçu: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[LLM 🤖] ❌ ERREUR API LLM (${response.status}):`, errorText);
                gameScene?.debugDisplay?.log(`Erreur API LLM: ${response.status}`);
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error(`[LLM 🤖] Détails de l'erreur:`, errorJson.error || errorJson);
                } catch (e) {
                    // Si ce n'est pas du JSON
                }
                return "IDLE";
            }

            console.log(`[LLM 🤖] ✅ Réponse reçue (status: ${response.status})`);
            gameScene?.debugDisplay?.log(`Réponse LLM reçue ✅`);
            
            // 3. TRAITEMENT DE LA RÉPONSE
            const responseText = await response.text();
            console.log(`[LLM 🤖] Réponse brute:`, responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error(`[LLM 🤖] ❌ Erreur de parsing JSON:`, e);
                console.error(`[LLM 🤖] Contenu non-JSON reçu:`, responseText);
                gameScene?.debugDisplay?.log(`Erreur format réponse`);
                return "IDLE";
            }
            
            if (this.debugMode) {
                console.log('[LLM 🤖] Réponse complète:', JSON.stringify(data, null, 2));
            }
            
            if (data.choices && data.choices.length > 0) {
                const rawResponse = data.choices[0].message?.content?.trim();
                console.log(`[LLM 🤖] Réponse brute LLM: "${rawResponse}"`);
                gameScene?.debugDisplay?.log(`LLM répond: ${rawResponse}`);
                
                // Essayer d'extraire une action valide de la réponse
                const actionText = this.extractActionFromResponse(rawResponse);
                if (actionText) {
                    console.log(`[LLM 🤖] ✅ Action choisie: ${actionText}`);
                    console.log("====================================================");
                    console.log(`[LLM 🤖] FIN REQUÊTE POUR ${context.id}`);
                    console.log("====================================================");
                    return actionText;
                } else {
                    console.warn(`[LLM 🤖] ⚠️ Aucune action valide trouvée: "${rawResponse}"`);
                    gameScene?.debugDisplay?.log(`Réponse invalide!`);
                }
            } else {
                 console.warn("[LLM 🤖] ⚠️ Format de réponse inattendu:", data);
                 gameScene?.debugDisplay?.log(`Format LLM invalide`);
            }

        } catch (error) {
            console.error("[LLM 🤖] ❌ ERREUR CRITIQUE:", error);
            gameScene?.debugDisplay?.log(`Erreur API LLM`);
            
            // Donner plus de détails sur l'erreur
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error("[LLM 🤖] ❌ Problème réseau: vérifiez que le serveur StudioLLM est bien lancé sur le port 1234");
                console.error("[LLM 🤖] ❌ Essayez d'ouvrir http://localhost:1234/v1/models dans votre navigateur pour vérifier");
                gameScene?.debugDisplay?.log(`Erreur réseau LLM`);
            }
            if (error instanceof SyntaxError) {
                console.error("[LLM 🤖] ❌ Erreur de parsing JSON: la réponse n'est pas au bon format");
                gameScene?.debugDisplay?.log(`Erreur format JSON`);
            }
        }

        console.log(`[LLM 🤖] ⚠️ Action par défaut (IDLE) pour ${context.id}`);
        console.log("====================================================");
        console.log(`[LLM 🤖] FIN REQUÊTE POUR ${context.id}`);
        console.log("====================================================");
        return "IDLE";
    }
    
    private getSystemPrompt(): string {
        const possibleActions = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN", "ATTACK_PLAYER", "INTERACT_NPC", "IDLE", "PATROL"].join(", ");
        const prompt = `Tu es l'IA d'un personnage non-joueur (PNJ) dans un jeu vidéo 2D vu de dessus.
Ton objectif est de te comporter de manière crédible en fonction de ton type et de l'environnement.
Décris ta prochaine action en choisissant UNIQUEMENT parmi les options suivantes : ${possibleActions}.
Ne réponds RIEN d'autre que l'action choisie.`;

        if (this.debugMode) {
            console.log(`[LLM] System prompt:
----- DÉBUT SYSTEM PROMPT -----
${prompt}
----- FIN SYSTEM PROMPT -----`);
        }
        return prompt;
    }

    private buildPrompt(context: NPCContext): string {
        let prompt = `Contexte actuel du PNJ (ID: ${context.id}, Type: ${context.type}):
Position: (${context.x.toFixed(0)}, ${context.y.toFixed(0)})
Santé: ${context.health}
Dernière action: ${context.lastAction ?? 'aucune'}
`;

        if (context.player) {
            prompt += `Joueur détecté à (${context.player.x.toFixed(0)}, ${context.player.y.toFixed(0)}), distance: ${context.player.distance.toFixed(1)}\n`;
        } else {
            prompt += "Joueur non visible.\n";
        }

        if (context.nearbyNPCs.length > 0) {
            prompt += "Autres PNJ à proximité:\n";
            context.nearbyNPCs.forEach(npc => {
                prompt += `- ID: ${npc.id}, Type: ${npc.type}, Pos: (${npc.x.toFixed(0)}, ${npc.y.toFixed(0)}), Dist: ${npc.distance.toFixed(1)}\n`;
            });
        } else {
            prompt += "Aucun autre PNJ à proximité.\n";
        }
        
        if (context.visibleObstacles.length > 0) {
            prompt += "Obstacles visibles à proximité:\n";
            context.visibleObstacles.forEach(obs => {
                prompt += `- Pos: (${obs.x.toFixed(0)}, ${obs.y.toFixed(0)}), Taille: ${obs.width}x${obs.height}, Dist: ${obs.distance.toFixed(1)}\n`;
            });
        } else {
            prompt += "Aucun obstacle visible à proximité.\n";
        }

        prompt += "\nQuelle est ta prochaine action ?";
        return prompt;
    }
    
    // Nouvelle méthode pour extraire une action valide de la réponse du modèle
    private extractActionFromResponse(response: string | undefined): NPCAction | null {
        if (!response) return null;
        
        // Liste des actions valides
        const validActions: NPCAction[] = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN", "ATTACK_PLAYER", "INTERACT_NPC", "IDLE", "PATROL"];
        
        // Vérifier d'abord si la réponse est exactement une action valide
        const upperResponse = response.toUpperCase();
        for (const action of validActions) {
            if (upperResponse === action) {
                return action;
            }
        }
        
        // Sinon, chercher une action valide dans la réponse
        for (const action of validActions) {
            if (upperResponse.includes(action)) {
                return action;
            }
        }
        
        // Essayer des correspondances plus floues
        if (upperResponse.includes("LEFT") || upperResponse.includes("GAUCHE")) return "MOVE_LEFT";
        if (upperResponse.includes("RIGHT") || upperResponse.includes("DROITE")) return "MOVE_RIGHT";
        if (upperResponse.includes("UP") || upperResponse.includes("HAUT")) return "MOVE_UP";
        if (upperResponse.includes("DOWN") || upperResponse.includes("BAS")) return "MOVE_DOWN";
        if (upperResponse.includes("ATTACK") || upperResponse.includes("ATTAQUE")) return "ATTACK_PLAYER";
        if (upperResponse.includes("INTERACT") || upperResponse.includes("INTERACT")) return "INTERACT_NPC";
        if (upperResponse.includes("PATROL") || upperResponse.includes("PATROUILLE")) return "PATROL";
        if (upperResponse.includes("IDLE") || upperResponse.includes("RIEN") || upperResponse.includes("ATTENTE")) return "IDLE";
        
        // Aucune correspondance trouvée
        return null;
    }
    
    private isValidAction(action: string | undefined): action is NPCAction {
        if (!action) {
            if (this.debugMode) console.log(`[LLM] Action reçue est undefined ou vide`);
            return false;
        }
        
        const validActions: Set<string> = new Set(["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN", "ATTACK_PLAYER", "INTERACT_NPC", "IDLE", "PATROL"]);
        const isValid = validActions.has(action);
        
        if (this.debugMode && !isValid) {
            console.log(`[LLM] Action "${action}" n'est pas dans la liste des actions valides [${Array.from(validActions).join(', ')}]`);
        }
        
        return isValid;
    }

    // Récupérer la scène pour afficher des messages de debug
    private getGameScene(context: NPCContext): any {
        // On essaie de trouver une référence à la scène dans le contexte
        const scene = (context as any).scene;
        return scene;
    }

    // Génère des réponses sans serveur LLM
    private getOfflineResponse(context: NPCContext): string {
        // Log des paramètres pour aider au débogage
        console.log("Génération réponse hors-ligne pour:", context);
        
        // Réponses différentes selon le type de contexte
        if (context.type === "dialogue_npc") {
            return this.getRandomDialogue(context);
        }
        
        // Pour les actions normales de PNJ
        const actions = ["MOVE_LEFT", "MOVE_RIGHT", "MOVE_UP", "MOVE_DOWN", "IDLE"];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        // Si le PNJ peut attaquer et que le joueur est proche, possibilité d'attaque
        if (context.player && context.player.distance < 100 && context.canAttack) {
            if (Math.random() < 0.3) { // 30% de chance d'attaquer si proche
                return "ATTACK_PLAYER";
            }
        }
        
        // Ajouter un dialogue aléatoire à l'action (50% de chance)
        if (Math.random() < 0.5) {
            const dialog = this.getRandomDialogue(context);
            return `${randomAction}|SAY:${dialog}`;
        }
        
        return randomAction;
    }
    
    // Génère des dialogues aléatoires selon le contexte
    private getRandomDialogue(context: NPCContext): string {
        const name = context.id;
        
        // Dialogues génériques
        const genericDialogues = [
            "Bonjour aventurier! Belle journée, n'est-ce pas?",
            "Sois le bienvenu dans notre village.",
            "As-tu visité la forêt au nord? On dit qu'elle cache des secrets.",
            "Je me demande ce qui se passe dans le royaume ces temps-ci.",
            "J'ai entendu parler d'étranges créatures qui rôdent la nuit.",
            "Tu sembles fatigué de ton voyage. Prends un peu de repos.",
            "Les temps sont durs pour tout le monde, mais nous résistons.",
            "Si tu cherches des provisions, parle au marchand près de la place.",
            "Méfie-toi des bandits sur la route de l'est.",
            "Il paraît que le roi prépare une grande annonce."
        ];
        
        // Dialogues spécifiques selon le personnage
        if (name.includes("Marchand")) {
            const merchantDialogues = [
                "J'ai les meilleures marchandises de toute la région!",
                "Acheter, vendre, échanger - tout est possible ici.",
                "Ces épées viennent directement des forges royales!",
                "Mes potions sont concoctées par les meilleurs alchimistes.",
                "Si tu as des objets rares, je suis toujours intéressé."
            ];
            return merchantDialogues[Math.floor(Math.random() * merchantDialogues.length)];
        }
        
        if (name.includes("Garde")) {
            const guardDialogues = [
                "Circulez, rien à voir ici.",
                "Je garde cet endroit jour et nuit.",
                "Un problème avec les bandits? Je m'en occupe.",
                "Mon épée est prête à défendre le village.",
                "Signale-moi tout comportement suspect."
            ];
            return guardDialogues[Math.floor(Math.random() * guardDialogues.length)];
        }
        
        // Si proche du joueur, dialogues spécifiques
        if (context.player && context.player.distance < 50) {
            const closeDialogues = [
                "Tu es bien près! Je peux t'aider?",
                "Hé, fais attention où tu marches!",
                "Un peu d'espace personnel, s'il te plaît?",
                "Bonjour! Tu cherches quelque chose en particulier?"
            ];
            return closeDialogues[Math.floor(Math.random() * closeDialogues.length)];
        }
        
        // Dialogue générique par défaut
        return genericDialogues[Math.floor(Math.random() * genericDialogues.length)];
    }
} 