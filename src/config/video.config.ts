// Video Service Configuration - Single Point of Control
// Change VIDEO_SERVICE to switch between platforms globally

export type VideoServiceProvider = 'zoom' | 'agora';

// 🎯 PRIMARY CONFIGURATION - Change this to switch video providers
export const VIDEO_SERVICE: VideoServiceProvider = 'agora'; // Switch between 'zoom' or 'agora'

// Service-specific configurations
export const VIDEO_CONFIG = {
  // Active service configuration
  primary: VIDEO_SERVICE,

  // Fallback service (opposite of primary)
  fallback: VIDEO_SERVICE === 'zoom' ? 'agora' : 'zoom',

  // Service-specific settings
  zoom: {
    // Zoom SDK configuration
    apiKey: import.meta.env.VITE_ZOOM_SDK_KEY,
    apiSecret: import.meta.env.VITE_ZOOM_SDK_SECRET,
    tokenEndpoint: import.meta.env.VITE_ZOOM_TOKEN_ENDPOINT,
    defaultSessionName: import.meta.env.VITE_DEFAULT_SESSION_NAME || 'fitwithpari-session',
    sessionPassword: import.meta.env.VITE_SESSION_PASSWORD || 'test123',

    // Zoom-specific video settings
    video: {
      width: 1280,
      height: 720,
      frameRate: 30
    },

    // Zoom connection settings
    connection: {
      timeout: 10000,
      retryCount: 3
    }
  },

  agora: {
    // Agora SDK configuration
    appId: import.meta.env.VITE_AGORA_APP_ID,

    // Agora-specific video settings optimized for fitness
    video: {
      coach: {
        width: 1280,
        height: 720,
        frameRate: 30,
        bitrateMin: 800,
        bitrateMax: 2000
      },
      student: {
        width: 640,
        height: 480,
        frameRate: 15,
        bitrateMin: 400,
        bitrateMax: 1000
      }
    },

    // Agora connection settings
    connection: {
      timeout: 10000,
      retryCount: 3,
      maxParticipants: 50
    }
  }
} as const;

// Service validation
export function validateVideoConfig(): boolean {
  const config = VIDEO_CONFIG[VIDEO_SERVICE];

  if (VIDEO_SERVICE === 'zoom') {
    return !!(config as typeof VIDEO_CONFIG.zoom).apiKey &&
           !!(config as typeof VIDEO_CONFIG.zoom).apiSecret;
  } else if (VIDEO_SERVICE === 'agora') {
    return !!(config as typeof VIDEO_CONFIG.agora).appId;
  }

  return false;
}

// Get current service configuration
export function getCurrentServiceConfig() {
  return VIDEO_CONFIG[VIDEO_SERVICE];
}

// Get fallback service configuration
export function getFallbackServiceConfig() {
  return VIDEO_CONFIG[VIDEO_CONFIG.fallback];
}

// Service display names
export const SERVICE_NAMES = {
  zoom: 'Zoom Video SDK',
  agora: 'Agora RTC SDK'
} as const;

// Debug information
export function getVideoConfigInfo() {
  return {
    primaryService: VIDEO_SERVICE,
    primaryServiceName: SERVICE_NAMES[VIDEO_SERVICE],
    fallbackService: VIDEO_CONFIG.fallback,
    fallbackServiceName: SERVICE_NAMES[VIDEO_CONFIG.fallback],
    isValid: validateVideoConfig(),
    config: getCurrentServiceConfig()
  };
}

export default VIDEO_CONFIG;