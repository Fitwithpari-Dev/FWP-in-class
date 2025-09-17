import { Observable, Subject, BehaviorSubject } from 'rxjs';
import ZoomVideo from '@zoom/videosdk';
import {
  IVideoService,
  VideoServiceType,
  VideoServiceConfig,
  VideoServiceCapabilities,
  VideoQuality,
  StreamConfiguration,
  JoinSessionRequest,
  SessionJoinResult,
  ParticipantEvent,
  VideoEvent,
  AudioEvent,
  ConnectionEvent,
  ScalingEvent,
  ConnectionStatistics
} from '../../../core/interfaces/video-service/IVideoService';
import { ParticipantId } from '../../../core/domain/value-objects/ParticipantId';
import { SessionId } from '../../../core/domain/value-objects/SessionId';
import { Participant } from '../../../core/domain/entities/Participant';
import { ZoomTokenService } from './ZoomTokenService';

/**
 * Zoom Video Service Implementation
 * Integrates with Zoom Video SDK using modern WebRTC patterns
 * Optimized for 1000+ participant fitness sessions
 */
export class ZoomVideoService implements IVideoService {
  readonly serviceName: VideoServiceType = 'zoom';
  readonly capabilities: VideoServiceCapabilities = {
    maxParticipants: 1000,
    supportsScreenShare: true,
    supportsRecording: true,
    supportsChat: true,
    supportsBreakoutRooms: false,
    supportsSelectiveStreaming: true,
    supportsLiveStreaming: true,
    supportedVideoQualities: ['low', 'medium', 'high', 'ultra'],
    supportedStreamTypes: ['camera', 'screen', 'audio-only']
  };

  private _isInitialized = false;
  private client: any = null; // Zoom client instance
  private stream: any = null; // Media stream instance
  private currentParticipant: Participant | null = null;
  private participantsMap: Map<string, Participant> = new Map();
  private config: VideoServiceConfig | null = null;
  private videoCanvasMap: Map<string, any> = new Map();
  private tokenService: ZoomTokenService;
  private participantSyncInterval: NodeJS.Timeout | null = null;

  // Event subjects for reactive programming
  private participantSubject = new Subject<ParticipantEvent>();
  private videoSubject = new Subject<VideoEvent>();
  private audioSubject = new Subject<AudioEvent>();
  private connectionSubject = new Subject<ConnectionEvent>();
  private scalingSubject = new Subject<ScalingEvent>();

  // Observable streams
  readonly participantEvents$ = this.participantSubject.asObservable();
  readonly videoEvents$ = this.videoSubject.asObservable();
  readonly audioEvents$ = this.audioSubject.asObservable();
  readonly connectionEvents$ = this.connectionSubject.asObservable();
  readonly scalingEvents$ = this.scalingSubject.asObservable();

  constructor() {
    this.tokenService = new ZoomTokenService();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(config: VideoServiceConfig): Promise<void> {
    try {
      this.config = config;

      console.log('[ZoomVideoService] Creating Zoom Video SDK client...');

      // Create Zoom Video SDK client according to official docs
      this.client = ZoomVideo.createClient();

      if (!this.client) {
        throw new Error('Failed to create Zoom Video SDK client');
      }

      console.log('[ZoomVideoService] Initializing client...');

      // Initialize client according to official docs: client.init(language, region, options)
      await this.client.init('en-US', 'Global', {
        patchJsMedia: true, // Required for proper media handling
        leaveOnPageUnload: true,
        stayAwake: true, // Prevent device sleep during fitness sessions
      });

      console.log('[ZoomVideoService] Getting media stream...');

      // Get media stream for video/audio controls (this is required after init)
      this.stream = this.client.getMediaStream();

      if (!this.stream) {
        throw new Error('Failed to get media stream from Zoom client');
      }

      this.setupEventHandlers();
      this._isInitialized = true;

      console.log('[ZoomVideoService] ✅ Initialized successfully');
    } catch (error) {
      console.error('[ZoomVideoService] ❌ Initialization failed:', error);
      throw new Error(`Failed to initialize Zoom Video Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async destroy(): Promise<void> {
    try {
      // Clear sync interval
      if (this.participantSyncInterval) {
        clearInterval(this.participantSyncInterval);
        this.participantSyncInterval = null;
      }

      if (this.client) {
        await this.client.leave();
        this.client = null;
      }

      this.participantsMap.clear();
      this.currentParticipant = null;

      // Complete all subjects
      this.participantSubject.complete();
      this.videoSubject.complete();
      this.audioSubject.complete();
      this.connectionSubject.complete();
      this.scalingSubject.complete();

      this._isInitialized = false;
    } catch (error) {
      console.error('[ZoomVideoService] Destroy failed:', error);
      throw error;
    }
  }

  async joinSession(request: JoinSessionRequest): Promise<SessionJoinResult> {
    let sessionName = '';
    let userId = 0;

    try {
      if (!this.client || !this._isInitialized) {
        throw new Error('Zoom Video Service not initialized');
      }

      if (!this.stream) {
        throw new Error('Media stream not available');
      }

      // Generate session name according to Zoom requirements
      sessionName = ZoomTokenService.generateSessionName(request.sessionId);

      // Validate sessionName was generated correctly
      if (!sessionName || sessionName.trim().length === 0) {
        const errorMsg = `Failed to generate valid sessionName from sessionId: ${request.sessionId.getValue()}`;
        console.error('[ZoomVideoService] ❌ SessionName generation failed:', {
          originalSessionId: request.sessionId.getValue(),
          sessionIdType: typeof request.sessionId.getValue(),
          generatedSessionName: sessionName,
          sessionNameType: typeof sessionName,
          sessionNameLength: sessionName?.length || 0,
          trimmedLength: sessionName?.trim().length || 0
        });
        throw new Error(errorMsg);
      }

      // Additional sessionName validation
      if (!ZoomTokenService.isValidSessionName(sessionName)) {
        const errorMsg = `Generated sessionName is not valid for Zoom SDK: ${sessionName}`;
        console.error('[ZoomVideoService] ❌ SessionName validation failed:', {
          sessionName,
          isValid: ZoomTokenService.isValidSessionName(sessionName),
          length: sessionName.length,
          containsInvalidChars: !/^[a-zA-Z0-9\s\-_]+$/.test(sessionName)
        });
        throw new Error(errorMsg);
      }

      console.log('[ZoomVideoService] Generated sessionName:', {
        sessionName,
        originalSessionId: request.sessionId.getValue(),
        isValidFormat: ZoomTokenService.isValidSessionName(sessionName)
      });

      // Generate JWT token using token service
      const token = await this.tokenService.generateToken(
        sessionName,
        request.participantRole === 'coach' ? 'host' : 'participant',
        request.participantName,
        'fitness-session'
      );

      console.log('[ZoomVideoService] Joining session:', {
        sessionName,
        participantName: request.participantName,
        role: request.participantRole
      });

      // Generate a valid userId (1-10000 range as per Zoom requirements)
      userId = Math.floor(Math.random() * 9999) + 1;

      // Decode and validate JWT token for debugging
      try {
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        const now = Math.floor(Date.now() / 1000);

        console.log('[ZoomVideoService] 📋 JWT Token Payload:', {
          topic: payload.topic || payload.tpc,
          role_type: payload.role_type,
          user_identity: payload.user_identity,
          app_key: payload.app_key ? 'present' : 'missing',
          iatDate: new Date(payload.iat * 1000).toISOString(),
          expDate: new Date(payload.exp * 1000).toISOString(),
          isExpired: now > payload.exp,
          timeSinceIssued: now - payload.iat
        });
      } catch (e) {
        console.error('[ZoomVideoService] Failed to decode JWT token:', e);
      }

      console.log('[ZoomVideoService] Calling client.join with parameters:', {
        sessionName,
        tokenPrefix: token.substring(0, 20) + '...',
        participantName: request.participantName,
        userId,
        hasClient: !!this.client,
        hasStream: !!this.stream,
        tokenLength: token.length
      });

      // Join Zoom session according to official docs: client.join(sessionName, token, userName, sessionPasscode)
      console.log('[ZoomVideoService] 🚀 Joining session with Zoom SDK...');

      await this.client.join(
        sessionName,
        token,
        request.participantName,
        '' // Session password (empty when using JWT)
      );

      console.log('[ZoomVideoService] Successfully joined session');

      // Create participant entity - handle Zoom's numeric userId safely
      const userInfo = this.client.getCurrentUserInfo();
      console.log('[ZoomVideoService] Creating participant with userId:', {
        userId: userInfo.userId,
        userIdType: typeof userInfo.userId,
        participantName: request.participantName,
        participantRole: request.participantRole
      });

      this.currentParticipant = Participant.create(
        ParticipantId.create(userInfo.userId), // Pass numeric userId directly - ParticipantId.create now handles numbers
        request.participantName,
        request.participantRole
      );

      // Enable media based on request
      if (request.videoEnabled) {
        console.log('[ZoomVideoService] Enabling video as requested in join session');
        await this.enableVideo();

        // Update the current participant state to reflect video is enabled
        if (this.currentParticipant) {
          // The enableVideo() method already updates the participant, but ensure it's tracked
          const updatedParticipant = this.participantsMap.get(this.currentParticipant.getId().getValue());
          if (!updatedParticipant) {
            // Add current participant to the participants map
            this.participantsMap.set(
              this.currentParticipant.getId().getValue(),
              this.currentParticipant
            );
          }
        }
      }
      if (request.audioEnabled) {
        console.log('[ZoomVideoService] Enabling audio as requested in join session');
        await this.enableAudio();
      }

      const sessionInfo = {
        participantCount: await this.getParticipantCount(),
        isRecording: false,
        sessionStartTime: new Date()
      };

      // Final validation before returning success result
      if (!this.currentParticipant) {
        const errorMsg = 'Join succeeded but currentParticipant is null';
        console.error('[ZoomVideoService] ❌ Success state validation failed:', {
          hasClient: !!this.client,
          hasStream: !!this.stream,
          currentParticipant: this.currentParticipant,
          sessionName,
          participantName: request.participantName
        });
        throw new Error(errorMsg);
      }

      console.log('[ZoomVideoService] ✅ Join session success - final validation passed:', {
        sessionName,
        participantId: this.currentParticipant.getId().getValue(),
        participantName: this.currentParticipant.getName(),
        participantRole: this.currentParticipant.getRole(),
        sessionInfo,
        hasValidSessionName: !!sessionName && sessionName.length > 0
      });

      // Start participant state synchronization
      this.startParticipantSync();

      return {
        success: true,
        participant: this.currentParticipant,
        sessionInfo
      };
    } catch (error) {
      console.error('[ZoomVideoService] Session join failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        sessionName,
        participantName: request.participantName,
        userId
      });

      return {
        success: false,
        participant: this.currentParticipant!,
        sessionInfo: {
          participantCount: 0,
          isRecording: false,
          sessionStartTime: new Date()
        },
        error: error instanceof Error ? error.message : `Unknown error: ${JSON.stringify(error)}`
      };
    }
  }

  async leaveSession(): Promise<void> {
    // Stop participant sync
    if (this.participantSyncInterval) {
      clearInterval(this.participantSyncInterval);
      this.participantSyncInterval = null;
    }

    if (this.client) {
      await this.client.leave();
      this.currentParticipant = null;
      this.participantsMap.clear();
    }
  }

  async getCurrentParticipant(): Promise<Participant | null> {
    return this.currentParticipant;
  }

  async getParticipants(): Promise<Participant[]> {
    return Array.from(this.participantsMap.values());
  }

  async getParticipantCount(): Promise<number> {
    if (!this.client) return 0;
    const participants = this.client.getAllUser();
    return participants.length;
  }

  async getParticipantById(id: ParticipantId): Promise<Participant | null> {
    return this.participantsMap.get(id.getValue()) || null;
  }

  // Media controls with WebRTC optimizations
  async enableVideo(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      console.log('[ZoomVideoService] Starting video stream...');

      // Start video through the stream
      await this.stream.startVideo();

      console.log('[ZoomVideoService] Video stream started successfully');

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableVideo();

        // Emit video enabled event
        this.videoSubject.next({
          type: 'video-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });

        // Also emit participant updated event to trigger UI refresh
        this.participantSubject.next({
          type: 'participant-updated',
          participant: this.currentParticipant,
          timestamp: new Date()
        });

        console.log('[ZoomVideoService] Current participant video enabled:', {
          participantId: this.currentParticipant.getId().getValue(),
          participantName: this.currentParticipant.getName()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoService] Failed to enable video:', error);
      throw error;
    }
  }

  async disableVideo(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      console.log('[ZoomVideoService] Stopping video stream...');

      // Stop video through the stream
      await this.stream.stopVideo();

      console.log('[ZoomVideoService] Video stream stopped successfully');

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.disableVideo();

        // Emit video disabled event
        this.videoSubject.next({
          type: 'video-disabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });

        // Also emit participant updated event to trigger UI refresh
        this.participantSubject.next({
          type: 'participant-updated',
          participant: this.currentParticipant,
          timestamp: new Date()
        });

        console.log('[ZoomVideoService] Current participant video disabled:', {
          participantId: this.currentParticipant.getId().getValue(),
          participantName: this.currentParticipant.getName()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoService] Failed to disable video:', error);
      throw error;
    }
  }

  async enableAudio(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      console.log('[ZoomVideoService] Starting audio stream...');

      await this.stream.startAudio();

      console.log('[ZoomVideoService] Audio stream started successfully');

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableAudio();
        this.audioSubject.next({
          type: 'audio-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoService] Failed to enable audio:', error);
      throw error;
    }
  }

  async disableAudio(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      console.log('[ZoomVideoService] Stopping audio stream...');

      await this.stream.stopAudio();

      console.log('[ZoomVideoService] Audio stream stopped successfully');

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.disableAudio();
        this.audioSubject.next({
          type: 'audio-disabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoService] Failed to disable audio:', error);
      throw error;
    }
  }

  async setVideoQuality(quality: VideoQuality): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const qualityMap = {
      'low': '90p',
      'medium': '180p',
      'high': '360p',
      'ultra': '720p'
    };

    const stream = this.client.getMediaStream();
    await stream.updateVideoCanvasDimension(qualityMap[quality]);
  }

  // Advanced features for fitness sessions
  async startScreenShare(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const stream = this.client.getMediaStream();
    await stream.startShareScreen(document.querySelector('#share-canvas'));
  }

  async stopScreenShare(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const stream = this.client.getMediaStream();
    await stream.stopShareScreen();
  }

  async setActiveSpeaker(participantId: ParticipantId): Promise<void> {
    // Zoom SDK automatically handles active speaker detection
    const participant = this.participantsMap.get(participantId.getValue());
    if (participant) {
      const updatedParticipant = participant.setActiveSpeaker(true);
      this.participantsMap.set(participantId.getValue(), updatedParticipant);
    }
  }

  // Coach-specific controls
  async muteParticipant(participantId: ParticipantId): Promise<void> {
    if (!this.currentParticipant?.canControlOthers()) {
      throw new Error('Only coaches can mute participants');
    }

    if (!this.client) throw new Error('Client not initialized');

    await this.client.mute(parseInt(participantId.getValue()));
  }

  async removeParticipant(participantId: ParticipantId): Promise<void> {
    if (!this.currentParticipant?.canControlOthers()) {
      throw new Error('Only coaches can remove participants');
    }

    if (!this.client) throw new Error('Client not initialized');

    await this.client.remove(parseInt(participantId.getValue()));
  }

  async spotlightParticipant(participantId: ParticipantId): Promise<void> {
    // Implementation depends on UI layer rendering logic
    this.participantSubject.next({
      type: 'participant-updated',
      participant: this.participantsMap.get(participantId.getValue())!,
      timestamp: new Date()
    });
  }

  async clearSpotlight(): Promise<void> {
    // Implementation depends on UI layer rendering logic
  }

  // Scaling optimizations for 1000+ participants
  async enableSelectiveStreaming(config: StreamConfiguration): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // Configure which participants get high-quality streams
    const stream = this.client.getMediaStream();

    // Enable high quality for active streams (coach + active speakers)
    for (const participantId of config.activeStreams) {
      await stream.subscribeVideo(parseInt(participantId.getValue()), '720p');
    }

    // Enable low quality thumbnails for others
    for (const participantId of config.thumbnailStreams) {
      await stream.subscribeVideo(parseInt(participantId.getValue()), '90p');
    }

    // Audio-only for inactive participants
    for (const participantId of config.audioOnlyStreams) {
      await stream.unsubscribeVideo(parseInt(participantId.getValue()));
    }

    this.scalingSubject.next({
      type: 'selective-streaming-enabled',
      data: config,
      timestamp: new Date()
    });
  }

  async setParticipantVideoLimit(limit: number): Promise<void> {
    // Zoom SDK handles this through gallery view configuration
    if (limit > this.capabilities.maxParticipants) {
      this.scalingSubject.next({
        type: 'participant-limit-reached',
        data: { limit, max: this.capabilities.maxParticipants },
        timestamp: new Date()
      });
    }
  }

  async enableAudioOnlyMode(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const stream = this.client.getMediaStream();
    await stream.stopVideo();

    // Unsubscribe from all video streams to save bandwidth
    const participants = this.client.getAllUser();
    for (const participant of participants) {
      if (participant.userId !== this.client.getCurrentUserInfo().userId) {
        await stream.unsubscribeVideo(participant.userId);
      }
    }
  }

  async getConnectionStatistics(): Promise<ConnectionStatistics> {
    if (!this.client) {
      return this.getEmptyStats();
    }

    const participants = this.client.getAllUser();
    const stream = this.client.getMediaStream();

    return {
      totalParticipants: participants.length,
      activeVideoStreams: participants.filter((p: any) => p.bVideoOn).length,
      activeAudioStreams: participants.filter((p: any) => p.muted === false).length,
      averageConnectionQuality: 0.8, // Zoom doesn't expose detailed connection stats
      bandwidthUsage: {
        upstream: stream.getVideoStatisticData()?.encode_send_kbps || 0,
        downstream: stream.getVideoStatisticData()?.decode_recv_kbps || 0
      },
      latencyStats: {
        average: 50, // Estimated based on Zoom's global infrastructure
        min: 20,
        max: 100
      },
      cpuUsage: 0, // Not available from Zoom SDK
      memoryUsage: 0 // Not available from Zoom SDK
    };
  }

  // Video rendering for UI integration
  async renderParticipantVideo(participantId: ParticipantId, element: HTMLElement): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      const userId = parseInt(participantId.getValue());
      const stream = this.stream;

      console.log('[ZoomVideoService] Attempting to render video:', {
        participantId: participantId.getValue(),
        userId,
        elementWidth: element.clientWidth,
        elementHeight: element.clientHeight,
        hasStream: !!stream,
        elementTag: element.tagName
      });

      // Check if the participant has video enabled
      const allUsers = this.client.getAllUser();
      const user = allUsers.find((u: any) => u.userId === userId);

      if (!user) {
        console.warn('[ZoomVideoService] User not found for video rendering:', userId);
        throw new Error(`User ${userId} not found in session`);
      }

      // Check if this is self-view
      const currentUserId = this.client.getCurrentUserInfo()?.userId;
      const isSelfView = userId === currentUserId;

      if (!user.bVideoOn && !isSelfView) {
        console.warn('[ZoomVideoService] User video is disabled:', {
          userId,
          bVideoOn: user.bVideoOn,
          displayName: user.displayName
        });
        // Don't throw error - just log warning, UI will handle this
        return;
      }

      // For self-view, we might need to wait for video to be ready
      if (isSelfView && !user.bVideoOn) {
        console.log('[ZoomVideoService] Self-view detected, attempting to render even though bVideoOn is false (video might be starting)');
      }

      // Determine rendering method based on element type
      if (element.tagName === 'VIDEO') {
        // Use attachVideo for video elements (modern browsers require this)
        const videoElement = element as HTMLVideoElement;

        // Ensure video element has required attributes
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        if (isSelfView) {
          videoElement.muted = true; // Mute self-video to prevent echo
        }

        // Video quality: 0=90p, 1=180p, 2=360p, 3=720p, 4=1080p
        const videoQuality = 2; // 360p for good balance

        console.log('[ZoomVideoService] Using attachVideo method for VIDEO element:', {
          userId,
          videoQuality,
          isSelfView,
          elementId: element.id
        });

        // Use attachVideo for video elements (parameters: userId, quality, videoElement)
        await stream.attachVideo(
          userId,        // userId as number
          videoQuality,  // video quality (comes BEFORE element)
          videoElement   // video element
        );

        // Store reference for cleanup
        this.videoCanvasMap.set(participantId.getValue(), videoElement);

      } else if (element.tagName === 'CANVAS') {
        // Use renderVideo for canvas elements
        const canvas = element as HTMLCanvasElement;

        // Set canvas dimensions if not already set
        if (canvas.width === 0) {
          canvas.width = Math.max(element.clientWidth, 320);
        }
        if (canvas.height === 0) {
          canvas.height = Math.max(element.clientHeight, 240);
        }

        const width = canvas.width;
        const height = canvas.height;

        console.log('[ZoomVideoService] Using renderVideo method for CANVAS element:', {
          userId,
          width,
          height,
          canvasId: element.id
        });

        // Use renderVideo for canvas (parameters: canvas, userId, width, height, x, y, quality)
        await stream.renderVideo(
          canvas,       // canvas element
          userId,       // userId as number
          width,        // width
          height,       // height
          0,           // x offset
          0,           // y offset
          2            // Video quality (2 = 360p)
        );

        // Store reference for cleanup
        this.videoCanvasMap.set(participantId.getValue(), canvas);

      } else {
        throw new Error(`Unsupported element type for video rendering: ${element.tagName}. Use VIDEO or CANVAS elements.`);
      }

      console.log('[ZoomVideoService] ✅ Successfully rendered video for participant:', {
        participantId: participantId.getValue(),
        userId,
        userDisplayName: user.displayName,
        elementType: element.tagName
      });
    } catch (error) {
      console.error('[ZoomVideoService] Failed to render participant video:', {
        participantId: participantId.getValue(),
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        elementDetails: {
          tagName: element.tagName,
          width: element.clientWidth,
          height: element.clientHeight,
          id: element.id,
          className: element.className
        }
      });
      throw error;
    }
  }

  async stopRenderingVideo(participantId: ParticipantId): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      const userId = parseInt(participantId.getValue());
      const stream = this.stream;

      console.log('[ZoomVideoService] Stopping video rendering for participant:', {
        participantId: participantId.getValue(),
        userId
      });

      // Get the stored element reference to determine cleanup method
      const storedElement = this.videoCanvasMap.get(participantId.getValue());

      if (storedElement && storedElement.tagName === 'VIDEO') {
        // Use detachVideo for video elements
        console.log('[ZoomVideoService] Using detachVideo for VIDEO element');
        await stream.detachVideo(userId);
      } else if (storedElement && storedElement.tagName === 'CANVAS') {
        // Use stopRenderVideo for canvas elements
        console.log('[ZoomVideoService] Using stopRenderVideo for CANVAS element');
        await stream.stopRenderVideo(storedElement, userId);
      } else {
        // Fallback: try detachVideo (most common case)
        console.log('[ZoomVideoService] No stored element found, trying detachVideo');
        try {
          await stream.detachVideo(userId);
        } catch (e) {
          console.warn('[ZoomVideoService] detachVideo failed, trying stopRenderVideo:', e);
          // If detachVideo fails, element might be a canvas
          // But we need the canvas element reference which we don't have
        }
      }

      // Clean up stored reference
      this.videoCanvasMap.delete(participantId.getValue());

      console.log('[ZoomVideoService] ✅ Stopped video rendering for participant:', participantId.getValue());
    } catch (error) {
      console.error('[ZoomVideoService] Failed to stop video rendering:', {
        participantId: participantId.getValue(),
        error
      });
      // Don't throw - this is cleanup, continue gracefully

      // Clean up stored reference anyway
      this.videoCanvasMap.delete(participantId.getValue());
    }
  }

  // Recording features
  async startRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.startCloudRecording();
  }

  async stopRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.stopCloudRecording();
  }

  // Private helper methods
  private async loadZoomSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://source.zoom.us/zoom-video-sdk-js-latest.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private async generateJWTToken(sessionName: string): Promise<string> {
    if (!this.config) throw new Error('Service not configured');

    // In production, this should be done server-side for security
    // This is a simplified version for demonstration
    const payload = {
      iss: this.config.appId,
      exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      iat: Date.now(),
      aud: 'zoom',
      appKey: this.config.appId,
      tokenExp: Date.now() + (24 * 60 * 60 * 1000),
      alg: 'HS256'
    };

    // Note: JWT generation should be moved to server-side for production security
    return btoa(JSON.stringify(payload)); // Simplified - use proper JWT library
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Participant events
    this.client.on('user-added', (payload: any) => {
      this.handleUserEvent(payload, 'user-added');
    });

    this.client.on('user-removed', (payload: any) => {
      this.handleUserEvent(payload, 'user-removed');
    });

    // Video events - Critical for remote video rendering
    this.client.on('user-updated', (payload: any) => {
      this.handleUserVideoStateEvent(payload);
    });

    this.client.on('video-on', (payload: any) => {
      this.handleVideoStateChange(payload, true);
    });

    this.client.on('video-off', (payload: any) => {
      this.handleVideoStateChange(payload, false);
    });

    this.client.on('audio-on', (payload: any) => {
      this.handleAudioStateChange(payload, true);
    });

    this.client.on('audio-off', (payload: any) => {
      this.handleAudioStateChange(payload, false);
    });

    // Connection events
    this.client.on('connection-change', (payload: any) => {
      this.connectionSubject.next({
        type: 'connection-state-changed',
        state: payload.state,
        timestamp: new Date()
      });
    });

    // Active speaker events
    this.client.on('active-speaker', (payload: any) => {
      this.handleActiveSpeakerEvent(payload);
    });
  }

  /**
   * Robust payload parsing for user-added and user-removed events
   * Handles both array and object formats from Zoom SDK
   */
  private handleUserEvent(payload: any, eventType: 'user-added' | 'user-removed'): void {
    const logPrefix = `[ZoomVideoService] ${eventType}`;

    console.log(`${logPrefix} received payload:`, {
      payload,
      type: typeof payload,
      isArray: Array.isArray(payload),
      hasUserId: payload?.userId !== undefined,
      keys: typeof payload === 'object' && payload !== null ? Object.keys(payload) : 'N/A'
    });

    try {
      // Parse payload to extract user info - handle both formats
      const userInfos = this.parseUserPayload(payload, logPrefix);

      if (userInfos.length === 0) {
        console.warn(`${logPrefix} No valid user info found in payload:`, payload);
        return;
      }

      // Process each user info
      for (const userInfo of userInfos) {
        if (eventType === 'user-added') {
          this.processUserAdded(userInfo, logPrefix);
        } else {
          this.processUserRemoved(userInfo, logPrefix);
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error processing event:`, error, 'payload:', payload);
    }
  }

  /**
   * Robust payload parsing for active-speaker events
   * Handles both array and object formats from Zoom SDK
   */
  private handleActiveSpeakerEvent(payload: any): void {
    const logPrefix = '[ZoomVideoService] active-speaker';

    console.log(`${logPrefix} received payload:`, {
      payload,
      type: typeof payload,
      isArray: Array.isArray(payload),
      hasUserId: payload?.userId !== undefined,
      keys: typeof payload === 'object' && payload !== null ? Object.keys(payload) : 'N/A'
    });

    try {
      // Parse payload to extract speaker info - handle both formats
      const speakerInfos = this.parseUserPayload(payload, logPrefix);

      if (speakerInfos.length === 0) {
        console.warn(`${logPrefix} No valid speaker info found in payload:`, payload);
        return;
      }

      // Clear all active speakers first
      this.participantsMap.forEach((participant, id) => {
        if (participant.isActiveSpeaker()) {
          const clearedParticipant = participant.setActiveSpeaker(false);
          this.participantsMap.set(id, clearedParticipant);
        }
      });

      // Set new active speakers
      for (const speakerInfo of speakerInfos) {
        const userIdStr = speakerInfo.userId.toString();
        const participant = this.participantsMap.get(userIdStr);
        if (participant) {
          const updatedParticipant = participant.setActiveSpeaker(true);
          this.participantsMap.set(userIdStr, updatedParticipant);

          this.audioSubject.next({
            type: 'active-speaker-changed',
            participantId: ParticipantId.create(userIdStr),
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error processing event:`, error, 'payload:', payload);
    }
  }

  /**
   * Universal payload parser for Zoom SDK events
   * Handles multiple payload formats:
   * 1. Array of objects: [{userId: 123, displayName: "User"}, ...]
   * 2. Single object: {userId: 123, displayName: "User"}
   * 3. Direct properties (legacy): {userId: 123, displayName: "User"}
   */
  private parseUserPayload(payload: any, logPrefix: string): Array<{userId: number, displayName?: string}> {
    if (!payload) {
      console.warn(`${logPrefix} Payload is null or undefined`);
      return [];
    }

    // Format 1: Array of user objects
    if (Array.isArray(payload)) {
      console.log(`${logPrefix} Processing array payload with ${payload.length} items`);
      return payload
        .filter(item => this.isValidUserInfo(item, logPrefix))
        .map(item => ({
          userId: item.userId,
          displayName: item.displayName || item.display_name || 'Unknown User'
        }));
    }

    // Format 2: Single object with userId
    if (typeof payload === 'object' && payload.userId !== undefined) {
      if (this.isValidUserInfo(payload, logPrefix)) {
        console.log(`${logPrefix} Processing single object payload`);
        return [{
          userId: payload.userId,
          displayName: payload.displayName || payload.display_name || 'Unknown User'
        }];
      }
    }

    // Format 3: Check if payload has nested user data
    if (typeof payload === 'object') {
      // Look for common nested patterns
      const possibleArrays = ['users', 'participants', 'data'];
      for (const key of possibleArrays) {
        if (Array.isArray(payload[key])) {
          console.log(`${logPrefix} Found nested array at payload.${key}`);
          return this.parseUserPayload(payload[key], logPrefix);
        }
      }

      // Look for common object patterns
      const possibleObjects = ['user', 'participant', 'userInfo'];
      for (const key of possibleObjects) {
        if (payload[key] && typeof payload[key] === 'object') {
          console.log(`${logPrefix} Found nested object at payload.${key}`);
          return this.parseUserPayload(payload[key], logPrefix);
        }
      }
    }

    console.warn(`${logPrefix} Unrecognized payload format:`, {
      payload,
      type: typeof payload,
      isArray: Array.isArray(payload),
      hasUserId: payload?.userId !== undefined,
      keys: typeof payload === 'object' && payload !== null ? Object.keys(payload) : 'N/A'
    });

    return [];
  }

  /**
   * Validates user info object has required userId
   */
  private isValidUserInfo(userInfo: any, logPrefix: string): boolean {
    if (!userInfo || typeof userInfo !== 'object') {
      console.warn(`${logPrefix} Invalid userInfo - not an object:`, userInfo);
      return false;
    }

    if (userInfo.userId === undefined || userInfo.userId === null) {
      console.warn(`${logPrefix} Invalid userInfo - missing userId:`, userInfo);
      return false;
    }

    // Ensure userId can be converted to string safely
    try {
      userInfo.userId.toString();
      return true;
    } catch (error) {
      console.warn(`${logPrefix} Invalid userInfo - userId cannot be stringified:`, userInfo, error);
      return false;
    }
  }

  /**
   * Process user-added event with validated user info
   */
  private processUserAdded(userInfo: {userId: number, displayName?: string}, logPrefix: string): void {
    try {
      const userIdStr = userInfo.userId.toString();

      // Get current video/audio state from Zoom SDK
      let participant = Participant.create(
        ParticipantId.create(userIdStr),
        userInfo.displayName || 'Unknown User',
        'student' // Assume student unless specified otherwise
      );

      // Sync video/audio state from Zoom SDK
      try {
        const allUsers = this.client.getAllUser();
        const zoomUser = allUsers.find((u: any) => u.userId === userInfo.userId);

        if (zoomUser) {
          console.log(`${logPrefix} Syncing media state for user:`, {
            userId: userIdStr,
            bVideoOn: zoomUser.bVideoOn,
            muted: zoomUser.muted,
            audio: zoomUser.audio
          });

          // Enable video if user has video on
          if (zoomUser.bVideoOn) {
            participant = participant.enableVideo();
          }

          // Enable audio if user is not muted
          if (!zoomUser.muted && zoomUser.audio) {
            participant = participant.enableAudio();
          }
        }
      } catch (syncError) {
        console.warn(`${logPrefix} Failed to sync media state:`, syncError);
      }

      this.participantsMap.set(userIdStr, participant);

      console.log(`${logPrefix} Successfully added participant:`, {
        userId: userIdStr,
        displayName: userInfo.displayName,
        videoEnabled: participant.isVideoEnabled(),
        audioEnabled: participant.isAudioEnabled(),
        totalParticipants: this.participantsMap.size
      });

      this.participantSubject.next({
        type: 'participant-joined',
        participant,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to process user addition:`, error, 'userInfo:', userInfo);
    }
  }

  /**
   * Process user-removed event with validated user info
   */
  private processUserRemoved(userInfo: {userId: number, displayName?: string}, logPrefix: string): void {
    try {
      const userIdStr = userInfo.userId.toString();
      const participant = this.participantsMap.get(userIdStr);

      if (participant) {
        this.participantsMap.delete(userIdStr);

        console.log(`${logPrefix} Successfully removed participant:`, {
          userId: userIdStr,
          displayName: userInfo.displayName,
          totalParticipants: this.participantsMap.size
        });

        this.participantSubject.next({
          type: 'participant-left',
          participant,
          timestamp: new Date()
        });
      } else {
        console.warn(`${logPrefix} Attempted to remove non-existent participant:`, userIdStr);
      }
    } catch (error) {
      console.error(`${logPrefix} Failed to process user removal:`, error, 'userInfo:', userInfo);
    }
  }

  /**
   * Handle user video state changes from Zoom SDK events
   */
  private handleUserVideoStateEvent(payload: any): void {
    const logPrefix = '[ZoomVideoService] user-updated';

    console.log(`${logPrefix} received payload:`, payload);

    try {
      const userInfos = this.parseUserPayload(payload, logPrefix);

      for (const userInfo of userInfos) {
        const userIdStr = userInfo.userId.toString();
        const participant = this.participantsMap.get(userIdStr);

        if (participant) {
          // Get current state from Zoom SDK
          const allUsers = this.client.getAllUser();
          const zoomUser = allUsers.find((u: any) => u.userId === userInfo.userId);

          if (zoomUser) {
            let updatedParticipant = participant;

            // Update video state
            if (zoomUser.bVideoOn !== participant.isVideoEnabled()) {
              updatedParticipant = zoomUser.bVideoOn ?
                updatedParticipant.enableVideo() : updatedParticipant.disableVideo();

              this.videoSubject.next({
                type: zoomUser.bVideoOn ? 'video-enabled' : 'video-disabled',
                participantId: ParticipantId.create(userIdStr),
                timestamp: new Date()
              });
            }

            // Update audio state
            const shouldHaveAudio = !zoomUser.muted && zoomUser.audio;
            if (shouldHaveAudio !== participant.isAudioEnabled()) {
              updatedParticipant = shouldHaveAudio ?
                updatedParticipant.enableAudio() : updatedParticipant.disableAudio();

              this.audioSubject.next({
                type: shouldHaveAudio ? 'audio-enabled' : 'audio-disabled',
                participantId: ParticipantId.create(userIdStr),
                timestamp: new Date()
              });
            }

            if (updatedParticipant !== participant) {
              this.participantsMap.set(userIdStr, updatedParticipant);

              this.participantSubject.next({
                type: 'participant-updated',
                participant: updatedParticipant,
                timestamp: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error processing event:`, error, 'payload:', payload);
    }
  }

  /**
   * Handle specific video state change events
   */
  private handleVideoStateChange(payload: any, isVideoEnabled: boolean): void {
    const logPrefix = `[ZoomVideoService] video-${isVideoEnabled ? 'on' : 'off'}`;

    console.log(`${logPrefix} received payload:`, payload);

    try {
      const userInfos = this.parseUserPayload(payload, logPrefix);

      for (const userInfo of userInfos) {
        const userIdStr = userInfo.userId.toString();
        const participant = this.participantsMap.get(userIdStr);

        if (participant) {
          const updatedParticipant = isVideoEnabled ?
            participant.enableVideo() : participant.disableVideo();

          this.participantsMap.set(userIdStr, updatedParticipant);

          this.videoSubject.next({
            type: isVideoEnabled ? 'video-enabled' : 'video-disabled',
            participantId: ParticipantId.create(userIdStr),
            timestamp: new Date()
          });

          this.participantSubject.next({
            type: 'participant-updated',
            participant: updatedParticipant,
            timestamp: new Date()
          });

          console.log(`${logPrefix} Updated participant video state:`, {
            userId: userIdStr,
            videoEnabled: isVideoEnabled,
            participantVideoState: updatedParticipant.isVideoEnabled()
          });
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error processing event:`, error, 'payload:', payload);
    }
  }

  /**
   * Handle specific audio state change events
   */
  private handleAudioStateChange(payload: any, isAudioEnabled: boolean): void {
    const logPrefix = `[ZoomVideoService] audio-${isAudioEnabled ? 'on' : 'off'}`;

    console.log(`${logPrefix} received payload:`, payload);

    try {
      const userInfos = this.parseUserPayload(payload, logPrefix);

      for (const userInfo of userInfos) {
        const userIdStr = userInfo.userId.toString();
        const participant = this.participantsMap.get(userIdStr);

        if (participant) {
          const updatedParticipant = isAudioEnabled ?
            participant.enableAudio() : participant.disableAudio();

          this.participantsMap.set(userIdStr, updatedParticipant);

          this.audioSubject.next({
            type: isAudioEnabled ? 'audio-enabled' : 'audio-disabled',
            participantId: ParticipantId.create(userIdStr),
            timestamp: new Date()
          });

          this.participantSubject.next({
            type: 'participant-updated',
            participant: updatedParticipant,
            timestamp: new Date()
          });

          console.log(`${logPrefix} Updated participant audio state:`, {
            userId: userIdStr,
            audioEnabled: isAudioEnabled,
            participantAudioState: updatedParticipant.isAudioEnabled()
          });
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error processing event:`, error, 'payload:', payload);
    }
  }

  /**
   * Start periodic participant state synchronization
   * This ensures we capture any missed video/audio state changes
   */
  private startParticipantSync(): void {
    // Clear any existing interval
    if (this.participantSyncInterval) {
      clearInterval(this.participantSyncInterval);
    }

    // Sync every 3 seconds
    this.participantSyncInterval = setInterval(() => {
      this.syncParticipantStates();
    }, 3000);

    console.log('[ZoomVideoService] Started participant state synchronization');
  }

  /**
   * Synchronize participant states with Zoom SDK
   */
  private syncParticipantStates(): void {
    try {
      if (!this.client) return;

      const allUsers = this.client.getAllUser();
      console.log('[ZoomVideoService] Syncing participant states:', {
        zoomUsers: allUsers.length,
        trackedParticipants: this.participantsMap.size
      });

      // Check each Zoom user against our tracked participants
      for (const zoomUser of allUsers) {
        const userIdStr = zoomUser.userId.toString();
        const participant = this.participantsMap.get(userIdStr);

        if (participant) {
          let needsUpdate = false;
          let updatedParticipant = participant;

          // Check video state
          const shouldHaveVideo = !!zoomUser.bVideoOn;
          if (shouldHaveVideo !== participant.isVideoEnabled()) {
            updatedParticipant = shouldHaveVideo ?
              updatedParticipant.enableVideo() : updatedParticipant.disableVideo();
            needsUpdate = true;

            console.log('[ZoomVideoService] Video state sync:', {
              userId: userIdStr,
              name: participant.getName(),
              zoomVideoState: shouldHaveVideo,
              previousState: participant.isVideoEnabled(),
              newState: updatedParticipant.isVideoEnabled()
            });

            this.videoSubject.next({
              type: shouldHaveVideo ? 'video-enabled' : 'video-disabled',
              participantId: ParticipantId.create(userIdStr),
              timestamp: new Date()
            });
          }

          // Check audio state
          const shouldHaveAudio = !zoomUser.muted && !!zoomUser.audio;
          if (shouldHaveAudio !== participant.isAudioEnabled()) {
            updatedParticipant = shouldHaveAudio ?
              updatedParticipant.enableAudio() : updatedParticipant.disableAudio();
            needsUpdate = true;

            console.log('[ZoomVideoService] Audio state sync:', {
              userId: userIdStr,
              name: participant.getName(),
              zoomAudioState: shouldHaveAudio,
              muted: zoomUser.muted,
              audio: zoomUser.audio,
              previousState: participant.isAudioEnabled(),
              newState: updatedParticipant.isAudioEnabled()
            });

            this.audioSubject.next({
              type: shouldHaveAudio ? 'audio-enabled' : 'audio-disabled',
              participantId: ParticipantId.create(userIdStr),
              timestamp: new Date()
            });
          }

          if (needsUpdate) {
            this.participantsMap.set(userIdStr, updatedParticipant);

            this.participantSubject.next({
              type: 'participant-updated',
              participant: updatedParticipant,
              timestamp: new Date()
            });
          }
        } else {
          // Found a Zoom user we're not tracking - might be a missed user-added event
          console.log('[ZoomVideoService] Found untracked participant during sync:', {
            userId: userIdStr,
            displayName: zoomUser.displayName || zoomUser.display_name,
            bVideoOn: zoomUser.bVideoOn,
            muted: zoomUser.muted
          });

          // Add the missing participant
          this.processUserAdded({
            userId: zoomUser.userId,
            displayName: zoomUser.displayName || zoomUser.display_name
          }, '[ZoomVideoService] sync-recovery');
        }
      }

      // Check for participants that left (in our map but not in Zoom)
      const zoomUserIds = new Set(allUsers.map((u: any) => u.userId.toString()));
      for (const [userIdStr, participant] of this.participantsMap) {
        if (!zoomUserIds.has(userIdStr) && participant !== this.currentParticipant) {
          console.log('[ZoomVideoService] Found departed participant during sync:', {
            userId: userIdStr,
            name: participant.getName()
          });

          this.processUserRemoved({
            userId: parseInt(userIdStr),
            displayName: participant.getName()
          }, '[ZoomVideoService] sync-recovery');
        }
      }
    } catch (error) {
      console.error('[ZoomVideoService] Error during participant sync:', error);
    }
  }

  private getEmptyStats(): ConnectionStatistics {
    return {
      totalParticipants: 0,
      activeVideoStreams: 0,
      activeAudioStreams: 0,
      averageConnectionQuality: 0,
      bandwidthUsage: { upstream: 0, downstream: 0 },
      latencyStats: { average: 0, min: 0, max: 0 },
      cpuUsage: 0,
      memoryUsage: 0
    };
  }
}