/**
 * HUDManager.js
 * Combat 2.0: Clean UI.
 */
import { SKILL_DATA } from '../../data/SkillData.js';
import { eventBus } from '../../core/EventBus.js';

export class HUDManager {
    constructor(buildManager, keybindManager = null) {
        this.buildManager = buildManager;
        this.keybindManager = keybindManager;
        
        // Safely get elements with null checks
        this.hpFill = document.getElementById('hp-fill');
        this.manaFill = document.getElementById('mana-fill');
        this.staminaFill = document.getElementById('stamina-fill');
        this.scoreValue = document.getElementById('score-value');
        this.uiLayer = document.getElementById('ui-layer');
        
        console.log('HUDManager: Elements found:', {
            hpFill: !!this.hpFill,
            manaFill: !!this.manaFill,
            staminaFill: !!this.staminaFill,
            scoreValue: !!this.scoreValue,
            uiLayer: !!this.uiLayer
        });

        this.initSkillBar();

        eventBus.on('game:start', () => {
            this.initSkillBar();
            if (this.uiLayer) this.uiLayer.style.display = 'block';
        });

        // Listeners
        eventBus.on('build:updated', () => this.initSkillBar());
        eventBus.on('ui:scoreboard', (data) => this.updateScoreboard(data));
        eventBus.on('ui:killfeed', (data) => this.showKillFeed(data));
        
        // ✅ Resource bars update (HP, Mana, Stamina)
        eventBus.on('player:resource_update', (data) => {
            this.updateResourceBars(data.hp, data.maxHp, data.mana, data.maxMana, data.stamina, data.maxStamina);
        });
        
        // Cooldown Display
        eventBus.on('skill:cooldown', (data) => this.triggerCooldown(data.slotIndex, data.duration));

        // Scoreboard Toggle - uses SCOREBOARD keybind action
        eventBus.on('input:keydown', (code) => {
            // Check if this key is bound to SCOREBOARD action
            const isScoreboardKey = this.keybindManager ? 
                this.keybindManager.getAction('SCOREBOARD') : 
                (code === 'Tab');  // Fallback to Tab if no keybindManager
            
            if (isScoreboardKey) {
                const sb = document.getElementById('scoreboard');
                if (sb) sb.style.display = 'block';
            }
        });

        eventBus.on('input:keyup', (code) => {
            const isScoreboardKey = this.keybindManager ? 
                this.keybindManager.getAction('SCOREBOARD') : 
                (code === 'Tab');  // Fallback to Tab
            
            if (isScoreboardKey) {
                const sb = document.getElementById('scoreboard');
                if (sb) sb.style.display = 'none';
            }
        });
    }

    // ✅ NEW: Update resource bars real-time
    updateResourceBars(hp, maxHp, mana, maxMana, stamina, maxStamina) {
        if (this.hpFill) {
            const hpPercent = (hp / maxHp) * 100;
            this.hpFill.style.width = `${hpPercent}%`;
        }
        if (this.manaFill) {
            const manaPercent = (mana / maxMana) * 100;
            this.manaFill.style.width = `${manaPercent}%`;
        }
        if (this.staminaFill) {
            const staminaPercent = (stamina / maxStamina) * 100;
            this.staminaFill.style.width = `${staminaPercent}%`;
        }
    }

    initSkillBar() {
        if (!this.buildManager) return;
        const loadout = this.buildManager.getLoadout();

        // Map slots to IDs in index.html
        const slotMap = {
            'slot-1': { id: loadout.slot1, key: '1' },
            'slot-2': { id: loadout.slot2, key: '2' },
            'slot-3': { id: loadout.slot3, key: '3' },
            'slot-4': { id: loadout.slot4, key: '4' },
            'slot-5': { id: loadout.slot5, key: '5' },
            'slot-6': { id: loadout.slot6, key: '6' },
            'slot-r': { id: loadout.slot7, key: 'R' }, // Heal
            'slot-transfer-1': { id: loadout.slot8, key: '7' },
            'slot-transfer-2': { id: loadout.slot9, key: '8' },
            'slot-transfer-3': { id: loadout.slot10, key: '9' }
        };

        for (const [elementId, data] of Object.entries(slotMap)) {
            const slotEl = document.getElementById(elementId);
            if (!slotEl) continue;

            // Clear previous icon
            const existingIcon = slotEl.querySelector('img');
            if (existingIcon) existingIcon.remove();

            if (data.id && SKILL_DATA[data.id]) {
                const skill = SKILL_DATA[data.id];
                if (!skill.icon) {
                    console.warn(`⚠️ Skill ${skill.name} has no icon path`);
                    continue;
                }
                
                const img = document.createElement('img');
                img.src = skill.icon;
                img.className = 'skill-icon';
                img.alt = skill.name;
                
                // Add error handler for missing icon files
                img.onerror = () => {
                    console.warn(`⚠️ Icon file not found: ${skill.icon}`);
                    slotEl.style.backgroundColor = '#ff3333';  // Show red indicator
                };
                
                slotEl.appendChild(img);
            }
        }
    }

    update(stats) {
        if (!stats) return;
        
        // Only update DOM if value changed (dirty flag optimization)
        if (stats.hp !== undefined && stats.hp !== this.lastHp && this.hpFill) {
            this.hpFill.style.width = `${stats.hp}%`;
            this.lastHp = stats.hp;
        }
        if (stats.mana !== undefined && stats.mana !== this.lastMana && this.manaFill) {
            this.manaFill.style.width = `${stats.mana}%`;
            this.lastMana = stats.mana;
        }
        if (stats.stamina !== undefined && stats.stamina !== this.lastStamina && this.staminaFill) {
            this.staminaFill.style.width = `${stats.stamina}%`;
            this.lastStamina = stats.stamina;
        }
        if (stats.score !== undefined && stats.score !== this.lastScore && this.scoreValue) {
            this.scoreValue.textContent = stats.score;
            this.lastScore = stats.score;
        }
    }

    triggerCooldown(slotIndex, duration) {
        // Map slotIndex (1-10) to HTML element ID
        const slotElementMap = {
            1: 'slot-1',    // Q
            2: 'slot-2',    // C
            3: 'slot-3',    // 1
            4: 'slot-4',    // E
            5: 'slot-5',    // F
            6: 'slot-6',    // X
            7: 'slot-r',    // R (Heal)
            8: 'slot-transfer-1',  // 2
            9: 'slot-transfer-2',  // 3
            10: 'slot-transfer-3'  // 4
        };

        const elementId = slotElementMap[slotIndex];
        const slotElement = document.getElementById(elementId);
        if (!slotElement) return;

        // ✅ Create or get cooldown overlay
        let overlay = slotElement.querySelector('.cooldown-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'cooldown-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.transition = 'height 0.1s linear';
            overlay.style.overflow = 'hidden';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            slotElement.appendChild(overlay);
        }
        
        // ✅ GDD: Create countdown text overlay
        let countdown = slotElement.querySelector('.cooldown-text');
        if (!countdown) {
            countdown = document.createElement('div');
            countdown.className = 'cooldown-text';
            countdown.style.position = 'absolute';
            countdown.style.top = '50%';
            countdown.style.left = '50%';
            countdown.style.transform = 'translate(-50%, -50%)';
            countdown.style.color = '#ffff00';
            countdown.style.fontWeight = 'bold';
            countdown.style.fontSize = '18px';
            countdown.style.textShadow = '0 0 8px rgba(255, 255, 0, 0.8)';
            countdown.style.pointerEvents = 'none';
            countdown.style.zIndex = '11';
            countdown.style.fontFamily = 'Arial, sans-serif';
            slotElement.appendChild(countdown);
        }

        // ✅ Animate cooldown - smooth linear height shrink
        const startTime = Date.now();
        const updateCooldown = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const remaining = Math.max(0, duration - elapsed);
            
            // Shrink from top (height decreases)
            overlay.style.height = `${(1 - progress) * 100}%`;
            
            // ✅ GDD: Show countdown number
            if (remaining > 0) {
                countdown.textContent = remaining.toFixed(1).replace(/\.0$/, '');
                countdown.style.display = 'block';
            } else {
                countdown.style.display = 'none';
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCooldown);
            } else {
                overlay.style.height = '0%';
                overlay.style.display = 'none';
                countdown.style.display = 'none';
            }
        };

        overlay.style.display = 'block';
        overlay.style.height = '100%';
        updateCooldown();
    }

    showAnnouncement(text, style = 'normal') {
        let container = document.getElementById('announcement-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'announcement-container';
            document.body.appendChild(container);
        }

        const el = document.createElement('div');
        el.className = `announcement-text ${style}`;
        el.textContent = text;
        container.appendChild(el);

        // Animate
        // CSS animation 'pop-in-out'
        setTimeout(() => {
            el.remove();
        }, 2000);
    }

    updateScoreboard(data) {
        const body = document.getElementById('scoreboard-body');
        if (!body) return;

        body.innerHTML = '';
        // Data is object { socketId: { id, kills, deaths, team } }
        // Convert to array and sort by kills
        const players = Object.values(data).sort((a, b) => b.kills - a.kills);

        players.forEach(p => {
            const row = document.createElement('div');
            row.className = 'sb-row';
            row.innerHTML = `
                <div class="sb-col name" style="color:${p.team === 'Red' ? '#ff3333' : '#3333ff'}">${p.id.slice(0, 8)}</div>
                <div class="sb-col kills">${p.kills || 0}</div>
                <div class="sb-col deaths">${p.deaths || 0}</div>
                <div class="sb-col ping">0</div>
            `;
            body.appendChild(row);
        });
    }

    showKillFeed(data) {
        const feed = document.getElementById('kill-feed');
        if (!feed) return;

        const msg = document.createElement('div');
        msg.className = 'kill-msg';
        // Format: Killer [Skill] Victim
        const killerName = data.killerId ? data.killerId.slice(0, 8) : 'Environment';
        const victimName = data.victimId ? data.victimId.slice(0, 8) : 'Unknown';
        const skillName = data.skillId || 'Unknown';

        msg.innerHTML = `<span class="killer">${killerName}</span> <span class="skill">[${skillName}]</span> <span class="victim">${victimName}</span>`;

        feed.prepend(msg); // Add to top

        // Remove after 5s
        setTimeout(() => msg.remove(), 5000);
    }
}
