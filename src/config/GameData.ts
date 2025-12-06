export const PHYSICS = {
  GRAVITY: 800.0,      // Heavy Quake-like gravity
  JUMP_FORCE: 200.0,
  MOVE_SPEED: 14.0,    // Base movement speed
  FRICTION: 10.0,      // Instant ground stop
  AIR_CONTROL: 0.5,    // Reduced control in air
  SPRINT_MULT: 1.4
};

export const WEAPONS = {
  STAFF: { type: 'RANGED', model: 'staff.glb' },
  SWORD: { type: 'MELEE', model: 'sword.glb' },
  BOW: { type: 'RANGED', model: 'bow.glb' }
};

export const SPELLS = {
  1: { name: 'Missile', cost: 5, damage: 10, speed: 900, gravity: 80, color: '#00ffff' },
  2: { name: 'Begone', cost: 15, damage: 10, knockback: 900, color: '#ffffff' },
  3: { name: 'Fireball', cost: 20, damage: 30, splash: 5, speed: 500, gravity: 600, color: '#ff6600' },
  4: { name: 'Impale', cost: 5, damage: 25, range: 200, hitscan: true, color: '#888888' },
  5: { name: 'Arrow', cost: 5, resource: 'STAMINA', damage: 15, speed: 1000, gravity: 5, color: '#8B4513' },
  6: { name: 'Melee', cost: 5, resource: 'STAMINA', damage: 15, range: 3.2, color: '#ffffff' },
  7: { name: 'Whirlwind', cost: 10, resource: 'STAMINA', damage: 30, radius: 25, color: '#ffffff' },
  8: { name: 'Heal', cost: 10, heal: 20, color: '#00ff00' },
  12: { name: 'Block', mitigation: 0.7, color: '#00aaff' }
};
