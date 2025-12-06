# 🎮 GETTING STARTED - RAGEQUIT 2

**What This Guide Does:** Shows you exactly how to run the game, what to expect, and where to find detailed documentation.

**Time to First Game:** 2 minutes

---

## 📦 INSTALLATION & STARTUP

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 3: Open Browser
Navigate to: **http://localhost:5173/**

---

## 🎯 YOUR FIRST 2 MINUTES

### Login
- Click "START GAME"
- Enter username (anything is fine)
- Click "PLAY"

### Select Arena
Choose one:
- **TRAINING** ← Start here (easy, solo, good practice)
- **MONSTERS SLAYER** ← Medium (survival waves)
- **TEAM CARNAGE** ← Hardest (PvP, needs balance testing)

### Get Playing
1. Use **W/A/S/D** to move
2. Use **mouse** to look around
3. Press **1** to cast Magic Bolt
4. Watch enemy fly backward (that's the knockback!)
5. Press **Space** to jump
6. Land hard and bounce (that's rimbalzi!)

### What You're Testing
✅ Movement feels smooth  
✅ Spells cast instantly  
✅ Knockback is strong  
✅ Resources drain  
✅ Enemies respond  

---

## 🎮 KEYBOARD CONTROLS

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move forward/left/back/right |
| **Space** | Jump |
| **Shift** | Sprint (faster movement) |
| **Mouse** | Look around |
| **LMB** (click) | Cast spell (repeats last) |
| **RMB** (hold) | Block (experimental) |

### Spells
| Key | Spell | Cost | Effect |
|-----|-------|------|--------|
| **Q** | Heavy Strike | 15 stamina | Melee blast |
| **1** | Magic Bolt | 6 mana | Instant projectile |
| **E** | Shockwave | 18 mana | AoE around you |
| **F** | Fireball | 22 mana | Arc projectile |
| **X** | Stone Spikes | 20 stamina | Ground spikes |
| **R** | Heal Self | 15 hp cost | Recover health |

### Other
| Key | Action |
|-----|--------|
| **Tab** | View scoreboard |
| **Esc** | Open menu |

---

## 🎪 WHAT TO EXPECT

### ✅ WORKING GREAT
- Smooth movement and camera control
- Spells cast instantly and correctly
- Knockback is strong (intentional!)
- Enemies spawn and move toward you
- HP/Mana bars update in real-time
- Audio plays for each spell
- You can bounce (rimbalzi) when landing hard

### ⚠️ PARTIALLY WORKING
- Difficulty scaling works but untested at full scale
- Some resource converters exist but need testing

### ❌ NOT WORKING (MULTIPLAYER)
- Other players' attacks don't show on your screen
- Damage doesn't sync between players
- Animations don't sync
- This is next on the refinement list

---

## 📊 GAME MODES AT A GLANCE

### 🧟 MONSTERS SLAYER
**What:** Survive waves of increasingly difficult enemies  
**Arena:** Symmetrical layout with pillars for cover  
**Goal:** Defeat all waves  
**Best For:** Skill testing, practice  
**Difficulty:** ⭐⭐⭐

### 🏆 TRAINING
**What:** Solo practice with one dummy enemy  
**Arena:** Platforms at different heights (easy to hard)  
**Goal:** Master movement and spell combos  
**Best For:** Learning controls  
**Difficulty:** ⭐

### ⚔️ TEAM CARNAGE
**What:** Team PvP (4 teams of 4)  
**Arena:** 4 corners with central healing objective  
**Goal:** Control the Healing Totem and eliminate enemies  
**Best For:** Competitive testing  
**Difficulty:** ⭐⭐⭐⭐

---

## 🎯 QUICK TEST CHECKLIST

After launching, verify these work:

- [ ] Can move with WASD
- [ ] Can look around with mouse
- [ ] Can cast Magic Bolt (press 1)
- [ ] Enemy gets knocked backward (knockback working)
- [ ] HP bar shows taking damage
- [ ] Mana bar shows using resources
- [ ] Stamina bar shows depleting
- [ ] Can jump and bounce on landing
- [ ] Can cast multiple spells
- [ ] Spells have cooldowns
- [ ] Audio plays for each spell

If all checked: ✅ **Game is working!**

---

## 🔍 WHAT EACH STAT MEANS

### HP (Health Points)
- Maximum: 100
- Shown: Red bar at top-left
- Regen: Slowly over time
- Lost: When enemies hit you
- Game Over: When it reaches 0

### MANA
- Maximum: 100
- Shown: Blue bar at top-left
- Regen: Medium speed
- Cost: Magic Bolt (6), Shockwave (18), Fireball (22), Begone (30)
- Use For: Ranged spells, AOE effects

### STAMINA
- Maximum: 100
- Shown: Green bar at top-left
- Regen: Fast
- Cost: Heavy Strike (15), Whirlwind (20), Sprint (ongoing)
- Use For: Melee attacks, movement speed

---

## 📚 DOCUMENTATION ROADMAP

**Read These in Order:**

1. **README.md** ← Quick start + architecture
2. **QUICK_START_CURRENT_STATE.md** ← Current gameplay snapshot (Dec 4)
3. **COMBAT_BALANCE_DOCUMENTATION.md** ← Spell details and tuning (source: `src/data/SkillData.js`)
4. **DOCUMENTATION_INDEX_CURRENT.md** ← Canonical doc index

**For Specific Questions:**

- **"How does knockback work?"** → Read COMBAT_BALANCE_DOCUMENTATION.md
- **"How do I change spell damage?"** → Edit `src/data/SkillData.js`
- **"How do I add a new spell?"** → Read QUAKE_3_ARENA_IMPLEMENTATION.md
- **"What systems exist?"** → Read README.md (systems overview)
- **"How does networking work?"** → Read docs/Phoenix_Protocol/INTEGRATION_GUIDE.md

---

## ⚠️ KNOWN QUIRKS

### "Why does the enemy fly so far?"
- **Expected behavior** - Knockback is intentionally strong (Quake 3 Arena style)
- You can reduce it by editing `src/data/SkillData.js` and lowering knockback values

### "Why can't I see other players' attacks?"
- **This is incomplete** - Network sync for projectiles not yet implemented
- Solo modes work perfectly - PvP is being refined

### "Why do I bounce when I land?"
- **This is intentional** - Called "rimbalzi" (bounce), part of game feel
- Enables skill-based movement like in Quake 3

### "Why does my resource bar jump around?"
- **This is correct** - Bars update every frame as you cast and take damage
- Shows real-time resource state

---

## 🚀 PERFORMANCE TIPS

### If Game Feels Slow
1. Close other browser tabs
2. Lower graphics settings (if available in settings)
3. Check browser console (F12) for errors
4. Try Chrome/Edge instead of Firefox

### If Game Feels Choppy
- You're getting <60 FPS
- Try closing background apps
- Update graphics drivers
- This is normal in development mode

### Optimal Performance
- Use **Chrome** or **Edge**
- Close other browser tabs
- Hardware acceleration enabled
- 60 FPS target = 16ms per frame

---

## 🐛 REPORTING ISSUES

If you find a bug:

1. **Note what happened** - Exactly what went wrong
2. **Note the spell** - Which spell were you using?
3. **Note the mode** - Which game mode?
4. **Check console** - Press F12, look for red errors

**Common Issues & Fixes:**

| Problem | Solution |
|---------|----------|
| Spell doesn't cast | Try clicking mouse instead of hotkey |
| Game freezes | Browser cache issue, refresh page |
| No sound | Check browser volume + speaker volume |
| Can't move | Check caps lock (W and A work, 1 doesn't if caps on) |
| Enemies don't move | Refresh page |

---

## 🎮 SESSION CHECKLIST

### Before Testing
- [ ] Ran `npm install`
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:5173/
- [ ] Read this guide

### During Testing
- [ ] Try all 3 game modes
- [ ] Try all spells (Q, 1, E, F, X, R)
- [ ] Check each resource bar updates
- [ ] Listen for sound effects
- [ ] Test movement and jumping
- [ ] Note any bugs

### After Testing
- [ ] Note what works well
- [ ] Note what needs tuning
- [ ] Read detailed documentation
- [ ] Report issues in Discord/GitHub

---

## ✨ YOU'RE READY!

1. ✅ Open terminal
2. ✅ Run `npm run dev`
3. ✅ Open browser to http://localhost:5173/
4. ✅ Click START GAME
5. ✅ Choose TRAINING mode
6. ✅ Press 1 and start casting!

---

## 💬 QUICK FAQ

**Q: Can I play with friends?**  
A: Movement syncs but combat doesn't yet. Working on it next.

**Q: Can I change spell damage?**  
A: Yes! Edit `src/data/SkillData.js` (detailed guide in COMBAT_BALANCE_DOCUMENTATION.md)

**Q: Is the knockback too strong?**  
A: Maybe - this is what we're testing. Let me know!

**Q: How do I add a new spell?**  
A: Add it to SkillData.js, then bind a key in CastingSystem.js

**Q: Where's the multiplayer?**  
A: Movement works, combat sync coming next.

---

**Happy testing! 🎮**

For detailed combat mechanics, read: **CURRENT_STATUS_AUDIT_DECEMBER_3_2025.md**
