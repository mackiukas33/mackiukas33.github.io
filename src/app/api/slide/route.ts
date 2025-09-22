import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

// Register fonts
try {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  GlobalFonts.registerFromPath(
    path.join(fontsDir, 'Inter-Regular.ttf'),
    'Inter'
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, 'Inter-Bold.ttf'),
    'InterBold'
  );
} catch (e: any) {
  console.warn('Font registration failed:', e.message);
}

interface ImageParams {
  variant: 'intro' | 'song' | 'lyrics';
  bg?: string;
  song?: string;
  lyrics?: string;
}

function drawRoundedRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function computeWrappedLines(
  ctx: any,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = String(text).split(/\r?\n/);
  const lines: string[] = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(/\s+/);
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = line.length ? line + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get('variant') as ImageParams['variant'];
  const bg = searchParams.get('bg');
  const song = searchParams.get('song');
  const lyrics = searchParams.get('lyrics');

  if (!variant || !bg) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load background image
    const bgPath = path.join(process.cwd(), 'public/photos', bg);
    if (!fs.existsSync(bgPath)) {
      return NextResponse.json(
        { error: 'Background image not found' },
        { status: 404 }
      );
    }

    const background = await loadImage(bgPath);
    ctx.drawImage(background, 0, 0, width, height);

    // Add dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Add content based on variant
    if (variant === 'intro') {
      // Intro slide
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px InterBold';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000000';

      const introText = "It's just a song..";
      ctx.strokeText(introText, width / 2, height / 2);
      ctx.fillText(introText, width / 2, height / 2);
    } else if (variant === 'song' && song) {
      // Song title slide
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px InterBold';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';

      const songText = `the song: ${song}`;
      ctx.strokeText(songText, width / 2, height / 2);
      ctx.fillText(songText, width / 2, height / 2);
    } else if (variant === 'lyrics' && lyrics) {
      // Lyrics slide
      ctx.fillStyle = '#ffffff';
      ctx.font = '36px Inter';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';

      const maxWidth = width - 100;
      const lines = computeWrappedLines(ctx, lyrics, maxWidth);
      const lineHeight = 50;
      const startY = (height - lines.length * lineHeight) / 2;

      lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
        ctx.strokeText(line, width / 2, y);
        ctx.fillText(line, width / 2, y);
      });
    }

    // Add gem icon if available
    try {
      const gemPath = path.join(process.cwd(), 'public/gem.png');
      if (fs.existsSync(gemPath)) {
        const gem = await loadImage(gemPath);
        const gemSize = 120;
        const gx = (width - gemSize) / 2;
        const gy = 180;
        ctx.drawImage(gem, gx, gy, gemSize, gemSize);
      }
    } catch {}

    // Add footer text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px InterBold';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';

    const footerText = 'Follow for more underrated gems';
    ctx.strokeText(footerText, width / 2, height - 180);
    ctx.fillText(footerText, width / 2, height - 180);
    ctx.textAlign = 'left';

    // Convert to buffer
    const buffer = canvas.toBuffer('image/jpeg', 0.9);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
