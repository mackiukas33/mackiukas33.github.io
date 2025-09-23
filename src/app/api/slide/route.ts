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

    // ---------------------------
    // Title (centered, dynamic size)
    // ---------------------------
    let titleFontSize = 160 * 0.7;
    ctx.font = `bold ${titleFontSize}px InterBold, sans-serif`;

    // Scale title if too wide
    const titleMaxWidth = width - margin * 2;
    let titleMetrics = ctx.measureText(title);
    while (titleMetrics.width > titleMaxWidth && titleFontSize > 60) {
      titleFontSize -= 4;
      ctx.font = `bold ${titleFontSize}px InterBold, sans-serif`;
      titleMetrics = ctx.measureText(title);
    }

    // Determine Y position
    let titleY = 220;
    if (variant === 'intro' || variant === 'song') {
      titleY = Math.floor((height - titleFontSize) / 2);
    } else if (variant === 'lyrics') {
      titleY = 300; // leave space for gem if present
    }

    // Draw title with stroke and fill
    ctx.lineWidth = Math.floor(titleFontSize / 20); // proportional stroke
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.strokeText(title, width / 2, titleY);
    ctx.fillText(title, width / 2, titleY);
    ctx.textAlign = 'left';

    // ---------------------------
    // Lyrics / Body (dynamic scaling)
    // ---------------------------
    if (body) {
      const panelX = margin;
      const panelW = width - margin * 2;
      const innerPad = 40;
      const maxTextWidth = panelW - innerPad * 2;

      // Start with a large font
      let fontSize = 140 * 0.7;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      let lines = computeWrappedLines(ctx, body, maxTextWidth);

      // Scale font to fit max panel height (60% of canvas)
      const maxPanelHeight = height * 0.6;
      const lineSpacing = 1.2;
      let totalHeight = lines.length * fontSize * lineSpacing;

      while (totalHeight > maxPanelHeight && fontSize > 40) {
        fontSize -= 4;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        lines = computeWrappedLines(ctx, body, maxTextWidth);
        totalHeight = lines.length * fontSize * lineSpacing;
      }

      // Draw shadow box behind lyrics
      const panelH = totalHeight + innerPad * 2;
      const panelY = Math.max(0, Math.floor((height - panelH) / 2));

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000000';
      drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 28);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw centered lyrics with stroke and fill
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.floor(fontSize / 16);
      ctx.textAlign = 'center';

      const startY = panelY + innerPad + fontSize / 2;
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * fontSize * lineSpacing;
        ctx.strokeText(lines[i], width / 2, y);
        ctx.fillText(lines[i], width / 2, y);
      }

      ctx.textAlign = 'left';
    }

    // ---------------------------
    // Footer CTA (dynamic scaling)
    // ---------------------------
    let footerFontSize = 90 * 0.7;
    ctx.font = `${footerFontSize}px Inter, sans-serif`;

    // Scale footer if too wide
    const footerText = 'Follow for more underrated gems';
    let footerMetrics = ctx.measureText(footerText);
    while (footerMetrics.width > width - margin * 2 && footerFontSize > 40) {
      footerFontSize -= 2;
      ctx.font = `${footerFontSize}px Inter, sans-serif`;
      footerMetrics = ctx.measureText(footerText);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.floor(footerFontSize / 16);
    ctx.textAlign = 'center';
    ctx.strokeText(footerText, width / 2, height - 150);
    ctx.fillText(footerText, width / 2, height - 150);
    ctx.textAlign = 'left';

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
