import { Song } from '@/lib/data/songs';
import { getRandomHashtags, getRandomTitle } from '@/lib/data/hashtags';
import fs from 'fs';
import path from 'path';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomPhotoFiles(): string[] {
  const photosDir = path.join(process.cwd(), 'public/photos');
  
  if (!fs.existsSync(photosDir)) {
    throw new Error('Photos directory does not exist');
  }

  const files = fs
    .readdirSync(photosDir)
    .filter((f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

  if (files.length < 3) {
    throw new Error('Need at least 3 photos in /public/photos');
  }

  // Ensure no duplicate photos are selected (shuffle and take first 3 unique)
  const shuffled = files.sort(() => 0.5 - Math.random());
  const uniqueSelected = Array.from(new Set(shuffled)).slice(0, 3);
  
  return uniqueSelected;
}

export function generateImageUrls(baseUrl: string, bgFiles: string[], song: Song): string[] {
  const [bg1, bg2, bg3] = bgFiles;

  return [
    `${baseUrl}/api/slide?variant=intro&bg=${encodeURIComponent(bg1)}`,
    `${baseUrl}/api/slide?variant=song&song=${encodeURIComponent(song.name)}&bg=${encodeURIComponent(bg2)}`,
    `${baseUrl}/api/slide?variant=lyrics&lyrics=${encodeURIComponent(song.lyrics)}&bg=${encodeURIComponent(bg3)}`,
  ];
}

export function createCarouselPayload(
  title: string,
  song: Song,
  hashtags: string[],
  imageUrls: string[]
) {
  return {
    media_type: 'PHOTO',
    post_mode: 'MEDIA_UPLOAD',
    post_info: {
      title,
      description: `🎵 ${song.name}\n\n${hashtags.join(' ')}`,
      privacy_level: 'SELF_ONLY',
      disable_comment: false,
      auto_add_music: true,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_images: imageUrls,
      photo_cover_index: 0,
    },
  };
}

export function getRandomSong(songs: Song[]): Song {
  return songs[Math.floor(Math.random() * songs.length)];
}

export function generatePostContent() {
  return {
    title: getRandomTitle(),
    hashtags: getRandomHashtags(5),
  };
}
