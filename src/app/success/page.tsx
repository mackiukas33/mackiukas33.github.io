'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface PostResult {
  token: any;
  publish_api: any;
  slide_urls: string[];
  status_checks: any[];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PostResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you'd get this data from the callback API
    // For now, we'll show a success message
    setResult({
      token: {},
      publish_api: { data: { publish_id: 'demo_publish_id' } },
      slide_urls: [
        '/api/slide?variant=intro',
        '/api/slide?variant=song',
        '/api/slide?variant=lyrics',
      ],
      status_checks: [
        { data: { status: 'PROCESSING', publish_id: 'demo_publish_id' } },
      ],
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-red-500/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Post Failed</h1>
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-3xl">
              ✅
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">
            Carousel Posted!
          </h1>
          <p className="text-white/80 mb-8">
            Your TikTok carousel has been submitted successfully
          </p>

          {/* Status */}
          {result && (
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Post Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Publish ID:</span>
                  <span className="text-white font-mono text-sm">
                    {result.publish_api?.data?.publish_id || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Status:</span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-200 rounded-full text-sm">
                    {result.status_checks?.[0]?.data?.status || 'PROCESSING'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Slides Generated:</span>
                  <span className="text-white">
                    {result.slide_urls?.length || 0}/3
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preview Images */}
          {result?.slide_urls && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Preview Slides
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.slide_urls.map((url, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="aspect-[9/16] bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-white/60 text-sm">
                        Slide {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Create Another
            </button>
            <button
              onClick={() => window.open('https://tiktok.com', '_blank')}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              View on TikTok
            </button>
          </div>

          {/* Info */}
          <p className="text-white/60 text-sm mt-6">
            Your post is being processed. It may take a few minutes to appear on
            TikTok.
          </p>
        </div>
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
