import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
  const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

  if (!CLIENT_KEY || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Missing TikTok configuration' },
      { status: 500 }
    );
  }

  const csrfState = Math.random().toString(36).substring(2);
  
  // Set CSRF state cookie
  const cookieStore = await cookies();
  cookieStore.set('csrfState', csrfState, {
    maxAge: 60, // 1 minute
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: REDIRECT_URI,
    state: csrfState,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
