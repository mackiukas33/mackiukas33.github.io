import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import qs from 'qs';
import { createCanvas } from '@napi-rs/canvas';

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

app.get('/', (req, res) => {
  res.send(`
    <h1>TTPhotos Sandbox App</h1>
    <p>Click <a href="/login">here</a> to log in with TikTok sandbox.</p>
  `);
});

// -------------------
// /login route
// -------------------
// app.get('/login', (req, res) => {
//   const state = crypto.randomBytes(16).toString('hex');
//   stateStore.add(state);

//   const formHtml = `
//     <html>
//       <body>
//         <form id="tiktokLogin" action="https://www.tiktok.com/v2/auth/authorize/" method="POST">
//           <input type="hidden" name="client_key" value="${CLIENT_KEY}"/>
//           <input type="hidden" name="response_type" value="code"/>
//           <input type="hidden" name="scope" value="user.info.basic"/>
//           <input type="hidden" name="redirect_uri" value="${REDIRECT_URI}"/>
//           <input type="hidden" name="state" value="${state}"/>
//         </form>
//         <script>
//           document.getElementById('tiktokLogin').submit();
//         </script>
//       </body>
//     </html>
//   `;

//   res.send(formHtml);
// });

// app.get('/login', (req, res) => {
//   const state = crypto.randomBytes(16).toString('hex');
//   stateStore.add(state);

//   const params = new URLSearchParams({
//     client_key: CLIENT_KEY,
//     response_type: 'code',
//     scope: 'user.info.basic',
//     redirect_uri: REDIRECT_URI,
//     state: state,
//   });

//   // Redirect user to TikTok login page
//   res.redirect(
//     `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
//   );
// });

app.get('/login', (req, res) => {
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie('csrfState', csrfState, { maxAge: 60000 });

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic video.publish',
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
  const imageUrls = [
    `${baseUrl}/slide?variant=intro`,
    `${baseUrl}/slide?variant=song&song=${encodeURIComponent(song.name)}`,
    `${baseUrl}/slide?variant=lyrics&lyrics=${encodeURIComponent(song.lyrics)}`,
  ];

  const payload = {
    post_info: {
      title: 'TTPhotos',
      description: `🎵 ${song.name}\n#ttphotos`,
      privacy_level: 'PUBLIC_TO_EVERYONE',
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

    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

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
    ctx.font = 'bold 108px sans-serif';
    const titleMetrics = ctx.measureText(title);
    const titleRenderWidth = Math.min(titleMetrics.width, maxTextWidth);
    const titleX = (width - titleRenderWidth) / 2;
    const titleY = 220;
    ctx.fillText(title, titleX, titleY);

    // Draw body/wrapped lyrics
    if (body) {
      if (variant === 'song') {
        // Emphasize song name
        ctx.font = 'bold 88px sans-serif';
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
        ctx.font = '64px sans-serif';
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
    ctx.font = '48px sans-serif';
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
