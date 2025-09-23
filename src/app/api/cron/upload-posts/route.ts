import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingPosts,
  updatePostStatus,
  getPostingSchedule,
} from '@/lib/posting-schedule';
import { createCarouselPayload } from '@/lib/utils';
import axios from 'axios';

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
        // Generate fresh content for this post
        const { songs } = await import('@/lib/data/songs');
        const { getRandomTitle, getRandomHashtags } = await import(
          '@/lib/data/hashtags'
        );
        const { getRandomPhotoFiles, generateImageUrls } = await import(
          '@/lib/utils'
        );

        const randomSong = songs[Math.floor(Math.random() * songs.length)];
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

        // Post to TikTok using the correct carousel endpoint
        const response = await axios.post(
          'https://open.tiktokapis.com/v2/post/publish/content/init/',
          payload,
          {
            headers: {
              Authorization: `Bearer ${schedule.user.tiktokAccessToken}`,
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
