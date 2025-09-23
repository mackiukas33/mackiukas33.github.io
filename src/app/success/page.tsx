'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

interface ImageVariant {
  variant: string;
  url: string;
  description: string;
}

interface ImageResult {
  token: any;
  images: {
    title: string;
    song: string;
    hashtags: string;
    imageUrls: string[];
    variants: ImageVariant[];
  };
  message: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { authenticated, logout } = useSession();

  useEffect(() => {
    // Get data from URL params (from OAuth callback) or use demo data
    const isGenerated = searchParams.get('generated') === 'true';
    const isPosted = searchParams.get('posted') === 'true';
    const publishStatus = searchParams.get('publish_status');
    const publishError = searchParams.get('publish_error');

    if (isGenerated) {
      // Use actual generated data from callback
      const title = decodeURIComponent(
        searchParams.get('title') || 'Generated Post'
      );
      const song = decodeURIComponent(
        searchParams.get('song') || 'Unknown Song'
      );
      const hashtags = decodeURIComponent(
        searchParams.get('hashtags') || '#music #trending'
      );
      const introUrl =
        searchParams.get('intro_url') || '/api/slide?variant=intro';
      const songUrl = searchParams.get('song_url') || '/api/slide?variant=song';
      const lyricsUrl =
        searchParams.get('lyrics_url') || '/api/slide?variant=lyrics';

      let message = 'Beautiful images generated successfully!';
      if (isPosted) {
        if (publishStatus === 'PUBLISHED') {
          message = '🎉 Posted to TikTok successfully! Your carousel is live!';
        } else if (publishStatus === 'FAILED' || publishError) {
          message = `⚠️ Images generated but TikTok posting failed: ${
            publishError ? decodeURIComponent(publishError) : 'Unknown error'
          }`;
        } else {
          message =
            '📤 Images generated and posted to TikTok! Check your TikTok account.';
        }
      }

      setResult({
        token: {},
        images: {
          title,
          song,
          hashtags,
          imageUrls: [introUrl, songUrl, lyricsUrl],
          variants: [
            {
              variant: 'intro',
              url: introUrl,
              description: 'Intro slide',
            },
            {
              variant: 'song',
              url: songUrl,
              description: 'Song title slide',
            },
            {
              variant: 'lyrics',
              url: lyricsUrl,
              description: 'Lyrics slide',
            },
          ],
        },
        message,
      });
    } else {
      // Use demo data for direct access
      setResult({
        token: {},
        images: {
          title: 'Demo Post',
          song: 'Sample Song',
          hashtags: '#music #trending #viral #fyp',
          imageUrls: [
            '/api/slide?variant=intro',
            '/api/slide?variant=song&song=Sample Song',
            '/api/slide?variant=lyrics&lyrics=Sample lyrics from our collection...',
          ],
          variants: [
            {
              variant: 'intro',
              url: '/api/slide?variant=intro',
              description: 'Intro slide',
            },
            {
              variant: 'song',
              url: '/api/slide?variant=song&song=Sample Song',
              description: 'Song title slide',
            },
            {
              variant: 'lyrics',
              url: '/api/slide?variant=lyrics&lyrics=Sample lyrics from our collection...',
              description: 'Lyrics slide',
            },
          ],
        },
        message: 'Demo images - try the OAuth flow for real generation!',
      });
    }

    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <h1 className="text-xl font-bold text-white">
              Generating Images...
            </h1>
            <p className="text-white/80 mt-2">
              Creating your beautiful carousel slides
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-red-500/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Generation Failed
            </h1>
            <p className="text-white/80 mb-6">{error}</p>
            <button
              onClick={() => (window.location.href = '/')}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Logout Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>

          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-3xl mb-6">
            🎨
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
          <p className="text-white/80 text-lg mb-8">
            {result?.message || 'Welcome to your TTPhotos dashboard'}
          </p>

          {/* Start Uploading Button */}
          <button
            onClick={() => {
              // TODO: Implement upload functionality
              console.log('Start uploading clicked');
            }}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Start Uploading
          </button>
        </div>

        {/* Recent Activity */}
        {result?.images && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    🎵
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {result.images.title}
                    </p>
                    <p className="text-white/60 text-sm">
                      {result.images.song}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm font-medium">
                    Generated
                  </p>
                  <p className="text-white/60 text-xs">Just now</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Preview */}
        {result?.images?.variants && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Quick Preview</h2>
            <div className="grid grid-cols-3 gap-4">
              {result.images.variants.map((variant, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center"
                >
                  <div className="aspect-[9/16] bg-black/20 rounded-lg overflow-hidden mb-3">
                    <img
                      src={variant.url}
                      alt={variant.description}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-white/60">
                              <div class="text-2xl">🖼️</div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                  <p className="text-white/80 text-sm font-medium">
                    {variant.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>🔄</span>
            <span>Create New Carousel</span>
          </button>
          <button
            onClick={() => {
              // Copy all image URLs to clipboard
              if (result?.images?.imageUrls) {
                navigator.clipboard.writeText(
                  result.images.imageUrls.join('\n')
                );
                alert('Image URLs copied to clipboard!');
              }
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>📋</span>
            <span>Copy URLs</span>
          </button>
        </div>

        {/* Info */}
        <p className="text-white/60 text-sm mt-6 text-center">
          These images are ready to be used for your TikTok carousel post!
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
