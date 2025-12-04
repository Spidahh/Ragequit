/**
 * TestSkillData.js
 * 
 * 🧪 EXPERIMENTAL ZONE 🧪
 * Use this file to test new skills or balance changes.
 * DO NOT commit changes here to the main SkillData.js without approval.
 * 
 * Usage:
 * Import this in SkillManager.js TEMPORARILY to test.
 */

export const TEST_SKILL_DATA = {
    // Add experimental skills here
    'test_god_mode': {
        id: 'test_god_mode',
        name: 'DEBUG: God Mode',
        type: 'SELF',
        stance: 'ANY',
        heal: 9999,
        cooldown: 0,
        icon: 'assets/icons/generic_icon.png',
        vfx: { type: 'heal', color: 0xffd700 }
    }
};
