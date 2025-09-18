# TTPhotos TikTok Sandbox App

## Setup

1. Copy `.env.example` → `.env` and fill in sandbox keys.
2. Install dependencies:
3. Run locally:
4. Place at least 3 photos in `public/photos/`.
5. Go to `https://ttphotos.online/login` to start TikTok sandbox login flow.
6. After login, `/callback` will show access token info.
7. Call `postCarousel(accessToken)` to test random carousel selection (sandbox only).

## Notes

- Sandbox app must have verified domain and required fields filled.
- State tokens prevent CSRF attacks.
- HTTPS redirect URI required for production; sandbox allows HTTP.
