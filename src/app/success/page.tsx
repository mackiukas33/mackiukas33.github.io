'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

  useEffect(() => {
    const generateImages = async () => {
      try {
        // Always generate fresh images for preview
        const response = await fetch('/api/slide?variant=intro');
        if (response.ok) {
          setResult({
            token: {},
            images: {
              title: 'Fresh Post',
              song: 'Random Song',
              hashtags: '#music #trending #viral #fyp',
              imageUrls: [
                '/api/slide?variant=intro',
                '/api/slide?variant=song&song=Random Song',
                '/api/slide?variant=lyrics&lyrics=Random lyrics from our collection...',
              ],
              variants: [
                { variant: 'intro', url: '/api/slide?variant=intro', description: 'Intro slide' },
                { variant: 'song', url: '/api/slide?variant=song&song=Random Song', description: 'Song title slide' },
                { variant: 'lyrics', url: '/api/slide?variant=lyrics&lyrics=Random lyrics from our collection...', description: 'Lyrics slide' },
              ],
            },
            message: 'Beautiful images generated successfully!',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    generateImages();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <h1 className="text-xl font-bold text-white">Generating Images...</h1>
            <p className="text-white/80 mt-2">Creating your beautiful carousel slides</p>
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
            <h1 className="text-2xl font-bold text-white mb-4">Generation Failed</h1>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4">
            🎨
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Your Carousel is Ready!
          </h1>
          <p className="text-white/80 text-lg">
            {result?.message || 'Beautiful images generated successfully'}
          </p>
        </div>

        {/* Song Info */}
        {result?.images && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Title</h3>
                <p className="text-white font-semibold">{result.images.title}</p>
              </div>
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Song</h3>
                <p className="text-white font-semibold">🎵 {result.images.song}</p>
              </div>
              <div>
                <h3 className="text-white/80 text-sm font-medium mb-2">Hashtags</h3>
                <p className="text-white font-semibold text-sm">{result.images.hashtags}</p>
              </div>
            </div>
          </div>
        )}

        {/* Image Gallery */}
        {result?.images?.variants && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Generated Slides</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {result.images.variants.map((variant, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {variant.description}
                    </h3>
                    <div className="inline-block bg-white/20 text-white/80 text-xs px-3 py-1 rounded-full">
                      {variant.variant.toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Image Container */}
                  <div className="relative group">
                    <div className="aspect-[9/16] bg-black/20 rounded-xl overflow-hidden shadow-2xl">
                      <img
                        src={variant.url}
                        alt={variant.description}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center text-white/60">
                                <div class="text-center">
                                  <div class="text-4xl mb-2">🖼️</div>
                                  <p class="text-sm">Loading image...</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                      <button
                        onClick={() => window.open(variant.url, '_blank')}
                        className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                      >
                        View Full Size
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Create Another
          </button>
          <button
            onClick={() => {
              // Copy all image URLs to clipboard
              if (result?.images?.imageUrls) {
                navigator.clipboard.writeText(result.images.imageUrls.join('\n'));
                alert('Image URLs copied to clipboard!');
              }
            }}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Copy URLs
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
