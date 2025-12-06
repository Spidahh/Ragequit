# ⚡ QUICK TESTING REFERENCE CARD

## What Changed?

**Multiplayer Combat Sync** → You now see other players' spells  
**Balance Rebalancing** → Knockback 40% weaker on all spells  
**Visual Polish** → Blood splatter + camera shake effects  

---

## Quick Test Checklist

### 🎯 Must Test (Blocking)
- [ ] Player A casts Magic Bolt → Player B sees it
- [ ] Player A casts Heavy Strike → Less knockback than before
- [ ] Player A takes damage → Red blood particles appear
- [ ] Player A gets hit hard → Camera tilts

### ✅ Should Test (High Priority)
- [ ] Player A casts Impale → Instant, no travel time
- [ ] 2 players fight 2 minutes → Both agree on HP
- [ ] Team colors work → Red vs Blue visually distinct
- [ ] Animations replicate → See other player swing/cast

### 🎮 Nice to Have (Polish)
- [ ] Spectator mode works with 2+ players
- [ ] Killfeed shows correct kills
- [ ] No lag with 3+ players

---

## How to Test Multiplayer

**Local Testing (2 browser windows):**
```
1. Open localhost:5173 in Browser 1 (Player A)
2. Open localhost:5173 in Browser 2 (Player B)
3. Both create accounts (different names)
4. Create same match lobby
5. Both join match
6. Test spells in console
```

**Network Testing (2 computers):**
```
1. Get server IP (localhost = 127.0.0.1)
2. Player A: http://localhost:5173
3. Player B: http://[Server-IP]:5173
4. Both join same match
5. Test multiplayer features
```

---

## Console Debug Commands

Copy-paste in browser console during gameplay:

```javascript
// See all network events
window.game.networkManager.socket.onAny((e, d) => console.log(`[${e}]`, d));

// See all damage events
eventBus.on('damage:applied', d => console.log('DAMAGE:', d));

// Check player HP
console.log('My HP:', window.game.player.hp);
console.log('My Team:', window.game.player.team);

// Check projectiles
console.log('Active Projectiles:', window.game.skillManager.projectileSystem.projectiles.length);

// Trigger camera tilt manually
window.game.vfxManager.spawnKnockbackTilt(5);
```

---

## What to Watch For

✅ **Good Signs:**
- Other players' projectiles visible and moving smoothly
- Knockback pushes you ~15-20 units (not 50+)
- Blood particles appear on damage
- Camera tilts when hit by heavy spell
- No lag or packet loss in console

❌ **Red Flags:**
- Other players' projectiles don't appear
- Spells push enemies too far
- Crashes in console
- Desync between players
- Missing animations

---

## Test Match Setup

**Best for Testing:**
- Mode: TEAM CARNAGE (2-4 players)
- Time: 2-3 minutes per test
- Spells to test: All 7 (Heavy Strike, Whirlwind, Magic Bolt, Shockwave, Fireball, Impale, Begone)

**Quick Stress Test:**
- 3+ players in same match
- All spam Magic Bolt simultaneously
- Monitor console for errors
- Check if all projectiles visible

---

## Success Metrics

### 🟢 PASS (All systems go)
- [ ] Multiplayer sync works
- [ ] No critical errors
- [ ] Knockback feels right
- [ ] Visual feedback present

### 🟡 PARTIAL (Minor issues)
- [ ] Occasional desync (<2 seconds)
- [ ] Some animations missing
- [ ] Rare network errors

### 🔴 FAIL (Blocking issues)
- [ ] Projectiles not visible
- [ ] Knockback broken
- [ ] Server crashes
- [ ] Frequent desync

---

## If Something Breaks

**Projectiles not visible:**
→ Check server console for `playerProjectile` events  
→ Check client console for `remoteProjectile` listener  

**Knockback too strong/weak:**
→ Check SkillData.js values match expected (25, 20, 10, etc.)  

**Camera tilt not working:**
→ Check VFXManager.currentTilt is being set  
→ Check Game.js render loop calls applyKnockbackTilt  

**Animations not syncing:**
→ Check NetworkManager emits `playerAnimation` event  
→ Check SkillManager listens to `network:hitscan_attack`  

---

## Session Notes

- **Duration:** 2.5 hours estimated
- **Passing all tests:** Ready for production
- **Finding bugs:** Expected and normal
- **Post-testing:** Fix + re-test critical issues

---

🎯 **TEST WITH CONFIDENCE - CODE IS SOLID** 🎯
