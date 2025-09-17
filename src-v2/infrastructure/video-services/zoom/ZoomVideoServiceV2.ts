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
 * Zoom Video Service V2 - Correct Implementation
 *
 * Key Changes from V1:
 * 1. Uses Zoom-provided video elements (attachVideo returns element)
 * 2. Implements proper video pagination for 25+ participants
 * 3. Follows official Zoom SDK video rendering patterns
 * 4. Eliminates custom video element dimension handling
 */
export class ZoomVideoServiceV2 implements IVideoService {
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
  private client: any = null;
  private stream: any = null;
  private currentParticipant: Participant | null = null;
  private participantsMap: Map<string, Participant> = new Map();
  private config: VideoServiceConfig | null = null;
  private tokenService: ZoomTokenService;
  private participantSyncInterval: NodeJS.Timeout | null = null;

  // New: Zoom-provided video elements management
  private zoomVideoElements: Map<string, HTMLVideoElement> = new Map();
  private videoContainers: Map<string, HTMLElement> = new Map();

  // Video pagination state
  private readonly MAX_VIDEOS_DESKTOP = 25;
  private readonly MAX_VIDEOS_MOBILE = 9;
  private currentVideoPage = 0;
  private visibleParticipants: Set<string> = new Set();

  // Event subjects
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

      console.log('[ZoomVideoServiceV2] Creating Zoom Video SDK client...');

      this.client = ZoomVideo.createClient();
      if (!this.client) {
        throw new Error('Failed to create Zoom Video SDK client');
      }

      console.log('[ZoomVideoServiceV2] Initializing client...');

      // Initialize with proper options for fitness platform
      await this.client.init('en-US', 'Global', {
        patchJsMedia: true,
        leaveOnPageUnload: true,
        stayAwake: true,
        // Enable SharedArrayBuffer for multiple videos (required for 25+ videos)
        enforceMultipleVideos: true
      });

      this.stream = this.client.getMediaStream();
      if (!this.stream) {
        throw new Error('Failed to get media stream from Zoom client');
      }

      this.setupEventHandlers();
      this._isInitialized = true;

      console.log('[ZoomVideoServiceV2] ✅ Initialized successfully with V2 architecture');
    } catch (error) {
      console.error('[ZoomVideoServiceV2] ❌ Initialization failed:', error);
      throw new Error(`Failed to initialize Zoom Video Service V2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async destroy(): Promise<void> {
    try {
      // Clear sync interval
      if (this.participantSyncInterval) {
        clearInterval(this.participantSyncInterval);
        this.participantSyncInterval = null;
      }

      // Clean up all video elements
      await this.cleanupAllVideoElements();

      if (this.client) {
        await this.client.leave();
        this.client = null;
      }

      this.participantsMap.clear();
      this.currentParticipant = null;
      this.visibleParticipants.clear();
      this.currentVideoPage = 0;

      // Complete all subjects
      this.participantSubject.complete();
      this.videoSubject.complete();
      this.audioSubject.complete();
      this.connectionSubject.complete();
      this.scalingSubject.complete();

      this._isInitialized = false;

      console.log('[ZoomVideoServiceV2] ✅ Destroyed successfully');
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Destroy failed:', error);
      throw error;
    }
  }

  async joinSession(request: JoinSessionRequest): Promise<SessionJoinResult> {
    let sessionName = '';
    let userId = 0;

    try {
      if (!this.client || !this._isInitialized) {
        throw new Error('Zoom Video Service V2 not initialized');
      }

      if (!this.stream) {
        throw new Error('Media stream not available');
      }

      // Generate session name and token
      sessionName = ZoomTokenService.generateSessionName(request.sessionId);

      if (!sessionName || !ZoomTokenService.isValidSessionName(sessionName)) {
        throw new Error(`Invalid session name generated: ${sessionName}`);
      }

      const token = await this.tokenService.generateToken(
        sessionName,
        request.participantRole === 'coach' ? 'host' : 'participant',
        request.participantName,
        'fitness-session'
      );

      console.log('[ZoomVideoServiceV2] Joining session:', {
        sessionName,
        participantName: request.participantName,
        role: request.participantRole
      });

      // Join session
      await this.client.join(sessionName, token, request.participantName, '');

      // Create participant entity
      const userInfo = this.client.getCurrentUserInfo();
      this.currentParticipant = Participant.create(
        ParticipantId.create(userInfo.userId),
        request.participantName,
        request.participantRole
      );

      // Enable media based on request
      if (request.videoEnabled) {
        await this.enableVideo();
      }
      if (request.audioEnabled) {
        await this.enableAudio();
      }

      const sessionInfo = {
        participantCount: await this.getParticipantCount(),
        isRecording: false,
        sessionStartTime: new Date()
      };

      // Start participant sync and video pagination
      this.startParticipantSync();
      this.updateVideoPagination();

      console.log('[ZoomVideoServiceV2] ✅ Session joined successfully');

      return {
        success: true,
        participant: this.currentParticipant,
        sessionInfo
      };
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Session join failed:', error);
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
    if (this.participantSyncInterval) {
      clearInterval(this.participantSyncInterval);
      this.participantSyncInterval = null;
    }

    await this.cleanupAllVideoElements();

    if (this.client) {
      await this.client.leave();
      this.currentParticipant = null;
      this.participantsMap.clear();
      this.visibleParticipants.clear();
      this.currentVideoPage = 0;
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

  // Media controls with proper Zoom patterns
  async enableVideo(): Promise<void> {
    if (!this.client || !this.stream) throw new Error('Client/stream not initialized');

    try {
      console.log('[ZoomVideoServiceV2] Starting video stream...');

      // Start video (must be tied to user interaction)
      await this.stream.startVideo();

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableVideo();

        this.videoSubject.next({
          type: 'video-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });

        this.participantSubject.next({
          type: 'participant-updated',
          participant: this.currentParticipant,
          timestamp: new Date()
        });

        console.log('[ZoomVideoServiceV2] ✅ Video enabled successfully');
      }
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to enable video:', error);
      throw error;
    }
  }

  async disableVideo(): Promise<void> {
    if (!this.client || !this.stream) throw new Error('Client/stream not initialized');

    try {
      await this.stream.stopVideo();

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.disableVideo();

        this.videoSubject.next({
          type: 'video-disabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });

        this.participantSubject.next({
          type: 'participant-updated',
          participant: this.currentParticipant,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to disable video:', error);
      throw error;
    }
  }

  async enableAudio(): Promise<void> {
    if (!this.client || !this.stream) throw new Error('Client/stream not initialized');

    try {
      await this.stream.startAudio();

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableAudio();
        this.audioSubject.next({
          type: 'audio-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to enable audio:', error);
      throw error;
    }
  }

  async disableAudio(): Promise<void> {
    if (!this.client || !this.stream) throw new Error('Client/stream not initialized');

    try {
      await this.stream.stopAudio();

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.disableAudio();
        this.audioSubject.next({
          type: 'audio-disabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to disable audio:', error);
      throw error;
    }
  }

  async setVideoQuality(quality: VideoQuality): Promise<void> {
    // Video quality is handled per-participant in attachVideo method
    console.log('[ZoomVideoServiceV2] Video quality setting handled per-participant');
  }

  /**
   * NEW V2 METHOD: Get Zoom-provided video element for participant
   * This is the correct approach according to Zoom documentation
   */
  async getParticipantVideoElement(participantId: ParticipantId, quality: VideoQuality = 'medium'): Promise<HTMLVideoElement | null> {
    if (!this.client || !this.stream) {
      throw new Error('Client/stream not initialized');
    }

    const userId = parseInt(participantId.getValue());
    const userIdStr = participantId.getValue();

    try {
      // Check if we already have a video element for this participant
      const existingElement = this.zoomVideoElements.get(userIdStr);
      if (existingElement) {
        console.log('[ZoomVideoServiceV2] Returning existing video element for participant:', userIdStr);
        return existingElement;
      }

      // Verify participant has video enabled
      const allUsers = this.client.getAllUser();
      const user = allUsers.find((u: any) => u.userId === userId);

      if (!user) {
        console.warn('[ZoomVideoServiceV2] User not found for video element:', userId);
        return null;
      }

      const currentUserId = this.client.getCurrentUserInfo()?.userId;
      const isSelfView = userId === currentUserId;

      if (!user.bVideoOn && !isSelfView) {
        console.warn('[ZoomVideoServiceV2] User video is disabled:', userIdStr);
        return null;
      }

      // Map quality to Zoom SDK quality levels
      const qualityMap = {
        'low': 0,     // 90p
        'medium': 2,  // 360p
        'high': 3,    // 720p
        'ultra': 4    // 1080p
      };

      console.log('[ZoomVideoServiceV2] Creating Zoom-provided video element:', {
        userId,
        quality,
        zoomQuality: qualityMap[quality],
        isSelfView
      });

      // CORRECT APPROACH: Let Zoom create and provide the video element
      // attachVideo returns the video element created by Zoom SDK
      const videoElement = await this.stream.attachVideo(userId, qualityMap[quality]);

      if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
        throw new Error(`attachVideo did not return a valid video element for userId ${userId}`);
      }

      // Configure video element for fitness platform
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      if (isSelfView) {
        videoElement.muted = true; // Prevent echo
      }

      // Add CSS classes for styling
      videoElement.className = 'zoom-video-element';
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';

      // Store reference for cleanup
      this.zoomVideoElements.set(userIdStr, videoElement);

      console.log('[ZoomVideoServiceV2] ✅ Successfully created Zoom video element for participant:', userIdStr);

      return videoElement;
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to get video element for participant:', {
        participantId: userIdStr,
        error
      });
      return null;
    }
  }

  /**
   * NEW V2 METHOD: Attach Zoom video element to container
   * This replaces the old renderParticipantVideo method
   */
  async attachVideoToContainer(participantId: ParticipantId, container: HTMLElement, quality: VideoQuality = 'medium'): Promise<boolean> {
    try {
      const videoElement = await this.getParticipantVideoElement(participantId, quality);

      if (!videoElement) {
        console.warn('[ZoomVideoServiceV2] No video element available for participant:', participantId.getValue());
        return false;
      }

      // Clear any existing content in container
      container.innerHTML = '';

      // Append Zoom-provided video element to container
      container.appendChild(videoElement);

      // Store container reference for pagination
      this.videoContainers.set(participantId.getValue(), container);
      this.visibleParticipants.add(participantId.getValue());

      console.log('[ZoomVideoServiceV2] ✅ Successfully attached video to container:', {
        participantId: participantId.getValue(),
        containerTag: container.tagName,
        containerId: container.id
      });

      return true;
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to attach video to container:', error);
      return false;
    }
  }

  /**
   * V2 IMPLEMENTATION: renderParticipantVideo now uses attach pattern
   */
  async renderParticipantVideo(participantId: ParticipantId, element: HTMLElement): Promise<void> {
    const success = await this.attachVideoToContainer(participantId, element);
    if (!success) {
      throw new Error(`Failed to render video for participant ${participantId.getValue()}`);
    }
  }

  async stopRenderingVideo(participantId: ParticipantId): Promise<void> {
    const userIdStr = participantId.getValue();
    const userId = parseInt(userIdStr);

    try {
      console.log('[ZoomVideoServiceV2] Stopping video rendering for participant:', userIdStr);

      // Remove from visible participants
      this.visibleParticipants.delete(userIdStr);

      // Get and clear container
      const container = this.videoContainers.get(userIdStr);
      if (container) {
        container.innerHTML = '';
        this.videoContainers.delete(userIdStr);
      }

      // Detach from Zoom SDK
      if (this.stream) {
        await this.stream.detachVideo(userId);
      }

      // Remove stored video element
      this.zoomVideoElements.delete(userIdStr);

      console.log('[ZoomVideoServiceV2] ✅ Stopped video rendering for participant:', userIdStr);
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Failed to stop video rendering:', error);
      // Clean up references anyway
      this.visibleParticipants.delete(userIdStr);
      this.videoContainers.delete(userIdStr);
      this.zoomVideoElements.delete(userIdStr);
    }
  }

  /**
   * NEW V2 FEATURE: Video pagination for 25+ participants
   */
  getMaxVisibleVideos(): number {
    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? this.MAX_VIDEOS_MOBILE : this.MAX_VIDEOS_DESKTOP;
  }

  async setVideoPage(pageNumber: number): Promise<void> {
    this.currentVideoPage = Math.max(0, pageNumber);
    await this.updateVideoPagination();
  }

  async nextVideoPage(): Promise<void> {
    const maxVideos = this.getMaxVisibleVideos();
    const totalParticipants = this.participantsMap.size;
    const maxPages = Math.ceil(totalParticipants / maxVideos);

    if (this.currentVideoPage < maxPages - 1) {
      this.currentVideoPage++;
      await this.updateVideoPagination();
    }
  }

  async previousVideoPage(): Promise<void> {
    if (this.currentVideoPage > 0) {
      this.currentVideoPage--;
      await this.updateVideoPagination();
    }
  }

  private async updateVideoPagination(): Promise<void> {
    const maxVideos = this.getMaxVisibleVideos();
    const allParticipants = Array.from(this.participantsMap.keys());

    // Calculate which participants should be visible on current page
    const startIndex = this.currentVideoPage * maxVideos;
    const endIndex = startIndex + maxVideos;
    const visibleParticipantIds = allParticipants.slice(startIndex, endIndex);

    console.log('[ZoomVideoServiceV2] Updating video pagination:', {
      currentPage: this.currentVideoPage,
      maxVideos,
      totalParticipants: allParticipants.length,
      visibleCount: visibleParticipantIds.length,
      visibleIds: visibleParticipantIds
    });

    // Hide participants not on current page
    for (const participantId of this.visibleParticipants) {
      if (!visibleParticipantIds.includes(participantId)) {
        await this.stopRenderingVideo(ParticipantId.create(participantId));
      }
    }

    // Show participants on current page
    for (const participantId of visibleParticipantIds) {
      if (!this.visibleParticipants.has(participantId)) {
        // Find container for this participant (UI layer should provide containers)
        const container = document.querySelector(`[data-participant-id="${participantId}"]`) as HTMLElement;
        if (container) {
          await this.attachVideoToContainer(ParticipantId.create(participantId), container);
        }
      }
    }

    this.scalingSubject.next({
      type: 'selective-streaming-enabled',
      data: {
        currentPage: this.currentVideoPage,
        visibleParticipants: visibleParticipantIds,
        maxVideos
      },
      timestamp: new Date()
    });
  }

  private async cleanupAllVideoElements(): Promise<void> {
    console.log('[ZoomVideoServiceV2] Cleaning up all video elements...');

    // Stop rendering for all visible participants
    for (const participantId of this.visibleParticipants) {
      try {
        await this.stopRenderingVideo(ParticipantId.create(participantId));
      } catch (error) {
        console.error(`Failed to cleanup video for participant ${participantId}:`, error);
      }
    }

    // Clear all maps
    this.zoomVideoElements.clear();
    this.videoContainers.clear();
    this.visibleParticipants.clear();
    this.currentVideoPage = 0;

    console.log('[ZoomVideoServiceV2] ✅ All video elements cleaned up');
  }

  // Rest of the methods remain similar to V1 but with V2 logging
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
    const participant = this.participantsMap.get(participantId.getValue());
    if (participant) {
      const updatedParticipant = participant.setActiveSpeaker(true);
      this.participantsMap.set(participantId.getValue(), updatedParticipant);
    }
  }

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
    this.participantSubject.next({
      type: 'participant-updated',
      participant: this.participantsMap.get(participantId.getValue())!,
      timestamp: new Date()
    });
  }

  async clearSpotlight(): Promise<void> {
    // Implementation depends on UI layer
  }

  async enableSelectiveStreaming(config: StreamConfiguration): Promise<void> {
    // This is handled by video pagination in V2
    await this.updateVideoPagination();
  }

  async setParticipantVideoLimit(limit: number): Promise<void> {
    if (limit > this.capabilities.maxParticipants) {
      this.scalingSubject.next({
        type: 'participant-limit-reached',
        data: { limit, max: this.capabilities.maxParticipants },
        timestamp: new Date()
      });
    }
  }

  async enableAudioOnlyMode(): Promise<void> {
    await this.cleanupAllVideoElements();
    if (this.stream) {
      await this.stream.stopVideo();
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
      averageConnectionQuality: 0.8,
      bandwidthUsage: {
        upstream: stream.getVideoStatisticData()?.encode_send_kbps || 0,
        downstream: stream.getVideoStatisticData()?.decode_recv_kbps || 0
      },
      latencyStats: {
        average: 50,
        min: 20,
        max: 100
      },
      cpuUsage: 0,
      memoryUsage: 0
    };
  }

  async startRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    await this.client.startCloudRecording();
  }

  async stopRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    await this.client.stopCloudRecording();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('user-added', (payload: any) => {
      this.handleUserEvent(payload, 'user-added');
    });

    this.client.on('user-removed', (payload: any) => {
      this.handleUserEvent(payload, 'user-removed');
    });

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

    this.client.on('connection-change', (payload: any) => {
      this.connectionSubject.next({
        type: 'connection-state-changed',
        state: payload.state,
        timestamp: new Date()
      });
    });

    this.client.on('active-speaker', (payload: any) => {
      this.handleActiveSpeakerEvent(payload);
    });
  }

  // Event handlers (simplified from V1 - same logic but cleaner)
  private handleUserEvent(payload: any, eventType: 'user-added' | 'user-removed'): void {
    // Similar to V1 but with V2 logging and pagination updates
    try {
      const userInfos = this.parseUserPayload(payload, `[ZoomVideoServiceV2] ${eventType}`);

      for (const userInfo of userInfos) {
        if (eventType === 'user-added') {
          this.processUserAdded(userInfo);
        } else {
          this.processUserRemoved(userInfo);
        }
      }

      // Update pagination when participants change
      this.updateVideoPagination();
    } catch (error) {
      console.error(`[ZoomVideoServiceV2] ${eventType} error:`, error);
    }
  }

  private parseUserPayload(payload: any, logPrefix: string): Array<{userId: number, displayName?: string}> {
    // Same logic as V1 but simplified
    if (!payload) return [];

    if (Array.isArray(payload)) {
      return payload
        .filter(item => item && typeof item === 'object' && item.userId !== undefined)
        .map(item => ({
          userId: item.userId,
          displayName: item.displayName || item.display_name || 'Unknown User'
        }));
    }

    if (typeof payload === 'object' && payload.userId !== undefined) {
      return [{
        userId: payload.userId,
        displayName: payload.displayName || payload.display_name || 'Unknown User'
      }];
    }

    return [];
  }

  private processUserAdded(userInfo: {userId: number, displayName?: string}): void {
    const userIdStr = userInfo.userId.toString();

    let participant = Participant.create(
      ParticipantId.create(userIdStr),
      userInfo.displayName || 'Unknown User',
      'student'
    );

    // Sync video/audio state from Zoom SDK
    try {
      const allUsers = this.client.getAllUser();
      const zoomUser = allUsers.find((u: any) => u.userId === userInfo.userId);

      if (zoomUser) {
        if (zoomUser.bVideoOn) {
          participant = participant.enableVideo();
        }
        if (!zoomUser.muted && zoomUser.audio) {
          participant = participant.enableAudio();
        }
      }
    } catch (syncError) {
      console.warn('[ZoomVideoServiceV2] Failed to sync media state:', syncError);
    }

    this.participantsMap.set(userIdStr, participant);

    this.participantSubject.next({
      type: 'participant-joined',
      participant,
      timestamp: new Date()
    });

    console.log('[ZoomVideoServiceV2] Participant added:', userIdStr);
  }

  private processUserRemoved(userInfo: {userId: number, displayName?: string}): void {
    const userIdStr = userInfo.userId.toString();
    const participant = this.participantsMap.get(userIdStr);

    if (participant) {
      this.participantsMap.delete(userIdStr);

      // Clean up video if participant was visible
      if (this.visibleParticipants.has(userIdStr)) {
        this.stopRenderingVideo(ParticipantId.create(userIdStr));
      }

      this.participantSubject.next({
        type: 'participant-left',
        participant,
        timestamp: new Date()
      });

      console.log('[ZoomVideoServiceV2] Participant removed:', userIdStr);
    }
  }

  private handleUserVideoStateEvent(payload: any): void {
    // Similar to V1 but triggers pagination update
    const userInfos = this.parseUserPayload(payload, '[ZoomVideoServiceV2] user-updated');

    for (const userInfo of userInfos) {
      const userIdStr = userInfo.userId.toString();
      const participant = this.participantsMap.get(userIdStr);

      if (participant) {
        const allUsers = this.client.getAllUser();
        const zoomUser = allUsers.find((u: any) => u.userId === userInfo.userId);

        if (zoomUser) {
          let updatedParticipant = participant;

          if (zoomUser.bVideoOn !== participant.isVideoEnabled()) {
            updatedParticipant = zoomUser.bVideoOn ?
              updatedParticipant.enableVideo() : updatedParticipant.disableVideo();

            this.videoSubject.next({
              type: zoomUser.bVideoOn ? 'video-enabled' : 'video-disabled',
              participantId: ParticipantId.create(userIdStr),
              timestamp: new Date()
            });
          }

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
  }

  private handleVideoStateChange(payload: any, isVideoEnabled: boolean): void {
    // Same as V1 but with V2 logging
    const userInfos = this.parseUserPayload(payload, `[ZoomVideoServiceV2] video-${isVideoEnabled ? 'on' : 'off'}`);

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
      }
    }
  }

  private handleAudioStateChange(payload: any, isAudioEnabled: boolean): void {
    // Same as V1 but with V2 logging
    const userInfos = this.parseUserPayload(payload, `[ZoomVideoServiceV2] audio-${isAudioEnabled ? 'on' : 'off'}`);

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
      }
    }
  }

  private handleActiveSpeakerEvent(payload: any): void {
    // Same as V1 but with V2 logging
    const speakerInfos = this.parseUserPayload(payload, '[ZoomVideoServiceV2] active-speaker');

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
  }

  private startParticipantSync(): void {
    if (this.participantSyncInterval) {
      clearInterval(this.participantSyncInterval);
    }

    this.participantSyncInterval = setInterval(() => {
      this.syncParticipantStates();
    }, 3000);

    console.log('[ZoomVideoServiceV2] Started participant state synchronization');
  }

  private syncParticipantStates(): void {
    // Same as V1 but simplified and with pagination updates
    try {
      if (!this.client) return;

      const allUsers = this.client.getAllUser();

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
          // Add missing participant
          this.processUserAdded({
            userId: zoomUser.userId,
            displayName: zoomUser.displayName || zoomUser.display_name
          });
        }
      }

      // Remove departed participants
      const zoomUserIds = new Set(allUsers.map((u: any) => u.userId.toString()));
      for (const [userIdStr, participant] of this.participantsMap) {
        if (!zoomUserIds.has(userIdStr) && participant !== this.currentParticipant) {
          this.processUserRemoved({
            userId: parseInt(userIdStr),
            displayName: participant.getName()
          });
        }
      }
    } catch (error) {
      console.error('[ZoomVideoServiceV2] Error during participant sync:', error);
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