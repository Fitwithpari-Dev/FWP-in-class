import ZoomVideo, {
  VideoClient,
  Stream,
  Participant as ZoomParticipant,
  ChatMessage,
  ConnectionState,
  VideoQuality,
  VideoCanvas,
} from '@zoom/videosdk';
import { ZOOM_CONFIG } from '../config/zoom.config';
import { Participant, StudentLevel } from '../types/fitness-platform';

export interface ZoomSDKEventHandlers {
  onUserJoin?: (userId: string, user: ZoomParticipant) => void;
  onUserLeave?: (userId: string) => void;
  onUserVideoStateChange?: (userId: string, videoOn: boolean) => void;
  onUserAudioStateChange?: (userId: string, audioOn: boolean) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onNetworkQualityChange?: (userId: string, quality: 'excellent' | 'good' | 'poor') => void;
  onChatMessage?: (message: ChatMessage) => void;
  onHandRaised?: (userId: string, raised: boolean) => void;
  onRecordingStateChange?: (recording: boolean) => void;
  onSessionClosed?: () => void;
}

export class ZoomSDKService {
  private client: typeof VideoClient | null = null;
  private stream: typeof Stream | null = null;
  private currentSession: any = null;
  private eventHandlers: ZoomSDKEventHandlers = {};
  private videoCanvasMap: Map<string, VideoCanvas> = new Map();
  private participantLevels: Map<string, StudentLevel> = new Map();
  private isInitialized = false;
  private renderingParticipants: Set<string> = new Set();
  private videoQualitySettings: Map<string, VideoQuality> = new Map();

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.client = ZoomVideo.createClient();

      if (!this.client) {
        throw new Error('Failed to create Zoom Video SDK client');
      }

      // Initialize the client with configuration
      await this.client.init('en-US', 'Global', {
        enforceMultipleVideos: true,
        patchJsMedia: true,
        leaveOnPageUnload: true,
        stayAwake: true, // Prevent device sleep during sessions
      });

      this.stream = this.client.getMediaStream();
      this.isInitialized = true;
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize Zoom SDK:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.client) return;

    // User events
    this.client.on('user-added', (payload: any) => {
      const users = payload?.users || [payload];
      users.forEach((user: ZoomParticipant) => {
        if (this.eventHandlers.onUserJoin) {
          this.eventHandlers.onUserJoin(user.userId, user);
        }
      });
    });

    this.client.on('user-removed', (payload: any) => {
      const users = payload?.users || [payload];
      users.forEach((user: ZoomParticipant) => {
        this.cleanupParticipantResources(user.userId);
        if (this.eventHandlers.onUserLeave) {
          this.eventHandlers.onUserLeave(user.userId);
        }
      });
    });

    // Video state changes
    this.client.on('video-statistic-data-change', (payload: any) => {
      if (payload.userId && this.eventHandlers.onUserVideoStateChange) {
        this.eventHandlers.onUserVideoStateChange(payload.userId, payload.videoOn);
      }
    });

    // Audio state changes
    this.client.on('audio-statistic-data-change', (payload: any) => {
      if (payload.userId && this.eventHandlers.onUserAudioStateChange) {
        this.eventHandlers.onUserAudioStateChange(payload.userId, !payload.muted);
      }
    });

    // Network quality monitoring
    this.client.on('network-quality', (payload: any) => {
      if (this.eventHandlers.onNetworkQualityChange) {
        const quality = this.mapNetworkQuality(payload.uplinkNetworkQuality, payload.downlinkNetworkQuality);
        this.eventHandlers.onNetworkQualityChange(payload.userId, quality);
      }
    });

    // Chat messages
    this.client.on('chat-message', (payload: ChatMessage) => {
      if (this.eventHandlers.onChatMessage) {
        this.eventHandlers.onChatMessage(payload);
      }
    });

    // Connection state
    this.client.on('connection-change', (payload: any) => {
      if (this.eventHandlers.onConnectionChange) {
        this.eventHandlers.onConnectionChange(payload.state);
      }
    });

    // Recording state
    this.client.on('recording-change', (payload: any) => {
      if (this.eventHandlers.onRecordingStateChange) {
        this.eventHandlers.onRecordingStateChange(payload.state === 'started');
      }
    });

    // Session closed
    this.client.on('session-closed', () => {
      this.cleanup();
      if (this.eventHandlers.onSessionClosed) {
        this.eventHandlers.onSessionClosed();
      }
    });
  }

  public setEventHandlers(handlers: ZoomSDKEventHandlers) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public async joinSession(
    sessionName: string,
    token: string,
    userName: string,
    isHost: boolean = false
  ): Promise<void> {
    if (!this.client || !this.isInitialized) {
      await this.initializeClient();
    }

    try {
      this.currentSession = await this.client!.join(
        sessionName,
        token,
        userName,
        '',
        {
          enforceGalleryView: true,
          virtualBackground: false,
        }
      );

      // Configure based on role
      if (isHost) {
        await this.configureHostSettings();
      } else {
        await this.configureParticipantSettings();
      }

      // Start with optimized settings for fitness classes
      await this.optimizeForFitnessClass();
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }

  private async configureHostSettings() {
    if (!this.stream) return;

    try {
      // Host starts with video and audio on
      await this.stream.startVideo();
      await this.stream.startAudio();

      // Enable host-specific features
      if (this.client) {
        // Host can manage participants
        await this.client.setCommandChannelPermission(true);
      }
    } catch (error) {
      console.error('Error configuring host settings:', error);
    }
  }

  private async configureParticipantSettings() {
    if (!this.stream) return;

    try {
      // Participants start with video on, audio muted
      await this.stream.startVideo();
      await this.stream.muteAudio();
    } catch (error) {
      console.error('Error configuring participant settings:', error);
    }
  }

  private async optimizeForFitnessClass() {
    if (!this.stream || !this.client) return;

    try {
      // Set video quality based on participant count
      const participantCount = this.client.getAllUser().length;

      if (participantCount > 25) {
        // Lower quality for large classes
        await this.stream.setVideoQuality('360p');
      } else {
        // Higher quality for smaller classes
        await this.stream.setVideoQuality('720p');
      }

      // Enable optimizations
      await this.stream.enableHardwareAcceleration();

      // Configure audio for fitness environment
      await this.stream.setAudioNoiseSuppression(true);
      await this.stream.setAudioEchoCancellation(true);
    } catch (error) {
      console.error('Error optimizing for fitness class:', error);
    }
  }

  // Video control methods
  public async startVideo(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');
    await this.stream.startVideo();
  }

  public async stopVideo(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');
    await this.stream.stopVideo();
  }

  public async muteAudio(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');
    await this.stream.muteAudio();
  }

  public async unmuteAudio(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');
    await this.stream.unmuteAudio();
  }

  // Participant management (host only)
  public async muteParticipant(userId: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      // Send command to mute specific participant
      await this.client.sendCommand(userId, 'mute', '');
    } catch (error) {
      console.error('Error muting participant:', error);
      throw error;
    }
  }

  public async muteAllParticipants(excludeHost: boolean = true): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const users = this.client.getAllUser();
      const currentUserId = this.client.getSessionInfo().userId;

      for (const user of users) {
        if (excludeHost && user.userId === currentUserId) continue;
        await this.muteParticipant(user.userId);
      }
    } catch (error) {
      console.error('Error muting all participants:', error);
      throw error;
    }
  }

  public async removeParticipant(userId: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      await this.client.sendCommand(userId, 'remove', '');
      this.cleanupParticipantResources(userId);
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  // Video rendering for fitness platform
  public async renderVideo(
    userId: string,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    isSpotlight: boolean = false
  ): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      // Clean up existing rendering for this user
      if (this.renderingParticipants.has(userId)) {
        await this.stopRenderVideo(userId, canvas);
      }

      // Set video quality based on view mode
      const quality = isSpotlight ? '720p' : '360p';
      this.videoQualitySettings.set(userId, quality as VideoQuality);

      // Start rendering
      await this.stream.renderVideo(
        canvas,
        userId,
        width,
        height,
        0, // x coordinate
        0, // y coordinate
        3  // video quality level
      );

      this.renderingParticipants.add(userId);
      this.videoCanvasMap.set(userId, canvas as VideoCanvas);
    } catch (error) {
      console.error(`Error rendering video for user ${userId}:`, error);
      throw error;
    }
  }

  public async stopRenderVideo(userId: string, canvas: HTMLCanvasElement): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      await this.stream.stopRenderVideo(canvas, userId);
      this.renderingParticipants.delete(userId);
      this.videoCanvasMap.delete(userId);
    } catch (error) {
      console.error(`Error stopping video render for user ${userId}:`, error);
    }
  }

  // Optimized batch rendering for gallery view
  public async renderGalleryView(
    canvas: HTMLCanvasElement,
    participants: string[],
    tilesPerRow: number = 7,
    tileWidth: number = 160,
    tileHeight: number = 90
  ): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      // Calculate layout
      const totalRows = Math.ceil(participants.length / tilesPerRow);

      // Clear canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Render participants in grid
      for (let i = 0; i < participants.length && i < ZOOM_CONFIG.videoConfig.performance.maxRenderingParticipants; i++) {
        const row = Math.floor(i / tilesPerRow);
        const col = i % tilesPerRow;
        const x = col * tileWidth;
        const y = row * tileHeight;

        await this.stream.renderVideo(
          canvas,
          participants[i],
          tileWidth,
          tileHeight,
          x,
          y,
          2 // Lower quality for gallery view
        );
      }
    } catch (error) {
      console.error('Error rendering gallery view:', error);
      throw error;
    }
  }

  // Spotlight functionality
  public async spotlightParticipant(userId: string, canvas: HTMLCanvasElement): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      // Clear existing renders
      for (const [participantId, participantCanvas] of this.videoCanvasMap) {
        if (participantCanvas === canvas) {
          await this.stopRenderVideo(participantId, participantCanvas);
        }
      }

      // Render spotlighted participant at higher quality
      await this.renderVideo(userId, canvas, canvas.width, canvas.height, true);
    } catch (error) {
      console.error('Error spotlighting participant:', error);
      throw error;
    }
  }

  // Chat functionality
  public async sendChatMessage(message: string, toUserId?: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      if (toUserId) {
        // Private message
        await this.client.sendChat(message, toUserId);
      } else {
        // Broadcast message
        await this.client.sendChat(message);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  // Recording controls
  public async startRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      await this.client.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      await this.client.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  // Screen sharing for workout plans
  public async startScreenShare(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      await this.stream.startShareScreen();
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      await this.stream.stopShareScreen();
    } catch (error) {
      console.error('Error stopping screen share:', error);
      throw error;
    }
  }

  // Participant information
  public getAllParticipants(): Participant[] {
    if (!this.client) return [];

    try {
      const users = this.client.getAllUser();
      const currentUserId = this.client.getSessionInfo().userId;

      return users.map((user: ZoomParticipant) => ({
        id: user.userId,
        name: user.displayName || 'Unknown',
        isVideoOn: user.bVideoOn || false,
        isAudioOn: !user.muted,
        isHost: user.userId === currentUserId,
        connectionQuality: this.getUserConnectionQuality(user.userId),
        hasRaisedHand: false, // Will be tracked separately
        level: this.participantLevels.get(user.userId),
      }));
    } catch (error) {
      console.error('Error getting participants:', error);
      return [];
    }
  }

  private getUserConnectionQuality(userId: string): 'excellent' | 'good' | 'poor' {
    // This would be tracked from network quality events
    // For now, return a default
    return 'good';
  }

  private mapNetworkQuality(uplink: number, downlink: number): 'excellent' | 'good' | 'poor' {
    const avgQuality = (uplink + downlink) / 2;
    if (avgQuality >= 4) return 'excellent';
    if (avgQuality >= 2) return 'good';
    return 'poor';
  }

  // Set participant fitness level
  public setParticipantLevel(userId: string, level: StudentLevel): void {
    this.participantLevels.set(userId, level);
  }

  // Leave session
  public async leaveSession(): Promise<void> {
    if (!this.client) return;

    try {
      await this.cleanup();
      await this.client.leave();
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  private cleanupParticipantResources(userId: string): void {
    // Clean up video canvas
    const canvas = this.videoCanvasMap.get(userId);
    if (canvas && this.stream) {
      this.stream.stopRenderVideo(canvas, userId).catch(console.error);
    }

    // Clean up tracking maps
    this.videoCanvasMap.delete(userId);
    this.renderingParticipants.delete(userId);
    this.videoQualitySettings.delete(userId);
    this.participantLevels.delete(userId);
  }

  private async cleanup(): Promise<void> {
    // Stop all video renders
    for (const [userId, canvas] of this.videoCanvasMap) {
      if (this.stream) {
        await this.stream.stopRenderVideo(canvas, userId).catch(console.error);
      }
    }

    // Clear all maps
    this.videoCanvasMap.clear();
    this.renderingParticipants.clear();
    this.videoQualitySettings.clear();
    this.participantLevels.clear();

    // Stop local media
    if (this.stream) {
      await this.stream.stopVideo().catch(console.error);
      await this.stream.stopAudio().catch(console.error);
    }
  }

  // Get session info
  public getSessionInfo(): any {
    if (!this.client) return null;
    return this.client.getSessionInfo();
  }

  // Check if user is host
  public isHost(): boolean {
    if (!this.client) return false;
    const sessionInfo = this.client.getSessionInfo();
    return sessionInfo?.isHost || false;
  }

  // Get current user info
  public getCurrentUser(): ZoomParticipant | null {
    if (!this.client) return null;
    return this.client.getCurrentUserInfo();
  }
}