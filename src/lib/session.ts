import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'your-super-secret-jwt-key-change-this-in-production';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId?: string;
  scope?: string;
}

export function createSessionToken(sessionData: SessionData): string {
  return jwt.sign(sessionData, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionData;
  } catch (error) {
    console.error('Session token verification failed:', error);
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  sessionData: SessionData
): void {
  const token = createSessionToken(sessionData);

  response.cookies.set('ttphotos_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export function getSessionFromRequest(
  request: NextRequest
): SessionData | null {
  const token = request.cookies.get('ttphotos_session')?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('ttphotos_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function isSessionValid(sessionData: SessionData): boolean {
  return Date.now() < sessionData.expiresAt;
}

export async function getValidAccessToken(
  request: NextRequest
): Promise<string | null> {
  const session = getSessionFromRequest(request);

  if (!session || !isSessionValid(session)) {
    return null;
  }

  // Check if token needs refresh (within 1 hour of expiry)
  const oneHourFromNow = Date.now() + 60 * 60 * 1000;
  if (session.expiresAt <= oneHourFromNow && session.refreshToken) {
    // Token needs refresh, but we can't refresh it here in a utility function
    // The client-side hook will handle the refresh
    // For now, return the current token
    return session.accessToken;
  }

  return session.accessToken;
}
