# 🧪 TESTING GUIDE - RageQuit-2 Bug Fixes

## Quick Start

1. **Open Game:** http://localhost:5173
2. **Open DevTools:** F12 (Console tab)
3. **Run Tests:** Copy-paste the test script below
4. **Check Metrics:** Open Performance tab and record 10 seconds

---

## Manual Testing Steps

### TEST 1: Screen Shake (Fix #1)
**What to test:** Screen shake should work on impacts and accumulate with multiple explosions

**Steps:**
1. Start game (select PvE mode)
2. Cast **Fireball** at enemies (middle skill button)
3. Observe screen shake intensity
4. Cast another fireball while screen is still shaking
5. **Expected:** Shake should accumulate (stronger/longer), not reset

**Pass Criteria:**
- ✅ Screen visibly shakes on fireball impact
- ✅ Multiple impacts create stronger shake
- ✅ No crashes or visual artifacts

---

### TEST 2: Projectile Collision (Fix #2 & #3)
**What to test:** Projectiles should collide smoothly with many enemies

**Steps:**
1. Start game in PvE mode
2. Spawn wave with 10+ enemies (press spacebar or wait for auto-spawn)
3. Cast **Magic Bolt** or **Power Shot** repeatedly
4. Observe FPS counter (open DevTools → Performance → FPS meter)
5. **Expected:** FPS should stay 50+ even with 20 projectiles in flight

**Pass Criteria:**
- ✅ No lag spikes when projectiles hit
- ✅ FPS stable at 50-60 (was 30-35)
- ✅ 20+ enemies don't cause stutter

---

### TEST 3: Enemy Pathfinding (Fix #3)
**What to test:** 20+ enemies should move smoothly without AI lag

**Steps:**
1. Start game in PvE
2. Spawn multiple waves (wait for auto-spawn or cheat spawn)
3. Move away from enemies to avoid combat
4. Let enemies path-find toward you
5. Check CPU/FPS metrics

**Pass Criteria:**
- ✅ Enemies move smoothly with 20+ on screen
- ✅ CPU usage ~40-50% (was 60-70%)
- ✅ No stuttering or lag during movement

---

### TEST 4: HUD Smoothness (Fix #6)
**What to test:** HUD bars should update smoothly without flicker

**Steps:**
1. Start game
2. Take damage from enemies
3. Watch HP bar decrease
4. Watch Mana/Stamina bars update
5. Open DevTools Performance tab → record 5 seconds
6. Look for DOM updates (should be minimal)

**Pass Criteria:**
- ✅ Bars animate smoothly
- ✅ No flickering or jitter
- ✅ Fewer DOM updates in Performance tab

---

### TEST 5: Cooldown System (Fix #4)
**What to test:** Cooldown timers should match skill duration

**Steps:**
1. Start game
2. Cast a skill (any 1-9 button)
3. Observe cooldown overlay on skill icon
4. Wait for cooldown to expire
5. Can cast again once overlay gone

**Pass Criteria:**
- ✅ Cooldown overlay appears
- ✅ Timer matches skill cooldown duration
- ✅ Skill fires immediately after cooldown ends

---

### TEST 6: Control Responsiveness (Fix #7)
**What to test:** Movement should feel responsive, no input lag

**Steps:**
1. Start game
2. Press WASD for movement
3. Tap rapidly: W, A, S, D in sequence
4. Move mouse and look around (should feel smooth)
5. Jump (spacebar) - should respond immediately

**Pass Criteria:**
- ✅ No input delay or lag
- ✅ Smooth camera movement
- ✅ Quick response to key presses

---

### TEST 7: Visual Consistency (Fix #10)
**What to test:** Stance changes should work without crashes

**Steps:**
1. Start game (stay in Lobby or during match)
2. Try to change stance (if available in your build)
3. Switch weapons/stance multiple times
4. Check console for errors (F12)

**Pass Criteria:**
- ✅ No crashes when changing stance
- ✅ No console errors about null references
- ✅ Weapons appear/disappear correctly

---

### TEST 8: Skill Icon Display (Fix #12)
**What to test:** Skill icons should load and display properly

**Steps:**
1. Start game
2. Look at skill bar at bottom (buttons 1-9)
3. Check if all skill icons display
4. If an icon is missing, should see red indicator

**Pass Criteria:**
- ✅ All valid skill icons display
- ✅ Missing icons show red background indicator
- ✅ No console errors about missing files

---

### TEST 9: Memory Stability (Fix #13)
**What to test:** Memory should stay stable, no continuous growth

**Steps:**
1. Open DevTools → Memory tab
2. Take baseline memory reading (note the number)
3. Play for 5 minutes (combat, moving, spawning enemies)
4. Take another memory reading
5. **Expected:** Growth should be <20MB

**Pass Criteria:**
- ✅ Memory stable after 5 minutes
- ✅ No unbounded growth
- ✅ Garbage collection pauses are rare

---

## Performance Profiling

### Using DevTools Performance Tab

1. **Open DevTools:** F12
2. **Go to Performance tab**
3. **Click Record button** (red circle)
4. **Play for 10 seconds** (move, attack, spawn enemies)
5. **Click Stop button**
6. **Analyze results:**
   - Look for **FPS meter** → should stay above 50
   - Look for **CPU chart** → should be <50% (was >70%)
   - Look for **dropped frames** → should be minimal
   - Look for **long tasks** → should see reduction

### Expected Performance Results

**Before Fixes:**
- CPU: 60-95% usage
- FPS: 15-35 (variable, stuttering)
- Frame time: 30-70ms (long)
- GC pauses: Every 5-10 seconds

**After Fixes:**
- CPU: 40-60% usage
- FPS: 50-60 (stable)
- Frame time: 16-20ms (smooth)
- GC pauses: Rare, <20ms when occur

---

## Console Test Script

**Paste in console (F12) to run automated tests:**

```javascript
// Copy from test-fixes.js file
window.runGameTests()
```

This will check:
- ✅ VFXManager screen shake
- ✅ ProjectileSystem optimization
- ✅ HUDManager dirty flags
- ✅ VisualManager event cleanup
- ✅ EnemyManager position tracking
- ✅ PlayerModel gameTime usage
- ✅ CastingSystem cooldown units
- ✅ MovementSystem precision
- ✅ Console errors

---

## Checklist for Complete Testing

### Functional Tests
- [ ] Game boots without crashes
- [ ] Login → Lobby → Game Start works
- [ ] Player can move in all directions
- [ ] Player can jump and land
- [ ] Skills cast and cooldowns work
- [ ] Projectiles spawn and collide
- [ ] Enemies spawn and move
- [ ] Enemies attack player
- [ ] Damage numbers appear
- [ ] Enemy health bars display
- [ ] HUD updates smoothly
- [ ] Scoreboard opens with Tab

### Performance Tests
- [ ] FPS stable 50+ (10 enemies)
- [ ] FPS stable 35+ (20 enemies)
- [ ] CPU usage <50% (idle)
- [ ] CPU usage 40-60% (10 enemies)
- [ ] CPU usage 60-75% (20 enemies)
- [ ] Memory grows <20MB over 5 min
- [ ] No GC stalls every frame

### Quality Tests
- [ ] No console errors
- [ ] No visual artifacts
- [ ] No crashed shaders
- [ ] Smooth animations
- [ ] Responsive controls
- [ ] No input lag

---

## If Something Breaks

### Common Issues & Solutions

**Issue:** Game won't load
**Solution:** Check console (F12) for errors, refresh page (Ctrl+R)

**Issue:** FPS drops below 50
**Solution:** 
- Check enemy count (if 30+, reduce with `game.enemyManager.clear()`)
- Close other tabs/programs
- Check GPU (might be thermal throttled)

**Issue:** Projectiles don't collide
**Solution:** 
- Check console for errors
- Verify enemies are spawned
- Try different projectile type

**Issue:** Memory keeps growing
**Solution:** 
- Play for less time, close/reopen game
- Check for infinite loops in console
- Report bug with memory snapshot

**Issue:** HUD doesn't update
**Solution:** 
- Refresh page
- Check console for undefined errors
- Verify HUDManager initialized

---

## Reporting Results

When testing is complete, provide:

1. **Performance Metrics** (from DevTools Performance tab):
   - Average FPS with 10 enemies
   - Average CPU usage
   - Memory baseline
   - GC pause frequency

2. **Issues Found** (if any):
   - Description of the problem
   - Steps to reproduce
   - Console error message (if any)
   - Screenshot/video if visual

3. **Pass/Fail Summary**:
   - ✅ Passed: X tests
   - ⚠️ Issues: Y items
   - ❌ Failed: Z critical items

---

## Success Criteria

**All fixes are successful if:**
- ✅ No new crashes or errors
- ✅ FPS improvement of 50%+ over baseline
- ✅ Smooth gameplay with 20+ enemies
- ✅ Memory stable (no unbounded growth)
- ✅ All visuals working (no missing sprites/icons)
- ✅ All controls responsive (no input lag)

