const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const srcIcon = path.join(__dirname, 'public', 'logo.jpg');
const outDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(srcIcon)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  // Also generate a badge icon
  const badgePath = path.join(outDir, 'badge.png');
  await sharp(srcIcon)
    .resize(96, 96, { fit: 'cover' })
    .png()
    .toFile(badgePath);
  console.log('Generated: badge.png');
  
  console.log('All icons generated!');
}

generate().catch(console.error);
