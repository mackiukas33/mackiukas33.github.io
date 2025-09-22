import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import qs from 'qs';
import { songs } from '@/lib/data/songs';
import {
  getRandomPhotoFiles,
  generateImageUrls,
  createCarouselPayload,
  getRandomSong,
  generatePostContent,
  sleep,
} from '@/lib/utils';
import { TikTokPublishStatus } from '@/types';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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

  // CSRF state validation disabled for sandbox testing
  // In production, you should validate the state parameter

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

    // Skip TikTok posting for now - just generate images for preview
    // const publish = await postCarousel(accessToken);

    // Poll publish status
    // const statusChecks: TikTokPublishStatus[] = [];
    // try {
    //   const publishId = publish.api?.data?.publish_id;
    //   if (publishId) {
    //     for (let i = 0; i < 4; i++) {
    //       const status = await getPublishStatus(accessToken, publishId);
    //       statusChecks.push(status);

    //       // Stop early if status indicates completion
    //       const statusType = status?.data?.status;
    //       if (
    //         statusType &&
    //         ['PUBLISHED', 'FAILED', 'CANCELLED'].includes(statusType)
    //       ) {
    //         break;
    //       }
    //       await sleep(2000);
    //     }
    //   }
    // } catch (e: any) {
    //   statusChecks.push({
    //     data: {
    //       status: 'FAILED' as const,
    //       publish_id: 'unknown',
    //     },
    //     error: {
    //       code: 'STATUS_CHECK_ERROR',
    //       message: e.response?.data?.message || e.message,
    //     },
    //   });
    // }

    // return NextResponse.json({
    //   token: tokenRes.data,
    //   publish_api: publish.api,
    //   slide_urls: publish.imageUrls,
    //   status_checks: statusChecks,
    // });

    // Generate images for preview (skip TikTok posting for now)
    console.log('Generating images for preview...');

    // Generate images and redirect to success page
    const imageData = await generatePreviewImages();

    // Redirect to success page with image data
    const successUrl = new URL('/success', BASE_URL);
    successUrl.searchParams.set('generated', 'true');
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

    return NextResponse.redirect(successUrl);
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

async function postCarousel(accessToken: string) {
  const song = getRandomSong(songs);
  const photoFiles = getRandomPhotoFiles();
  // Use the verified domain for image URLs
  const imageUrls = generateImageUrls(
    'https://ttphotos.online',
    photoFiles,
    song
  );
  const { title, hashtags } = generatePostContent();

  const payload = createCarouselPayload(title, song, hashtags, imageUrls);

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

async function getPublishStatus(
  accessToken: string,
  publishId: string
): Promise<TikTokPublishStatus> {
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
