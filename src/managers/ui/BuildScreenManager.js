/**
 * BuildScreenManager.js
 * Responsibilities:
 * - Manage the Skill Library Grid
 * - Manage Loadout Slots
 * - Handle Drag & Drop / Click-to-Equip logic
 * - Display correct keybinds on slots
 */
import { SKILL_DATA } from '../../data/SkillData.js';
import { KeybindManager, ACTIONS } from '../KeybindManager.js';
import { InputManager } from '../InputManager.js';
import { eventBus } from '../../core/EventBus.js';

export class BuildScreenManager {
    constructor(buildManager) {
        this.buildManager = buildManager;
        this.inputManager = new InputManager();
        this.keybindManager = new KeybindManager(this.inputManager);

        // Elements
        this.buildScreen = document.getElementById('build-screen');
        this.libraryGrid = document.getElementById('library-grid');
        this.loadoutSlots = document.getElementById('loadout-slots');
        this.skillDescription = document.getElementById('skill-description');

        // State
        this.currentCategory = 'melee';
        this.selectedLibrarySkill = null;

        this.initListeners();

        // Refresh when keybinds change
        eventBus.on('keybinds:updated', () => {
            if (this.buildScreen.style.display === 'block') {
                this.renderLoadout();
            }
        });
    }

    initListeners() {
        // Open/Close Buttons
        const btnOpen = document.getElementById('btn-open-build');
        const btnClose = document.getElementById('btn-close-build');

        if (btnOpen) btnOpen.addEventListener('click', () => this.open());
        if (btnClose) btnClose.addEventListener('click', () => this.close());

        // Category Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.tab;
                this.renderSkillLibrary();
            });
        });
    }

    open() {
        this.buildScreen.style.display = 'block';
        this.renderSkillLibrary();
        this.renderLoadout();
    }

    close() {
        this.buildScreen.style.display = 'none';
    }

    renderSkillLibrary() {
        this.libraryGrid.innerHTML = '';

        const categoryMap = {
            'melee': 'MELEE',
            'bow': 'BOW',
            'staff': 'MAGIC'
        };
        const targetStance = categoryMap[this.currentCategory];

        const skills = Object.values(SKILL_DATA).filter(s => {
            // Exclude Hidden Skills (Basic Attacks)
            if (s.hidden) return false;

            // Exclude Utility Skills (Fixed in Slots 7-10)
            if (s.type === 'SELF' || s.type === 'CHANNEL') return false;

            // Show skills matching the stance, or universal skills (ANY)
            return s.stance === targetStance || s.stance === 'ANY';
        });

        // Get current loadout values to check for equipped status
        const currentLoadoutValues = Object.values(this.buildManager.getLoadout());

        skills.forEach(skill => {
            const el = document.createElement('div');
            el.className = 'library-skill';

            // Check if equipped
            if (currentLoadoutValues.includes(skill.id)) {
                el.classList.add('equipped');
                el.draggable = false;
                el.title = "Already Equipped";
            } else {
                el.draggable = true;
            }

            el.dataset.skillId = skill.id;

            // Use img tag for icon
            const iconPath = skill.icon ? skill.icon : '';
            el.innerHTML = `
                <img src="${iconPath}" class="skill-icon" onerror="this.style.display='none'">
                <div class="library-skill-name">${skill.name}</div>
            `;

            // Drag Events (only if not equipped)
            if (!el.classList.contains('equipped')) {
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', skill.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    el.classList.add('dragging');
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                });
            }

            // Tooltip
            el.addEventListener('mouseenter', (e) => this.showTooltip(e, skill));
            el.addEventListener('mouseleave', () => this.hideTooltip());

            this.libraryGrid.appendChild(el);
        });
    }

    renderLoadout() {
        if (!this.buildManager) return;

        this.loadoutSlots.innerHTML = '';
        const loadout = this.buildManager.getLoadout();

        // Define Groups
        const groups = [
            { name: 'MELEE', slots: [1], class: 'group-melee' },
            { name: 'BOW', slots: [2], class: 'group-bow' },
            { name: 'MAGIC', slots: [3, 4, 5, 6], class: 'group-magic' },
            { name: 'UTILITY', slots: [7, 8, 9, 10], class: 'group-utility' }
        ];

        groups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = `slot-group ${group.class}`;

            const header = document.createElement('div');
            header.className = 'group-header';
            header.textContent = group.name;
            groupEl.appendChild(header);

            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'group-slots';

            group.slots.forEach(i => {
                const skillId = loadout[`slot${i}`];
                const skill = SKILL_DATA[skillId];

                // Get the actual key bound to this slot
                const actionName = `SLOT_${i}`;
                const key = this.keybindManager.getKeyForAction(ACTIONS[actionName]) || i;
                const displayKey = String(key).replace('Digit', '').replace('Key', '');

                const el = document.createElement('div');
                el.className = 'loadout-slot';
                el.dataset.slotIndex = i;

                const iconPath = skill && skill.icon ? skill.icon : '';

                el.innerHTML = `
                    <div class="skill-key">${displayKey}</div>
                    ${skill ? `<img src="${iconPath}" class="skill-icon" onerror="this.style.display='none'">` : ''}
                `;

                // Draggable Slot Logic
                if (skill) {
                    el.draggable = true;
                    el.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', skill.id);
                        e.dataTransfer.setData('source-slot', String(i)); // Ensure string
                        e.dataTransfer.effectAllowed = 'copyMove'; // Allow both
                        el.classList.add('dragging');
                    });

                    el.addEventListener('dragend', () => {
                        el.classList.remove('dragging');
                    });
                }

                // Drop Zone Logic
                el.addEventListener('dragover', (e) => {
                    e.preventDefault(); // Allow drop
                    e.dataTransfer.dropEffect = 'copy'; // Default to copy (works for both)
                    el.classList.add('drag-over');
                });

                el.addEventListener('dragleave', () => {
                    el.classList.remove('drag-over');
                });

                el.addEventListener('drop', (e) => {
                    e.preventDefault();
                    el.classList.remove('drag-over');

                    const droppedSkillId = e.dataTransfer.getData('text/plain');
                    const sourceSlot = e.dataTransfer.getData('source-slot');
                    const droppedSkill = SKILL_DATA[droppedSkillId];

                    if (droppedSkillId && droppedSkill) {
                        // --- SLOT VALIDATION ---
                        console.log(`Checking validation for ${droppedSkill.name} (Stance: ${droppedSkill.stance}) into Slot ${i}`);
                        const isValidForTarget = this.validateSlot(i, droppedSkill);
                        console.log(`Validation Result: ${isValidForTarget}`);

                        if (!isValidForTarget) {
                            console.warn(`Invalid slot for ${droppedSkill.name}. Slot ${i} requires specific type.`);
                            el.style.borderColor = 'red';
                            setTimeout(() => el.style.borderColor = '', 500);
                            return;
                        }

                        // --- SWAP LOGIC ---
                        if (sourceSlot) {
                            // It's a swap!
                            const currentSkillId = loadout[`slot${i}`]; // Skill currently in target
                            const currentSkill = SKILL_DATA[currentSkillId];

                            // If target has a skill, validate it for the source slot
                            if (currentSkill) {
                                const isValidForSource = this.validateSlot(parseInt(sourceSlot), currentSkill);
                                if (!isValidForSource) {
                                    console.warn(`Cannot swap: ${currentSkill.name} invalid for source slot ${sourceSlot}.`);
                                    return;
                                }
                                // Perform Swap
                                this.buildManager.setSlot(`slot${sourceSlot}`, currentSkillId);
                            } else {
                                // Target empty, just clear source
                                this.buildManager.setSlot(`slot${sourceSlot}`, null);
                            }
                        }

                        // Visual feedback: Flash the slot
                        el.style.animation = 'none';
                        el.offsetHeight; /* trigger reflow */
                        el.style.animation = 'slot-equip 0.3s ease-out';

                        this.buildManager.setSlot(`slot${i}`, droppedSkillId);
                        this.renderLoadout(); // Refresh loadout
                        this.renderSkillLibrary(); // Refresh library to update equipped state
                    }
                });

                // Tooltip
                if (skill) {
                    el.addEventListener('mouseenter', (e) => this.showTooltip(e, skill));
                    el.addEventListener('mouseleave', () => this.hideTooltip());
                }

                slotsContainer.appendChild(el);
            });

            groupEl.appendChild(slotsContainer);
            this.loadoutSlots.appendChild(groupEl);
        });
    }

    showTooltip(e, skill) {
        const tooltip = document.getElementById('skill-tooltip') || this.createTooltip();
        tooltip.style.display = 'block';
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
        tooltip.innerHTML = `
            <h3 style="color:var(--gore-text-accent); margin:0;">${skill.name}</h3>
            <p style="margin:5px 0; font-size:0.9em;">${skill.description || 'No description.'}</p>
            <div style="font-size:0.8em; color:#aaa;">
                ${skill.damage ? `<div>Damage: ${skill.damage}</div>` : ''}
                ${skill.mana ? `<div>Mana: ${skill.mana}</div>` : ''}
                ${skill.cooldown ? `<div>Cooldown: ${skill.cooldown}s</div>` : ''}
            </div>
        `;
    }

    hideTooltip() {
        const tooltip = document.getElementById('skill-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    createTooltip() {
        const div = document.createElement('div');
        div.id = 'skill-tooltip';
        div.className = 'skill-tooltip';
        document.body.appendChild(div);
        return div;
    }

    validateSlot(slotIndex, skill) {
        if (slotIndex === 1 && skill.stance === 'MELEE') return true;
        if (slotIndex === 2 && skill.stance === 'BOW') return true;
        if (slotIndex >= 3 && slotIndex <= 6 && skill.stance === 'MAGIC') return true;
        if (slotIndex >= 7 && skill.stance === 'ANY') return true; // Utility
        return false;
    }
}
