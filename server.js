import express from 'express';
import axios from 'axios';
import qs from 'qs';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import dotenv from 'dotenv';
import { songs } from './public/data/songs.js';
import { getRandomTitle, getRandomHashtags } from './public/data/hashtags.js';

dotenv.config();

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// TikTok API Configuration
const TIKTOK_CONFIG = {
  clientKey: process.env.TIKTOK_CLIENT_KEY,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  redirectUri: process.env.TIKTOK_REDIRECT_URI,
  baseUrl: 'https://open.tiktokapis.com',
  scopes: 'user.info.basic,video.publish',
};

// Application State
const appState = {
  accessToken: null,
  uploadScheduler: {
    active: false,
    interval: null,
    nextUpload: null,
    dailyUploads: 0,
    lastUploadDate: null,
  },
};

// Constants
const UPLOAD_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours
const DAILY_UPLOAD_LIMIT = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ''
  );
};

const isNewDay = () => {
  const today = new Date().toDateString();
  return appState.uploadScheduler.lastUploadDate !== today;
};

const resetDailyUploads = () => {
  if (isNewDay()) {
    appState.uploadScheduler.dailyUploads = 0;
    appState.uploadScheduler.lastUploadDate = new Date().toDateString();
    log('Daily upload count reset');
  }
};

// ============================================================================
// MIDDLEWARE & STATIC FILES
// ============================================================================

app.use(express.json());
app.use(express.static('public'));

// Register fonts for serverless environments
try {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  GlobalFonts.registerFromPath(
    path.join(fontsDir, 'Inter-Regular.ttf'),
    'Inter'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, 'Inter-Bold.ttf'),
    'InterBold'
  );
} catch (error) {
  console.warn('Font registration failed:', error.message);
}

// ============================================================================
// TIKTOK API FUNCTIONS
// ============================================================================

class TikTokAPI {
  static async exchangeCodeForToken(code) {
    const tokenUrl = `${TIKTOK_CONFIG.baseUrl}/v2/oauth/token/`;
    const payload = {
      client_key: TIKTOK_CONFIG.clientKey,
      client_secret: TIKTOK_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: TIKTOK_CONFIG.redirectUri,
    };

    log('Exchanging code for token');
    const response = await axios.post(tokenUrl, qs.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }

  static async getUserInfo(accessToken) {
    const userUrl = `${TIKTOK_CONFIG.baseUrl}/v2/user/info/`;
    const response = await axios.get(userUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  static async createPhotoCarousel(
    accessToken,
    imageUrls,
    song,
    title,
    hashtags
  ) {
    const payload = {
      media_type: 'PHOTO',
      post_mode: 'MEDIA_UPLOAD',
      post_info: {
        title,
        description: `🎵 ${song.name}\n\n${hashtags}`,
        privacy_level: 'SELF_ONLY',
        disable_comment: false,
        auto_add_music: true,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_images: imageUrls,
        photo_cover_index: 0,
      },
    };

    log('Creating photo carousel', {
      song: song.name,
      imageCount: imageUrls.length,
    });

    const response = await axios.post(
      `${TIKTOK_CONFIG.baseUrl}/v2/post/publish/content/init/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );

    return response.data;
  }

  static async getPublishStatus(accessToken, publishId) {
    const statusUrl = `${TIKTOK_CONFIG.baseUrl}/v2/post/publish/status/fetch/`;
    const response = await axios.post(
      statusUrl,
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );
    return response.data;
  }
}

// ============================================================================
// IMAGE GENERATION FUNCTIONS
// ============================================================================

class ImageGenerator {
  static async generateSlide(variant, options = {}) {
    const { width, height } = { width: 1080, height: 1920 };
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load background image
    const bgImage = await this.loadRandomBackground();
    ctx.drawImage(bgImage, 0, 0, width, height);

    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Generate content based on variant
    switch (variant) {
      case 'intro':
        this.drawIntroSlide(ctx, width, height);
        break;
      case 'song':
        this.drawSongSlide(ctx, width, height, options.song);
        break;
      case 'lyrics':
        this.drawLyricsSlide(ctx, width, height, options.lyrics);
        break;
    }

    // Add footer
    this.drawFooter(ctx, width, height);

    return canvas.toBuffer('image/jpeg');
  }

  static async loadRandomBackground() {
    const photosDir = path.join(process.cwd(), 'public/photos');
    const files = fs
      .readdirSync(photosDir)
      .filter(
        (f) => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
      );

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const imagePath = path.join(photosDir, randomFile);
    return await loadImage(imagePath);
  }

  static drawIntroSlide(ctx, width, height) {
    ctx.font = 'bold 80px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.textAlign = 'center';
    ctx.strokeText('"It\'s just a song.."', width / 2, height / 2);
    ctx.fillText('"It\'s just a song.."', width / 2, height / 2);
  }

  static drawSongSlide(ctx, width, height, song) {
    ctx.font = 'bold 80px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.textAlign = 'center';
    ctx.strokeText('The song:', width / 2, height / 2);
    ctx.fillText('The song:', width / 2, height / 2);
  }

  static async drawLyricsSlide(ctx, width, height, lyrics) {
    // Draw gem emoji
    try {
      const gem = await loadImage(
        'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f48e.png'
      );
      const gemSize = 120;
      const gx = (width - gemSize) / 2;
      const gy = 180;
      ctx.drawImage(gem, gx, gy, gemSize, gemSize);
    } catch (error) {
      console.warn('Failed to load gem emoji:', error.message);
    }

    // Draw lyrics in shadow box
    this.drawLyricsBox(ctx, width, height, lyrics);
  }

  static drawLyricsBox(ctx, width, height, lyrics) {
    const lines = lyrics.split('\n');
    const lineHeight = 60;
    const padding = 40;
    const maxWidth = width - 2 * padding;

    // Calculate box dimensions
    const boxHeight = lines.length * lineHeight + 2 * padding;
    const boxY = (height - boxHeight) / 2;

    // Draw shadow box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.drawRoundedRect(ctx, padding, boxY, maxWidth, boxHeight, 20);
    ctx.fill();

    // Draw lyrics
    ctx.font = 'bold 50px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';

    lines.forEach((line, index) => {
      const y = boxY + padding + (index + 1) * lineHeight;
      ctx.strokeText(line, width / 2, y);
      ctx.fillText(line, width / 2, y);
    });
  }

  static drawFooter(ctx, width, height) {
    ctx.font = 'bold 50px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.textAlign = 'center';
    ctx.strokeText('Follow for more underrated gems', width / 2, height - 180);
    ctx.fillText('Follow for more underrated gems', width / 2, height - 180);
  }

  static drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// ============================================================================
// UPLOAD SCHEDULER
// ============================================================================

class UploadScheduler {
  static start() {
    if (appState.uploadScheduler.active) {
      log('Upload scheduler already active');
      return;
    }

    appState.uploadScheduler.active = true;
    appState.uploadScheduler.nextUpload = new Date(
      Date.now() + UPLOAD_INTERVAL_MS
    );

    // Immediate upload
    this.performUpload();

    // Schedule recurring uploads
    appState.uploadScheduler.interval = setInterval(() => {
      this.performUpload();
    }, UPLOAD_INTERVAL_MS);

    log('Upload scheduler started', {
      nextUpload: appState.uploadScheduler.nextUpload,
    });
  }

  static stop() {
    if (!appState.uploadScheduler.active) {
      log('Upload scheduler not active');
      return;
    }

    appState.uploadScheduler.active = false;
    appState.uploadScheduler.nextUpload = null;

    if (appState.uploadScheduler.interval) {
      clearInterval(appState.uploadScheduler.interval);
      appState.uploadScheduler.interval = null;
    }

    log('Upload scheduler stopped');
  }

  static async performUpload() {
    if (!appState.accessToken) {
      log('No access token available for upload');
      return;
    }

    resetDailyUploads();

    if (appState.uploadScheduler.dailyUploads >= DAILY_UPLOAD_LIMIT) {
      log('Daily upload limit reached', {
        dailyUploads: appState.uploadScheduler.dailyUploads,
      });
      return;
    }

    try {
      log('Performing scheduled upload');
      await this.createAndUploadCarousel();
      appState.uploadScheduler.dailyUploads++;
      appState.uploadScheduler.nextUpload = new Date(
        Date.now() + UPLOAD_INTERVAL_MS
      );
      log('Upload completed successfully', {
        dailyUploads: appState.uploadScheduler.dailyUploads,
      });
    } catch (error) {
      log('Upload failed', { error: error.message });
    }
  }

  static async createAndUploadCarousel() {
    const song = songs[Math.floor(Math.random() * songs.length)];
    const title = getRandomTitle();
    const hashtags = getRandomHashtags(5).join(' ');

    // Generate slide URLs
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://ttphotos.online';
    const imageUrls = [
      `${baseUrl}/slide?variant=intro`,
      `${baseUrl}/slide?variant=song&song=${encodeURIComponent(song.name)}`,
      `${baseUrl}/slide?variant=lyrics&lyrics=${encodeURIComponent(
        song.lyrics
      )}`,
    ];

    // Create carousel
    const result = await TikTokAPI.createPhotoCarousel(
      appState.accessToken,
      imageUrls,
      song,
      title,
      hashtags
    );

    // Poll status
    if (result.data?.publish_id) {
      await this.pollUploadStatus(result.data.publish_id);
    }

    return result;
  }

  static async pollUploadStatus(publishId) {
    for (let i = 0; i < 3; i++) {
      await sleep(2000);
      try {
        const status = await TikTokAPI.getPublishStatus(
          appState.accessToken,
          publishId
        );
        const statusType = status.data?.status;

        if (
          statusType === 'PUBLISHED' ||
          statusType === 'FAILED' ||
          statusType === 'CANCELLED'
        ) {
          log('Upload status final', { status: statusType });
          break;
        }
      } catch (error) {
        log('Status check failed', { error: error.message });
      }
    }
  }
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dashboard.html'));
});

// Login
app.get('/login', (req, res) => {
  try {
    log('Login endpoint hit');

    if (!TIKTOK_CONFIG.clientKey || !TIKTOK_CONFIG.redirectUri) {
      log('Missing TikTok configuration', {
        clientKey: !!TIKTOK_CONFIG.clientKey,
        redirectUri: !!TIKTOK_CONFIG.redirectUri,
      });
      return res.status(500).json({ error: 'TikTok configuration missing' });
    }

    const csrfState = Math.random().toString(36).substring(2);
    res.cookie('csrfState', csrfState, { maxAge: 60000 });

    const params = new URLSearchParams({
      client_key: TIKTOK_CONFIG.clientKey,
      scope: TIKTOK_CONFIG.scopes,
      response_type: 'code',
      redirect_uri: TIKTOK_CONFIG.redirectUri,
      state: csrfState,
    });

    const authUrl = `${TIKTOK_CONFIG.baseUrl}/v2/oauth/authorize/?${params}`;
    log('Redirecting to TikTok auth', { authUrl });
    res.redirect(authUrl);
  } catch (error) {
    log('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// OAuth callback
app.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Exchange code for token
    const tokenData = await TikTokAPI.exchangeCodeForToken(code);
    appState.accessToken = tokenData.access_token;

    // Get user info
    const userInfo = await TikTokAPI.getUserInfo(appState.accessToken);

    log('User authenticated successfully', {
      openId: tokenData.open_id,
      displayName: userInfo.data?.user?.display_name,
    });

    // Redirect to dashboard
    res.redirect('/dashboard?success=true');
  } catch (error) {
    log('Authentication failed', { error: error.message });
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// API Routes
app.get('/api/status', async (req, res) => {
  try {
    let userInfo = null;
    if (appState.accessToken) {
      userInfo = await TikTokAPI.getUserInfo(appState.accessToken);
    }

    res.json({
      connected: !!appState.accessToken,
      userInfo: userInfo?.data?.user,
      dailyUploads: appState.uploadScheduler.dailyUploads,
      uploadActive: appState.uploadScheduler.active,
      nextUpload: appState.uploadScheduler.nextUpload,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.get('/api/upload-state', (req, res) => {
  res.json({
    active: appState.uploadScheduler.active,
    nextUpload: appState.uploadScheduler.nextUpload,
    dailyUploads: appState.uploadScheduler.dailyUploads,
  });
});

app.post('/api/start-uploading', (req, res) => {
  if (!appState.accessToken) {
    return res.status(400).json({ error: 'Not authenticated' });
  }

  UploadScheduler.start();
  res.json({ success: true });
});

app.post('/api/stop-uploading', (req, res) => {
  UploadScheduler.stop();
  res.json({ success: true });
});

// Slide generation
app.get('/slide', async (req, res) => {
  try {
    const { variant, song, lyrics } = req.query;

    const options = {};
    if (song) options.song = { name: song };
    if (lyrics) options.lyrics = lyrics;

    const imageBuffer = await ImageGenerator.generateSlide(variant, options);

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.send(imageBuffer);
  } catch (error) {
    log('Slide generation failed', { error: error.message });
    res.status(500).json({ error: 'Failed to generate slide' });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// For Vercel deployment
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    log(`Server running on port ${PORT}`);
    log('TikTok API configured', {
      clientKey: TIKTOK_CONFIG.clientKey ? 'Set' : 'Missing',
      redirectUri: TIKTOK_CONFIG.redirectUri,
    });
  });
}
