# 🧪 COMPREHENSIVE PRE-LAUNCH TEST ROUTINE

**Status:** 🔴 BEFORE LAUNCH  
**Purpose:** Verify EVERY game detail is configured correctly  
**Estimated Time:** 45-60 minutes  
**Tools Needed:** Game running locally + 2nd player (optional for multiplayer tests)

---

## PHASE 0: SETUP (5 minutes)

### Initial Checks
- [ ] Clear browser cache (Ctrl+Shift+Del)
- [ ] Open browser console (F12) - check for errors
- [ ] Load game URL (http://localhost:5000)
- [ ] Connection shows green (Socket.io connected)
- [ ] No 404 errors in Network tab

### Asset Verification
- [ ] Index.html loads without network errors
- [ ] Skill icons visible in skill bar (10 icons should appear)
- [ ] CSS styling applied (dark theme, centered content)
- [ ] Audio context initialized (no browser permission blocks)

---

## PHASE 1: LOGIN FLOW (3 minutes)

### Test Login Screen
- [ ] **Screen Appearance**
  - [ ] Version displayed: "v1.0.0 PHOENIX"
  - [ ] Input field visible and focused
  - [ ] "PLAY" button interactive
  
- [ ] **Input Handling**
  - [ ] Type player name "TestPlayer1"
  - [ ] Click PLAY button
  - [ ] Screen transitions to Lobby (no freeze)
  - [ ] Player name displayed: "OPERATOR: TestPlayer1"

- [ ] **Default Name**
  - [ ] Clear input, click PLAY
  - [ ] Random name generated (Player_XXXX format)
  - [ ] Name displayed correctly

---

## PHASE 2: LOBBY & MODE SELECTION (5 minutes)

### Test Lobby Screen
- [ ] **Visual**
  - [ ] Three game modes visible (MONSTERS SLAYER, TEAM CARNAGE, TEST)
  - [ ] MONSTERS SLAYER selected by default
  - [ ] Mode tiles have hover effects (border glow)

- [ ] **Build Button**
  - [ ] "SELEZIONE SKILL/SPELL" button visible and clickable
  - [ ] Click it → Build Screen opens
  - [ ] Build Screen shows:
    - [ ] Left panel: Skill library (sorted by Melee/Bow/Magic)
    - [ ] Right panel: Current 10-slot loadout
    - [ ] Close button or Escape key closes it

### Test Build Screen
- [ ] **Skill Library**
  - [ ] All 14 skills visible with icons
  - [ ] Melee: Heavy Strike, Power Shot visible
  - [ ] Magic: Magic Bolt, Fireball, Shockwave, etc. visible
  - [ ] Utility: Heal, resource transfers visible

- [ ] **Loadout Display**
  - [ ] All 10 slots show current skill icons
  - [ ] Keybind labels visible (Q, C, 1, E, F, X, R, 2, 3, 4)
  - [ ] Skills show proper stance colors (Melee=red, Bow=blue, Magic=purple, Utility=green)

- [ ] **Drag & Drop**
  - [ ] Drag a skill from library to empty slot → slot updates
  - [ ] Drag to incompatible slot (e.g., bow skill to melee slot 1) → red border, reject
  - [ ] Drag to correct slot → accept with visual feedback
  - [ ] Refresh build → new assignments persist

- [ ] **Tooltip Hover**
  - [ ] Hover over skill → tooltip appears near cursor
  - [ ] Tooltip shows: Name, Description, Damage, Mana/Stamina cost, Cooldown
  - [ ] Move away → tooltip disappears

- [ ] **Close Build Screen**
  - [ ] Click outside panel or press Escape
  - [ ] Screen closes smoothly
  - [ ] Back to Lobby

### Test Mode Selection
- [ ] **PvE Mode (MONSTERS SLAYER)** - Default, select and confirm
- [ ] **PvP Mode (TEAM CARNAGE)** - Click, shows team selection screen
  - [ ] Red team option visible with "R" label
  - [ ] Blue team option visible with "B" label
  - [ ] Click team → join and go to match

- [ ] **Test Zone** - Click, immediately goes to match with dummies

---

## PHASE 3: MATCH START & HUD (5 minutes)

### Test Game Start
- [ ] **Scene Load**
  - [ ] Scene renders (arena/map visible)
  - [ ] Player character appears in center
  - [ ] Enemies spawn (either bots or dummies depending on mode)
  - [ ] Camera initializes (TPS view for melee by default)

### Test HUD Display
- [ ] **Skill Bar (Bottom Center)**
  - [ ] 10 skill slots visible with glassmorphic panel
  - [ ] Skill icons loaded correctly (no broken images)
  - [ ] Keybind hints visible (Q, C, 1, E, F, X, R, 2, 3, 4)
  - [ ] Icons have drop shadows

- [ ] **Stat Bars (Top Left)**
  - [ ] HP bar visible (red) with label
  - [ ] Mana bar visible (blue) with label
  - [ ] Stamina bar visible (yellow) with label
  - [ ] All three bars are 100% at start
  - [ ] Values update as you play

- [ ] **Crosshair (Center Screen)**
  - [ ] White dot visible in center
  - [ ] Doesn't interfere with gameplay
  - [ ] Visible against background

- [ ] **Score Display**
  - [ ] Score visible (usually top-right)
  - [ ] Starts at 0
  - [ ] Updates when you kill enemies

---

## PHASE 4: COMBAT MECHANICS (20 minutes)

### Test 4.1: Basic Attack (Melee - Q Key)

**Setup:** Select melee skill, go to Monsters Slayer mode

- [ ] **Input & Animation**
  - [ ] Press Q → player raises arm (cast pose)
  - [ ] Player faces forward direction
  - [ ] Animation plays (should see arm movement)
  - [ ] Duration ~0.4 seconds

- [ ] **Hit Detection**
  - [ ] Attack nearby dummy → dummy flashes white + pops (1.2x scale)
  - [ ] Flash duration ~150ms
  - [ ] Enemy takes damage (HP reduced if visible)

- [ ] **VFX & Audio**
  - [ ] White impact particles spawn at enemy
  - [ ] "Hit" sound plays (noise burst)
  - [ ] Screen shakes slightly (intensity ~0.5)
  - [ ] Audio volume reasonable (not too loud/quiet)

- [ ] **Stat Updates**
  - [ ] Stamina bar visible + decreases (check cost in SkillData)
  - [ ] Bar fills back up (stamina regen working)
  - [ ] Mana bar unchanged

- [ ] **Cooldown**
  - [ ] Can attack again immediately (melee has low cooldown)
  - [ ] Repeated attacks trigger repeated animations

**Issue Check:** If attack doesn't work:
- [ ] Check console for errors
- [ ] Verify InputManager receives 'Q' key event
- [ ] Verify CombatSystem.skillManager.useSkill() is called

---

### Test 4.2: Projectile Skill (Bow - C Key)

**Setup:** Select bow skill (Power Shot)

- [ ] **Stance Change**
  - [ ] Press C → camera switches to FPS (first-person)
  - [ ] Player model rotates to face forward
  - [ ] You can see projectile in hand or ready to fire

- [ ] **Animation**
  - [ ] Arm raises in aiming pose
  - [ ] Crosshair may change appearance (currently static, but prepare for it)
  
- [ ] **Projectile Spawn**
  - [ ] Projectile visible (colored cylinder for arrow)
  - [ ] Spawns from player position
  - [ ] Travels forward in straight line (no gravity on low-cooldown skills)

- [ ] **Projectile Travel**
  - [ ] Projectile moves smoothly
  - [ ] Disappears after hitting target or timeout
  - [ ] Doesn't clip through terrain (if collision exists)

- [ ] **Hit Feedback**
  - [ ] Enemy hit → flashes + pops
  - [ ] Impact particles at hit location
  - [ ] "Hit" sound
  - [ ] Screen shake

- [ ] **Resource & Cooldown**
  - [ ] Stamina decreases (projectiles use stamina)
  - [ ] Cooldown ~0.3s (can spam)
  - [ ] After cast, skill available again quickly

---

### Test 4.3: Magic Skill (1 Key - Magic Bolt)

**Setup:** Select magic skill (Magic Bolt)

- [ ] **Stance Change**
  - [ ] Press 1 → camera switches to FPS
  - [ ] Arm raises to cast position

- [ ] **Animation & VFX**
  - [ ] Casting animation visible (arm raised)
  - [ ] Cyan projectile spawns and travels
  - [ ] Trail effect behind projectile (if implemented)

- [ ] **Projectile Physics**
  - [ ] Magic Bolt travels as cyan sphere
  - [ ] Speed appropriate (defined in SkillData)
  - [ ] Arc trajectory if gravity applied

- [ ] **Hit & Damage**
  - [ ] Enemy flashes + pops on hit
  - [ ] Particles spawned (colored by skill - cyan)
  - [ ] Damage dealt (visible in enemy HP reduction)

- [ ] **Resource Drain**
  - [ ] Mana bar decreases (magic uses mana)
  - [ ] Amount matches skill.mana (usually 5-15)
  - [ ] Mana regenerates slowly

- [ ] **Cooldown**
  - [ ] Cooldown active after cast (0.2s)
  - [ ] Try to spam → get blocked by cooldown check
  - [ ] Console should show "⏳ Skill X on Cooldown"

---

### Test 4.4: Area-of-Effect (E Key - Shockwave)

**Setup:** Select Shockwave (AoE magic)

- [ ] **Cast Execution**
  - [ ] Press E → animation plays
  - [ ] Shockwave spawns at player position
  - [ ] White ring effect expands from center

- [ ] **Multi-Target Hit**
  - [ ] Multiple dummies in range all take damage
  - [ ] Multiple white flashes visible
  - [ ] All enemies affected simultaneously

- [ ] **Resource & Recoil**
  - [ ] Mana cost high (15+)
  - [ ] After cast, Shockwave does self-damage (half damage)
  - [ ] Player HP reduced slightly (feedback shows recoil mechanic)

- [ ] **VFX & Audio**
  - [ ] Area ring VFX visible
  - [ ] Multiple impact particles
  - [ ] Sound plays (hit sound for each target or single area sound)
  - [ ] Screen shake intensity higher (more impactful)

- [ ] **Cooldown**
  - [ ] Cooldown 0.5s (short)
  - [ ] Can use multiple times

---

### Test 4.5: Healing Skill (R Key)

**Setup:** First take some damage, then use R

- [ ] **Damage Taken**
  - [ ] Let dummy attack you (or damage yourself with shockwave)
  - [ ] HP bar reduces
  - [ ] HP bar shows color transition (still red, but darker if hit hard)

- [ ] **Heal Cast**
  - [ ] Press R → healing animation (raise arm)
  - [ ] Mana cost deducted
  - [ ] Heal amount applied immediately

- [ ] **HP Bar Update**
  - [ ] HP bar increases smoothly (or instantly, depending on implementation)
  - [ ] New value matches: old_hp + heal_amount (capped at 100)
  - [ ] Visual feedback (green flash or glow?)

- [ ] **Cooldown**
  - [ ] Cooldown ~2-5 seconds
  - [ ] Can't spam heal

---

### Test 4.6: Resource Transfers (2, 3, 4 Keys)

**Setup:** Deplete one resource, transfer from another

**2 - Stamina → HP:**
- [ ] Press 2 → Stamina decreases, HP increases
- [ ] Channel feedback visible (if implemented)
- [ ] Transfer continues until key released or resources deplete

**3 - HP → Mana:**
- [ ] Lower health slightly first (don't go below 50 to stay safe)
- [ ] Press 3 → HP decreases, Mana increases
- [ ] Take damage intentionally to test

**4 - Mana → Stamina:**
- [ ] Use up stamina with attacks
- [ ] Press 4 → Mana decreases, Stamina increases
- [ ] Continue using stamina skills

- [ ] **All Transfers Should Show:**
  - [ ] Smooth bar transitions
  - [ ] Correct resource amounts
  - [ ] Stop when source depleted (expected behavior)

---

### Test 4.7: Block Mechanic (Right Mouse Button)

**Setup:** Face enemy, use right-click to block

- [ ] **Block Animation**
  - [ ] Right-click → shield/block pose visible
  - [ ] Stance doesn't change (stays TPS for melee)
  - [ ] Arm/shield positioned forward

- [ ] **Damage Reduction**
  - [ ] While blocking, take damage from enemy
  - [ ] Damage taken reduced (blocking active)
  - [ ] Release right-click → normal pose, normal damage

- [ ] **Stamina Drain**
  - [ ] Blocking active → Stamina continuously drains
  - [ ] Stop blocking when stamina depleted
  - [ ] Can't maintain block without stamina

- [ ] **Block Duration**
  - [ ] Can block indefinitely (until stamina depletes)
  - [ ] Release → stamina regenerates

---

## PHASE 5: UI & FEEDBACK SYSTEMS (10 minutes)

### Test 5.1: Stat Bar Animations
- [ ] **Smooth Transitions** (or at least visible updates)
  - [ ] Damage taken → HP bar shrinks
  - [ ] Should take ~0.2s to animate (not instant flash)
  - [ ] Cast spell → Mana bar shrinks
  - [ ] Regen → bars grow back smoothly

- [ ] **Visual Feedback**
  - [ ] Damage flash effect (optional, but check)
  - [ ] Bar color changes slightly on low resources?

### Test 5.2: Cooldown Visual Feedback ⚠️ CRITICAL TEST

**Setup:** Cast a spell with visible cooldown

- [ ] **Cooldown Overlay Appearance**
  - [ ] Cast skill (e.g., Magic Bolt with 0.2s cooldown)
  - [ ] Look at corresponding skill bar slot
  - [ ] ❓ Does black overlay appear at bottom of slot?
  - [ ] ❓ Does overlay shrink as cooldown expires?
  - [ ] ❓ Does overlay disappear when skill ready?

**Expected Behavior (if implemented):**
- Slot shows black overlay from bottom
- Height decreases from 100% → 0% over cooldown duration
- Once at 0%, overlay disappears

**If NOT working:**
- [ ] Check console for errors in `HUDManager.triggerCooldown()`
- [ ] Verify `CastingSystem` calls `HUDManager.triggerCooldown(slotIndex, duration)`
- [ ] Add implementation if missing (noted as Fix #2 in docs)

### Test 5.3: Damage Numbers (Floating Text) ⚠️ CRITICAL TEST
- [ ] **Hit Detection**
  - [ ] Hit enemy with melee attack
  - [ ] ❓ Do damage numbers appear at enemy location?
  - [ ] ❓ Do numbers float upward + fade?
  - [ ] ❓ Do numbers show correct damage amount?

**Expected:** "25" appears in white/red text, floats up, fades over ~1s

**If NOT working:** This is a CRITICAL feature - add before launch (noted as Fix in docs)

### Test 5.4: Kill Announcements
- [ ] **Kill Enemy**
  - [ ] Defeat a dummy/enemy
  - [ ] Large gold text appears: "KILL" or enemy name
  - [ ] Announcement animates (pop-in-out over 2s)
  - [ ] Disappears and is gone

- [ ] **Death Announcement**
  - [ ] Get killed by enemy
  - [ ] Large gold text: "WASTED" appears
  - [ ] Animation plays, then disappears
  - [ ] Game respawns or shows game-over screen

### Test 5.5: Kill Feed (Top Right)
- [ ] **Single Kill**
  - [ ] Kill one enemy
  - [ ] Entry in kill feed: "[You] [Skill] [Enemy]"
  - [ ] Entry visible for ~5 seconds then fades
  - [ ] Text color readable (white/red)

- [ ] **Multiple Kills**
  - [ ] Kill multiple enemies
  - [ ] Multiple entries stack
  - [ ] Order is newest first

### Test 5.6: Scoreboard (TAB Key)
- [ ] **Open Scoreboard**
  - [ ] Press TAB
  - [ ] Scoreboard appears (list of players/teams)
  - [ ] Your player listed with current stats
  - [ ] Score displayed

- [ ] **Scoreboard Data**
  - [ ] Player names shown
  - [ ] Scores accurate (matches on-screen score)
  - [ ] (Optional) Team colors visible
  - [ ] (Optional) Kill/death counts if tracked

- [ ] **Close Scoreboard**
  - [ ] Release TAB
  - [ ] Scoreboard disappears

---

## PHASE 6: INPUT & CONTROLS (5 minutes)

### Test 6.1: Keyboard Input Responsiveness
- [ ] **Single Key Presses**
  - [ ] Press Q → immediate response (melee attack)
  - [ ] Press 1 → immediate response (magic skill)
  - [ ] No lag or delayed response

- [ ] **Key Combinations**
  - [ ] Press Q while moving → attack + movement work
  - [ ] Press Shift (sprint, if implemented) + move → smooth movement

- [ ] **Double-Tap Detection** (double-tap abilities, if any)
  - [ ] Some skills may trigger on double-tap
  - [ ] Double-tap should register within 300ms window
  - [ ] Single tap triggers normal cast

### Test 6.2: Mouse Input
- [ ] **Pointer Lock**
  - [ ] First click in game → pointer lock activates
  - [ ] Mouse cursor disappears (captured)
  - [ ] Crosshair visible instead

- [ ] **Mouse Movement**
  - [ ] Move mouse → camera rotates (FPS in bow/magic mode)
  - [ ] Smooth rotation (no jitter)
  - [ ] Can look around freely

- [ ] **Mouse Clicks**
  - [ ] Left Click → basic attack
  - [ ] Right Click → block (while held)
  - [ ] Immediate response

---

## PHASE 7: ANIMATION & VISUALS (5 minutes)

### Test 7.1: Player Animations
- [ ] **Movement Animations**
  - [ ] Walk forward → leg cycle visible
  - [ ] Walk backward → legs move opposite direction
  - [ ] Idle → breathing animation (slight up/down)

- [ ] **Attack Animations**
  - [ ] Melee swing → arm swings (windup + strike)
  - [ ] Magic cast → arm raises smoothly
  - [ ] Should see weight/follow-through in arms

- [ ] **State Transitions**
  - [ ] Attack → Run → attack again → smooth transitions
  - [ ] No freezing or popping between animations
  - [ ] Animations layer properly (walk + attack simultaneous)

### Test 7.2: Enemy Animations
- [ ] **Enemy Movement**
  - [ ] Enemies walk toward you
  - [ ] Movement smooth (not stuttering)

- [ ] **Enemy Attack Animation**
  - [ ] Enemy attacks → visible attack animation (if implemented)
  - [ ] Or just see hit effect on player

- [ ] **Enemy Death**
  - [ ] Enemy defeated → enemy disappears (or falls?)
  - [ ] Any death animation/effect playing?

### Test 7.3: VFX Quality
- [ ] **Impact Effects**
  - [ ] Attack → particles spawn at impact point
  - [ ] Particles fade smoothly
  - [ ] Color matches skill (white for melee, cyan for magic, orange for fire)

- [ ] **Area Effects**
  - [ ] AoE skill → ring or expanding effect
  - [ ] Effect fades after animation
  - [ ] Particles clean up (no leftover meshes)

- [ ] **Screen Shake**
  - [ ] Big impact → camera shakes
  - [ ] Shake intensity appropriate (not too violent)
  - [ ] Shake fades smoothly

---

## PHASE 8: AUDIO (3 minutes)

### Test 8.1: Sound Effects
- [ ] **Hit Sound**
  - [ ] Deal damage → "hit" sound plays
  - [ ] Volume reasonable (not muted or too loud)
  - [ ] Sound triggers per hit

- [ ] **UI Sounds**
  - [ ] Hover over button → subtle "blip" sound
  - [ ] Click button → "click" sound
  - [ ] Sounds are distinct and not jarring

- [ ] **Footsteps** (if implemented)
  - [ ] Walk forward → footstep sounds at intervals
  - [ ] Sound quality (not crackling or distorted)

### Test 8.2: Audio Balance
- [ ] **Volume Levels**
  - [ ] Hit sound not too loud compared to others
  - [ ] UI sounds subtle but audible
  - [ ] Overall audio mix balanced (nothing drowning out others)

- [ ] **Audio Initialization**
  - [ ] No console errors about Web Audio API
  - [ ] No permission blocks from browser

---

## PHASE 9: MULTIPLAYER (OPTIONAL - if 2 players available)

### Test 9.1: Player Connection
- [ ] **Two Browsers/Tabs**
  - [ ] Open game in two separate browser windows
  - [ ] Both players create accounts
  - [ ] Both enter same game mode (Monsters Slayer)
  - [ ] Both see each other's characters on screen

### Test 9.2: Position Synchronization
- [ ] **Movement Sync**
  - [ ] Player 1 moves → Player 2 sees movement (within 1-2 second delay acceptable)
  - [ ] Position updates continuously (no teleporting)
  - [ ] No extreme lag or jitter

### Test 9.3: Combat Sync
- [ ] **Attack Visibility**
  - [ ] Player 1 attacks → Player 2 sees animation or effect
  - [ ] Projectiles visible to both players
  - [ ] Damage applied consistently (no desync issues)

- [ ] **Damage Reflection**
  - [ ] Player 1 hits Player 2 → both see damage applied
  - [ ] Both see HP bars update
  - [ ] Kill credit properly assigned

### Test 9.4: Shared World State
- [ ] **Enemy HP Sync**
  - [ ] Both players see same enemy HP
  - [ ] Both can damage same enemy
  - [ ] Kill credit assigned correctly

- [ ] **Team Mechanics** (if TDM mode)
  - [ ] Can identify teammates vs. enemies
  - [ ] Attacks don't damage teammates
  - [ ] Score reflects team kills

---

## PHASE 10: PERFORMANCE & STABILITY (5 minutes)

### Test 10.1: FPS & Performance
- [ ] **Baseline FPS**
  - [ ] Open DevTools Performance tab
  - [ ] Start game, stand idle
  - [ ] Record FPS (should be 60+ on modern hardware)
  - [ ] Check if stable (no constant drops)

- [ ] **During Combat**
  - [ ] Cast multiple spells
  - [ ] Spawn lots of particles
  - [ ] FPS drops acceptable? (should stay 30+)
  - [ ] No freezing or stuttering

- [ ] **Memory Usage**
  - [ ] Open Memory tab in DevTools
  - [ ] Baseline memory ~50-100MB
  - [ ] After 10 min gameplay, check growth
  - [ ] Should not exceed ~200MB (memory leak check)

### Test 10.2: Error Handling
- [ ] **Console Errors**
  - [ ] Open DevTools Console
  - [ ] Play for 5 minutes
  - [ ] Check for red errors
  - [ ] No uncaught exceptions expected
  - [ ] Warnings are acceptable (console.warn)

- [ ] **Network Issues**
  - [ ] Disconnect internet briefly
  - [ ] Reconnect
  - [ ] Game handles gracefully (reconnects or shows error)

### Test 10.3: Long Session Stability
- [ ] **Extended Play**
  - [ ] Play for 15+ minutes
  - [ ] Check for memory leaks (DevTools Memory tab)
  - [ ] Performance remains consistent
  - [ ] No slowdown over time
  - [ ] No crash

---

## PHASE 11: EDGE CASES & GOTCHAS (5 minutes)

### Test 11.1: Boundary Cases
- [ ] **Zero HP**
  - [ ] Let HP go to 0 → death triggers
  - [ ] Can't attack after death
  - [ ] Respawn works (or game ends)

- [ ] **Zero Stamina**
  - [ ] Use all stamina
  - [ ] Try to attack → blocked (can't cast stamina skill)
  - [ ] Stamina regenerates

- [ ] **Zero Mana**
  - [ ] Use all mana
  - [ ] Try to cast magic → blocked
  - [ ] Mana regenerates

### Test 11.2: Simultaneous Actions
- [ ] **Attack While Moving**
  - [ ] Hold movement key + press attack key
  - [ ] Both work together (no input conflict)

- [ ] **Attack While Blocking**
  - [ ] Hold right-click (block) + press attack key
  - [ ] Right-click takes priority (blocking continues)
  - [ ] Release right-click → attack triggers next frame

- [ ] **Attack While in Air**
  - [ ] Jump then press attack mid-air
  - [ ] Attack executes (or blocked by design)

### Test 11.3: Rapid-Fire Actions
- [ ] **Spam Same Skill**
  - [ ] Press Q repeatedly (melee attack)
  - [ ] Game doesn't crash
  - [ ] Cooldown enforced after first cast
  - [ ] Subsequent presses blocked until cooldown expires

- [ ] **Switch Stances Rapidly**
  - [ ] Press Q (melee) → C (bow) → 1 (magic) in succession
  - [ ] Stances switch correctly
  - [ ] Camera changes appropriately
  - [ ] No stuck states

---

## PHASE 12: CONFIGURATION VERIFICATION (3 minutes)

### Test 12.1: Skill Balance
- [ ] **Damage Values**
  - [ ] Each skill deals expected damage (check SkillData)
  - [ ] Melee ~10-20 damage
  - [ ] Magic ~10-30 damage
  - [ ] AoE ~10-25 damage

- [ ] **Resource Costs**
  - [ ] Melee costs ~5 stamina
  - [ ] Magic costs ~5-15 mana
  - [ ] Expensive skills deal more damage
  - [ ] Balance feels fair

- [ ] **Cooldowns**
  - [ ] Fast skills: 0.2-0.5s cooldown
  - [ ] Medium skills: 0.5-2s cooldown
  - [ ] Slow skills: 2-10s cooldown
  - [ ] Match intended balance

### Test 12.2: Game Parameters
- [ ] **Player Stats**
  - [ ] Start with 100 HP
  - [ ] Start with 100 Mana
  - [ ] Start with 100 Stamina

- [ ] **Enemy Spawning**
  - [ ] Enemies spawn waves correctly
  - [ ] Enemy HP appropriate for difficulty
  - [ ] Enemies don't spawn inside terrain

- [ ] **Regeneration Rates**
  - [ ] Mana regen ~10/sec (or configured value)
  - [ ] Stamina regen ~20/sec (or configured value)
  - [ ] HP doesn't auto-regen (by design)

---

## FINAL CHECKLIST (2 minutes)

Before clicking "Deploy":

### Critical Features (MUST WORK)
- [ ] Game loads without errors
- [ ] Login works
- [ ] Lobby loads
- [ ] Match starts
- [ ] Player visible in-game
- [ ] Attacks execute
- [ ] Enemies take damage
- [ ] HP bar updates
- [ ] Can win/lose
- [ ] Animations play
- [ ] No console errors

### Important Features (SHOULD WORK)
- [ ] Skill bar visible with icons
- [ ] Cooldowns enforced
- [ ] Resources managed correctly
- [ ] VFX/particles spawn
- [ ] Audio plays
- [ ] UI transitions smooth
- [ ] Scoreboard works
- [ ] Kill feed works

### Polish Features (NICE TO HAVE)
- [ ] Damage numbers visible (if implemented)
- [ ] Cooldown overlay visible (if implemented)
- [ ] Smooth bar animations (if implemented)
- [ ] Block mechanics work
- [ ] Multiplayer sync works (if testing 2 players)

### Performance (REQUIRED)
- [ ] FPS stays 30+ during gameplay
- [ ] No memory leaks (memory stable after 10+ min)
- [ ] No crash after 15+ min play

---

## FAILURE PROTOCOL

If ANY critical feature fails:

1. **Note the failure:** Write down exactly what failed and reproduction steps
2. **Check console:** Look for JavaScript errors (F12 → Console tab)
3. **Check network:** Look for failed asset loads (DevTools → Network tab)
4. **Isolate the issue:** Run specific test again to confirm
5. **Fix priority:**
   - **P0 (Blocker):** Game won't start → fix immediately
   - **P1 (Critical):** Core gameplay broken → fix before launch
   - **P2 (High):** Feature missing → document, consider adding
   - **P3 (Polish):** Nice-to-have missing → document for future

6. **Test fix:** Re-run the phase that failed
7. **Regression test:** Run earlier phases to ensure fix didn't break anything

---

## SUCCESS CRITERIA

### Game is LAUNCH READY if:
✅ All critical features work  
✅ All important features work  
✅ FPS stable 30+  
✅ No memory leaks  
✅ No crashes in 20+ minute session  
✅ UI is responsive  
✅ Multiplayer works (if testing)

### Document blockers:
If any "Should Work" feature is missing, document it in `KNOWN_LIMITATIONS.md` for post-launch hotfix.

---

## TIME BREAKDOWN
- Phase 0 (Setup): 5 min
- Phase 1 (Login): 3 min
- Phase 2 (Lobby/Build): 5 min
- Phase 3 (HUD): 5 min
- Phase 4 (Combat): 20 min ← LONGEST, most thorough
- Phase 5 (UI/Feedback): 10 min
- Phase 6 (Input): 5 min
- Phase 7 (Animation): 5 min
- Phase 8 (Audio): 3 min
- Phase 9 (Multiplayer): 5 min (optional, skip if solo)
- Phase 10 (Performance): 5 min
- Phase 11 (Edge Cases): 5 min
- Phase 12 (Config): 3 min
- Final Checklist: 2 min

**Total Time:** ~45-60 minutes (excluding optional multiplayer)

---

**Status:** Ready for testing  
**Next Step:** Run this test routine, document any failures  
**Success:** Complete this checklist = LAUNCH READY ✅
