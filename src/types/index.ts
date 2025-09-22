export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
}

export interface TikTokPublishResponse {
  data: {
    publish_id: string;
    status: string;
  };
  error: {
    code: string;
    message: string;
  };
}

export interface TikTokPublishStatus {
  data: {
    status: 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
    publish_id: string;
    upload_url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CarouselPostData {
  token: TikTokTokenResponse;
  publish_api: TikTokPublishResponse;
  slide_urls: string[];
  status_checks: TikTokPublishStatus[];
}

export interface ImageGenerationParams {
  variant: 'intro' | 'song' | 'lyrics';
  bg?: string;
  song?: string;
  lyrics?: string;
}

export interface PostCarouselParams {
  accessToken: string;
  baseUrl: string;
}
