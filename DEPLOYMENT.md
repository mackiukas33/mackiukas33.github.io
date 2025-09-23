# Deployment Guide

## Environment Variables Setup

### For Vercel Deployment:

1. **Push your code to GitHub**
2. **Connect to Vercel:**

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect it's a Next.js app

3. **Add Environment Variables in Vercel Dashboard:**

   - Go to your project → Settings → Environment Variables
   - Add these variables:

   ```
   TIKTOK_CLIENT_KEY = your_tiktok_client_key_here
   TIKTOK_CLIENT_SECRET = your_tiktok_client_secret_here
   TIKTOK_REDIRECT_URI = https://your-app-name.vercel.app/api/auth/callback
   NEXT_PUBLIC_BASE_URL = https://your-app-name.vercel.app
   ```

4. **Update TikTok App Settings:**
   - Go to your TikTok Developer Portal
   - Update the redirect URI to match your Vercel URL
   - Example: `https://tiktok-carousel-app.vercel.app/api/auth/callback`

### For Netlify Deployment:

1. **Build Command:** `npm run build`
2. **Publish Directory:** `.next`
3. **Environment Variables in Netlify:**
   - Go to Site Settings → Environment Variables
   - Add the same variables as above

### For Railway/Render:

1. **Connect your GitHub repo**
2. **Add Environment Variables in dashboard:**
   - Same variables as Vercel
   - Update `NEXT_PUBLIC_BASE_URL` to your Railway/Render URL

## Important Notes:

- **Never commit `.env.local`** - it's in `.gitignore`
- **Update redirect URIs** in TikTok Developer Portal for production
- **Use HTTPS URLs** for production redirect URIs
- **Test the OAuth flow** after deployment

## Environment Variable Reference:

| Variable               | Description                   | Example                                        |
| ---------------------- | ----------------------------- | ---------------------------------------------- |
| `TIKTOK_CLIENT_KEY`    | Your TikTok app client key    | `aw1234567890abcdef`                           |
| `TIKTOK_CLIENT_SECRET` | Your TikTok app client secret | `secret1234567890abcdef`                       |
| `TIKTOK_REDIRECT_URI`  | OAuth callback URL            | `https://yourapp.vercel.app/api/auth/callback` |
| `NEXT_PUBLIC_BASE_URL` | Your app's base URL           | `https://yourapp.vercel.app`                   |

## Local Development:

1. Copy `env.example` to `.env.local`
2. Fill in your TikTok API credentials
3. Run `npm run dev`
   sadasd
