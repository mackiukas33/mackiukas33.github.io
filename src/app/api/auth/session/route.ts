import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  isSessionValid,
  clearSessionCookie,
} from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (!isSessionValid(session)) {
      // Clear expired session
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      clearSessionCookie(response);
      return response;
    }

    // Check if token needs refresh (within 1 hour of expiry)
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    const needsRefresh = session.expiresAt <= oneHourFromNow;

    return NextResponse.json({
      authenticated: true,
      expiresAt: session.expiresAt,
      scope: session.scope,
      needsRefresh,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
