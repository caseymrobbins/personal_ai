# PWA (Progressive Web App) Setup Guide

SML Guardian is now a fully installable Progressive Web App! This means users can install it on their devices like a native app.

## Features

✅ **Installable** - Add to home screen on mobile and desktop
✅ **Offline Support** - Works without internet (via Service Worker)
✅ **Native Feel** - Runs in standalone mode without browser UI
✅ **App Shortcuts** - Quick actions from home screen
✅ **Share Target** - Receive shared text from other apps
✅ **Theme Colors** - Matches system light/dark mode

---

## Files Created

### 1. Manifest (`/public/manifest.json`)
The PWA manifest defines app metadata, icons, and behavior:

- **name**: "SML Guardian"
- **display**: standalone (no browser UI)
- **theme_color**: #667eea (brand purple)
- **background_color**: #1a202c (dark theme)
- **icons**: 8 sizes from 72x72 to 512x512
- **shortcuts**: New Conversation, Analytics Dashboard
- **share_target**: Receive shared text

### 2. App Icons (`/public/icons/`)

#### SVG Source
- `icon.svg` - Vector source with shield, brain, and eye symbolism

#### PNG Icons (to be generated)
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (Primary - Android)
- icon-384x384.png
- icon-512x512.png (Primary - Splash screens)

### 3. Microsoft Tile Config (`/public/browserconfig.xml`)
Windows tile configuration for Microsoft Edge.

### 4. Updated HTML (`/index.html`)
Added meta tags for:
- PWA manifest link
- Theme colors (light/dark)
- Apple Web App meta tags
- Microsoft tile configuration
- Open Graph social meta tags
- Twitter card meta tags

---

## Generating Icons

You have **three options** to generate PNG icons:

### Option 1: HTML Generator (Easiest)

1. Open `scripts/generate-icons.html` in your browser
2. Click "Generate All Icons"
3. Download each icon (or use "Download All")
4. Place icons in `/public/icons/` directory

### Option 2: Node.js Script (If Sharp installed)

```bash
cd scripts
node generate-icons-node.js
```

**Requirements**: `npm install sharp --save-dev`

### Option 3: Online Tools

1. Visit https://svgtopng.com/ or similar
2. Upload `/public/icons/icon.svg`
3. Generate each size: 72, 96, 128, 144, 152, 192, 384, 512
4. Save as: `icon-{size}x{size}.png`

### Option 4: ImageMagick (Command Line)

```bash
cd public/icons
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

---

## Testing Installation

### Desktop (Chrome/Edge)

1. Start dev server: `npm run dev`
2. Open http://localhost:5173/
3. Look for install icon in address bar (➕ or install button)
4. Click to install
5. App opens in standalone window

**Alternative**: Three-dot menu → "Install SML Guardian..."

### Mobile (Android)

1. Open site in Chrome/Edge
2. Tap three-dot menu
3. Select "Add to Home screen" or "Install app"
4. Confirm installation
5. App appears on home screen with icon

### Mobile (iOS - Safari)

1. Open site in Safari
2. Tap Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Edit name if desired
5. Tap "Add"

**Note**: iOS has limited PWA support compared to Android/Desktop.

---

## PWA Requirements Checklist

✅ **HTTPS** - Required for PWA (dev server uses HTTP, production needs HTTPS)
✅ **manifest.json** - App metadata
✅ **Icons** - Multiple sizes (192x192 and 512x512 minimum)
✅ **Service Worker** - Already implemented (Sprint 12)
✅ **start_url** - Entry point for app
✅ **display: standalone** - Removes browser UI
✅ **theme_color** - Brand color

---

## Deployment Notes

### GitHub Pages

```bash
npm run build
# Deploy dist/ to GitHub Pages
```

Make sure GitHub Pages is served over HTTPS (it is by default).

### Netlify/Vercel

1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Auto-deploys on push

Both platforms serve over HTTPS automatically.

### Custom Domain

If using custom domain:
1. Ensure HTTPS is enabled (Let's Encrypt, Cloudflare, etc.)
2. Update `start_url` in manifest.json if using subdirectory
3. Update social media image URLs (og:image, twitter:image)

---

## Features Explained

### App Shortcuts

Users can right-click the app icon (desktop) or long-press (mobile) to access:

- **New Conversation** - Opens app with `?action=new`
- **Analytics Dashboard** - Opens app with `?action=analytics`

Handle these in your app:

```typescript
// In App.tsx or routing logic
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');

  if (action === 'new') {
    // Create new conversation
  } else if (action === 'analytics') {
    // Open analytics dashboard
  }
}, []);
```

### Share Target

Users can share text from other apps directly to SML Guardian:

1. Select text in any app
2. Tap "Share"
3. Select "SML Guardian"
4. Text is sent to your app

Handle in your app:

```typescript
// In App.tsx
useEffect(() => {
  // Handle shared content
  if (window.location.pathname === '/share') {
    const formData = new URLSearchParams(window.location.search);
    const sharedText = formData.get('text');
    const sharedTitle = formData.get('title');
    const sharedUrl = formData.get('url');

    // Create new conversation with shared content
  }
}, []);
```

---

## Troubleshooting

### Install button not showing

**Causes**:
- Not on HTTPS (required in production)
- Missing required manifest fields
- Missing Service Worker
- Browser doesn't support PWA (old browsers)

**Solutions**:
- Test on HTTPS domain (deploy to Netlify/Vercel)
- Check browser console for manifest errors
- Verify Service Worker is registered
- Use Chrome/Edge (best PWA support)

### Icons not loading

**Causes**:
- PNG icons not generated yet
- Incorrect file paths
- Icons missing from build

**Solutions**:
- Generate icons using one of the methods above
- Verify icons exist in `/public/icons/`
- Check browser Network tab for 404 errors
- Rebuild app: `npm run build`

### App doesn't work offline

**Causes**:
- Service Worker not registered
- Service Worker not caching correctly

**Solutions**:
- Check Service Worker in DevTools → Application → Service Workers
- Verify cache strategy in `public/sw.js`
- Test in production build (dev mode may behave differently)

---

## Browser Support

| Browser | Desktop | Mobile | PWA Support |
|---------|---------|--------|-------------|
| Chrome | ✅ Full | ✅ Full | Excellent |
| Edge | ✅ Full | ✅ Full | Excellent |
| Safari | ⚠️ Partial | ⚠️ Limited | Basic |
| Firefox | ⚠️ Partial | ✅ Good | Good |
| Opera | ✅ Full | ✅ Full | Excellent |

**Best Experience**: Chrome or Edge on Android/Desktop

---

## Next Steps

1. **Generate Icons** - Use one of the methods above
2. **Test Locally** - Verify install button appears
3. **Deploy** - Push to production (HTTPS required)
4. **Test Installation** - Install on desktop and mobile
5. **Share** - Let users know they can install!

---

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Guide](https://web.dev/progressive-web-apps/)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [Icon Generator](https://realfavicongenerator.net/)

---

*Generated: Sprint 14 - PWA Implementation*
