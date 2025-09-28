import { NextRequest, NextResponse } from 'next/server';
import { getPostingSchedule } from '@/lib/posting-schedule';
import { createCarouselPayload } from '@/lib/utils';
import { songs } from '@/lib/data/songs';
import { getRandomTitle, getRandomHashtags } from '@/lib/data/hashtags';
import { getRandomPhotoFiles, generateImageUrls } from '@/lib/utils';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 /api/check-posts called at:', new Date().toISOString());
    console.log('🔔 User-Agent:', request.headers.get('user-agent'));
    console.log('🔔 Referer:', request.headers.get('referer'));

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
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const schedule of activeSchedules) {
      console.log('🔍 Current hour:', currentHour);
      console.log('🔍 Posting times:', schedule.postingTimes);

      const shouldPost = schedule.postingTimes.some((postingTime) => {
        const [postHours] = postingTime.split(':').map(Number);
        console.log(
          '🔍 Checking posting time:',
          postingTime,
          '-> hour:',
          postHours
        );
        return postHours === currentHour;
      });

      console.log('🔍 Should post:', shouldPost);

      if (!shouldPost) {
        continue;
      }

      // Check if we've already posted for this user today at this hour
      const existingPost = await prisma.scheduledPost.findUnique({
        where: {
          userId: schedule.userId,
        },
      });

      if (existingPost && existingPost.status === 'POSTED') {
        const postHour = existingPost.scheduledFor.getHours();
        const postDate = existingPost.scheduledFor.toISOString().split('T')[0];

        if (postDate === today && postHour === currentHour) {
          console.log(
            `⏭️ Already posted for user ${schedule.userId} at hour ${currentHour} today`
          );
          continue;
        }
      }

      try {
        // Generate fresh content for this post
        // Avoid using the same song as the last post
        let availableSongs = songs;
        if (existingPost && existingPost.song) {
          availableSongs = songs.filter(
            (song) => song.name !== existingPost.song
          );
          // If all songs were used, fall back to all songs
          if (availableSongs.length === 0) {
            availableSongs = songs;
          }
        }

        const randomSong =
          availableSongs[Math.floor(Math.random() * availableSongs.length)];
        console.log(
          'Selected song:',
          randomSong.name,
          'from',
          availableSongs.length,
          'available songs',
          existingPost
            ? `(last song was: ${existingPost.song})`
            : '(no previous posts)'
        );

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
          // Upsert the most recent post record (replace previous one)
          await prisma.scheduledPost.upsert({
            where: {
              userId: schedule.userId,
            },
            update: {
              title,
              song: randomSong.name,
              hashtags,
              imageUrls,
              scheduledFor: now,
              status: 'POSTED',
              tiktokPublishId: publishId,
              tiktokStatus: 'PUBLISHED',
              updatedAt: now,
            },
            create: {
              userId: schedule.userId,
              title,
              song: randomSong.name,
              hashtags,
              imageUrls,
              scheduledFor: now,
              status: 'POSTED',
              tiktokPublishId: publishId,
              tiktokStatus: 'PUBLISHED',
            },
          });

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

        // Upsert the failed post record (replace previous one)
        await prisma.scheduledPost.upsert({
          where: {
            userId: schedule.userId,
          },
          update: {
            title: 'Failed to generate',
            song: 'Unknown',
            hashtags: '',
            imageUrls: [],
            scheduledFor: now,
            status: 'FAILED',
            tiktokError: error.response?.data?.error?.message || error.message,
            updatedAt: now,
          },
          create: {
            userId: schedule.userId,
            title: 'Failed to generate',
            song: 'Unknown',
            hashtags: '',
            imageUrls: [],
            scheduledFor: now,
            status: 'FAILED',
            tiktokError: error.response?.data?.error?.message || error.message,
          },
        });

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
