# Frontend Deployment Guide

## Environment Configuration

The frontend has **ZERO hardcoded URLs**. All API endpoints are configured via environment variables.

### Required Environment Variables

Create a `.env` file (or configure in your hosting platform) with:

```env
VITE_API_URL=<your-backend-url>
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

## Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Production Deployment

### Step 1: Set Environment Variables

**For your production environment, set:**

```env
VITE_API_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-google-client-id
```

**Examples for different platforms:**

#### Vercel
```bash
vercel env add VITE_API_URL
# Enter: https://api.yourdomain.com

vercel env add VITE_GOOGLE_CLIENT_ID
# Enter: your-production-client-id
```

Or in Vercel Dashboard:
- Go to Project Settings → Environment Variables
- Add `VITE_API_URL` = `https://api.yourdomain.com`
- Add `VITE_GOOGLE_CLIENT_ID` = `your-production-client-id`

#### Netlify
In `netlify.toml`:
```toml
[build.environment]
  VITE_API_URL = "https://api.yourdomain.com"
  VITE_GOOGLE_CLIENT_ID = "your-production-client-id"
```

Or in Netlify Dashboard:
- Go to Site Settings → Build & Deploy → Environment
- Add variables

#### Docker
In your `Dockerfile`:
```dockerfile
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
```

Then build:
```bash
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-id \
  -t anifight-frontend .
```

### Step 2: Build the Application

```bash
npm run build
```

This creates optimized production files in the `dist/` directory.

### Step 3: Deploy

The `dist/` folder contains static files ready for deployment to any static hosting service.

## Important Notes

### ⚠️ No Hardcoded Fallbacks

The application will **NOT work** if `VITE_API_URL` is not set. This is intentional to prevent:
- Accidentally deploying production pointing to localhost
- Hard-to-debug environment issues
- Security vulnerabilities

### ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] `VITE_API_URL` is set to production backend URL
- [ ] `VITE_GOOGLE_CLIENT_ID` is set to production Google OAuth Client ID
- [ ] Backend CORS settings allow your frontend domain
- [ ] Google OAuth redirect URIs include your production domain
- [ ] `.env` file is in `.gitignore` (already done)
- [ ] No hardcoded URLs in source code (verified)

### Testing Your Build

Test the production build locally:

1. Build the app:
   ```bash
   npm run build
   ```

2. Preview the build:
   ```bash
   npm run preview
   ```

3. Open the preview URL (usually http://localhost:4173)

4. Test all authentication flows

## Backend CORS Configuration

Make sure your Django backend allows requests from your production frontend domain.

In `backend/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Local development
    'https://yourdomain.com',  # Production frontend
]

# Or for development only:
# CORS_ALLOW_ALL_ORIGINS = True  # DON'T USE IN PRODUCTION!
```

## Google OAuth Configuration

Update your Google OAuth settings:

1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add Authorized JavaScript origins:
   - `https://yourdomain.com`
4. Add Authorized redirect URIs:
   - `https://yourdomain.com`

## Troubleshooting

### Build fails with "VITE_API_URL is not defined"
- Make sure environment variables are set before running `npm run build`
- For Vite, env vars must start with `VITE_`

### API calls return 404 or CORS errors
- Check `VITE_API_URL` is correctly set
- Verify backend CORS settings
- Check browser network tab for actual URL being called

### Google OAuth not working
- Verify `VITE_GOOGLE_CLIENT_ID` is set
- Check Google Console has correct authorized domains
- Ensure using production Client ID (not dev Client ID)

### App shows blank page after deployment
- Check browser console for errors
- Verify all environment variables are set
- Check if build was successful
- Ensure static files are being served correctly

## Environment Files Reference

```
.env.example     # Template with all required variables (committed to git)
.env             # Local development (NOT committed to git)
.env.local       # Local overrides (NOT committed to git)
.env.production  # Production values (NOT committed to git)
```

All `.env*` files (except `.env.example`) are ignored by git.

## Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use different Google OAuth Client IDs** for dev and production
3. **Keep API URLs in environment variables** (already done)
4. **Rotate secrets regularly**
5. **Use HTTPS in production** for both frontend and backend
