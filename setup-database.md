# Database Setup Guide

## Quick Setup Options

### Option 1: Supabase (Recommended - Free)

1. **Create Account & Project**

   - Go to [supabase.com](https://supabase.com)
   - Sign up and create a new project
   - Choose a region (e.g., US East, Europe)

2. **Get Database URL**

   - Go to Settings → Database
   - Copy the "Connection string" (URI)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **Add to Environment Variables**
   ```bash
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

### Option 2: Railway (Free Tier)

1. **Create Account & Project**

   - Go to [railway.app](https://railway.app)
   - Sign up and create a new project
   - Add a PostgreSQL database

2. **Get Database URL**

   - Copy the connection string from Railway dashboard
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway`

3. **Add to Environment Variables**
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
   ```

### Option 3: Neon (Free Tier)

1. **Create Account & Project**

   - Go to [neon.tech](https://neon.tech)
   - Sign up and create a new project

2. **Get Database URL**

   - Copy the connection string
   - Format: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]`

3. **Add to Environment Variables**
   ```bash
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]"
   ```

## After Setting Up Database

1. **Add DATABASE_URL to your environment variables**
2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

## For Vercel Deployment

Add these environment variables in your Vercel dashboard:

- `DATABASE_URL`
- `JWT_SECRET`
- `CRON_SECRET`
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI`
- `NEXT_PUBLIC_BASE_URL`

## Testing Database Connection

Once set up, you can test the connection:

```bash
npx prisma db pull
```

This will verify your database connection is working.
