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
    scope: 'user.info.basic,video.publish',
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
    lyrics: 'And I already heard what you said already...',
  },
  {
    id: 'MUSIC_ID_2',
    name: 'Poley More - Nowhere To Be Found',
    lyrics: '‘Cause i loved you with my eyes closed...',
  },
  {
    id: 'MUSIC_ID_3',
    name: 'prod.push, Poley More - HAPPY ANNIVERSARY',
    lyrics: 'Thats my shawty knowing all the facts...',
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
    post_info: {
      title: 'TTPhotos',
      description: `🎵 ${song.name}\n#ttphotos`,
      privacy_level: 'PRIVATE_TO_SELF',
      disable_comment: false,
      auto_add_music: true,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_images: imageUrls,
      photo_cover_index: 0,
    },
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO',
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
// Dynamic slide renderer
// -------------------
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = '';
  let cursorY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line.length ? line + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
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

app.get('/slide', async (req, res) => {
  try {
    const variant = String(req.query.variant || 'intro');
    const song = typeof req.query.song === 'string' ? req.query.song : '';
    const lyrics = typeof req.query.lyrics === 'string' ? req.query.lyrics : '';
    const bg = typeof req.query.bg === 'string' ? req.query.bg : '';

    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background: photo if provided, otherwise gradient
    if (bg) {
      try {
        const img = await loadImage(
          path.join(process.cwd(), 'public/photos', bg)
        );
        // cover-fit image
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawW, drawH, dx, dy;
        if (imgRatio > canvasRatio) {
          // image wider than canvas
          drawH = height;
          drawW = height * imgRatio;
          dx = (width - drawW) / 2;
          dy = 0;
        } else {
          // image taller than canvas
          drawW = width;
          drawH = width / imgRatio;
          dx = 0;
          dy = (height - drawH) / 2;
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);
      } catch (e) {
        // fallback gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
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
      title = "It's just a song..";
    } else if (variant === 'song') {
      title = 'the song:';
      body = song;
    } else if (variant === 'lyrics') {
      title = 'lyrics';
      body = lyrics;
    } else {
      title = 'TTPhotos';
    }

    const margin = 80;
    const maxTextWidth = width - margin * 2;

    // Draw title (centered)
    ctx.font = GlobalFonts.has('InterBold')
      ? '108px InterBold'
      : 'bold 108px sans-serif';
    const titleMetrics = ctx.measureText(title);
    const titleRenderWidth = Math.min(titleMetrics.width, maxTextWidth);
    const titleX = (width - titleRenderWidth) / 2;
    const titleY = 220;
    ctx.fillText(title, titleX, titleY);

    // Draw body/wrapped lyrics
    if (body) {
      if (variant === 'song') {
        // Emphasize song name
        ctx.font = GlobalFonts.has('InterBold')
          ? '88px InterBold'
          : 'bold 88px sans-serif';
        ctx.fillStyle = '#FFCC00';
        const startY = titleY + 180;
        const songLineHeight = 100;
        drawWrappedText(
          ctx,
          body,
          margin,
          startY,
          maxTextWidth,
          songLineHeight
        );
        ctx.fillStyle = '#FFFFFF';
      } else if (variant === 'lyrics') {
        // Lyrics panel
        const panelX = margin;
        const panelY = titleY + 160;
        const panelW = width - margin * 2;
        const panelH = height - panelY - 240;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000000';
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 28);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Lyrics text
        ctx.font = GlobalFonts.has('Inter') ? '64px Inter' : '64px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        const lineHeight = 78;
        const innerPad = 40;
        drawWrappedText(
          ctx,
          body,
          panelX + innerPad,
          panelY + innerPad,
          panelW - innerPad * 2,
          lineHeight
        );
      }
    }

    // Footer CTA
    ctx.font = GlobalFonts.has('Inter') ? '48px Inter' : '48px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('Tap to listen and follow for more', width / 2, height - 160);
    ctx.textAlign = 'left';

    res.set('Content-Type', 'image/png');
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
