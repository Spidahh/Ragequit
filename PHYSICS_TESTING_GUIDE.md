# 🧪 PHYSICS TESTING GUIDE

**How to verify the physics fixes work correctly**

---

## 📚 **IMPORTANT: Start Here When Testing**

⚠️ **Related documents in root folder (`/`):**
- **PHYSICS_TUNING_GUIDE.md** - If tests fail, use this to adjust parameters
- **FULL_SYSTEM_POLISH_FIX.md** - Understand what was changed
- **SYSTEM_POLISH_CHECKLIST.md** - Overall progress tracking

---

## 🎮 QUICK START TEST (5 minutes)

### Boot the game
1. Run `npm run dev`
2. Open http://localhost:5173
3. Game auto-starts with player at origin

### Jump Test
1. Press SPACE to jump
2. Watch how long you're in air
3. Should be ~0.8-1.0 seconds
4. Should feel natural (not floaty, not weak)

### Movement Test
1. Press W to move forward
2. Should feel responsive
3. Not too slow, not too fast
4. Try strafing (A/D keys)
5. Should feel smooth

### Camera Test
1. Look around (mouse)
2. Camera should be at eye level
3. No weird positioning
4. Should match where your eyes would be

### Result
- If all feel good → Physics are fixed ✅
- If feels weird → Use PHYSICS_TUNING_GUIDE.md

---

## 🔍 DETAILED VERIFICATION

### Test 1: Jump Height

**Expected:**
- Max jump height: ~5 units (from ground level)
- Time in air: ~1.0 second total
- Should feel like real jumping

**How to measure:**
1. Stand still (no moving)
2. Jump straight up (SPACE)
3. Count: "1-Mississippi" (approx 1 second)
4. Observe height reached

**Verify:**
- [ ] Reaches reasonable height
- [ ] Takes ~1 second to come back down
- [ ] Feels natural, not floaty

**If wrong:**
- Too high/floaty → Increase GRAVITY (make more negative)
- Too low → Decrease GRAVITY or increase JUMP_FORCE

---

### Test 2: Gravity Feel

**Expected:**
- Gravity feels like real Earth
- Not too heavy (not falling like boulder)
- Not too light (not floating away)
- Consistent throughout game

**How to test:**
1. Jump and observe falling motion
2. Jump multiple times
3. Notice the acceleration downward
4. Compare to real jumping sensation

**Verify:**
- [ ] Gravity feels natural
- [ ] Acceleration visible (speeds up as falls)
- [ ] Landing feels solid

**If wrong:**
- Too strong (falls fast) → Decrease |GRAVITY|
- Too weak (floats) → Increase |GRAVITY|

---

### Test 3: Movement Speed

**Expected:**
- Forward/backward: Responsive, not slow
- Strafing: Smooth and quick
- Sprint (Shift): 1.5x faster
- Feels like FPS game

**How to test:**
1. Press W to walk forward
2. Move for 3 seconds
3. Estimate distance traveled (~45 units)
4. Then press Shift to sprint
5. Should be noticeably faster

**Verify:**
- [ ] Walking feels right speed
- [ ] Sprint is faster
- [ ] Responsive to input
- [ ] No acceleration delay

**If wrong:**
- Too slow → Increase PLAYER_SPEED
- Too fast → Decrease PLAYER_SPEED

---

### Test 4: Camera Position

**Expected:**
- Camera at eye level (not feet level)
- About 1.8 units above ground
- Matches where eyes would be
- Doesn't float weirdly

**How to test:**
1. Look at environment
2. Imagine where your eyes are
3. Check if view matches
4. Walk forward and observe

**Verify:**
- [ ] Camera height feels right
- [ ] Not looking from feet (too low)
- [ ] Not floating above head (too high)
- [ ] Matches real eye level

**Formula:**
```
Player position = center of capsule
Player height = 2.0 units
Bottom of player = position.y - 1.0
Eyes = position.y + 0.8 (from center)
```

---

### Test 5: Collision Detection

**Expected:**
- Can't walk through walls
- Can walk along edges (slides)
- Landing on ground works
- No falling through floor

**How to test:**
1. Walk toward a wall
2. Try to push through
3. Should stop at wall
4. Try walking along wall edge
5. Should slide naturally

**Verify:**
- [ ] Collision stops movement
- [ ] No clipping through geometry
- [ ] Sliding works
- [ ] Ground collision works

**If wrong:**
- Clipping through walls → Check collision box centering
- Can't slide → Check axis-separated collision
- Fall through floor → Check ground level at y=0

---

### Test 6: Ground Level

**Expected:**
- Player stands at y=0 ground level
- Standing height = 2.0 units
- Camera at y ≈ 1.8 when standing
- No weird y-offset

**How to test:**
1. Look at console while standing still
2. Check player position in inspector
3. Position.y should be ~1.0 (center of capsule)
4. Camera should be ~0.8 above that

**Verify:**
- [ ] Player centered at y=1.0
- [ ] Ground at y=0
- [ ] Camera at ~y=1.8
- [ ] No weird offsets

**Math check:**
```
Ground level: y = 0
Player half height: 1.0
Player position (center): y = 1.0
Camera (eye height from center): 0.8 above center
Camera position: y = 1.8
```

---

### Test 7: Jump + Movement Combo

**Expected:**
- Can jump while moving
- Can move while in air
- Landing feels smooth
- No weird physics interactions

**How to test:**
1. Move forward (W)
2. While moving, jump (SPACE)
3. While in air, keep moving
4. Land smoothly
5. Repeat combo

**Verify:**
- [ ] Jump during movement works
- [ ] Can steer in air
- [ ] Landing is smooth
- [ ] No stuttering

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: Player falls too fast
**Cause:** GRAVITY too strong (too negative)
**Solution:**
```javascript
// Increase GRAVITY (make less negative)
GRAVITY: -25 → GRAVITY: -20
```

### Issue: Player floats forever
**Cause:** GRAVITY too weak
**Solution:**
```javascript
// Decrease GRAVITY (make more negative)
GRAVITY: -25 → GRAVITY: -30
```

### Issue: Jump too high
**Cause:** JUMP_FORCE too high or GRAVITY too weak
**Solution:**
```javascript
// Option 1: Decrease jump force
PLAYER_JUMP_FORCE: 15 → PLAYER_JUMP_FORCE: 12

// Option 2: Increase gravity
GRAVITY: -25 → GRAVITY: -30
```

### Issue: Jump too weak
**Cause:** JUMP_FORCE too low or GRAVITY too strong
**Solution:**
```javascript
// Option 1: Increase jump force
PLAYER_JUMP_FORCE: 15 → PLAYER_JUMP_FORCE: 18

// Option 2: Decrease gravity
GRAVITY: -25 → GRAVITY: -20
```

### Issue: Camera not at eye level
**Cause:** PLAYER_EYE_HEIGHT wrong
**Solution:**
```javascript
// Adjust eye height (distance from center of capsule to eyes)
PLAYER_EYE_HEIGHT: 1.8  // Standard

// If camera too high:
PLAYER_EYE_HEIGHT: 1.6

// If camera too low:
PLAYER_EYE_HEIGHT: 1.9
```

### Issue: Fall through floor
**Cause:** GROUND_LEVEL wrong or collision box misaligned
**Solution:**
```javascript
// Verify GROUND_LEVEL
GROUND_LEVEL: 0  // Should be at y=0

// Check collision box calculation:
playerHalfHeight = playerHeight / 2 = 1.0
playerBottomY = position.y - playerHalfHeight

// If position.y = 1.0, then bottom = 0.0 ✓
```

---

## ✅ COMPLETE TESTING CHECKLIST

- [ ] Jump test passes (height ~5 units, duration ~1s)
- [ ] Gravity feels natural
- [ ] Movement speed appropriate
- [ ] Camera at eye level
- [ ] No clipping through walls
- [ ] Ground collision works
- [ ] Jump + movement combo smooth
- [ ] No console errors
- [ ] Game runs at 60 FPS
- [ ] Overall feels like professional FPS

---

## 🎮 IN-BROWSER TESTING

### Debug Console
Press F12 and open console, then:

```javascript
// Check player position
console.log(window.game.player.position);

// Check gravity
console.log(window.game.systems.movementSystem.player.velocity);

// Manually adjust velocity for testing
window.game.player.velocity.y = 20;  // Make jump higher

// Check if grounded
console.log(window.game.player.isGrounded);
```

---

## 📊 PHYSICS METRICS

After testing, note these metrics:

**Jump Metrics:**
- Max height reached: ____ units
- Time in air: ____ seconds
- Feel rating: ____ / 10

**Movement Metrics:**
- Movement feels: ☐ Too slow ☐ Right ☐ Too fast
- Strafe feels: ☐ Sluggish ☐ Good ☐ Too twitchy
- Response: ☐ Laggy ☐ Good ☐ Too sensitive

**Camera Metrics:**
- Position: ☐ Too low ☐ Right ☐ Too high
- Movement: ☐ Jerky ☐ Smooth ☐ Too smooth
- Clipping: ☐ Major ☐ Minor ☐ None

**Overall Feel:**
- Compared to Halo/Destiny: ☐ Slower ☐ Same ☐ Faster
- Feels like FPS: ☐ No ☐ Kinda ☐ Yes
- Professional: ☐ No ☐ Somewhat ☐ Yes

---

## 🎯 SUCCESS CRITERIA MET

When you check all these, physics are correctly tuned:

- [x] Jump feels natural and responsive
- [x] Gravity feels like real world
- [x] Movement feels smooth and immediate
- [x] Camera at eye level, no weirdness
- [x] Collision works without clipping
- [x] No physics bugs or issues
- [x] Overall "feels like a real game"

---

## 🚀 NEXT STEP

Once all tests pass → Move to next Polish item (Player Visual Model)

If tests fail → Use PHYSICS_TUNING_GUIDE.md to adjust parameters

---

*This guide ensures physics are correctly implemented and feel professional.*
