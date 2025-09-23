import { prisma } from './prisma';
import { songs } from './data/songs';
import { getRandomHashtags, getRandomTitle } from './data/hashtags';
import { getRandomPhotoFiles, generateImageUrls } from './utils';

// Optimal TikTok posting hours (5 times per day) - UTC+3 timezone
const OPTIMAL_POSTING_TIMES = [
  '21:00', // 12 AM (midnight) UTC+3 = 21:00 UTC
  '06:00', // 9 AM UTC+3 = 06:00 UTC
  '09:00', // 12 PM (noon) UTC+3 = 09:00 UTC
  '12:00', // 3 PM UTC+3 = 12:00 UTC
  '15:00', // 6 PM UTC+3 = 15:00 UTC
];

// Generate next posting times for the next 7 days
function generateNextPostingTimes(): Date[] {
  const now = new Date();
  const postingTimes: Date[] = [];

  // Generate for next 7 days
  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() + day);

    for (const time of OPTIMAL_POSTING_TIMES) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledFor = new Date(currentDate);
      scheduledFor.setHours(hours, minutes, 0, 0);

      // Skip if this time has already passed today
      if (day === 0 && scheduledFor <= now) {
        continue;
      }

      postingTimes.push(scheduledFor);
    }
  }

  return postingTimes.sort((a, b) => a.getTime() - b.getTime());
}

export interface PostingScheduleData {
  userId: string;
  tiktokAccessToken: string;
  tiktokRefreshToken?: string;
  tiktokTokenExpires: Date;
  tiktokScope?: string;
}

export async function createPostingSchedule(data: PostingScheduleData) {
  // Create or update user
  const user = await prisma.user.upsert({
    where: { id: data.userId },
    update: {
      tiktokAccessToken: data.tiktokAccessToken,
      tiktokRefreshToken: data.tiktokRefreshToken,
      tiktokTokenExpires: data.tiktokTokenExpires,
      tiktokScope: data.tiktokScope,
    },
    create: {
      id: data.userId,
      tiktokAccessToken: data.tiktokAccessToken,
      tiktokRefreshToken: data.tiktokRefreshToken,
      tiktokTokenExpires: data.tiktokTokenExpires,
      tiktokScope: data.tiktokScope,
    },
  });

  // Create or update posting schedule
  const schedule = await prisma.postingSchedule.upsert({
    where: { userId: data.userId },
    update: {
      isActive: true,
      postingTimes: OPTIMAL_POSTING_TIMES,
    },
    create: {
      userId: data.userId,
      isActive: true,
      postingTimes: OPTIMAL_POSTING_TIMES,
      postsPerDay: 5,
      timezone: 'UTC',
    },
  });

  // No need to pre-generate posts - they'll be created on-demand when due
  return schedule;
}

export async function stopPostingSchedule(userId: string) {
  return await prisma.postingSchedule.update({
    where: { userId },
    data: { isActive: false },
  });
}

export async function getPostingSchedule(userId: string) {
  try {
    const schedule = await prisma.postingSchedule.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    // Get pending posts separately
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      orderBy: { scheduledFor: 'asc' },
    });

    if (!schedule) {
      // Return default schedule structure when none exists
      return {
        id: null,
        userId,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        postingTimes: [],
        postsPerDay: 5,
        timezone: 'UTC',
        user: null,
        scheduledPosts,
      };
    }

    return {
      ...schedule,
      scheduledPosts,
    };
  } catch (error) {
    console.error('Error in getPostingSchedule:', error);
    throw error;
  }
}

async function generateScheduledPosts(userId: string) {
  const schedule = await prisma.postingSchedule.findUnique({
    where: { userId },
  });

  if (!schedule || !schedule.isActive) return;

  // Generate posting times for the next 7 days
  const postingTimes = generateNextPostingTimes();
  const posts = [];

  for (const scheduledFor of postingTimes) {
    // Generate random content
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    const photoFiles = getRandomPhotoFiles();
    const imageUrls = generateImageUrls(
      process.env.NEXT_PUBLIC_BASE_URL || 'https://ttphotos.online',
      photoFiles,
      randomSong
    );
    const title = getRandomTitle();
    const hashtags = getRandomHashtags().join(' ');

    posts.push({
      userId,
      title,
      song: randomSong.name,
      hashtags,
      imageUrls,
      scheduledFor,
      status: 'PENDING' as const,
    });
  }

  // Create all scheduled posts
  await prisma.scheduledPost.createMany({
    data: posts,
  });
}

export async function getPendingPosts() {
  return await prisma.scheduledPost.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: {
        lte: new Date(), // Posts that are due now or overdue
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      scheduledFor: 'asc',
    },
  });
}

export async function updatePostStatus(
  postId: string,
  status: 'POSTING' | 'POSTED' | 'FAILED',
  tiktokPublishId?: string,
  tiktokStatus?: string,
  tiktokError?: string
) {
  return await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status,
      tiktokPublishId,
      tiktokStatus,
      tiktokError,
    },
  });
}
