import { NextRequest, NextResponse } from 'next/server';
import { getPendingPosts, updatePostStatus } from '@/lib/posting-schedule';
import { createCarouselPayload } from '@/lib/utils';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending posts that are due
    const pendingPosts = await getPendingPosts();

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        message: 'No posts scheduled for upload',
        postsProcessed: 0,
      });
    }

    const results = [];

    for (const post of pendingPosts) {
      try {
        // Update status to POSTING
        await updatePostStatus(post.id, 'POSTING');

        // Create TikTok carousel payload
        const payload = createCarouselPayload(
          post.title,
          { name: post.song, lyrics: '' },
          post.hashtags.split(' '),
          post.imageUrls
        );

        // Post to TikTok
        const response = await axios.post(
          'https://open.tiktokapis.com/v2/post/publish/video/init/',
          payload,
          {
            headers: {
              Authorization: `Bearer ${post.user.tiktokAccessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
          }
        );

        const publishId = response.data.data?.publish_id;

        if (publishId) {
          // Update with publish ID
          await updatePostStatus(post.id, 'POSTED', publishId, 'PUBLISHED');

          results.push({
            postId: post.id,
            status: 'success',
            publishId,
            title: post.title,
          });
        } else {
          throw new Error('No publish ID returned from TikTok');
        }
      } catch (error: any) {
        console.error(
          `Failed to post ${post.id}:`,
          error.response?.data || error.message
        );

        await updatePostStatus(
          post.id,
          'FAILED',
          undefined,
          'FAILED',
          error.response?.data?.error?.message || error.message
        );

        results.push({
          postId: post.id,
          status: 'failed',
          error: error.response?.data?.error?.message || error.message,
          title: post.title,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} posts`,
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
