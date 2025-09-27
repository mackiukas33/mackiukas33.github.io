import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingPosts,
  updatePostStatus,
  getPostingSchedule,
} from '@/lib/posting-schedule';
import { createCarouselPayload } from '@/lib/utils';
import axios from 'axios';
import qs from 'qs';

// Token refresh function
async function refreshTokenIfNeeded(user: any, prisma: any) {
  const now = Date.now();
  const oneHourFromNow = now + 60 * 60 * 1000;

  // Check if token expires within 1 hour
  if (
    user.tiktokTokenExpires &&
    user.tiktokTokenExpires.getTime() <= oneHourFromNow
  ) {
    try {
      console.log(`🔄 Refreshing token for user ${user.id}`);

      // Refresh the token using TikTok API
      const tokenRes = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        qs.stringify({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: user.tiktokRefreshToken,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      // Update user with new tokens
      await prisma.user.update({
        where: { id: user.id },
        data: {
          tiktokAccessToken: tokenRes.data.access_token,
          tiktokRefreshToken:
            tokenRes.data.refresh_token || user.tiktokRefreshToken,
          tiktokTokenExpires: new Date(
            Date.now() + (tokenRes.data.expires_in || 86400) * 1000
          ),
        },
      });

      console.log(`✅ Token refreshed for user ${user.id}`);
      return tokenRes.data.access_token;
    } catch (error: any) {
      console.error(
        `❌ Token refresh failed for user ${user.id}:`,
        error?.response?.data || error.message
      );
      return null;
    }
  }

  return user.tiktokAccessToken;
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active posting schedules
    const { prisma } = await import('@/lib/prisma');
    const activeSchedules = await prisma.postingSchedule.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    if (activeSchedules.length === 0) {
      return NextResponse.json({
        message: 'No active posting schedules found',
        postsProcessed: 0,
      });
    }

    const results = [];
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    for (const schedule of activeSchedules) {
      // Check if current time matches any of the posting times
      const shouldPost = schedule.postingTimes.includes(currentTime);

      if (!shouldPost) {
        continue;
      }

      try {
        // 🔥 Refresh token if needed before posting
        const validToken = await refreshTokenIfNeeded(schedule.user, prisma);
        if (!validToken) {
          console.log(
            `⚠️ No valid token for user ${schedule.userId}, skipping post`
          );
          results.push({
            userId: schedule.userId,
            status: 'failed',
            error: 'No valid token available',
            title: 'Failed to generate',
            postedAt: now.toISOString(),
          });
          continue;
        }

        // Generate fresh content for this post
        const { songs } = await import('@/lib/data/songs');
        const { getRandomTitle, getRandomHashtags } = await import(
          '@/lib/data/hashtags'
        );
        const { getRandomPhotoFiles, generateImageUrls } = await import(
          '@/lib/utils'
        );

        // Get the last post to avoid duplicate songs
        const lastPost = await prisma.scheduledPost.findUnique({
          where: { userId: schedule.userId },
        });

        // Avoid using the same song as the last post
        let availableSongs = songs;
        if (lastPost && lastPost.song) {
          availableSongs = songs.filter((song) => song.name !== lastPost.song);
          if (availableSongs.length === 0) {
            availableSongs = songs; // Fallback to all songs
          }
        }

        const randomSong =
          availableSongs[Math.floor(Math.random() * availableSongs.length)];
        const photoFiles = getRandomPhotoFiles();
        const imageUrls = generateImageUrls(
          process.env.NEXT_PUBLIC_BASE_URL || 'https://ttphotos.online',
          photoFiles,
          randomSong
        );
        const title = getRandomTitle();
        const hashtags = getRandomHashtags().join(' ');

        // Create TikTok carousel payload
        const payload = createCarouselPayload(
          title,
          { id: 'temp', name: randomSong.name, lyrics: '' },
          hashtags.split(' '),
          imageUrls
        );

        console.log('Posting carousel to TikTok API...');
        console.log('Carousel payload:', JSON.stringify(payload, null, 2));

        // Post to TikTok using the refreshed token
        const response = await axios.post(
          'https://open.tiktokapis.com/v2/post/publish/content/init/',
          payload,
          {
            headers: {
              Authorization: `Bearer ${validToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
          }
        );

        console.log('TikTok API response:', response.data);
        const publishId = response.data.data?.publish_id;

        if (publishId) {
          // Log the successful post (optional - you can store this in DB if needed)
          console.log(
            `Successfully posted for user ${schedule.userId} at ${currentTime}`
          );

          results.push({
            userId: schedule.userId,
            status: 'success',
            publishId,
            title,
            song: randomSong.name,
            postedAt: now.toISOString(),
          });
        } else {
          throw new Error('No publish ID returned from TikTok');
        }
      } catch (error: any) {
        console.error(
          `Failed to post for user ${schedule.userId} at ${currentTime}:`,
          error.response?.data || error.message
        );

        // Check if this is a 401 error (token expired/invalid)
        if (error.response?.status === 401) {
          console.log(
            `🔑 401 error detected for user ${schedule.userId}, attempting token refresh...`
          );

          // Try to refresh the token one more time
          const refreshedToken = await refreshTokenIfNeeded(
            schedule.user,
            prisma
          );
          if (refreshedToken) {
            console.log(
              `🔄 Token refreshed successfully for user ${schedule.userId}, but post already failed`
            );
          } else {
            console.log(
              `❌ Token refresh failed for user ${schedule.userId}, schedule may need manual intervention`
            );
          }
        }

        results.push({
          userId: schedule.userId,
          status: 'failed',
          error: error.response?.data?.error?.message || error.message,
          title: 'Failed to generate',
          postedAt: now.toISOString(),
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} posts at ${currentTime}`,
      postsProcessed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron upload error:', error);
    return NextResponse.json(
      { error: 'Cron upload failed', details: error.message },
      { status: 500 }
    );
  }
}
