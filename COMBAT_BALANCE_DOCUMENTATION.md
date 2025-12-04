# 🎮 RAGEQUIT: COMBAT PHYSICS & BALANCE DOCUMENTATION

**Date:** December 3, 2025  
**Version:** 1.0 - Pre-Launch Calibration  
**Game Type:** First-Person Action MMORPG (Dark Souls + WoW + Monster Hunter style)

---

## 📊 COMBAT SYSTEM OVERVIEW

### Resource Management
The game uses **3 primary resources** for tactical depth:

| Resource | Use Case | Regeneration |
|----------|----------|--------------|
| **HP** | Health pool, must survive | Heal skill only (8s cooldown) |
| **Stamina** | Melee/mobility cost | Natural regen (5/sec idle) |
| **Mana** | Magic/utility cost | Natural regen (3/sec idle) |

### Stance System
Players switch between 3 stances:
1. **MELEE** - High physical damage, stamina-based
2. **BOW** - Medium range, precision-based
3. **MAGIC** - Ranged/AoE, mana-based

---

## ⚔️ SKILL BALANCE FRAMEWORK

### Damage Scaling Per Type

**MELEE ATTACKS** (High risk, high reward at close range)
```
Basic: 8-12 dmg, 0-0 cost, 0.6-0.7s CD
Medium: 25-30 dmg, 15-20 stamina, 0.8-1.5s CD
Heavy: 35+ dmg, 20+ stamina, 1.5+ s CD
```

**BOW ATTACKS** (Medium range, skill-shot based)
```
Basic: 8 dmg, 0 stamina, 0.7s CD
Charged: 40 dmg, 18 stamina, 1.8s CD
```

**MAGIC ATTACKS** (High diversity, mana-dependent)
```
Spam (bolt): 8 dmg, 8 mana, 0.4s CD (anti-spam cooldown)
Medium (shockwave): 12 dmg, 18 mana, 0.6s CD
Heavy (fireball): 35 dmg + 8 splash, 25 mana, 1.0s CD
Control (stone spikes): 30 dmg, 12 mana, 2.0s CD
```

**UTILITY** (Resource conversion + healing)
```
Healing: 30 HP, 15 mana, 8s CD (long cooldown = critical resource)
Channel (trans_*): 3-4 per sec, free (but exposed to damage)
```

### Cooldown Philosophy
- **0.2-0.7s:** Spam prevention (magic bolt, basic attacks)
- **0.8-1.8s:** Primary skills (heavy strike, power shot)
- **2.0-3.0s:** Area control (stone spikes)
- **8-10s:** Ultimate abilities (healing)

---

## 💨 KNOCKBACK SYSTEM

### Knockback Force Scaling
```javascript
knockbackForce: 1-2   // Light attacks (basic attacks)
knockbackForce: 3-5   // Medium attacks (heavy strike, power shot)
knockbackForce: 8-10  // Heavy attacks (whirlwind, shockwave)
knockbackForce: 12+   // Explosions (fireball, etc.)
```

### Knockback Physics
- Applied as instant velocity to enemy
- Decays over time (gravity-like physics)
- Affects positioning & tactics (enemies can be knocked off platforms)
- 0.5s stun on hit (state = HURT)

---

## 🎨 VISUAL EFFECTS SYSTEM

### Effect Types by Skill Category

**Melee Hit Effects:**
- `spawnImpact()` - Flash + glow + particle burst
- Color: White (0xffffff)
- Range: Immediate vicinity

**Area Effects:**
- `spawnAreaEffect(position, color, type)` - Expanding ring or spikes
- Types: `area_ring` (shockwave), `area_ground` (stone spikes)
- Duration: 0.5-1.0s

**Projectile Impacts:**
- Fireball: `spawnFireballExplosion()` - Triple ring + heavy particles
- Power Shot: `spawnImpact()` - Single impact
- Magic Bolt: `spawnImpact()` - Small flash

**Healing:**
- `spawnHealEffect()` - Green glow + upward spiral particles
- Color: Green (0x00ff00)
- Used by: `heal_self` skill

**Channel:**
- `spawnChannelEffect()` - Looping horizontal ring (aura)
- Color: Yellow (0xffff00)
- Used by: Transfer skills (HP↔Mana↔Stamina)
- Loop until `stopChannelEffect()` called

**Damage Feedback:**
- `spawnFloatingText()` - Damage numbers at hit location
- Color: Red (0xff0000) for damage, Green (0x00ff00) for heal
- Floats upward + fades over 1 second

---

## 🎯 TUNING GUIDE FOR FUTURE BALANCE CHANGES

### If Melee is Too Strong
```javascript
// Increase cooldowns OR reduce damage
heavy_strike: { cooldown: 800 → 1000, damage: 28 → 25 }
whirlwind: { cooldown: 1500 → 2000, damage: 35 → 30 }
// OR increase stamina cost
heavy_strike: { stamina: 15 → 20 }
```

### If Magic is Spammy
```javascript
// Increase mana cost OR cooldown
magic_bolt: { mana: 8 → 12, cooldown: 400 → 600 }
magic_fireball: { mana: 25 → 30 }
```

### If Healing is Too Powerful
```javascript
heal_self: { heal: 30 → 20, cooldown: 8000 → 10000 }
```

### If Knockback is Too Extreme
```javascript
// Reduce force values
shockwave: { knockbackForce: 10 → 7 }
fireball: { knockbackForce: 12 → 9 }
```

### If Difficulty Scaling is Wrong
```javascript
// In EnemyManager: adjust per-wave difficulty
difficulty = 1.0 + (wave * 0.15); // was 0.1 (+10% per wave)
```

---

## 📈 RECOMMENDED TEST SCENARIOS

### Scenario 1: Melee Flow
1. Player attacks with sword_swing repeatedly
2. Switch to Heavy Strike
3. Use Whirlwind on group
4. **Expected:** Smooth resource drain, tactical pauses for regen

### Scenario 2: Magic Spam Prevention
1. Spam magic_bolt 5 times
2. Check that cooldown prevents true spam
3. Cast fireball (should feel "heavy" vs bolt)
4. **Expected:** Magic_bolt feels fast but not infinite, fireball is rare

### Scenario 3: Knockback Positioning
1. Shockwave enemies toward edge/wall
2. Fireball should launch them vertically
3. Heavy melee should push slightly
4. **Expected:** Combat positioning matters, knockback shapes fights

### Scenario 4: Healing Scarcity
1. Take damage
2. Use heal_self (15 mana, 30 HP restored)
3. Wait 8 seconds for next heal
4. **Expected:** Healing feels precious, not spammable

---

## 🔄 LIVE BALANCE ITERATION

All values in `src/data/SkillData.js` can be changed without code recompilation (hot reload in dev):

```bash
# Edit SkillData.js
# Save file
# Browser will auto-reload changes
```

Use this for rapid testing of balance changes before committing.

---

## 📝 DESIGN BIBLE REFERENCE

**Game Philosophy:** "Dark Souls meets WoW Action Combat"
- Positioning matters (ranged advantage, melee commitment)
- Resource management (stamina/mana as strategic layer)
- Knockback = tactical depth (not just damage)
- Healing = precious resource (not spammable)

---

**Last Updated:** 2025-12-03  
**Next Review:** Post-launch (v1.1)
