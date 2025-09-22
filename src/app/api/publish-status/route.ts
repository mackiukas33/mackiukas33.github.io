import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const publishId = searchParams.get('publish_id');
  const accessToken = searchParams.get('access_token');

  if (!publishId) {
    return NextResponse.json(
      { error: 'Missing publish_id parameter' },
      { status: 400 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing access_token parameter' },
      { status: 400 }
    );
  }

  try {
    const data = await getPublishStatus(accessToken, publishId);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Status error', e.response?.data || e.message);
    return NextResponse.json(
      e.response?.data || { error: e.message },
      { status: 500 }
    );
  }
}

async function getPublishStatus(accessToken: string, publishId: string) {
  const resp = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    { publish_id: publishId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    }
  );
  return resp.data;
}
