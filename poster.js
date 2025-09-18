/**
 * TikTok Auto Carousel Poster (Dynamic GitHub Images)
 * Node.js 18+
 * Dependencies: axios, node-schedule
 */

import axios from 'axios';
import schedule from 'node-schedule';

// -------------------- CONFIG --------------------
const ACCESS_TOKEN = 'YOUR_TIKTOK_ACCESS_TOKEN';
const GITHUB_USER = 'mackiukas33';
const REPO = 'mackiukas33'; // your repo name
const BRANCH = 'main'; // or "master"
const HASHTAGS = [
  '#newsong',
  '#rnb',
  '#newmusic',
  '#darkrnb',
  '#rnbartist',
  '#foru',
];

// Songs with lyrics and TikTok music IDs
const SONGS = [
  {
    name: 'prod.push, Poley More - MORE TME',
    music_id: '1234567890', // replace with actual TikTok music_id
    lyrics: `And I already heard what you said already
You ain't even pause already
Late night talks already
Troubles got u on, don't know where to go
So you lost already,
Yeah,
Saying I ain't did you right
So tell me what you like
Don't try me`,
  },
  {
    name: 'Poley More - Nowhere To Be Found',
    music_id: '0987654321',
    lyrics: `‘Cause i loved you with my eyes closed
Take off my blindfold
My heart is ice cold now
You left me stranded
And took my heart for granted
And now you’re nowhere to be found`,
  },
  {
    name: 'prod.push, Poley More - HAPPY ANNIVERSARY',
    music_id: '1122334455',
    lyrics: `Thats my shawty 
knowing all the facts she wont get attached, 
Breaking all the rules she thought i won’t last, 
She saw me, we ain't speaking,
she just want it back 
Running round in circles
there's no coming back,
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

// -------------------- HELPERS --------------------

// Fetch all images (JPEG/PNG) from GitHub repo
async function getAllImages() {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/?ref=${BRANCH}`;
  const response = await axios.get(url);

  const images = response.data
    .filter((file) => file.name.match(/\.(jpe?g|png)$/i))
    .map((file) => file.download_url);

  if (images.length < 3) {
    throw new Error('Not enough images in repo. Add at least 3 images.');
  }

  return images;
}

// Pick N random items from array
function pickRandom(array, n) {
  const copy = [...array];
  const picked = [];
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(index, 1)[0]);
  }
  return picked;
}

// Retry helper
async function withRetry(fn, attempts = 3, delay = 2000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('All retry attempts failed');
}

// -------------------- POST FUNCTION --------------------
async function postCarousel() {
  try {
    const images = await getAllImages();
    const selectedPhotos = pickRandom(images, 3);
    const song = SONGS[Math.floor(Math.random() * SONGS.length)];

    const texts = ["It's just a song..", 'the song:', song.lyrics];
    const carousel = selectedPhotos.map((url, i) => ({
      image_url: url,
      text: texts[i],
    }));

    const description = `${song.name} ${HASHTAGS.join(' ')}`;

    const payload = {
      access_token: ACCESS_TOKEN,
      carousel,
      description,
      music_id: song.music_id,
    };

    const response = await withRetry(async () => {
      return axios.post(
        'https://open.tiktokapis.com/v1/carousel/create',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    console.log('Posted successfully:', response.data);
  } catch (err) {
    console.error(
      'Failed to post carousel:',
      err.response?.data || err.message
    );
  }
}

// -------------------- SCHEDULER --------------------
// Post 5 times per day at 9am, 12pm, 3pm, 6pm, 9pm
const times = [
  '0 9 * * *',
  '0 12 * * *',
  '0 15 * * *',
  '0 18 * * *',
  '0 21 * * *',
];
times.forEach((time) => schedule.scheduleJob(time, postCarousel));

console.log('TikTok auto-post scheduler running...');
