// Agora SDK Configuration for FitWithPari Video Platform

export const AGORA_CONFIG = {
  // App ID from Agora Console - replace with your actual App ID
  appId: import.meta.env.VITE_AGORA_APP_ID || 'your-agora-app-id',

  // Channel settings
  channel: {
    // Default channel prefix
    prefix: 'fitwithpari',
    // Channel expiration time (24 hours)
    expireTime: 24 * 60 * 60,
    // Max participants per channel
    maxParticipants: 50
  },

  // Video configuration optimized for fitness classes
  video: {
    // Video encoder config for different roles
    coach: {
      width: 1280,
      height: 720,
      frameRate: 30, // Smooth movement for demonstrations
      bitrateMin: 800,
      bitrateMax: 2000
    },
    student: {
      width: 640,
      height: 480,
      frameRate: 15, // Efficient for multiple participants
      bitrateMin: 400,
      bitrateMax: 1000
    },
    // Video quality levels
    quality: {
      high: '720p_1',
      medium: '480p_1',
      low: '360p_1'
    }
  },

  // Audio configuration optimized for fitness instruction
  audio: {
    // High quality for coach voice instruction
    coach: {
      profile: 'music_standard', // High quality for clear instruction
      scenario: 'game_streaming' // Low latency for real-time interaction
    },
    // Standard quality for student interaction
    student: {
      profile: 'speech_standard', // Optimized for voice
      scenario: 'meeting' // Good for group communication
    },
    // Audio processing
    processing: {
      AEC: true, // Acoustic Echo Cancellation
      ANS: true, // Automatic Noise Suppression
      AGC: true  // Automatic Gain Control
    }
  },

  // Network and performance settings
  network: {
    // Connection timeout
    timeout: 10000,
    // Retry attempts
    retryCount: 3,
    // Network quality monitoring
    qualityReporting: true
  },

  // UI settings
  ui: {
    // Auto-start video for coaches
    autoStartVideo: {
      coach: true,
      student: false // Let students choose when to start video
    },
    // Auto-start audio
    autoStartAudio: {
      coach: true,
      student: false // Let students choose when to unmute
    }
  },

  // Security settings
  security: {
    // Token expiration (24 hours)
    tokenExpireTime: 24 * 60 * 60,
    // Enable encryption
    encryption: false, // Set to true in production with proper key management
    // Allowed domains (for CORS)
    allowedDomains: [
      'localhost',
      'classes.tribe.fit',
      '*.tribe.fit'
    ]
  },

  // Debug settings
  debug: {
    // Enable console logging
    enableLogging: import.meta.env.DEV,
    // Log levels: 'debug', 'info', 'warning', 'error', 'none'
    logLevel: import.meta.env.DEV ? 'debug' : 'warning'
  }
};

// Agora App ID validation
export function validateAgoraConfig(): boolean {
  if (!AGORA_CONFIG.appId || AGORA_CONFIG.appId === 'your-agora-app-id') {
    console.error('❌ Agora App ID not configured. Please set VITE_AGORA_APP_ID in your .env file');
    return false;
  }
  return true;
}

// Generate channel name for session
export function generateChannelName(sessionId: string): string {
  // Ensure channel name is valid (alphanumeric and underscores only)
  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${AGORA_CONFIG.channel.prefix}_${cleanSessionId}`;
}

// Get video config based on role
export function getVideoConfig(role: 'coach' | 'student') {
  return AGORA_CONFIG.video[role];
}

// Get audio config based on role
export function getAudioConfig(role: 'coach' | 'student') {
  return AGORA_CONFIG.audio[role];
}

// Default export
export default AGORA_CONFIG;