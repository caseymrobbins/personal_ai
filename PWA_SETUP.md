# PWA Setup Guide

This document explains the Progressive Web App (PWA) setup for SML Guardian.

## ✅ What's Implemented

- ✅ `manifest.json` - PWA manifest with app metadata
- ✅ `public/icon.svg` - Source icon file (brain/neural network design)
- ✅ PWA meta tags in `index.html`
- ✅ Service Worker (from Sprint 12)
- ✅ IndexedDB persistence (from Sprint 12)
- ✅ Offline support (from Sprint 12)

## 📱 Installing the App

### On Desktop (Chrome, Edge, Brave)
1. Open SML Guardian in your browser
2. Look for the **Install app** prompt (⬇️ icon in address bar)
3. Click to install
4. App opens in a standalone window

### On Mobile (iOS)
1. Open SML Guardian in Safari
2. Tap the **Share** button
3. Select **Add to Home Screen**
4. Choose app name and icon
5. Tap **Add**

### On Mobile (Android Chrome)
1. Open SML Guardian in Chrome
2. Tap the **three-dot menu** (⋮)
3. Select **Install app** or **Add to Home Screen**
4. Confirm installation

## 🎨 App Icons

### Current Setup
- **SVG icon**: `public/icon.svg` (vector-based, scales perfectly)
- **Used as**: Favicon and PWA icon source

### Generating PNG Icons (Optional)

PNG icons provide better compatibility and appearance on all platforms. To generate them:

#### Option 1: Using Node.js (Recommended)
```bash
# Install sharp (image processing library)
npm install --save-dev sharp

# Generate icons
node scripts/generate-icons.js
```

This creates:
- `public/icon-192x192.png` - Mobile home screen icon
- `public/icon-512x512.png` - Splash screen, store listings
- `public/icon-maskable-192x192.png` - Adaptive icon (Android)
- `public/icon-maskable-512x512.png` - Adaptive icon (Android)

#### Option 2: Using Online Converter
1. Visit [CloudConvert](https://cloudconvert.com/svg-to-png)
2. Upload `public/icon.svg`
3. Convert to PNG at these sizes:
   - 192×192 pixels → save as `icon-192x192.png`
   - 512×512 pixels → save as `icon-512x512.png`
4. Place files in `public/` directory
5. The PNG versions will be used automatically

#### Option 3: Using ImageMagick
```bash
# Install ImageMagick if not already installed
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# Windows: https://imagemagick.org/script/download.php

# Generate icons
convert -background "#667eea" -resize 192x192 public/icon.svg public/icon-192x192.png
convert -background "#667eea" -resize 512x512 public/icon.svg public/icon-512x512.png
```

## 🔧 Manifest Configuration

The `manifest.json` includes:

```json
{
  "name": "SML Guardian - Privacy-First AI Chat",
  "short_name": "SML Guardian",
  "description": "...",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "icons": [...]
}
```

### Key Features

- **display: "standalone"** - App runs in its own window (not in browser)
- **start_url: "/"** - Opens to the main chat interface
- **theme_color** - Status bar color on Android
- **background_color** - Splash screen background while loading
- **shortcuts** - Quick actions (New Chat, Analytics)

## 🔒 Privacy & Security

PWA Features enabled:
- ✅ Service Worker caching (offline support)
- ✅ HTTPS required (for installability)
- ✅ All data stored locally
- ✅ No external tracking
- ✅ User-controlled installation

## 🧪 Testing the PWA

### Check Installation Support
1. Open DevTools (F12)
2. Go to **Application** → **Manifest**
3. Should show `manifest.json` details

### Check Service Worker
1. DevTools → **Application** → **Service Workers**
2. Should show status "activated and running"

### Check Install Prompt
- On Chrome: Look for install icon in address bar
- On Firefox: May show notification to install
- On Safari (iOS): Use Share → Add to Home Screen

### Test Offline Mode
1. Install the app
2. DevTools → **Network** tab
3. Check "Offline" checkbox
4. Reload app - should work without network

## 📦 Deployment Considerations

### Required for PWA Installation
- ✅ Valid `manifest.json`
- ✅ HTTPS certificate (localhost works for testing)
- ✅ Service Worker registered
- ✅ App icon(s)

### For Production
- 📌 Generate PNG icons for better compatibility
- 📌 Add app screenshots (for app store listings if applicable)
- 📌 Test on multiple devices/browsers
- 📌 Consider Chrome Web Store submission

## 🚀 Next Steps

1. **Optional**: Generate PNG icons (see above)
2. **Test**: Install app on your device
3. **Deploy**: Push to your server (must have HTTPS)
4. **Verify**: Test installation and offline mode

## 📚 References

- [MDN Web Docs - Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [WebKit PWA Support](https://webkit.org/status/#position-68)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)

---

**Status**: PWA foundation complete. PNG icons are optional but recommended for production.
