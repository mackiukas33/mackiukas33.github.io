'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();

      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Network error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-3xl">
              🎵
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">TTPhotos</h1>
          <p className="text-white/80 mb-8">
            Create and post beautiful TikTok carousels with your music
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center text-white/90">
              <span className="text-green-400 mr-3">✨</span>
              <span>Auto-generate dynamic slides</span>
            </div>
            <div className="flex items-center text-white/90">
              <span className="text-green-400 mr-3">🎶</span>
              <span>Add your song lyrics</span>
            </div>
            <div className="flex items-center text-white/90">
              <span className="text-green-400 mr-3">📱</span>
              <span>Post directly to TikTok</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connecting...
              </div>
            ) : (
              'Connect with TikTok'
            )}
          </button>

          {/* Info */}
          <p className="text-white/60 text-sm mt-6">
            This app uses TikTok's sandbox environment for testing
          </p>
        </div>
      </div>
    </div>
  );
}
