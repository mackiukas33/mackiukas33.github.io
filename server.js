import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import qs from 'qs';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { getRandomHashtags, getRandomTitle } from './public/data/hashtags.js';
import { songs } from './public/data/songs.js';

import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
let lastAccessToken = null; // store latest token in-memory for status checks
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// TikTok sandbox credentials
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Serve static photos
app.use(express.static('public'));

// Register bundled fonts for serverless (e.g., Vercel) where system fonts are absent
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
} catch (e) {
  console.warn(
    'Font registration failed; ensure TTFs exist under public/fonts/',
    e.message || e
  );
}

app.get('/', (req, res) => {
  res.send(`
    <h1>TTPhotos Sandbox App</h1>
    <p>Click <a href="/login">here</a> to log in with TikTok sandbox.</p>
  `);
});

app.get('/login', (req, res) => {
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie('csrfState', csrfState, { maxAge: 60000 });

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: REDIRECT_URI,
    state: csrfState,
  });
  res.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );
});

// -------------------
// /callback route
// -------------------
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) return res.status(400).send('Missing code or state');
  // if (!stateStore.has(state)) return res.status(403).send('Invalid state');

  // stateStore.delete(state);

  try {
    // Exchange code for access token (sandbox)
    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      qs.stringify({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // res.json(tokenRes.data);
    const accessToken = tokenRes.data.access_token;
    lastAccessToken = accessToken;
    const publish = await postCarousel(accessToken);

    // Poll publish status a few times (best-effort) and include in response
    let statusChecks = [];
    try {
      const publishId = publish.api?.data?.publish_id;
      if (publishId) {
        for (let i = 0; i < 4; i++) {
          const s = await getPublishStatus(accessToken, publishId);
          statusChecks.push(s);
          // stop early if returned status indicates completion
          const st = s?.data?.status;
          if (
            st &&
            (st === 'PUBLISHED' || st === 'FAILED' || st === 'CANCELLED')
          )
            break;
          await sleep(2000);
        }
      }
    } catch (e) {
      statusChecks.push({ error: e.response?.data || { message: e.message } });
    }

    res.json({
      token: tokenRes.data,
      publish_api: publish.api,
      slide_urls: publish.imageUrls,
      status_checks: statusChecks,
    });
  } catch (err) {
    console.error(
      'Token error:',
      err.response?.status,
      err.response?.data || err.message
    );
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// -------------------
// Carousel Posting (sandbox-safe)
// -------------------

async function postCarousel(accessToken) {
  // Use dynamically generated slides with requested texts
  const baseUrl = 'https://ttphotos.online';
  const song = songs[Math.floor(Math.random() * songs.length)];
  // pick 3 photos for backgrounds
  const photosDir = path.join(process.cwd(), 'public/photos');
  const files = fs
    .readdirSync(photosDir)
    .filter(
      (f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
    );
  if (files.length < 3)
    throw new Error('Need at least 3 photos in /public/photos');
  // Ensure no duplicate photos are selected (shuffle and take first 3 unique)
  const shuffled = files.sort(() => 0.5 - Math.random());
  const uniqueSelected = [...new Set(shuffled)].slice(0, 3);
  const [bg1, bg2, bg3] = uniqueSelected;

  const imageUrls = [
    `${baseUrl}/slide?variant=intro&bg=${encodeURIComponent(bg1)}`,
    `${baseUrl}/slide?variant=song&song=${encodeURIComponent(
      song.name
    )}&bg=${encodeURIComponent(bg2)}`,
    `${baseUrl}/slide?variant=lyrics&lyrics=${encodeURIComponent(
      song.lyrics
    )}&bg=${encodeURIComponent(bg3)}`,
  ];
  // Get random catchy title and trending hashtags
  const title = getRandomTitle();
  const hashtags = getRandomHashtags(5).join(' ');

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

  const resp = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/content/init/',
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }
  );
  return { api: resp.data, imageUrls };
}

// -------------------
// Publish status check
// -------------------
async function getPublishStatus(accessToken, publishId) {
  const resp = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    { publish_id: publishId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }
  );
  return resp.data;
}

// GET /publish-status?publish_id=...
app.get('/publish-status', async (req, res) => {
  try {
    const publishId = String(req.query.publish_id || '');
    const token =
      (typeof req.query.access_token === 'string' && req.query.access_token) ||
      lastAccessToken;
    if (!publishId)
      return res.status(400).json({ error: 'missing publish_id' });
    if (!token)
      return res
        .status(400)
        .json({ error: 'missing access_token (none stored yet)' });
    const data = await getPublishStatus(token, publishId);
    res.json(data);
  } catch (e) {
    console.error('status error', e.response?.data || e.message);
    res.status(500).json(e.response?.data || { error: e.message });
  }
});

function drawRoundedRect(ctx, x, y, w, h, r) {
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

// Measure-only: wrap text into lines to fit maxWidth, preserving newlines
function computeWrappedLines(ctx, text, maxWidth) {
  const paragraphs = String(text).split(/\r?\n/);
  const lines = [];
  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line.length ? line + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Start server
// -------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
