import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import qs from 'qs';
import {
  getSessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
  SessionData,
} from '@/lib/session';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session || !session.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Check if token is close to expiry (within 1 hour)
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (session.expiresAt > oneHourFromNow) {
      return NextResponse.json({
        message: 'Token is still valid',
        expiresAt: session.expiresAt,
      });
    }

    // Refresh the token using TikTok API
    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      qs.stringify({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const newAccessToken = tokenRes.data.access_token;
    const newRefreshToken = tokenRes.data.refresh_token || session.refreshToken; // Keep old refresh token if new one not provided
    const expiresIn = tokenRes.data.expires_in || 86400;

    // Create new session data
    const newSessionData: SessionData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: tokenRes.data.scope || session.scope,
    };

    // Update session cookie
    const response = NextResponse.json({
      success: true,
      expiresAt: newSessionData.expiresAt,
    });
    setSessionCookie(response, newSessionData);

    return response;
  } catch (error: any) {
    console.error(
      'Token refresh failed:',
      error.response?.data || error.message
    );

    // If refresh fails, clear the session
    const response = NextResponse.json(
      {
        error: 'Token refresh failed',
        authenticated: false,
      },
      { status: 401 }
    );
    clearSessionCookie(response);

    return response;
  }
}
