/**
 * Zoom Video SDK Configuration
 * Production credentials should be stored in environment variables
 */

export const ZOOM_CONFIG = {
  // SDK credentials - These should be from your Zoom Video SDK App
  sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY || '',
  sdkSecret: import.meta.env.VITE_ZOOM_SDK_SECRET || '',

  // Session configuration - Fixed session for multi-user testing
  topic: import.meta.env.VITE_DEFAULT_SESSION_NAME || 'test123',
  userName: '', // Will be set dynamically
  password: import.meta.env.VITE_SESSION_PASSWORD || 'test123',
  roleType: 1, // 1 for host, 0 for attendee

  // Video configuration optimized for ultra-fast real-time fitness classes
  videoConfig: {
    // Video element rendering for better WebRTC compatibility and speed
    renderMode: 'video' as const,

    // Ultra-fast video quality settings
    videoQuality: {
      // Optimized for speed over quality
      default: '180p',  // Lower default for faster processing
      spotlight: '360p', // Reduced spotlight quality for speed
      maxReceiveQuality: '360p', // Cap max quality for performance

      // Optimized bandwidth for ultra-fast delivery
      maxBandwidth: {
        uplink: 800,   // kbps - reduced for faster upload
        downlink: 2000, // kbps - optimized for multiple fast streams
      },

      // Frame rate optimization
      targetFrameRate: 15, // 15fps for fitness (smooth but not CPU intensive)
      maxFrameRate: 30,    // Cap at 30fps
    },

    // Layout configuration for speed
    layout: {
      maxTilesInGallery: 16, // Reduced for faster rendering
      defaultLayout: 'gallery',
      spotlightUserFirst: true,
      enableLazyRendering: true, // Only render visible participants
    },

    // Ultra-fast performance settings
    performance: {
      enableHardwareAcceleration: true,
      maxRenderingParticipants: 16, // Reduced for faster rendering
      paginationThreshold: 16,      // Earlier pagination for speed
      enableVideoQualityOptimization: true,

      // Real-time optimizations
      enableFastStartup: true,
      prioritizeLatencyOverQuality: true,
      enableResourceThrottling: true,
      renderingStrategy: 'performance', // vs 'quality'
    },
  },

  // Audio configuration
  audioConfig: {
    enableNoiseSuppression: true,
    enableEchoCancellation: true,
    defaultMuted: false, // Participants join unmuted for coach, muted for students
    enableStereoAudio: false, // Mono is sufficient for fitness classes
  },

  // Network optimization for ultra-fast real-time performance
  networkConfig: {
    // Enable simulcast for bandwidth optimization
    enableSimulcast: true,

    // Ultra-fast WebRTC optimizations
    webrtcOptimizations: {
      enableUltraLowLatency: true,
      preferredCodec: 'VP9', // Better compression than H.264
      enableTemporalLayering: true, // SVC for adaptive streaming
      maxKeyframeInterval: 30, // More frequent keyframes for faster recovery
    },

    // Aggressive connection quality thresholds for speed
    qualityThresholds: {
      excellent: { rtt: 100, packetLoss: 0.5 }, // <100ms target for ultra-fast
      good: { rtt: 200, packetLoss: 2 },
      poor: { rtt: 400, packetLoss: 4 },
    },

    // Fast retry configuration
    reconnectAttempts: 5,
    reconnectDelay: 1000, // Faster reconnection (1s instead of 2s)

    // Bandwidth adaptation for real-time performance
    bandwidthAdaptation: {
      enableAggressiveAdaptation: true,
      targetLatency: 100, // ms - ultra-low latency target
      bufferSize: 50, // ms - minimal buffering for speed
    },
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