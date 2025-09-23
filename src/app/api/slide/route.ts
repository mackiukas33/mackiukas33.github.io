import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { songs } from '@/lib/data/songs';

// Register fonts
try {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  registerFont(path.join(fontsDir, 'Inter-Regular.ttf'), { family: 'Inter' });
  registerFont(path.join(fontsDir, 'Inter-Bold.ttf'), { family: 'InterBold' });
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

    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background: always pick a random photo; fallback to gradient if none
    try {
      const photosDir = path.join(process.cwd(), 'public/photos');
      const files = fs
        .readdirSync(photosDir)
        .filter(
          (f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
        );
      const randomBg = files[Math.floor(Math.random() * files.length)];
      const img = await loadImage(path.join(photosDir, randomBg));
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawW, drawH, dx, dy;
      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        dx = (width - drawW) / 2;
        dy = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        dx = 0;
        dy = (height - drawH) / 2;
      }
      ctx.drawImage(img, dx, dy, drawW, drawH);
    } catch {
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

    // Text style
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;

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
        const gy = 130;
        ctx.drawImage(gem, gx, gy, gemSize, gemSize);
      } catch {}
    }

    // Draw title (centered) - Balanced size for TikTok readability
    ctx.font = '160px InterBold, bold 160px sans-serif';
    const titleMetrics = ctx.measureText(title);
    const titleRenderWidth = Math.min(titleMetrics.width, maxTextWidth);
    const titleX = (width - titleRenderWidth) / 2;
    let titleY = 220;
    if (variant === 'intro' || variant === 'song') {
      titleY = Math.floor((height - 160) / 2);
    } else if (variant === 'lyrics') {
      titleY = 300;
    }
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeText(title, titleX, titleY);
    ctx.fillText(title, titleX, titleY);

    // Draw body/wrapped lyrics
    if (body) {
      // Lyrics panel: center text within a fitted shadow box
      const panelX = margin;
      const panelW = width - margin * 2;
      ctx.font = '100px Inter, 100px sans-serif';
      const lineHeight = 130;
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

      // Draw centered lyrics
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000000';
      ctx.textAlign = 'center';
      const startY = panelY + Math.floor((panelH - totalHeight) / 2);
      const centerX = panelX + Math.floor(panelW / 2);
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * lineHeight;
        ctx.strokeText(lines[i], centerX, y);
        ctx.fillText(lines[i], centerX, y);
      }
      ctx.textAlign = 'left';
    }

    // Footer CTA - Balanced size for TikTok readability
    ctx.font = '90px Inter, 90px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeText('Follow for more underrated gems', width / 2, height - 150);
    ctx.fillText('Follow for more underrated gems', width / 2, height - 150);
    ctx.textAlign = 'left';
    // Debug: Check canvas content before output
    console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
    console.log(`Canvas data URL length: ${canvas.toDataURL().length}`);

    // Debug: Check if canvas has any content by sampling pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log(`Image data length: ${imageData.data.length}`);

    // Check if canvas is mostly black/empty
    let nonBlackPixels = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      if (r > 10 || g > 10 || b > 10) {
        nonBlackPixels++;
      }
    }
    console.log(
      `Non-black pixels: ${nonBlackPixels} out of ${imageData.data.length / 4}`
    );

    // Try maximum quality to see if that fixes the tiny file size
    const buffer = canvas.toBuffer('image/jpeg');

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
