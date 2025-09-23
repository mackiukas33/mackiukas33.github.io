import { NextRequest, NextResponse } from 'next/server';
import { getPostingSchedule } from '@/lib/posting-schedule';
import { createCarouselPayload } from '@/lib/utils';
import { songs } from '@/lib/data/songs';
import { getRandomTitle, getRandomHashtags } from '@/lib/data/hashtags';
import { getRandomPhotoFiles, generateImageUrls } from '@/lib/utils';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
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
        timestamp: new Date().toISOString(),
      });
    }

    const results = [];
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    for (const schedule of activeSchedules) {
      // Check if current hour matches any of the posting hours
      const currentHour = now.getHours();
      const shouldPost = schedule.postingTimes.some((postingTime) => {
        const [postHours] = postingTime.split(':').map(Number);
        return postHours === currentHour;
      });

      if (!shouldPost) {
        continue;
      }

      try {
        // Generate fresh content for this post
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
          // Log the successful post
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
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Check posts error:', error);
    return NextResponse.json(
      {
        error: 'Check posts failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
