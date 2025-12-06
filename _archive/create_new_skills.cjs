const fs = require('fs');
const path = require('path');

const iconsDir = 'e:\\RageQuit_FINAL\\public\\assets\\icons';

// 1x1 Transparent PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const newIcons = [
    'sword_pull.png',
    'explosive_shot.png',
    'rapid_fire.png'
];

// Ensure directory exists
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

newIcons.forEach(file => {
    fs.writeFileSync(path.join(iconsDir, file), pngBuffer);
    console.log(`Created Icon asset: ${file}`);
});
