/**
 * Generate PWA Icons from SVG using Node.js
 *
 * This script requires 'sharp' package. Install with:
 * npm install sharp --save-dev
 *
 * Note: This script is optional. You can also use the HTML generator
 * or online tools to create the icons.
 */

const fs = require('fs');
const path = require('path');

// Try to import sharp, provide helpful error if not available
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('❌ Sharp not installed.');
  console.error('Install with: npm install sharp --save-dev');
  console.error('Or use the HTML generator: scripts/generate-icons.html');
  process.exit(1);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_PATH = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcon(size) {
  const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

  try {
    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${size}x${size}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed to generate ${size}x${size}:`, err.message);
    return false;
  }
}

async function generateAllIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check if SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`❌ SVG source not found: ${SVG_PATH}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate all sizes
  const results = [];
  for (const size of ICON_SIZES) {
    const success = await generateIcon(size);
    results.push({ size, success });
  }

  // Summary
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Generated: ${successful}/${ICON_SIZES.length} icons`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} icons`);
  }

  console.log('\n✨ Done! Icons saved to:', OUTPUT_DIR);
}

// Run if executed directly
if (require.main === module) {
  generateAllIcons().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { generateIcon, generateAllIcons };
