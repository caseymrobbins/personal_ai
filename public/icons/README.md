# PWA Icons

## Generating Icons

To generate PNG icons from the SVG source:

1. Open `../../scripts/generate-icons.html` in a web browser
2. Click "Generate All Icons"
3. Download each icon individually
4. Place them in this directory (`/public/icons/`)

## Required Icons

The following icon sizes are required for the PWA:

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png` (Primary icon for Android)
- `icon-384x384.png`
- `icon-512x512.png` (Primary icon for splash screens)

## Alternative: Using Online Tools

If the HTML generator doesn't work, you can use online SVG to PNG converters:

1. Go to https://svgtopng.com/ or similar
2. Upload `icon.svg`
3. Generate each size listed above
4. Save them with the correct filenames

## Alternative: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# From the icons directory
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

## Alternative: Using Node.js (Sharp)

If you have Node.js and Sharp installed:

```bash
cd scripts
node generate-icons-node.js
```

## Current State

Currently using SVG as fallback. PNG icons should be generated for optimal PWA experience on all devices.
