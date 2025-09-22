# TikTok Carousel Creator

A modern Next.js application that creates and posts beautiful TikTok carousels with your music automatically.

## Features

- 🎵 **Auto-generate dynamic slides** with your song lyrics
- 🎨 **Beautiful image generation** with custom backgrounds
- 📱 **Direct TikTok posting** via TikTok API
- ⚡ **Modern Next.js architecture** with TypeScript
- 🎯 **Clean, responsive UI** with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- TikTok Developer Account
- TikTok App with sandbox access

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mackiukas33.github.io
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your TikTok API credentials:
```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Add your photos to the `public/photos/` directory (minimum 3 images required)

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Connect with TikTok** - Users authenticate via TikTok OAuth
2. **Generate Slides** - The app creates 3 dynamic slides:
   - Intro slide with catchy title
   - Song information slide
   - Lyrics slide with formatted text
3. **Post to TikTok** - Automatically posts the carousel to TikTok

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # TikTok OAuth
│   │   ├── slide/         # Image generation
│   │   └── publish-status/ # Post status checking
│   ├── success/           # Success page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
│   └── data/             # Songs and hashtags data
└── types/                # TypeScript type definitions
```

## API Endpoints

- `GET /api/auth/login` - Initiate TikTok OAuth
- `GET /api/auth/callback` - Handle OAuth callback and post carousel
- `GET /api/slide` - Generate dynamic slide images
- `GET /api/publish-status` - Check post status

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## Configuration

### Adding Songs

Edit `src/lib/data/songs.ts` to add your songs:

```typescript
export const songs: Song[] = [
  {
    id: 'MUSIC_ID_1',
    name: 'Your Song Name',
    lyrics: 'Your song lyrics here...'
  }
]
```

### Customizing Hashtags

Edit `src/lib/data/hashtags.ts` to customize hashtags and titles.

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@napi-rs/canvas** - Image generation
- **TikTok API** - Social media integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.