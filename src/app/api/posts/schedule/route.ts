import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import {
  createPostingSchedule,
  stopPostingSchedule,
  getPostingSchedule,
} from '@/lib/posting-schedule';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const schedule = await getPostingSchedule(session.userId || 'default-user');

    return NextResponse.json({
      schedule,
      isActive: schedule?.isActive || false,
    });
  } catch (error: any) {
    console.error('Get schedule error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: 'Failed to get schedule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'start') {
      // Start posting schedule
      const schedule = await createPostingSchedule({
        userId: session.userId || 'default-user',
        tiktokAccessToken: session.accessToken,
        tiktokRefreshToken: session.refreshToken,
        tiktokTokenExpires: new Date(session.expiresAt),
        tiktokScope: session.scope,
      });

      return NextResponse.json({
        message: 'Posting schedule started successfully',
        schedule,
      });
    } else if (action === 'stop') {
      // Stop posting schedule
      await stopPostingSchedule(session.userId || 'default-user');

      return NextResponse.json({
        message: 'Posting schedule stopped successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Schedule action error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
