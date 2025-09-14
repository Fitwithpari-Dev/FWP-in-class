/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENVIRONMENT: string
  readonly VITE_APP_URL: string

  readonly VITE_ZOOM_SDK_KEY: string
  readonly VITE_ZOOM_SDK_SECRET: string
  readonly VITE_DEFAULT_SESSION_NAME: string
  readonly VITE_SESSION_PASSWORD: string
  readonly VITE_SESSION_MAX_PARTICIPANTS: string
  readonly VITE_SESSION_VIDEO_QUALITY: string
  readonly VITE_ZOOM_API_ENDPOINT: string
  readonly VITE_ZOOM_TOKEN_ENDPOINT: string

  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_SUPABASE_STORAGE_BUCKET: string
  readonly VITE_SUPABASE_MAX_FILE_SIZE: string
  readonly VITE_SUPABASE_REALTIME_ENABLED: string
  readonly VITE_SUPABASE_REALTIME_BROADCAST_RATE: string

  readonly VITE_AWS_REGION: string
  readonly VITE_CLOUDFRONT_DISTRIBUTION_ID: string
  readonly VITE_S3_BUCKET_NAME: string

  readonly VITE_JWT_SECRET: string
  readonly VITE_JWT_EXPIRY: string
  readonly VITE_REFRESH_TOKEN_EXPIRY: string

  readonly VITE_ENABLE_CSP: string
  readonly VITE_ENABLE_CORS: string
  readonly VITE_ALLOWED_ORIGINS: string

  readonly VITE_ENABLE_LIVE_STREAMING: string
  readonly VITE_ENABLE_RECORDED_CLASSES: string
  readonly VITE_ENABLE_PAYMENT_INTEGRATION: string
  readonly VITE_ENABLE_SOCIAL_LOGIN: string
  readonly VITE_ENABLE_CHAT: string
  readonly VITE_ENABLE_SCREEN_SHARE: string
  readonly VITE_ENABLE_VIRTUAL_BACKGROUND: string
  readonly VITE_ENABLE_ANALYTICS: string

  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_ENVIRONMENT: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string

  readonly VITE_PERFORMANCE_MONITORING: string
  readonly VITE_ERROR_REPORTING: string
  readonly VITE_LOG_LEVEL: string

  readonly VITE_API_BASE_URL: string
  readonly VITE_API_ENDPOINT: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_API_RETRY_ATTEMPTS: string

  readonly VITE_DEBUG_MODE: string
  readonly VITE_MOCK_API: string
  readonly VITE_HOT_RELOAD: string

  readonly VITE_STRIPE_PUBLIC_KEY: string
  readonly VITE_GA_TRACKING_ID: string
  readonly VITE_FB_PIXEL_ID: string

  readonly VITE_RATE_LIMIT_ENABLED: string
  readonly VITE_RATE_LIMIT_WINDOW_MS: string
  readonly VITE_RATE_LIMIT_MAX_REQUESTS: string

  readonly VITE_CACHE_TTL: string
  readonly VITE_CACHE_ENABLED: string

  readonly VITE_VIDEO_BITRATE_LOW: string
  readonly VITE_VIDEO_BITRATE_MEDIUM: string
  readonly VITE_VIDEO_BITRATE_HIGH: string
  readonly VITE_VIDEO_FPS: string
  readonly VITE_VIDEO_CODEC: string

  readonly VITE_ENABLE_PUSH_NOTIFICATIONS: string
  readonly VITE_ENABLE_EMAIL_NOTIFICATIONS: string
  readonly VITE_ENABLE_SMS_NOTIFICATIONS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}