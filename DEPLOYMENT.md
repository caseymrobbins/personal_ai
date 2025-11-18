# Deployment Guide

Complete guide for deploying SML Guardian to various platforms.

## Table of Contents

- [CI/CD Pipeline](#cicd-pipeline)
- [GitHub Pages](#github-pages)
- [Netlify](#netlify)
- [Vercel](#vercel)
- [Docker](#docker)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline in `.github/workflows/ci-cd.yml`:

**Triggers:**
- Push to `main`, `master`, `develop`, or `claude/**` branches
- Pull requests to `main`, `master`, or `develop`

**Jobs:**

1. **Lint & Type Check**
   - Runs ESLint for code quality
   - Runs TypeScript compiler in check mode
   - Fast fail for code quality issues

2. **Unit Tests**
   - Runs full Vitest test suite (63 tests)
   - Generates code coverage reports
   - Uploads coverage to Codecov (if configured)
   - Artifacts retained for 30 days

3. **Build**
   - Compiles production bundle with Vite
   - Generates bundle size report
   - Uploads build artifacts (7-day retention)
   - Only runs if lint and tests pass

4. **Deploy to GitHub Pages**
   - Automatic deployment on `main`/`master` branch
   - Uses official GitHub Pages action
   - Requires repository settings configuration

**Pipeline Diagram:**
```
┌─────────┐     ┌──────┐     ┌───────┐     ┌────────────┐
│  Lint   │ ──> │ Test │ ──> │ Build │ ──> │   Deploy   │
│ & Type  │     │      │     │       │     │ (main only)│
└─────────┘     └──────┘     └───────┘     └────────────┘
```

---

## GitHub Pages

### Initial Setup

1. **Enable GitHub Pages in Repository Settings:**
   - Go to `Settings` → `Pages`
   - Source: **GitHub Actions**
   - No branch selection needed (handled by workflow)

2. **Configure Base Path (if using custom domain):**

   In `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/', // For custom domain
     // OR
     base: '/repository-name/', // For github.io/repository-name
   });
   ```

3. **Push to Main Branch:**
   ```bash
   git push origin main
   ```

4. **Monitor Deployment:**
   - Go to `Actions` tab
   - Watch workflow run
   - Visit your site at `https://username.github.io/repository-name/`

### Custom Domain

1. Add `CNAME` file to `public/` directory:
   ```
   yourdomain.com
   ```

2. Configure DNS records:
   - A records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - Or CNAME to `username.github.io`

3. Enable HTTPS in repository settings

---

## Netlify

### Deploy via Git Integration

1. **Sign Up / Log In:**
   - Visit [netlify.com](https://netlify.com)
   - Connect your GitHub account

2. **Create New Site:**
   - Click "Add new site" → "Import an existing project"
   - Select your repository
   - Configure build settings:
     - **Build command:** `npm run build`
     - **Publish directory:** `dist`
     - **Node version:** `18`

3. **Environment Variables:**
   - Go to Site Settings → Environment Variables
   - Add any required variables (see [Environment Variables](#environment-variables))

4. **Deploy:**
   - Netlify auto-deploys on every push to main
   - Branch deploys available for PRs

### Deploy via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build your app
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### `netlify.toml` Configuration

Create in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
```

---

## Vercel

### Deploy via Git Integration

1. **Sign Up / Log In:**
   - Visit [vercel.com](https://vercel.com)
   - Connect your GitHub account

2. **Import Project:**
   - Click "Add New" → "Project"
   - Select your repository
   - Vercel auto-detects Vite settings

3. **Configure (if needed):**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install --ignore-scripts`

4. **Deploy:**
   - Click "Deploy"
   - Auto-deploys on every push

### Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### `vercel.json` Configuration

Create in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --ignore-scripts",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" }
      ]
    }
  ]
}
```

---

## Docker

### Dockerfile

Create in project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### `nginx.conf`

Create in project root:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Build and Run

```bash
# Build image
docker build -t sml-guardian .

# Run container
docker run -p 8080:80 sml-guardian

# Visit http://localhost:8080
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

Run with:
```bash
docker-compose up -d
```

---

## Environment Variables

SML Guardian is designed to run entirely client-side with no backend, but you may need these for build/deployment:

### Build-Time Variables

These are embedded at build time via Vite:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application name | `SML Guardian` |
| `VITE_APP_VERSION` | Version from package.json | Auto-detected |
| `BASE_URL` | Base path for assets | `/` |

### Example `.env.production`

```env
VITE_APP_NAME="SML Guardian"
BASE_URL=/
```

### Accessing in Code

```typescript
const appName = import.meta.env.VITE_APP_NAME;
const baseUrl = import.meta.env.BASE_URL;
```

---

## Troubleshooting

### GitHub Pages Issues

**Problem:** 404 errors on refresh
- **Cause:** SPA routing not configured
- **Fix:** GitHub Pages doesn't support SPA fallback. Use hash routing or add a 404.html that redirects to index.html

**Problem:** Assets not loading (404)
- **Cause:** Incorrect base path
- **Fix:** Set `base: '/repository-name/'` in `vite.config.ts`

**Problem:** Deployment not triggering
- **Cause:** GitHub Pages source not set to "GitHub Actions"
- **Fix:** Check repository Settings → Pages → Source

### Netlify Issues

**Problem:** Build fails with "sharp" error
- **Cause:** Optional dependency download failure
- **Fix:** Use `npm ci --ignore-scripts` or add to netlify.toml:
  ```toml
  [build.environment]
    NPM_FLAGS = "--ignore-scripts"
  ```

**Problem:** Redirects not working
- **Cause:** Missing redirect configuration
- **Fix:** Add `[[redirects]]` to netlify.toml (see above)

### Vercel Issues

**Problem:** Large bundle size warning
- **Cause:** Vercel has 250MB limit for free tier
- **Fix:** SML Guardian is well under this, but check with `npm run build`

**Problem:** Environment variables not working
- **Cause:** Variables not prefixed with `VITE_`
- **Fix:** All client-side env vars must start with `VITE_`

### Docker Issues

**Problem:** Container exits immediately
- **Cause:** Nginx configuration error
- **Fix:** Check nginx.conf syntax with `nginx -t`

**Problem:** Large image size
- **Cause:** Including node_modules in final image
- **Fix:** Use multi-stage build (see Dockerfile above)

### General Build Issues

**Problem:** TypeScript errors in build
- **Cause:** Type mismatches or missing types
- **Fix:** Run `npx tsc --noEmit` locally to see errors

**Problem:** Tests fail in CI but pass locally
- **Cause:** Environment differences (timezone, Node version)
- **Fix:** Ensure CI uses Node 18, check test determinism

**Problem:** Out of memory during build
- **Cause:** Large project, insufficient Node memory
- **Fix:** Increase Node memory: `NODE_OPTIONS=--max_old_space_size=4096 npm run build`

---

## Performance Optimization

### Build Optimization

1. **Code Splitting:**
   - Vite automatically splits code by routes
   - Lazy load components with `React.lazy()`

2. **Tree Shaking:**
   - Import only what you need: `import { func } from 'lib'`
   - Avoid `import * as lib`

3. **Compression:**
   - Enable gzip/brotli in your server config
   - Netlify/Vercel do this automatically

### Runtime Optimization

1. **PWA Caching:**
   - Service worker caches assets for offline use
   - Update cache strategy in `public/sw.js` if needed

2. **Database:**
   - WASM SQLite runs entirely in-browser
   - IndexedDB provides persistent storage
   - No network latency for queries

3. **Bundle Analysis:**
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```

---

## Monitoring

### GitHub Actions

- View workflow runs in "Actions" tab
- Download artifacts from completed runs
- Check coverage reports in Codecov (if configured)

### Netlify

- Dashboard shows deploy status, build logs
- Analytics available on paid plans
- Real-time logs via CLI: `netlify watch`

### Vercel

- Dashboard shows deployments, performance metrics
- Web Analytics built-in (free tier)
- Real-time logs in deployment details

---

## Rollback Procedures

### GitHub Pages

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or deploy specific commit
git checkout <commit-hash>
git push origin main --force
```

### Netlify

- Go to Deploys tab
- Click "..." on previous deploy
- Click "Publish deploy"

### Vercel

- Go to Deployments
- Click on previous deployment
- Click "Promote to Production"

### Docker

```bash
# List images
docker images

# Run previous version
docker run -p 8080:80 sml-guardian:<tag>
```

---

## Security Considerations

1. **HTTPS Only:**
   - Always use HTTPS in production
   - All platforms provide free SSL

2. **Content Security Policy:**
   - Add CSP headers in server config
   - Restrict inline scripts if possible

3. **API Keys:**
   - Never commit API keys to git
   - Users enter their own API keys
   - Keys stored encrypted in IndexedDB

4. **Dependencies:**
   - Regularly update with `npm audit`
   - Monitor GitHub security alerts
   - CI fails on high severity vulnerabilities (can configure)

---

## Support

For deployment issues:
1. Check this guide's troubleshooting section
2. Review platform-specific documentation
3. Check GitHub Actions logs for CI/CD issues
4. File an issue in the repository

---

*Last Updated: Sprint 14 - CI/CD Implementation*
