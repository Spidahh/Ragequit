const fs = require('fs');
const path = require('path');

const uiDir = 'e:\\RageQuit_FINAL\\public\\assets\\ui';
const iconsDir = 'e:\\RageQuit_FINAL\\public\\assets\\icons';

// 1x1 Transparent PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const uiAssets = [
    'logo_main.png',
];

const iconAssets = [
    'greatsword.png',
    'whirlwind.png',
    'arrow.png',
    'magic_bolt.png',
    'fireball.png',
    'shockwave.png',
    'stone_spikes.png',
    'heal.png',
    'convert_sta_hp.png',
    // CSS might reference these with 'icon_' prefix
    'icon_magic_bolt.png',
    'icon_fireball.png',
    'icon_stone_spikes.png',
    'icon_shockwave.png',
    'icon_arrow.png',
    'icon_greatsword.png',
    'icon_whirlwind.png',
    'icon_heal.png',
    'icon_transfer_hp.png',
    'icon_transfer_mana.png',
    'icon_transfer_stm.png'
];

// Ensure directories exist (recursive)
if (!fs.existsSync(uiDir)) fs.mkdirSync(uiDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

uiAssets.forEach(file => {
    fs.writeFileSync(path.join(uiDir, file), pngBuffer);
    console.log(`Created UI asset: ${file}`);
});

iconAssets.forEach(file => {
    fs.writeFileSync(path.join(iconsDir, file), pngBuffer);
    console.log(`Created Icon asset: ${file}`);
});
