/**
 * Statistiques du joueur
 * Ce fichier centralise toutes les statistiques du personnage pour faciliter l'équilibrage du jeu
 */

export const PlayerStats = {
    // Statistiques de santé
    health: {
        initial: 5,       // Points de vie de départ
        maximum: 5,       // Points de vie maximum
        regenRate: 0      // Régénération de santé (points par seconde, 0 = pas de régénération automatique)
    },

    // Statistiques de mana
    mana: {
        initial: 100,     // Points de mana de départ
        maximum: 100,     // Points de mana maximum
        regenRate: 2,     // Régénération de mana (points par seconde)
    },

    // Statistiques de mouvement
    movement: {
        speed: 100,       // Vitesse de déplacement
    },

    // Statistiques d'attaque
    attack: {
        melee: {
            damage: 1,    // Dégâts de l'attaque au corps à corps
            range: 35,    // Portée de l'attaque au corps à corps
            cooldown: 300 // Temps de récupération en millisecondes
        },
        fireball: {
            damage: 2,            // Dégâts de la boule de feu
            speed: 300,           // Vitesse de la boule de feu
            range: 300,           // Portée maximum
            size: 24,             // Taille visuelle
            manaCost: 1,         // Coût en mana
            cooldown: 500,        // Temps de récupération en millisecondes
            lifespan: 1500,       // Durée de vie de la boule de feu en millisecondes
            knockbackForce: 150   // Force de recul appliquée aux ennemis
        }
    },

    // Expérience et niveaux
    experience: {
        baseXp: 100,      // XP nécessaire pour le niveau 2
        xpPerLevel: 50,   // XP supplémentaire nécessaire par niveau
        initialLevel: 1   // Niveau de départ
    },

    // Statistiques de combat
    combat: {
        invincibilityTime: 1000  // Temps d'invincibilité après avoir subi des dégâts en millisecondes
    },

    // Statistiques d'équipement
    equipment: {
        weaponSlots: 1,   // Nombre d'emplacements d'armes
        armorSlots: 3     // Nombre d'emplacements d'armure (tête, corps, jambes)
    }
};

// Statistiques qui évoluent avec le niveau
export const getStatsByLevel = (level: number) => {
    return {
        health: {
            maximum: PlayerStats.health.maximum + Math.floor(level / 2)
        },
        mana: {
            maximum: PlayerStats.mana.maximum + (level * 10)
        },
        attack: {
            melee: {
                damage: PlayerStats.attack.melee.damage + Math.floor(level / 3)
            },
            fireball: {
                damage: PlayerStats.attack.fireball.damage + Math.floor(level / 2)
            }
        }
    };
}; 