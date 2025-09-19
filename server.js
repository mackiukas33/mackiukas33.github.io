import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import qs from 'qs';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
let lastAccessToken = null; // store latest token in-memory for status checks

// TikTok sandbox credentials
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// In-memory state store
// const stateStore = new Set();

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
    res.json({
      token: tokenRes.data,
      publish_api: publish.api,
      slide_urls: publish.imageUrls,
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
const songs = [
  {
    id: 'MUSIC_ID_1',
    name: 'prod.push, Poley More - MORE TME',
    lyrics: `And I already heard what you said already, 
You ain't even pause already
Late night talks already...
Troubles got u on, don't know where to go
So you lost already
Yeah,
Saying I ain't did you right
So tell me what you like
Don't try me
`,
  },
  {
    id: 'MUSIC_ID_2',
    name: 'Poley More - Nowhere To Be Found',
    lyrics: `‘Cause i loved you with my eyes closed
Take off my blindfold
My heart is ice cold now
You left me stranded
And took my heart for granted
And now you’re nowhere to be found`,
  },
  {
    id: 'MUSIC_ID_3',
    name: 'prod.push, Poley More - HAPPY ANNIVERSARY',
    lyrics: `Thats my shawty knowing all the facts
She wont get attached
Breaking all the rules she thought i won't last
She saw me, we ain't speaking
she just want it back
Running round in circles
there's no coming back
thats how you do.

Gifts and all designers 
if you wanted these - that’s for you 
When you ready - come 
ama set a table just for two.
Miss the time we spent 
right under the moon.
Just me and you, me and you`,
  },
];

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
  const selected = files.sort(() => 0.5 - Math.random()).slice(0, 3);
  const [bg1, bg2, bg3] = selected;

  const imageUrls = [
    `${baseUrl}/slide?variant=intro&bg=${encodeURIComponent(bg1)}`,
    `${baseUrl}/slide?variant=song&song=${encodeURIComponent(
      song.name
    )}&bg=${encodeURIComponent(bg2)}`,
    `${baseUrl}/slide?variant=lyrics&lyrics=${encodeURIComponent(
      song.lyrics
    )}&bg=${encodeURIComponent(bg3)}`,
  ];
  const payload = {
    media_type: 'PHOTO',
    post_mode: 'DIRECT_POST', // or keep 'DIRECT_POST'
    post_info: {
      title: 'Test',
      description: `🎵 ${song.name}\n#ttphotos`,
      privacy_level: 'SELF_ONLY', // use this exact value
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
  const resp = await axios.get(
    'https://open.tiktokapis.com/v2/post/publish/status/',
    {
      params: { publish_id: publishId },
      headers: { Authorization: `Bearer ${accessToken}` },
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

// -------------------
// Dynamic slide renderer
// -------------------
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const paragraphs = String(text).split(/\r?\n/);
  let cursorY = y;
  const align = options.align || 'left'; // 'left' | 'center'
  const doStroke = options.stroke === true;

  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line.length ? line + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        const renderWidth = Math.min(ctx.measureText(line).width, maxWidth);
        const drawX = align === 'center' ? x - renderWidth / 2 : x;
        if (doStroke) ctx.strokeText(line, drawX, cursorY);
        ctx.fillText(line, drawX, cursorY);
        line = words[i];
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      const renderWidth = Math.min(ctx.measureText(line).width, maxWidth);
      const drawX = align === 'center' ? x - renderWidth / 2 : x;
      if (doStroke) ctx.strokeText(line, drawX, cursorY);
      ctx.fillText(line, drawX, cursorY);
    }
    // Extra advance between paragraphs except after last
    if (p < paragraphs.length - 1) {
      cursorY += lineHeight;
    }
  }
  return cursorY; // last baseline used
}

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

app.get('/slide', async (req, res) => {
  try {
    const variant = String(req.query.variant || 'intro');
    const song = typeof req.query.song === 'string' ? req.query.song : '';
    let lyrics = typeof req.query.lyrics === 'string' ? req.query.lyrics : '';

    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background: always pick a random photo; fallback to gradient if none
    try {
      const photosDir = path.join(process.cwd(), 'public/photos');
      const files = fs
        .readdirSync(photosDir)
        .filter(
          (f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
        );
      if (files.length > 0) {
        const randomBg = files[Math.floor(Math.random() * files.length)];
        const img = await loadImage(path.join(photosDir, randomBg));
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawW, drawH, dx, dy;
        if (imgRatio > canvasRatio) {
          drawH = height;
          drawW = height * imgRatio;
          dx = (width - drawW) / 2;
          dy = 0;
        } else {
          drawW = width;
          drawH = width / imgRatio;
          dx = 0;
          dy = (height - drawH) / 2;
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    } catch {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0f0c29');
      grad.addColorStop(0.5, '#302b63');
      grad.addColorStop(1, '#24243e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle vignette
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Text style
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;

    let title = '';
    let body = '';

    if (variant === 'intro') {
      title = '"It\'s just a song.."';
    } else if (variant === 'song') {
      title = 'The song:';
    } else if (variant === 'lyrics') {
      title = '';
      if (!lyrics) {
        // pick random lyrics from songs array if none provided
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        lyrics = randomSong.lyrics;
      }
      body = lyrics;
    } else {
      title = 'TTPhotos';
    }

    const margin = 80;
    const maxTextWidth = width - margin * 2;

    // If lyrics slide, draw Twemoji gem image above the title
    if (variant === 'lyrics') {
      try {
        const gem = await loadImage(
          'https://twemoji.maxcdn.com/v/latest/72x72/1f48e.png'
        );
        const gemSize = 120;
        const gx = (width - gemSize) / 2;
        const gy = 130;
        ctx.drawImage(gem, gx, gy, gemSize, gemSize);
      } catch {}
    }

    // Draw title (centered). Reduced ~30%
    ctx.font = GlobalFonts.has('InterBold')
      ? '68px InterBold'
      : 'bold 68px sans-serif';
    const titleMetrics = ctx.measureText(title);
    const titleRenderWidth = Math.min(titleMetrics.width, maxTextWidth);
    const titleX = (width - titleRenderWidth) / 2;
    let titleY = 220;
    if (variant === 'intro' || variant === 'song') {
      titleY = Math.floor((height - 68) / 2);
    } else if (variant === 'lyrics') {
      titleY = 300;
    }
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeText(title, titleX, titleY);
    ctx.fillText(title, titleX, titleY);

    // Draw body/wrapped lyrics
    if (body) {
      if (variant === 'lyrics') {
        // Lyrics panel: center text within a fitted shadow box
        const panelX = margin;
        const panelW = width - margin * 2;
        ctx.font = GlobalFonts.has('Inter') ? '36px Inter' : '36px sans-serif';
        const lineHeight = 46;
        const innerPad = 40;
        const lines = computeWrappedLines(ctx, body, panelW - innerPad * 2);
        const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
        const panelH = totalHeight + innerPad * 2;
        const panelY = Math.max(0, Math.floor((height - panelH) / 2));

        // Draw shadow box
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000000';
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 28);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw centered lyrics
        ctx.fillStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.textAlign = 'center';
        const startY = panelY + Math.floor((panelH - totalHeight) / 2);
        const centerX = panelX + Math.floor(panelW / 2);
        for (let i = 0; i < lines.length; i++) {
          const y = startY + i * lineHeight;
          ctx.strokeText(lines[i], centerX, y);
          ctx.fillText(lines[i], centerX, y);
        }
        ctx.textAlign = 'left';
      }
    }

    // Footer CTA (reduced ~30%)
    ctx.font = GlobalFonts.has('Inter') ? '31px Inter' : '31px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeText('Follow for more underrated gems', width / 2, height - 160);
    ctx.fillText('Follow for more underrated gems', width / 2, height - 160);
    ctx.textAlign = 'left';

    // Prevent CDN/browser caching so previews can change each load
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(canvas.toBuffer('image/png'));
  } catch (e) {
    console.error('slide render error', e);
    res.status(500).send('render_error');
  }
});
// -------------------
// Start server
// -------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
