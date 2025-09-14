/**
 * Zoom Video SDK Configuration
 * Production credentials should be stored in environment variables
 */

export const ZOOM_CONFIG = {
  // SDK credentials - These should be from your Zoom Video SDK App
  sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY || '',
  sdkSecret: import.meta.env.VITE_ZOOM_SDK_SECRET || '',

  // Session configuration - Fixed session for multi-user testing
  topic: 'fitwithpari-live-class-2024', // Fixed session name for all users
  userName: '', // Will be set dynamically
  password: 'FitClass123!', // Shared session password
  roleType: 1, // 1 for host, 0 for attendee

  // Video configuration optimized for fitness classes
  videoConfig: {
    // Canvas rendering for better performance with 50+ participants
    renderMode: 'canvas' as const,

    // Video quality settings
    videoQuality: {
      // Adaptive quality based on participant count
      default: '360p',
      spotlight: '720p',
      maxReceiveQuality: '720p',

      // Bandwidth optimization
      maxBandwidth: {
        uplink: 1500, // kbps
        downlink: 3000, // kbps
      },
    },

    // Layout configuration
    layout: {
      maxTilesInGallery: 49, // Optimal for fitness classes
      defaultLayout: 'gallery',
      spotlightUserFirst: true,
    },

    // Performance settings
    performance: {
      enableHardwareAcceleration: true,
      maxRenderingParticipants: 25, // Render up to 25 videos simultaneously
      paginationThreshold: 25, // Paginate after 25 participants
      enableVideoQualityOptimization: true,
    },
  },

  // Audio configuration
  audioConfig: {
    enableNoiseSuppression: true,
    enableEchoCancellation: true,
    defaultMuted: false, // Participants join unmuted for coach, muted for students
    enableStereoAudio: false, // Mono is sufficient for fitness classes
  },

  // Network optimization
  networkConfig: {
    // Enable simulcast for bandwidth optimization
    enableSimulcast: true,

    // Connection quality thresholds
    qualityThresholds: {
      excellent: { rtt: 150, packetLoss: 1 },
      good: { rtt: 300, packetLoss: 3 },
      poor: { rtt: 500, packetLoss: 5 },
    },

    // Retry configuration
    reconnectAttempts: 3,
    reconnectDelay: 2000, // ms
  },

  // Features specific to fitness platform
  features: {
    enableVirtualBackground: false, // Disabled for performance
    enableChat: true,
    enableRecording: true,
    enableScreenShare: true, // For sharing workout plans
    enableHandRaise: true,
    enableParticipantRename: false,
    enableWaitingRoom: false,

    // Fitness-specific features
    enableCoachControls: true,
    enableExerciseTargeting: true,
    enableHealthConsiderations: true,
  },

  // Session limits
  limits: {
    maxParticipants: 100,
    maxVideos: 25,
    sessionTimeout: 90 * 60 * 1000, // 90 minutes
  },
};

// Re-export token generation from the token service
export { generateSessionToken } from '../services/tokenService';