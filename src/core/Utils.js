/**
 * Utils.js
 * Helper functions for math, RNG, and constants.
 */

export const Utils = {
    /**
     * Generate a random number between min and max.
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Clamp a value between min and max.
     * @param {number} value 
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Get a random element from an array.
     * @param {Array} array 
     * @returns {any}
     */
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
};

export const Easing = {
    // t: current time, b: start value, c: change in value, d: duration
    // But for 0-1 progress:
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    // Back Out (Overshoot)
    easeOutBack: (x) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },

    // Elastic Out (Wobble)
    easeOutElastic: (x) => {
        const c4 = (2 * Math.PI) / 3;
        return x === 0
            ? 0
            : x === 1
                ? 1
                : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
};

export const CONSTANTS = {
    // Physics
    GRAVITY: -25,               // Natural gravity (was -60, too strong)
    PLAYER_SPEED: 15,           // Movement speed (keep)
    PLAYER_JUMP_FORCE: 15,      // Jump force (was 30, incoherent with gravity)
    PLAYER_RADIUS: 0.5,         // Collision radius
    PLAYER_HEIGHT: 2.0,         // Full player height (capsule)
    PLAYER_EYE_HEIGHT: 1.8,     // Eye level from feet
    GROUND_LEVEL: 0,            // Ground is at y=0
    
    // Character Stats
    MAX_HP: 100,
    MAX_MANA: 100,
    MAX_STAMINA: 100,
    
    // Animation & Timing
    FLOAT_DAMAGE_LIFETIME: 1.5, // Damage number float duration (seconds)
    SCREEN_SHAKE_DURATION: 0.3, // Default shake duration
    ENEMY_HURT_STUN_TIME: 0.5,  // Stun duration after hit
    
    // Pathfinding & AI
    ENEMY_SEPARATION_RADIUS: 2.0,      // Distance enemies maintain from each other
    ENEMY_OBSTACLE_RADIUS: 4.0,        // Distance to avoid obstacles
    ENEMY_SEPARATION_FORCE: 5.0,       // Separation force multiplier
    ENEMY_OBSTACLE_FORCE: 10.0,        // Obstacle avoidance force
    
    // Input
    MOUSE_SENSITIVITY: 0.002,   // Camera look sensitivity
    
    // Damage & Combat
    PROJECTILE_RADIUS: 1.0,     // Bot collision radius for projectiles
    KNOCKBACK_DAMPING: 0.85,    // Knockback velocity damping per frame
    
    // VFX
    CANVAS_WIDTH: 256,           // Damage number canvas width
    CANVAS_HEIGHT: 128,          // Damage number canvas height
    CANVAS_FONT: 'bold 80px Arial',  // Damage number font
    
    // Screen Shake
    SHAKE_INTENSITY_MULTIPLIER: 1.0,
    SHAKE_OFFSET_SCALE: 1.0
};

