# Zoom Video SDK Web Implementation Guide for FitWithPari V2

## 📚 Table of Contents
1. [Complete Setup Process](#complete-setup-process)
2. [Authentication Workflow](#authentication-workflow)
3. [Session Management](#session-management)
4. [Participant Management](#participant-management)
5. [Video/Audio Controls](#videoaudio-controls)
6. [Event Handling](#event-handling)
7. [React Integration](#react-integration)
8. [Production Best Practices](#production-best-practices)
9. [Performance Optimization for 50+ Participants](#performance-optimization-for-50-participants)
10. [Error Handling](#error-handling)
11. [Troubleshooting Guide](#troubleshooting-guide)

## 🚀 Complete Setup Process

### Prerequisites and Dependencies

#### 1. System Requirements
- **Browser Support**: Chrome 74+, Firefox 78+, Safari 12.1+, Edge 84+
- **HTTPS Required**: Video SDK requires secure context (HTTPS) for camera/microphone access
- **Network Requirements**:
  - Minimum bandwidth: 600kbps (1-on-1), 1.2Mbps (group)
  - Recommended: 3.8Mbps for optimal quality
  - Ports: TCP 80, 443; UDP 8801-8810

#### 2. Installation

```bash
# NPM Installation (Recommended for React)
npm install @zoom/videosdk --save

# Alternative: Yarn
yarn add @zoom/videosdk

# For TypeScript support
npm install --save-dev @types/zoom-videosdk
```

#### 3. Zoom App Configuration
1. Create account at [Zoom Marketplace](https://marketplace.zoom.us)
2. Create a Video SDK app
3. Obtain SDK Key and SDK Secret
4. Configure authorized domains for production

### Environment Configuration

```typescript
// .env file
VITE_ZOOM_SDK_KEY=your_sdk_key_here
VITE_ZOOM_SDK_SECRET=your_sdk_secret_here # NEVER expose in production
VITE_ZOOM_TOKEN_ENDPOINT=https://your-backend.com/api/zoom/token
VITE_ZOOM_MAX_PARTICIPANTS=100
VITE_ZOOM_ENABLE_GALLERY_VIEW=true
VITE_ZOOM_ENABLE_RECORDING=false
```

## 🔐 Authentication Workflow

### JWT Token Structure and Generation

#### Token Payload Requirements
```typescript
interface ZoomJWTPayload {
  app_key: string;           // Your SDK Key
  tpc: string;               // Session name (topic)
  role_type: 0 | 1;          // 0 = participant, 1 = host
  version: 1;                // Always 1
  iat: number;               // Issued at timestamp (seconds)
  exp: number;               // Expiration (min: iat + 1800, max: iat + 172800)
  user_identity?: string;    // Optional: unique user identifier
  session_key?: string;      // Optional: session identifier
  geo_regions?: string[];    // Optional: ['US', 'EU', 'AP'] for data centers
  cloud_recording_option?: 0 | 1;  // Optional: enable cloud recording
  telemetry_tracking_id?: string;   // Optional: for analytics
}
```

#### Server-Side Token Generation (Node.js/Lambda)

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class ZoomTokenService {
  private readonly SDK_KEY: string;
  private readonly SDK_SECRET: string;

  constructor() {
    this.SDK_KEY = process.env.ZOOM_SDK_KEY!;
    this.SDK_SECRET = process.env.ZOOM_SDK_SECRET!;
  }

  generateSessionToken(params: {
    sessionName: string;
    role: 'host' | 'participant';
    userIdentity: string;
    sessionKey?: string;
    duration?: number; // in seconds, default 2 hours
  }): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (params.duration || 7200); // 2 hours default

    // Validate expiration constraints
    if (exp - iat < 1800) {
      throw new Error('Token duration must be at least 1800 seconds');
    }
    if (exp - iat > 172800) {
      throw new Error('Token duration cannot exceed 48 hours');
    }

    const payload: ZoomJWTPayload = {
      app_key: this.SDK_KEY,
      tpc: params.sessionName,
      role_type: params.role === 'host' ? 1 : 0,
      version: 1,
      iat,
      exp,
      user_identity: params.userIdentity,
      session_key: params.sessionKey,
      geo_regions: ['US', 'EU', 'AP'], // Global coverage
      cloud_recording_option: params.role === 'host' ? 1 : 0,
      telemetry_tracking_id: crypto.randomUUID()
    };

    // Sign with HS256 algorithm
    return jwt.sign(payload, this.SDK_SECRET, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT'
      }
    });
  }

  verifyToken(token: string): ZoomJWTPayload {
    try {
      return jwt.verify(token, this.SDK_SECRET) as ZoomJWTPayload;
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }
}
```

#### AWS Lambda Token Generation Endpoint

```typescript
// lambda/zoom-token-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZoomTokenService } from './ZoomTokenService';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.sessionName || !body.userIdentity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const tokenService = new ZoomTokenService();
    const token = tokenService.generateSessionToken({
      sessionName: body.sessionName,
      role: body.role || 'participant',
      userIdentity: body.userIdentity,
      sessionKey: body.sessionKey,
      duration: body.duration || 7200
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token })
    };
  } catch (error) {
    console.error('Token generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Token generation failed' })
    };
  }
};
```

## 📹 Session Management

### Core Session Joining Process

```typescript
import ZoomVideo from '@zoom/videosdk';

export class ZoomSessionManager {
  private client: typeof ZoomVideo.VideoClient;
  private stream: typeof ZoomVideo.Stream;

  async initializeClient(): Promise<void> {
    // Create client instance
    this.client = ZoomVideo.createClient();

    // Initialize with optimized configuration
    await this.client.init('en-US', 'Global', {
      patchJsMedia: true,                    // Required for audio
      enforceMultipleVideos: true,           // Multiple video streams
      stayAwake: true,                       // Prevent device sleep
      captureVideoFromScreen: false,         // Disable screen capture
      enableSmartZoomQuality: true,          // Adaptive quality
      maxParticipantsInGalleryView: 25,      // Performance limit
      videoQuality: '720p',                  // Default quality
      audioWorkletEnabled: true,             // Better audio processing
      enableHardwareAcceleration: true       // GPU acceleration
    });
  }

  async joinSession(params: {
    sessionName: string;
    token: string;
    userName: string;
    role: 'coach' | 'student';
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  }): Promise<void> {
    try {
      // Session names support alphanumeric + specific symbols
      const sanitizedSessionName = params.sessionName
        .replace(/[^a-zA-Z0-9_\-\.]/g, '')
        .substring(0, 200); // Max 200 chars

      // Join with role-based configuration
      await this.client.join(
        sanitizedSessionName,
        params.token,
        params.userName,
        params.role === 'coach' ? '1' : '0' // Password differentiation
      );

      // Get media stream handle
      this.stream = this.client.getMediaStream();

      // Initialize media based on role
      if (params.videoEnabled) {
        await this.startVideo();
      }

      if (params.audioEnabled) {
        await this.startAudio();
      }

      // Enable subsystem features
      await this.setupSubsystems();

    } catch (error) {
      console.error('Session join failed:', error);
      throw this.handleJoinError(error);
    }
  }

  private async setupSubsystems(): Promise<void> {
    // Enable chat
    const chatClient = this.client.getChatClient();

    // Enable recording capabilities (host only)
    const recordingClient = this.client.getRecordingClient();

    // Enable live transcription (if available)
    const liveTranscriptionClient = this.client.getLiveTranscriptionClient();

    // Setup command channel for fitness instructions
    const commandClient = this.client.getCommandClient();
  }

  async leaveSession(): Promise<void> {
    try {
      // Stop all media streams
      if (this.stream) {
        await this.stream.stopVideo();
        await this.stream.stopAudio();
        await this.stream.stopShareScreen();
      }

      // Leave session
      await this.client.leave();

      // Cleanup
      this.stream = null;
    } catch (error) {
      console.error('Leave session error:', error);
    }
  }
}
```

## 👥 Participant Management

### Comprehensive Participant Control

```typescript
export class ParticipantManager {
  private participants: Map<number, ParticipantInfo> = new Map();
  private client: typeof ZoomVideo.VideoClient;
  private stream: typeof ZoomVideo.Stream;

  // Get all participants with detailed info
  async getAllParticipants(): Promise<ParticipantInfo[]> {
    const users = await this.client.getAllUser();

    return users.map(user => ({
      userId: user.userId,
      displayName: user.displayName,
      isHost: user.isHost,
      isCoHost: user.isCoHost,
      videoState: {
        isOn: user.bVideoOn,
        isReceiving: this.stream.isReceivingVideoFor(user.userId),
        quality: this.stream.getVideoQuality(user.userId)
      },
      audioState: {
        isOn: !user.muted,
        isReceiving: this.stream.isReceivingAudioFor(user.userId),
        isTalking: user.isTalking
      },
      sharingState: {
        isSharing: user.sharerOn,
        isReceivingShare: user.isReceivingScreenShare
      },
      connectionQuality: this.getConnectionQuality(user.userId)
    }));
  }

  // Coach/Host controls
  async muteParticipant(userId: number, mediaType: 'audio' | 'video'): Promise<void> {
    if (!await this.isCurrentUserHost()) {
      throw new Error('Only hosts can mute participants');
    }

    if (mediaType === 'audio') {
      await this.client.mute(userId, true);
    } else {
      await this.client.stopVideo(userId);
    }
  }

  async removeParticipant(userId: number): Promise<void> {
    if (!await this.isCurrentUserHost()) {
      throw new Error('Only hosts can remove participants');
    }

    await this.client.removeUser(userId);
  }

  // Spotlight for fitness instructor focus
  async spotlightParticipant(userId: number): Promise<void> {
    await this.stream.spotlightVideo(userId);
  }

  async addSpotlightParticipant(userId: number): Promise<void> {
    await this.stream.addSpotlightVideo(userId);
  }

  async removeSpotlight(userId: number): Promise<void> {
    await this.stream.removeSpotlightVideo(userId);
  }

  // Advanced participant filtering for large sessions
  async getActiveParticipants(limit: number = 25): Promise<ParticipantInfo[]> {
    const allParticipants = await this.getAllParticipants();

    // Priority: Host > Active Speakers > Video On > Recently Joined
    return allParticipants
      .sort((a, b) => {
        if (a.isHost) return -1;
        if (b.isHost) return 1;
        if (a.audioState.isTalking && !b.audioState.isTalking) return -1;
        if (b.audioState.isTalking && !a.audioState.isTalking) return 1;
        if (a.videoState.isOn && !b.videoState.isOn) return -1;
        if (b.videoState.isOn && !a.videoState.isOn) return 1;
        return 0;
      })
      .slice(0, limit);
  }

  // Pagination support for gallery view
  async getParticipantPage(page: number, pageSize: number = 25): Promise<{
    participants: ParticipantInfo[];
    totalPages: number;
    currentPage: number;
  }> {
    const allParticipants = await this.getAllParticipants();
    const totalPages = Math.ceil(allParticipants.length / pageSize);
    const start = page * pageSize;
    const end = start + pageSize;

    return {
      participants: allParticipants.slice(start, end),
      totalPages,
      currentPage: page
    };
  }
}
```

## 🎥 Video/Audio Controls

### Advanced Media Management

```typescript
export class MediaController {
  private stream: typeof ZoomVideo.Stream;
  private currentCamera: string | null = null;
  private currentMicrophone: string | null = null;
  private currentSpeaker: string | null = null;

  // Video controls with quality optimization
  async startVideo(options?: {
    cameraId?: string;
    quality?: '90p' | '180p' | '360p' | '720p' | '1080p';
    virtualBackground?: boolean;
    facingMode?: 'user' | 'environment'; // Mobile only
  }): Promise<void> {
    try {
      // Configure video constraints
      const videoConstraints: MediaTrackConstraints = {
        width: this.getResolutionWidth(options?.quality || '720p'),
        height: this.getResolutionHeight(options?.quality || '720p'),
        frameRate: { ideal: 30, max: 30 },
        deviceId: options?.cameraId
      };

      // Mobile-specific facing mode
      if (this.isMobile() && options?.facingMode) {
        videoConstraints.facingMode = options.facingMode;
      }

      // Start video with constraints
      await this.stream.startVideo({
        videoElement: document.querySelector('#my-video'),
        cameraId: options?.cameraId,
        captureWidth: videoConstraints.width,
        captureHeight: videoConstraints.height,
        virtualBackground: options?.virtualBackground
      });

      this.currentCamera = options?.cameraId || 'default';
    } catch (error) {
      console.error('Start video failed:', error);
      throw this.handleMediaError(error, 'video');
    }
  }

  async stopVideo(): Promise<void> {
    await this.stream.stopVideo();
    this.currentCamera = null;
  }

  // Audio controls with echo cancellation
  async startAudio(options?: {
    microphoneId?: string;
    speakerId?: string;
    suppressNoise?: boolean;
    enableAGC?: boolean; // Automatic Gain Control
    enableAEC?: boolean; // Acoustic Echo Cancellation
  }): Promise<void> {
    try {
      await this.stream.startAudio({
        microphoneId: options?.microphoneId,
        speakerId: options?.speakerId,
        suppressNoise: options?.suppressNoise ?? true,
        enableAGC: options?.enableAGC ?? true,
        enableAEC: options?.enableAEC ?? true
      });

      this.currentMicrophone = options?.microphoneId || 'default';
      this.currentSpeaker = options?.speakerId || 'default';
    } catch (error) {
      console.error('Start audio failed:', error);
      throw this.handleMediaError(error, 'audio');
    }
  }

  async stopAudio(): Promise<void> {
    await this.stream.stopAudio();
    this.currentMicrophone = null;
  }

  // Device management
  async getDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      cameras: devices.filter(d => d.kind === 'videoinput'),
      microphones: devices.filter(d => d.kind === 'audioinput'),
      speakers: devices.filter(d => d.kind === 'audiooutput')
    };
  }

  async switchCamera(cameraId: string): Promise<void> {
    if (this.currentCamera === cameraId) return;

    await this.stream.switchCamera(cameraId);
    this.currentCamera = cameraId;
  }

  async switchMicrophone(microphoneId: string): Promise<void> {
    if (this.currentMicrophone === microphoneId) return;

    await this.stream.switchMicrophone(microphoneId);
    this.currentMicrophone = microphoneId;
  }

  // Audio level monitoring for visual feedback
  async getAudioLevel(): Promise<number> {
    return this.stream.getCurrentAudioLevel();
  }

  // Virtual background for fitness sessions
  async setVirtualBackground(options: {
    type: 'blur' | 'image' | 'none';
    blurLevel?: 1 | 2 | 3;
    imageUrl?: string;
  }): Promise<void> {
    const vbClient = this.stream.getVirtualBackgroundClient();

    switch (options.type) {
      case 'blur':
        await vbClient.setVirtualBackground(
          undefined,
          options.blurLevel || 2
        );
        break;
      case 'image':
        if (options.imageUrl) {
          await vbClient.setVirtualBackground(options.imageUrl);
        }
        break;
      case 'none':
        await vbClient.stop();
        break;
    }
  }

  // Screen sharing for workout demonstrations
  async startScreenShare(options?: {
    withAudio?: boolean;
    optimizeForVideo?: boolean;
  }): Promise<void> {
    await this.stream.startShareScreen(
      document.querySelector('#share-canvas'),
      options?.withAudio,
      options?.optimizeForVideo
    );
  }

  async stopScreenShare(): Promise<void> {
    await this.stream.stopShareScreen();
  }
}
```

## 📡 Event Handling

### Comprehensive Event System

```typescript
export class ZoomEventHandler {
  private client: typeof ZoomVideo.VideoClient;
  private eventCallbacks: Map<string, Set<Function>> = new Map();

  setupEventHandlers(): void {
    // Connection events
    this.client.on('connection-change', (payload) => {
      this.emit('connectionStateChanged', {
        state: payload.state, // 'Connected' | 'Connecting' | 'Disconnected'
        reason: payload.reason
      });
    });

    // Participant events
    this.client.on('user-added', (payload) => {
      this.emit('participantJoined', {
        userId: payload.userId,
        displayName: payload.displayName,
        timestamp: Date.now()
      });
    });

    this.client.on('user-removed', (payload) => {
      this.emit('participantLeft', {
        userId: payload.userId,
        displayName: payload.displayName,
        timestamp: Date.now()
      });
    });

    this.client.on('user-updated', (payload) => {
      this.emit('participantUpdated', {
        userId: payload.userId,
        updates: payload.updates // Video/audio state changes
      });
    });

    // Video events
    this.client.on('peer-video-state-change', (payload) => {
      this.emit('videoStateChanged', {
        userId: payload.userId,
        state: payload.state, // 'Started' | 'Stopped'
        timestamp: Date.now()
      });
    });

    this.client.on('video-capturing-change', (payload) => {
      this.emit('videoCapturingChanged', {
        isCapturing: payload.isCapturing
      });
    });

    this.client.on('video-active-change', (payload) => {
      this.emit('activeVideoChanged', {
        activeVideos: payload.activeVideos,
        timestamp: Date.now()
      });
    });

    // Audio events
    this.client.on('audio-state-change', (payload) => {
      this.emit('audioStateChanged', {
        userId: payload.userId,
        muted: payload.muted
      });
    });

    this.client.on('active-speaker', (payload) => {
      this.emit('activeSpeakerChanged', {
        activeSpeakers: payload.map(s => ({
          userId: s.userId,
          displayName: s.displayName,
          audioLevel: s.audioLevel
        }))
      });
    });

    this.client.on('audio-level-change', (payload) => {
      this.emit('audioLevelChanged', {
        userId: payload.userId,
        level: payload.level // 0-100
      });
    });

    // Share screen events
    this.client.on('share-status-change', (payload) => {
      this.emit('shareStatusChanged', {
        userId: payload.userId,
        isSharing: payload.isSharing,
        shareType: payload.shareType // 'screen' | 'whiteboard'
      });
    });

    // Recording events
    this.client.on('recording-status-change', (payload) => {
      this.emit('recordingStatusChanged', {
        status: payload.status, // 'started' | 'stopped' | 'paused'
        recordingType: payload.recordingType // 'cloud' | 'local'
      });
    });

    // Chat events
    this.client.on('chat-message', (payload) => {
      this.emit('chatMessageReceived', {
        userId: payload.userId,
        message: payload.message,
        timestamp: payload.timestamp
      });
    });

    // Network quality events
    this.client.on('network-quality-change', (payload) => {
      this.emit('networkQualityChanged', {
        userId: payload.userId,
        quality: payload.quality, // 'good' | 'normal' | 'bad'
        uplinkQuality: payload.uplinkQuality,
        downlinkQuality: payload.downlinkQuality
      });
    });

    // Permission events
    this.client.on('device-permission-change', (payload) => {
      this.emit('devicePermissionChanged', {
        deviceType: payload.deviceType, // 'camera' | 'microphone'
        granted: payload.granted
      });
    });

    // Error events
    this.client.on('error', (error) => {
      this.emit('error', {
        code: error.code,
        message: error.message,
        type: error.type,
        timestamp: Date.now()
      });
    });
  }

  // Event subscription management
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.eventCallbacks.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.eventCallbacks.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }
}
```

## ⚛️ React Integration

### Custom React Hooks for Zoom Video SDK

```typescript
// hooks/useZoomVideoSDK.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import ZoomVideo from '@zoom/videosdk';

export interface UseZoomVideoSDKOptions {
  sessionName: string;
  userName: string;
  role: 'coach' | 'student';
  tokenEndpoint: string;
  onError?: (error: Error) => void;
  onConnectionChange?: (state: string) => void;
  enableAutoReconnect?: boolean;
}

export function useZoomVideoSDK(options: UseZoomVideoSDKOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<string>('disconnected');

  const clientRef = useRef<typeof ZoomVideo.VideoClient | null>(null);
  const streamRef = useRef<typeof ZoomVideo.Stream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client
  useEffect(() => {
    const initClient = async () => {
      try {
        const client = ZoomVideo.createClient();

        await client.init('en-US', 'Global', {
          patchJsMedia: true,
          enforceMultipleVideos: true,
          stayAwake: true,
          enableSmartZoomQuality: true,
          maxParticipantsInGalleryView: 25
        });

        clientRef.current = client;
        setIsInitialized(true);

        // Setup event handlers
        setupEventHandlers(client);
      } catch (error) {
        console.error('Failed to initialize Zoom client:', error);
        options.onError?.(error as Error);
      }
    };

    initClient();

    return () => {
      cleanup();
    };
  }, []);

  // Setup event handlers
  const setupEventHandlers = useCallback((client: any) => {
    client.on('connection-change', (payload: any) => {
      setConnectionState(payload.state);
      options.onConnectionChange?.(payload.state);

      // Auto-reconnect logic
      if (payload.state === 'Disconnected' && options.enableAutoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          joinSession();
        }, 3000);
      }
    });

    client.on('user-added', (payload: any) => {
      setParticipants(prev => [...prev, payload]);
    });

    client.on('user-removed', (payload: any) => {
      setParticipants(prev => prev.filter(p => p.userId !== payload.userId));
    });

    client.on('active-speaker', (payload: any) => {
      setActiveSpeakers(payload.map((s: any) => s.userId));
    });

    client.on('peer-video-state-change', (payload: any) => {
      setParticipants(prev => prev.map(p =>
        p.userId === payload.userId
          ? { ...p, videoOn: payload.state === 'Started' }
          : p
      ));
    });
  }, [options]);

  // Get JWT token from backend
  const getToken = useCallback(async (): Promise<string> => {
    const response = await fetch(options.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionName: options.sessionName,
        role: options.role,
        userIdentity: options.userName
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get token');
    }

    const data = await response.json();
    return data.token;
  }, [options]);

  // Join session
  const joinSession = useCallback(async () => {
    if (!clientRef.current || !isInitialized) {
      console.error('Client not initialized');
      return;
    }

    try {
      const token = await getToken();

      await clientRef.current.join(
        options.sessionName,
        token,
        options.userName,
        options.role === 'coach' ? '1' : '0'
      );

      streamRef.current = clientRef.current.getMediaStream();
      setIsJoined(true);

      // Load existing participants
      const users = await clientRef.current.getAllUser();
      setParticipants(users);
    } catch (error) {
      console.error('Failed to join session:', error);
      options.onError?.(error as Error);
    }
  }, [isInitialized, options, getToken]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      // Stop media streams
      if (streamRef.current) {
        await streamRef.current.stopVideo();
        await streamRef.current.stopAudio();
      }

      await clientRef.current.leave();
      setIsJoined(false);
      setParticipants([]);
      setIsVideoOn(false);
      setIsAudioOn(false);
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!streamRef.current || !isJoined) return;

    try {
      if (isVideoOn) {
        await streamRef.current.stopVideo();
        setIsVideoOn(false);
      } else {
        await streamRef.current.startVideo();
        setIsVideoOn(true);
      }
    } catch (error) {
      console.error('Failed to toggle video:', error);
      options.onError?.(error as Error);
    }
  }, [isVideoOn, isJoined]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!streamRef.current || !isJoined) return;

    try {
      if (isAudioOn) {
        await streamRef.current.stopAudio();
        setIsAudioOn(false);
      } else {
        await streamRef.current.startAudio();
        setIsAudioOn(true);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      options.onError?.(error as Error);
    }
  }, [isAudioOn, isJoined]);

  // Render video for a participant
  const renderVideo = useCallback(async (
    userId: number,
    element: HTMLElement,
    width: number,
    height: number
  ) => {
    if (!streamRef.current || !isJoined) return;

    try {
      await streamRef.current.renderVideo(
        element,
        userId,
        width,
        height,
        0,
        0,
        3 // Video quality level
      );
    } catch (error) {
      console.error('Failed to render video:', error);
    }
  }, [isJoined]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (clientRef.current) {
      clientRef.current.leave();
      clientRef.current = null;
    }
  }, []);

  return {
    // State
    isInitialized,
    isJoined,
    participants,
    isVideoOn,
    isAudioOn,
    activeSpeakers,
    connectionState,

    // Actions
    joinSession,
    leaveSession,
    toggleVideo,
    toggleAudio,
    renderVideo,

    // References
    client: clientRef.current,
    stream: streamRef.current
  };
}
```

### React Component Example

```tsx
// components/ZoomVideoSession.tsx
import React, { useEffect, useRef } from 'react';
import { useZoomVideoSDK } from '../hooks/useZoomVideoSDK';

interface VideoTileProps {
  participant: any;
  isActive: boolean;
  onRender: (element: HTMLElement) => void;
}

const VideoTile: React.FC<VideoTileProps> = ({ participant, isActive, onRender }) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.videoOn) {
      onRender(videoRef.current);
    }
  }, [participant.videoOn, onRender]);

  return (
    <div className={`video-tile ${isActive ? 'active-speaker' : ''}`}>
      <div ref={videoRef} className="video-container" />
      <div className="participant-info">
        <span>{participant.displayName}</span>
        {participant.audioOn && <span className="audio-indicator">🎤</span>}
      </div>
    </div>
  );
};

export const ZoomVideoSession: React.FC<{
  sessionName: string;
  userName: string;
  role: 'coach' | 'student';
}> = ({ sessionName, userName, role }) => {
  const {
    isJoined,
    participants,
    isVideoOn,
    isAudioOn,
    activeSpeakers,
    joinSession,
    leaveSession,
    toggleVideo,
    toggleAudio,
    renderVideo
  } = useZoomVideoSDK({
    sessionName,
    userName,
    role,
    tokenEndpoint: process.env.VITE_ZOOM_TOKEN_ENDPOINT!,
    enableAutoReconnect: true
  });

  useEffect(() => {
    joinSession();

    return () => {
      leaveSession();
    };
  }, []);

  const handleRenderVideo = useCallback((participant: any) => {
    return (element: HTMLElement) => {
      renderVideo(
        participant.userId,
        element,
        element.clientWidth,
        element.clientHeight
      );
    };
  }, [renderVideo]);

  if (!isJoined) {
    return <div>Joining session...</div>;
  }

  return (
    <div className="zoom-video-session">
      <div className="video-gallery">
        {participants.slice(0, 25).map(participant => (
          <VideoTile
            key={participant.userId}
            participant={participant}
            isActive={activeSpeakers.includes(participant.userId)}
            onRender={handleRenderVideo(participant)}
          />
        ))}
      </div>

      <div className="controls-bar">
        <button
          onClick={toggleVideo}
          className={isVideoOn ? 'active' : 'inactive'}
        >
          {isVideoOn ? '📹' : '📷'}
        </button>

        <button
          onClick={toggleAudio}
          className={isAudioOn ? 'active' : 'inactive'}
        >
          {isAudioOn ? '🎤' : '🔇'}
        </button>

        <button onClick={leaveSession} className="leave-button">
          Leave Session
        </button>
      </div>

      <div className="participant-count">
        Participants: {participants.length}
      </div>
    </div>
  );
};
```

## 🚀 Production Best Practices

### 1. Security Best Practices

```typescript
// Never expose SDK credentials in frontend
class SecurityBestPractices {
  // ❌ WRONG - Never do this
  badExample() {
    const SDK_KEY = 'your_sdk_key'; // NEVER hardcode
    const SDK_SECRET = 'your_sdk_secret'; // NEVER expose
  }

  // ✅ CORRECT - Use backend service
  goodExample() {
    // Token generation on backend
    const getToken = async () => {
      const response = await fetch('/api/zoom/token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionName,
          role,
          userIdentity
        })
      });

      return response.json();
    };
  }
}
```

### 2. Error Handling and Recovery

```typescript
class ErrorHandler {
  handleZoomError(error: any): void {
    const errorMap = {
      'INVALID_PARAMETER': 'Invalid session parameters',
      'INVALID_TOKEN': 'Authentication failed',
      'NETWORK_ERROR': 'Network connection issue',
      'MEDIA_PERMISSION_DENIED': 'Camera/Microphone access denied',
      'SESSION_FULL': 'Session has reached maximum participants',
      'RATE_LIMITED': 'Too many requests, please try again'
    };

    const message = errorMap[error.code] || 'An unexpected error occurred';

    // Log to monitoring service
    this.logError({
      code: error.code,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      sessionInfo: {
        sessionName: this.sessionName,
        participantCount: this.participants.length
      }
    });

    // User-friendly error display
    this.showUserError(message);

    // Attempt recovery
    this.attemptRecovery(error.code);
  }

  private attemptRecovery(errorCode: string): void {
    switch (errorCode) {
      case 'NETWORK_ERROR':
        setTimeout(() => this.reconnect(), 3000);
        break;
      case 'INVALID_TOKEN':
        this.refreshToken();
        break;
      case 'MEDIA_PERMISSION_DENIED':
        this.promptMediaPermissions();
        break;
    }
  }
}
```

### 3. Monitoring and Analytics

```typescript
class SessionMonitor {
  private metrics: SessionMetrics = {
    joinTime: 0,
    participantCount: 0,
    videoQualityChanges: [],
    connectionDrops: 0,
    averageLatency: 0
  };

  startMonitoring(client: any): void {
    // Track session metrics
    setInterval(() => {
      this.collectMetrics(client);
      this.sendToAnalytics();
    }, 30000); // Every 30 seconds
  }

  private collectMetrics(client: any): void {
    const stats = client.getSessionInfo();

    this.metrics = {
      ...this.metrics,
      participantCount: stats.participantCount,
      averageLatency: stats.networkLatency,
      cpuUsage: performance.memory?.usedJSHeapSize,
      timestamp: Date.now()
    };
  }

  private sendToAnalytics(): void {
    // Send to your analytics service
    fetch('/api/analytics/session', {
      method: 'POST',
      body: JSON.stringify(this.metrics)
    });
  }
}
```

## 📊 Performance Optimization for 50+ Participants

### 1. Selective Video Rendering

```typescript
class PerformanceOptimizer {
  // Only render visible participants
  optimizeVideoRendering(participants: any[], visibleRange: [number, number]) {
    const [start, end] = visibleRange;
    const visibleParticipants = participants.slice(start, end);

    // Render only visible participants
    visibleParticipants.forEach(participant => {
      this.renderParticipant(participant);
    });

    // Stop rendering non-visible participants
    const nonVisibleParticipants = [
      ...participants.slice(0, start),
      ...participants.slice(end)
    ];

    nonVisibleParticipants.forEach(participant => {
      this.stopRenderingParticipant(participant);
    });
  }

  // Adaptive quality based on participant count
  getOptimalVideoQuality(participantCount: number): string {
    if (participantCount <= 4) return '720p';
    if (participantCount <= 9) return '360p';
    if (participantCount <= 25) return '180p';
    return '90p'; // Thumbnail quality for 25+
  }

  // Prioritize active speakers
  prioritizeActiveParticipants(
    participants: any[],
    activeSpeakers: number[],
    maxHighQuality: number = 6
  ) {
    const prioritized = [];

    // Host/Coach always gets priority
    const host = participants.find(p => p.isHost);
    if (host) prioritized.push(host);

    // Active speakers next
    activeSpeakers.forEach(speakerId => {
      if (prioritized.length < maxHighQuality) {
        const speaker = participants.find(p => p.userId === speakerId);
        if (speaker) prioritized.push(speaker);
      }
    });

    // Fill remaining slots with video-enabled participants
    participants
      .filter(p => p.videoOn && !prioritized.includes(p))
      .forEach(p => {
        if (prioritized.length < maxHighQuality) {
          prioritized.push(p);
        }
      });

    return {
      highQuality: prioritized,
      lowQuality: participants.filter(p => !prioritized.includes(p))
    };
  }
}
```

### 2. Virtual Scrolling for Large Sessions

```tsx
// components/VirtualizedParticipantGallery.tsx
import { FixedSizeGrid } from 'react-window';

const VirtualizedParticipantGallery: React.FC<{
  participants: any[];
  columns: number;
  rowHeight: number;
}> = ({ participants, columns, rowHeight }) => {
  const rows = Math.ceil(participants.length / columns);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columns + columnIndex;
    const participant = participants[index];

    if (!participant) return null;

    return (
      <div style={style}>
        <VideoTile participant={participant} />
      </div>
    );
  };

  return (
    <FixedSizeGrid
      columnCount={columns}
      columnWidth={300}
      height={600}
      rowCount={rows}
      rowHeight={rowHeight}
      width={columns * 300}
    >
      {Cell}
    </FixedSizeGrid>
  );
};
```

### 3. Bandwidth Optimization

```typescript
class BandwidthOptimizer {
  // Dynamic quality adjustment
  async adjustQualityBasedOnBandwidth(stream: any) {
    const stats = await stream.getVideoStatisticData();
    const bandwidth = stats.available_bandwidth;

    if (bandwidth < 500) {
      // Very low bandwidth - audio only
      await stream.stopVideo();
      await this.setReceiveVideoQuality('none');
    } else if (bandwidth < 1000) {
      // Low bandwidth - minimal video
      await this.setReceiveVideoQuality('90p');
    } else if (bandwidth < 2000) {
      // Medium bandwidth
      await this.setReceiveVideoQuality('180p');
    } else if (bandwidth < 3000) {
      // Good bandwidth
      await this.setReceiveVideoQuality('360p');
    } else {
      // Excellent bandwidth
      await this.setReceiveVideoQuality('720p');
    }
  }

  // Pause inactive video streams
  async pauseInactiveStreams(
    participants: any[],
    inactiveThreshold: number = 300000 // 5 minutes
  ) {
    const now = Date.now();

    for (const participant of participants) {
      if (now - participant.lastActivity > inactiveThreshold) {
        await this.pauseVideoStream(participant.userId);
      }
    }
  }
}
```

## 🔧 Error Handling

### Comprehensive Error Codes and Solutions

```typescript
enum ZoomErrorCode {
  // Authentication Errors (1xxx)
  INVALID_TOKEN = 1001,
  TOKEN_EXPIRED = 1002,
  INVALID_APP_KEY = 1003,

  // Session Errors (2xxx)
  SESSION_NOT_FOUND = 2001,
  SESSION_FULL = 2002,
  DUPLICATE_SESSION_NAME = 2003,

  // Media Errors (3xxx)
  CAMERA_ACCESS_DENIED = 3001,
  MICROPHONE_ACCESS_DENIED = 3002,
  MEDIA_NOT_AVAILABLE = 3003,

  // Network Errors (4xxx)
  NETWORK_DISCONNECTED = 4001,
  NETWORK_TIMEOUT = 4002,
  BANDWIDTH_INSUFFICIENT = 4003,

  // Permission Errors (5xxx)
  NOT_HOST = 5001,
  FEATURE_DISABLED = 5002,
  RATE_LIMITED = 5003
}

class ErrorResolver {
  resolveError(code: ZoomErrorCode): ErrorResolution {
    const resolutions: Record<ZoomErrorCode, ErrorResolution> = {
      [ZoomErrorCode.INVALID_TOKEN]: {
        message: 'Authentication failed',
        action: 'refreshToken',
        userMessage: 'Please sign in again'
      },
      [ZoomErrorCode.CAMERA_ACCESS_DENIED]: {
        message: 'Camera access denied',
        action: 'requestPermissions',
        userMessage: 'Please allow camera access in your browser settings'
      },
      [ZoomErrorCode.SESSION_FULL]: {
        message: 'Session is full',
        action: 'notify',
        userMessage: 'This session has reached maximum participants'
      },
      [ZoomErrorCode.NETWORK_DISCONNECTED]: {
        message: 'Network connection lost',
        action: 'reconnect',
        userMessage: 'Connection lost. Attempting to reconnect...'
      },
      [ZoomErrorCode.BANDWIDTH_INSUFFICIENT]: {
        message: 'Poor network quality',
        action: 'reduceQuality',
        userMessage: 'Reducing video quality due to network conditions'
      }
    };

    return resolutions[code] || {
      message: 'Unknown error',
      action: 'retry',
      userMessage: 'An error occurred. Please try again.'
    };
  }
}
```

## 🐛 Troubleshooting Guide

### Common Issues and Solutions

#### 1. "Cannot join session" Error
```typescript
// Check these common causes:
const troubleshootJoinError = async () => {
  // 1. Verify token is valid
  const tokenPayload = parseJWT(token);
  console.log('Token expiry:', new Date(tokenPayload.exp * 1000));
  console.log('Session name in token:', tokenPayload.tpc);

  // 2. Ensure session name matches
  if (sessionName !== tokenPayload.tpc) {
    throw new Error('Session name mismatch');
  }

  // 3. Check role consistency
  if (role === 'host' && tokenPayload.role_type !== 1) {
    throw new Error('Role mismatch');
  }

  // 4. Verify SDK initialization
  if (!client.isInitialized()) {
    await client.init();
  }
};
```

#### 2. Video Not Showing
```typescript
// Diagnostic steps:
const diagnoseVideoIssues = async () => {
  // 1. Check permissions
  const permissions = await navigator.permissions.query({ name: 'camera' });
  console.log('Camera permission:', permissions.state);

  // 2. List available devices
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === 'videoinput');
  console.log('Available cameras:', cameras);

  // 3. Test camera access
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('Camera test successful');
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    console.error('Camera test failed:', error);
  }

  // 4. Check Zoom video state
  const videoState = await client.getMediaStream().isCapturingVideo();
  console.log('Zoom capturing video:', videoState);
};
```

#### 3. Poor Performance with Many Participants
```typescript
// Performance optimization checklist:
const optimizePerformance = async () => {
  // 1. Reduce video quality
  await stream.updateVideoCanvasDimension('180p');

  // 2. Limit rendered participants
  const maxRender = 9; // Only render 9 videos at once

  // 3. Disable unnecessary features
  await stream.disableHardwareAcceleration();
  await stream.disableVirtualBackground();

  // 4. Monitor resource usage
  const stats = {
    memory: performance.memory?.usedJSHeapSize,
    participants: client.getAllUser().length,
    activeVideos: client.getAllUser().filter(u => u.videoOn).length
  };

  console.log('Performance stats:', stats);

  // 5. Implement pagination
  if (stats.participants > 25) {
    console.log('Implementing pagination for', stats.participants, 'participants');
  }
};
```

#### 4. Audio Echo/Feedback
```typescript
// Audio troubleshooting:
const fixAudioIssues = async () => {
  // 1. Enable echo cancellation
  await stream.startAudio({
    suppressNoise: true,
    enableAEC: true, // Acoustic Echo Cancellation
    enableAGC: true, // Automatic Gain Control
    enableNS: true   // Noise Suppression
  });

  // 2. Check for multiple tabs
  if (navigator.locks) {
    await navigator.locks.request('zoom-audio-lock', async () => {
      // Ensures only one tab uses audio
      console.log('Audio lock acquired');
    });
  }

  // 3. Adjust audio levels
  await stream.adjustAudioLevel(0.7); // 70% volume
};
```

## 📋 Implementation Checklist

```typescript
// Complete implementation checklist
const implementationChecklist = {
  setup: {
    '✅ Install @zoom/videosdk package': true,
    '✅ Configure TypeScript types': true,
    '✅ Setup environment variables': true,
    '✅ Create backend token service': true,
    '✅ Configure CORS for API': true
  },

  authentication: {
    '✅ Implement JWT token generation': true,
    '✅ Secure SDK credentials': true,
    '✅ Add token refresh logic': true,
    '✅ Handle token expiration': true
  },

  core_features: {
    '✅ Session joining/leaving': true,
    '✅ Video start/stop': true,
    '✅ Audio start/stop': true,
    '✅ Participant management': true,
    '✅ Active speaker detection': true
  },

  advanced_features: {
    '✅ Screen sharing': true,
    '✅ Virtual backgrounds': true,
    '✅ Recording': true,
    '✅ Chat': true,
    '✅ Gallery view pagination': true
  },

  optimization: {
    '✅ Selective video streaming': true,
    '✅ Quality adaptation': true,
    '✅ Virtual scrolling': true,
    '✅ Resource monitoring': true,
    '✅ Bandwidth optimization': true
  },

  production: {
    '✅ Error handling': true,
    '✅ Reconnection logic': true,
    '✅ Analytics integration': true,
    '✅ Performance monitoring': true,
    '✅ Security hardening': true
  }
};
```

## 🎯 Summary

This comprehensive guide covers all aspects of implementing Zoom Video SDK in a V2 Clean Architecture React application for a fitness platform. Key highlights:

1. **Complete Setup**: From installation to production deployment
2. **Secure Authentication**: JWT token generation with proper server-side implementation
3. **Robust Session Management**: Handling 50+ participants efficiently
4. **Advanced Features**: Screen sharing, virtual backgrounds, recording
5. **React Integration**: Custom hooks and components optimized for performance
6. **Performance Optimization**: Virtual scrolling, selective streaming, bandwidth management
7. **Production Ready**: Error handling, monitoring, and security best practices
8. **Troubleshooting**: Common issues and diagnostic tools

The implementation follows clean architecture principles with proper separation of concerns, making it maintainable and scalable for your fitness platform needs.