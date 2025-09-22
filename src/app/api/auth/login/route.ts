import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

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

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: REDIRECT_URI,
    state: csrfState,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  console.log('Generated auth URL:', authUrl);
  console.log('Client key:', CLIENT_KEY);
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('Full params:', params.toString());

  return NextResponse.json(
    { authUrl },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
