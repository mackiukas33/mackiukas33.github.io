import { prisma } from './prisma';
import { songs } from './data/songs';
import { getRandomHashtags, getRandomTitle } from './data/hashtags';
import { getRandomPhotoFiles, generateImageUrls } from './utils';

// Optimal TikTok posting times (5 times per day)
const OPTIMAL_POSTING_TIMES = [
  '09:00', // 9 AM
  '12:00', // 12 PM (noon)
  '15:00', // 3 PM
  '18:00', // 6 PM
  '21:00', // 9 PM
];

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

  // Generate posts for the next 7 days
  await generateScheduledPosts(data.userId);

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

  // Generate posts for the next 7 days
  const posts = [];
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + day);

    for (const time of schedule.postingTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledFor = new Date(currentDate);
      scheduledFor.setHours(hours, minutes, 0, 0);

      // Skip if this time has already passed today
      if (day === 0 && scheduledFor <= new Date()) {
        continue;
      }

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
