/**
 * SkillData.js
 * Definitions for all skills, spells, and abilities.
 * Tuned to "Phoenix Protocol" Design Bible v7.0.
 * 
 * 🔒 PROTECTED FILE 🔒
 * DO NOT MODIFY THIS FILE FOR TESTING.
 * These values are fixed per the Design Bible.
 * For experiments, use a separate TestSkillData.js.
 */
export const SKILL_DATA = {
    // --- MELEE (SLOT 1) ---
    'heavy_strike': {
        id: 'heavy_strike',
        name: 'Heavy Strike',
        description: 'Powerful slash with knockback. High damage, high stamina cost.',
        type: 'MELEE',
        stance: 'MELEE',
        damage: 45,  // ✅ COMPETITIVE: 35→45 (+29%) for TTK 1.55s
        stamina: 15,
        cooldown: 700,  // ✅ COMPETITIVE: 800→700ms (-12.5%)
        range: 3,
        knockbackForce: 25,  // ✅ REBALANCED: 40→25 (40% reduction)
        hitstop: 0.1,  // ✅ 100ms freeze on hit (heavy impact)
        icon: 'assets/icons/melee_slash.png',
        vfx: { type: 'melee', color: 0xffffff }
    },
    'whirlwind': {
        id: 'whirlwind',
        name: 'Whirlwind',
        description: 'Spinning attack with massive AoE. Self-launch rocket jump ability!',
        type: 'MELEE',
        stance: 'MELEE',
        damage: 55,  // ✅ COMPETITIVE: 45→55 (+22%) for TTK 2.54s
        stamina: 20,
        cooldown: 1400,  // ✅ COMPETITIVE: 1500→1400ms (-6.7%)
        range: 8,  // ✅ Increased radius
        knockbackForce: 20,  // ✅ REBALANCED: 35→20 (40% reduction)
        verticalPush: 30,  // ✅ REBALANCED: 50→30 (40% reduction)
        hitstop: 0.08,  // ✅ 80ms freeze on hit (AoE impact)
        icon: 'assets/icons/whirlwind.png',
        vfx: { type: 'area_ring', color: 0xffaa00 }
    },
    'sword_swing': { // Basic Attack (Hidden)
        id: 'sword_swing',
        name: 'Basic Slash',
        type: 'MELEE',
        stance: 'MELEE',
        damage: 12,
        stamina: 0,
        cooldown: 600,
        range: 3,
        knockbackForce: 2,
        hidden: true,
        vfx: { type: 'melee', color: 0xcccccc }
    },

    // --- BOW (SLOT 2) ---
    'power_shot': { // Skill
        id: 'power_shot',
        name: 'Power Shot',
        description: 'A high-damage charged arrow. Skill shot with precision reward.',
        type: 'BOW',
        stance: 'BOW',
        damage: 55,  // ✅ COMPETITIVE: 40→55 (+37.5%) for TTK 2.73s
        stamina: 18,
        cooldown: 1500,  // ✅ COMPETITIVE: 1800→1500ms (-16.7%)
        speed: 70,
        knockbackForce: 6,
        hitstop: 0.08,  // ✅ 80ms freeze on hit
        icon: 'assets/icons/bow_shot.png',
        vfx: { type: 'projectile', color: 0xffd700 } // Gold
    },
    'bow_basic': { // Basic Attack (Hidden)
        id: 'bow_basic',
        name: 'Basic Arrow',
        type: 'BOW',
        stance: 'BOW',
        damage: 12,  // ✅ COMPETITIVE: 8→12 (+50%) for DPS 20
        stamina: 0,
        cooldown: 600,  // ✅ COMPETITIVE: 700→600ms (-14.3%)
        speed: 40,
        hidden: true,
        vfx: { type: 'projectile', color: 0x8b4513 }
    },

    // --- MAGIC (SLOTS 3-6) ---
    'magic_bolt': {
        id: 'magic_bolt',
        name: 'Magic Bolt',
        description: 'Fast magic projectile. Quick magical blast.',
        type: 'MAGIC',
        stance: 'MAGIC',
        damage: 12,  // ✅ COMPETITIVE: 8→12 (+50%) for DPS 34.3, TTK 2.92s
        mana: 6,
        cooldown: 350,
        speed: 80,  // ✅ Very fast projectile (not instant)
        knockbackForce: 10,  // ✅ REBALANCED: 15→10 (33% reduction)
        hitstop: 0.03,  // ✅ 30ms freeze on hit (light impact)
        physics: 'LINEAR',  // ✅ Regular projectile, not hitscan
        icon: 'assets/icons/magic_bolt.png',
        vfx: { type: 'projectile', color: 0x00ffff } // Cyan
    },
    'shockwave': {
        id: 'shockwave',
        name: 'Shockwave',
        description: 'Weak blast. Launches everything skyward - self included for rocket jumping!',
        type: 'MAGIC',
        stance: 'MAGIC',
        damage: 8,  // ✅ COMPETITIVE: 5→8 (+60%) utility focus
        splashDamage: 8,  // ✅ COMPETITIVE: 5→8 consistency
        explosionRadius: 15,  // ✅ Keep large radius
        mana: 18,
        cooldown: 700,
        speed: 0,  // Instant explosion
        physics: 'INSTANT',
        verticalVelocity: 0,  // Not used
        verticalPush: 35,  // ✅ REBALANCED: 60→35 (42% reduction, still rocket jumps)
        knockbackForce: 30,  // ✅ REBALANCED: 50→30 (40% reduction)
        knockbackDirection: 'RADIAL',  // ✅ Esplosione radiale
        hitstop: 0.06,  // ✅ 60ms freeze on hit (massive AoE)
        selfCast: true,  // ✅ Affects self too
        icon: 'assets/icons/shockwave.png',
        vfx: { type: 'shockwave', color: 0x1e90ff, scale: 3 }
    },
    'magic_fireball': {
        id: 'magic_fireball',
        name: 'Fireball',
        description: 'Low arc fireball. Explodes on contact with massive knockup.',
        type: 'MAGIC',
        stance: 'MAGIC',
        damage: 50,  // ✅ COMPETITIVE: 35→50 (+43%) for TTK 1.7s
        splashDamage: 15,  // ✅ COMPETITIVE: 10→15 (+50%)
        explosionRadius: 10,  // ✅ Bigger radius
        mana: 22,  // ✅ TUNED: 25→22
        cooldown: 850,  // ✅ COMPETITIVE: 950→850ms (-10.5%)
        speed: 15,  // ✅ SLOW - smooth parabolic arc
        physics: 'PARABOLIC',
        verticalVelocity: 6,  // ✅ Very low arc (almost straight, slight curve)
        verticalPush: 30,  // ✅ REBALANCED: 50→30 (40% reduction)
        knockbackForce: 18,  // ✅ REBALANCED: 30→18 (40% reduction)
        hitstop: 0.08,  // ✅ 80ms freeze on hit (explosion impact)
        bounce: true,  // ✅ NEW: Bounces on ground
        icon: 'assets/icons/fireball.png',
        vfx: { type: 'projectile', color: 0xff4500, explosion: true }
    },
    'stone_spikes': {
        id: 'stone_spikes',
        name: 'Stone Spikes',
        description: 'Spikes burst from the ground. Area control spell with long range.',
        type: 'hitscan_ground',
        stance: 'MAGIC',
        damage: 40,  // ✅ COMPETITIVE: 30→40 (+33%) for DPS 22.2
        mana: 12,
        cooldown: 1800,  // ✅ COMPETITIVE: 2000→1800ms (-10%)
        range: 25,
        knockbackForce: 3,
        icon: 'assets/icons/stone_spikes.png',
        vfx: { type: 'area_ground', color: 0x888888 }
    },

    // --- UTILITY (SLOTS 7-10) ---
    'heal_self': {
        id: 'heal_self',
        name: 'Recover',
        description: 'Restores Health. Tactical healing for sustain.',
        type: 'SELF',
        stance: 'ANY',
        heal: 40,  // ✅ COMPETITIVE: 30→40 (+33%) more impactful
        mana: 15,
        cooldown: 7000,  // ✅ COMPETITIVE: 8000→7000ms (-12.5%)

        icon: 'assets/icons/heal.png',
        vfx: { type: 'heal', color: 0x00ff00 }
    },
    'trans_stm_hp': {
        id: 'trans_stm_hp',
        name: 'Stamina > HP',
        description: 'Channel: Converts Stamina to HP (4 per sec). Tactical resource swap.',
        type: 'CHANNEL',
        stance: 'ANY',
        source: 'stamina',
        target: 'hp',
        rate: 4,
        cooldown: 1000,
        icon: 'assets/icons/trans_stm_hp.png',
        vfx: { type: 'channel', color: 0xff0000 }
    },
    'trans_hp_mana': {
        id: 'trans_hp_mana',
        name: 'HP > Mana',
        description: 'Channel: Converts HP to Mana (3 per sec). Risky trade-off.',
        type: 'CHANNEL',
        stance: 'ANY',
        source: 'hp',
        target: 'mana',
        rate: 3,
        cooldown: 1000,
        icon: 'assets/icons/trans_hp_mana.png',
        vfx: { type: 'channel', color: 0x0000ff }
    },
    'trans_mana_stm': {
        id: 'trans_mana_stm',
        name: 'Mana > Stamina',
        description: 'Channel: Converts Mana to Stamina (4 per sec). Positioning matters.',
        type: 'CHANNEL',
        stance: 'ANY',
        source: 'mana',
        target: 'stamina',
        rate: 4,
        cooldown: 1000,
        icon: 'assets/icons/trans_mana_stm.png',
        vfx: { type: 'channel', color: 0xffff00 }
    },
    
    // ✅ BEGONE - Heavy knockback spell (Ring-out potential!)
    'begone': {
        id: 'begone',
        name: 'Begone',
        description: 'Massive knockback explosion. Ring-out enemies! Weak damage but extreme push.',
        type: 'MAGIC',
        stance: 'MAGIC',
        damage: 15,  // ✅ COMPETITIVE: 10→15 (+50%) utility focus
        splashDamage: 8,  // ✅ COMPETITIVE: 5→8 consistency
        explosionRadius: 50,  // HUGE radius
        mana: 30,  // Expensive
        cooldown: 3000,  // Long cooldown (high impact)
        speed: 0,
        physics: 'INSTANT',
        verticalPush: 50,  // ✅ REBALANCED: 80→50 (37% reduction, still strong ring-out)
        knockbackForce: 90,  // ✅ REBALANCED: 150→90 (40% reduction)
        knockbackDirection: 'RADIAL',
        hitstop: 0.15,  // ✅ 150ms freeze on hit (massive ultimate ability impact)
        selfCast: true,  // Affects self too (but less force)
        icon: 'assets/icons/begone.png',
        vfx: { type: 'shockwave', color: 0xffffff, scale: 4 }  // White massive shockwave
    },
    
    // ✅ IMPALE - Hitscan instant strike (Precision weapon)
    'impale': {
        id: 'impale',
        name: 'Impale',
        description: 'Instant hitscan precision strike. Fast, deadly, no travel time.',
        type: 'MAGIC',
        stance: 'MAGIC',
        damage: 52,  // ✅ COMPETITIVE: 38→52 (+37%) for TTK 1.92s
        mana: 18,  // ✅ TUNED: 20→18
        cooldown: 1000,  // ✅ COMPETITIVE: 1100→1000ms (-9%)
        range: 150,  // Long range hitscan
        physics: 'HITSCAN',  // Instant hit, no projectile
        knockbackForce: 15,  // ✅ REBALANCED: 25→15 (40% reduction)
        hitstop: 0.12,  // ✅ 120ms freeze on hit (instant hit = big freeze)
        speed: 999,  // Instant (not used but for safety)
        icon: 'assets/icons/impale.png',
        vfx: { type: 'hitscan', color: 0xff6600, scale: 1.5 }  // Orange laser hitscan
    }
};

