#!/usr/bin/env node

/**
 * Generate PWA icons from SVG source
 *
 * Requires: sharp or imagemagick
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp (simpler, pure Node.js)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ sharp not found. Install with: npm install sharp');
  console.log('\nAlternatively, you can convert the SVG manually:');
  console.log('1. Open public/icon.svg in a browser or graphics editor');
  console.log('2. Export as PNG at these sizes:');
  console.log('   - 192x192 → icon-192x192.png');
  console.log('   - 512x512 → icon-512x512.png');
  console.log('3. For maskable icons, use the same SVG with a transparent background:');
  console.log('   - 192x192 → icon-maskable-192x192.png');
  console.log('   - 512x512 → icon-maskable-512x512.png');
  console.log('\nOnline converters:');
  console.log('- CloudConvert: https://cloudconvert.com/svg-to-png');
  console.log('- Zamzar: https://www.zamzar.com/convert/svg-to-png/');
  process.exit(1);
}

const sourceFile = path.join(__dirname, '../public/icon.svg');
const publicDir = path.join(__dirname, '../public');

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 192, name: 'icon-maskable-192x192.png' },
  { size: 512, name: 'icon-maskable-512x512.png' }
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  try {
    const svgData = fs.readFileSync(sourceFile);

    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name);

      console.log(`   Generating ${size}x${size} → ${name}`);

      await sharp(svgData)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 102, g: 126, b: 234, alpha: 1 } // theme color background
        })
        .png()
        .toFile(outputPath);

      console.log(`   ✅ Generated ${name}`);
    }

    console.log('\n✅ All icons generated successfully!\n');
    console.log('Generated files:');
    sizes.forEach(({ name }) => {
      console.log(`  - public/${name}`);
    });

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
