'use client';

import { useState, useEffect } from 'react';

interface SessionStatus {
  authenticated: boolean;
  expiresAt?: number;
  scope?: string;
  needsRefresh?: boolean;
  loading: boolean;
}

export function useSession() {
  const [session, setSession] = useState<SessionStatus>({
    authenticated: false,
    loading: true,
  });

  useEffect(() => {
    checkSession();

    // Set up periodic token refresh check (every 30 minutes)
    const refreshInterval = setInterval(() => {
      if (session.authenticated && !session.loading) {
        checkSession();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [session.authenticated, session.loading]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      setSession({
        authenticated: data.authenticated,
        expiresAt: data.expiresAt,
        scope: data.scope,
        needsRefresh: data.needsRefresh,
        loading: false,
      });

      // If token needs refresh, automatically refresh it
      if (data.authenticated && data.needsRefresh) {
        await refreshToken();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setSession({
        authenticated: false,
        loading: false,
      });
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        // Token refreshed successfully, update session
        setSession((prev) => ({
          ...prev,
          expiresAt: data.expiresAt,
          needsRefresh: false,
        }));
      } else {
        // Refresh failed, user needs to re-authenticate
        setSession({
          authenticated: false,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setSession({
        authenticated: false,
        loading: false,
      });
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      setSession({
        authenticated: false,
        loading: false,
      });
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    ...session,
    logout,
    refresh: checkSession,
  };
}
