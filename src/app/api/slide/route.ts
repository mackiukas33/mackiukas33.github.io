import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { songs } from '@/lib/data/songs';

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
  try {
    const { searchParams } = new URL(request.url);
    const variant = String(searchParams.get('variant') || 'intro');
    const song =
      typeof searchParams.get('song') === 'string'
        ? searchParams.get('song')
        : '';
    let lyrics =
      typeof searchParams.get('lyrics') === 'string'
        ? searchParams.get('lyrics')
        : '';

    // HIGH QUALITY CANVAS SETUP - Direct rendering at TikTok resolution
    const width = 1080;
    const height = 1920;

    // Create canvas at final resolution with maximum quality
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Enable maximum quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // HIGH QUALITY BACKGROUND RENDERING
    try {
      const photosDir = path.join(process.cwd(), 'public/photos');
      const files = fs
        .readdirSync(photosDir)
        .filter(
          (f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
        );

      console.log(`Found ${files.length} background images in ${photosDir}`);

      if (files.length > 0) {
        const randomBg = files[Math.floor(Math.random() * files.length)];
        console.log(`Using background image: ${randomBg}`);
        const img = await loadImage(path.join(photosDir, randomBg));
        console.log(`Loaded image: ${img.width}x${img.height}`);

        // Use COVER mode for best quality - fill entire canvas
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;

        let sourceX = 0,
          sourceY = 0,
          sourceW = img.width,
          sourceH = img.height;
        let destX = 0,
          destY = 0,
          destW = width,
          destH = height;

        if (imgRatio > canvasRatio) {
          // Image is wider - crop sides
          sourceW = img.height * canvasRatio;
          sourceX = (img.width - sourceW) / 2;
        } else {
          // Image is taller - crop top/bottom
          sourceH = img.width / canvasRatio;
          sourceY = (img.height - sourceH) / 2;
        }

        // Draw with perfect scaling
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceW,
          sourceH, // Source rectangle
          destX,
          destY,
          destW,
          destH // Destination rectangle
        );
      } else {
        // Fallback gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    } catch (error) {
      console.error('Background loading error:', error);
      // Fallback gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0f0c29');
      grad.addColorStop(0.5, '#302b63');
      grad.addColorStop(1, '#24243e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle vignette
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Enhanced text style for better quality
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;

    let title = '';
    let body = '';

    if (variant === 'intro') {
      title = '"It\'s just a song.."';
    } else if (variant === 'song') {
      title = 'The song:';
    } else if (variant === 'lyrics') {
      title = '';
      if (!lyrics) {
        // pick random lyrics from songs array if none provided
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        lyrics = randomSong.lyrics;
      }
      body = lyrics;
    } else {
      title = 'TTPhotos';
    }

    const margin = 80;
    const maxTextWidth = width - margin * 2;

    // If lyrics slide, draw Twemoji gem image above the title
    if (variant === 'lyrics') {
      try {
        const gem = await loadImage(
          'https://twemoji.maxcdn.com/v/latest/72x72/1f48e.png'
        );
        const gemSize = 120;
        const gx = (width - gemSize) / 2;
        const gy = 180;
        ctx.drawImage(gem, gx, gy, gemSize, gemSize);
      } catch {}
    }

    // HIGH QUALITY TEXT RENDERING
    ctx.font = GlobalFonts.has('InterBold')
      ? '68px InterBold'
      : 'bold 68px sans-serif';

    const titleMetrics = ctx.measureText(title);
    const titleRenderWidth = Math.min(titleMetrics.width, maxTextWidth);
    const titleX = (width - titleRenderWidth) / 2;
    let titleY = 220;

    if (variant === 'intro' || variant === 'song') {
      titleY = Math.floor((height - 68) / 2);
    } else if (variant === 'lyrics') {
      titleY = 300;
    }

    // Enhanced text rendering with stronger stroke
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeText(title, titleX, titleY);
    ctx.fillText(title, titleX, titleY);

    // Reset shadow for other elements
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;

    // Draw body/wrapped lyrics
    if (body) {
      if (variant === 'lyrics') {
        // Lyrics panel: center text within a fitted shadow box
        const panelX = margin;
        const panelW = width - margin * 2;
        ctx.font = GlobalFonts.has('Inter') ? '36px Inter' : '36px sans-serif';
        const lineHeight = 46;
        const innerPad = 40;
        const lines = computeWrappedLines(ctx, body, panelW - innerPad * 2);
        const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
        const panelH = totalHeight + innerPad * 2;
        const panelY = Math.max(0, Math.floor((height - panelH) / 2));

        // Draw shadow box
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000000';
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 28);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ENHANCED LYRICS RENDERING
        ctx.fillStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 16;

        const startY = panelY + Math.floor((panelH - totalHeight) / 2);
        const centerX = panelX + Math.floor(panelW / 2);

        for (let i = 0; i < lines.length; i++) {
          const y = startY + i * lineHeight;
          ctx.strokeText(lines[i], centerX, y);
          ctx.fillText(lines[i], centerX, y);
        }

        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
      }
    }

    // Enhanced Footer CTA
    ctx.font = GlobalFonts.has('Inter') ? '31px Inter' : '31px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeText('Follow for more underrated gems', width / 2, height - 180);
    ctx.fillText('Follow for more underrated gems', width / 2, height - 180);
    ctx.textAlign = 'left';

    // Debug: Check canvas content before output
    console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
    console.log(`Canvas data URL length: ${canvas.toDataURL().length}`);
    
    // HIGH QUALITY OUTPUT - JPEG for TikTok compatibility (under 5MB)
    const buffer = canvas.toBuffer('image/jpeg', 0.95);

    // Debug: Log file size for TikTok compatibility
    const fileSizeKB = Math.round(buffer.length / 1024);
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(
      `Generated image: ${width}x${height}, ${fileSizeKB}KB (${fileSizeMB}MB)`
    );
    
    // Debug: Check if buffer is too small
    if (buffer.length < 10000) {
      console.error('WARNING: Buffer is suspiciously small!');
      console.log('Buffer length:', buffer.length);
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (e: any) {
    console.error('slide render error', e);
    return NextResponse.json({ error: 'render_error' }, { status: 500 });
  }
}
