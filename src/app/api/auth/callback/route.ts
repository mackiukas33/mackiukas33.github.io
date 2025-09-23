import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import qs from 'qs';
import { songs } from '@/lib/data/songs';
import {
  getRandomPhotoFiles,
  generateImageUrls,
  getRandomSong,
  generatePostContent,
} from '@/lib/utils';
import { setSessionCookie, SessionData } from '@/lib/session';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ttphotos.online';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      qs.stringify({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const accessToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token;
    const expiresIn = tokenRes.data.expires_in || 86400; // Default to 24 hours

    // Generate a consistent user ID based on the access token (first 24 chars of hash)
    const crypto = require('crypto');
    const userId = crypto
      .createHash('sha256')
      .update(accessToken)
      .digest('hex')
      .substring(0, 24);

    console.log('Generated consistent userId:', userId);

    // Store session data
    const sessionData: SessionData = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: tokenRes.data.scope,
      userId,
    };

    // TikTok posting is now handled by the cron job system
    // No immediate posting needed here

    // Generate images for success page display
    console.log('Generating images for success page...');
    const imageData = await generatePreviewImages();

    // Redirect to success page with image data
    const successUrl = new URL('/success', BASE_URL);
    successUrl.searchParams.set('generated', 'true');
    successUrl.searchParams.set('posted', 'false'); // Posting handled by cron job
    successUrl.searchParams.set('title', encodeURIComponent(imageData.title));
    successUrl.searchParams.set('song', encodeURIComponent(imageData.song));
    successUrl.searchParams.set(
      'hashtags',
      encodeURIComponent(
        Array.isArray(imageData.hashtags)
          ? imageData.hashtags.join(' ')
          : imageData.hashtags
      )
    );
    successUrl.searchParams.set('intro_url', imageData.imageUrls[0]);
    successUrl.searchParams.set('song_url', imageData.imageUrls[1]);
    successUrl.searchParams.set('lyrics_url', imageData.imageUrls[2]);

    // Publish status not needed - posting handled by cron job

    // Create response with session cookie
    const response = NextResponse.redirect(successUrl);
    setSessionCookie(response, sessionData);

    return response;
  } catch (err: any) {
    console.error(
      'Token error:',
      err.response?.status,
      err.response?.data || err.message
    );
    return NextResponse.json(err.response?.data || { error: err.message }, {
      status: 500,
    });
  }
}

async function generatePreviewImages() {
  const song = getRandomSong(songs);
  const photoFiles = getRandomPhotoFiles();
  const verifiedBaseUrl = 'https://ttphotos.online';
  const imageUrls = generateImageUrls(verifiedBaseUrl, photoFiles, song);
  const { title, hashtags } = generatePostContent();

  return {
    title,
    song: song.name,
    hashtags,
    imageUrls,
    variants: [
      { variant: 'intro', url: imageUrls[0], description: 'Intro slide' },
      { variant: 'song', url: imageUrls[1], description: 'Song title slide' },
      { variant: 'lyrics', url: imageUrls[2], description: 'Lyrics slide' },
    ],
  };
}
