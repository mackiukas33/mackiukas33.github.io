import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Update all active posting schedules with new times
    const updatedSchedules = await prisma.postingSchedule.updateMany({
      where: { isActive: true },
      data: {
        postingTimes: ['21:00', '06:00', '09:00', '12:00', '15:00'], // UTC+3 times
      },
    });

    return NextResponse.json({
      message: `Updated ${updatedSchedules.count} posting schedules`,
      newPostingTimes: ['21:00', '06:00', '09:00', '12:00', '15:00'],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Update schedule error:', error);
    return NextResponse.json(
      {
        error: 'Update schedule failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
