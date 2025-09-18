import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// TikTok sandbox credentials
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// In-memory state store
const stateStore = new Set();

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

  let url = 'https://www.tiktok.com/v2/auth/authorize/';

  // the following params need to be in `application/x-www-form-urlencoded` format.
  url += `?client_key=${CLIENT_KEY}`;
  url += '&scope=user.info.basic';
  url += '&response_type=code';
  url += `&redirect_uri=${REDIRECT_URI}`;
  url += '&state=' + csrfState;

  res.redirect(url);
});

// -------------------
// /callback route
// -------------------
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) return res.status(400).send('Missing code or state');
  if (!stateStore.has(state)) return res.status(403).send('Invalid state');

  stateStore.delete(state);

  try {
    // Exchange code for access token (sandbox)
    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const accessToken = tokenRes.data.data.access_token;
    res.json({
      message: 'Login successful (sandbox)',
      accessToken,
      info: tokenRes.data,
    });

    // Optional: call postCarousel automatically here
    // await postCarousel(accessToken);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Failed to exchange code for token');
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

function pickRandomPhotos() {
  const photosDir = path.join(process.cwd(), 'public/photos');
  const allPhotos = fs
    .readdirSync(photosDir)
    .filter(
      (f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
    );
  if (allPhotos.length < 3)
    throw new Error('Need at least 3 photos in /public/photos');
  const shuffled = allPhotos.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map((f) => `/photos/${f}`);
}

async function postCarousel(accessToken) {
  const song = songs[Math.floor(Math.random() * songs.length)];
  const photos = pickRandomPhotos();

  console.log('=== Carousel Post (Sandbox) ===');
  console.log('Song:', song.name);
  console.log('Lyrics:', song.lyrics);
  console.log('Photos:', photos);
  console.log('Access token:', accessToken);
  console.log('===============================');
  // TODO: Replace with TikTok Content API calls for sandbox once token works
}

// -------------------
// Start server
// -------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
