# Free MongoDB Database Setup

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for free account
3. Create a new cluster (free tier: M0)

## Step 2: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Step 3: Add to Environment Variables

Add this to your `.env` file:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ttphotos
```

## Step 4: Deploy

The app will automatically:

- Connect to your database
- Create the `uploadState` collection
- Persist upload schedules across server restarts

## Benefits

✅ **Persistent uploads** - Works even if you close the website  
✅ **Server restart recovery** - Automatically resumes scheduled uploads  
✅ **Free forever** - MongoDB Atlas free tier is generous  
✅ **No setup required** - Just add the connection string

That's it! Your uploads will now persist even when the server restarts or you close the browser.
