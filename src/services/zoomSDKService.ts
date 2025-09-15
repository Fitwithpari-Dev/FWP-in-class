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

    // Video state changes - Listen to multiple events for better reliability
    this.client.on('video-statistic-data-change', (payload: any) => {
      if (payload.userId && this.eventHandlers.onUserVideoStateChange) {
        this.eventHandlers.onUserVideoStateChange(payload.userId, payload.videoOn);
      }
    });

    // Additional video state change events for better coverage
    this.client.on('peer-video-state-change', (payload: any) => {
      console.log('🎥 Peer video state change:', payload);
      if (payload.userId && this.eventHandlers.onUserVideoStateChange) {
        const action = payload.action; // 'Start' or 'Stop'
        this.eventHandlers.onUserVideoStateChange(payload.userId, action === 'Start');
      }
    });

    // Listen for local video state changes
    this.client.on('video-active-change', (payload: any) => {
      console.log('🎥 Video active change:', payload);
      if (this.stream) {
        const currentUserId = this.client?.getCurrentUserInfo()?.userId;
        if (currentUserId && this.eventHandlers.onUserVideoStateChange) {
          this.eventHandlers.onUserVideoStateChange(currentUserId, payload.state === 'Active');
        }
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
      // Check if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`📱 Host device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

      // Join audio session first
      console.log('🔊 Starting audio for host...');
      await this.stream.startAudio();

      // Small delay to ensure audio is properly initialized
      await new Promise(resolve => setTimeout(resolve, 300));

      // Unmute audio for host (they should be able to speak)
      console.log('🎤 Unmuting host audio...');
      await this.stream.unmuteAudio();

      // Handle video initialization based on device type
      if (isMobile) {
        console.log('📱 Mobile host detected - skipping auto-start video (user must tap video button)');
        // Don't auto-start video on mobile - let user interaction handle it
      } else {
        // For desktop, start video directly
        console.log('🎥 Starting video for desktop host...');
        await this.stream.startVideo();
      }

      console.log('✅ Host settings configured successfully');

      // Enable host-specific features
      if (this.client) {
        // Host privileges are automatically granted by the token
        console.log('👑 Host privileges active');
      }
    } catch (error) {
      console.error('Error configuring host settings:', error);
      // Don't throw - allow session to continue even if audio config fails
    }
  }

  private async configureParticipantSettings() {
    if (!this.stream) return;

    try {
      // Check if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`📱 Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

      // Join audio first, then mute (required sequence for Zoom SDK)
      console.log('🔊 Joining audio session...');
      await this.stream.startAudio();

      // Small delay to ensure audio is properly initialized
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now mute the audio
      console.log('🔇 Muting participant audio...');
      await this.stream.muteAudio();

      // For mobile devices, skip auto-start video - let user manually enable it
      if (isMobile) {
        console.log('📱 Mobile device detected - skipping auto-start video (user must tap video button)');
        // Don't auto-start video on mobile - let user interaction handle it
      } else {
        // For desktop, start video directly
        console.log('🎥 Starting video for desktop participant...');
        await this.stream.startVideo();
      }

      console.log('✅ Participant settings configured successfully');
    } catch (error) {
      console.error('❌ Error configuring participant settings:', error);
      // Don't throw - allow session to continue even if audio/video config fails
    }
  }

  private async optimizeForFitnessClass() {
    if (!this.stream || !this.client) return;

    try {
      // Set video quality based on participant count
      const participantCount = this.client.getAllUser().length;

      if (participantCount > 25) {
        // Lower quality for large classes - handled during rendering
        console.log('Large class detected, will use lower quality rendering');
      } else {
        // Higher quality for smaller classes - handled during rendering
        console.log('Small class detected, will use higher quality rendering');
      }

      // Enable optimizations (if available)
      try {
        if (this.stream.enableHardwareAcceleration) {
          await this.stream.enableHardwareAcceleration();
        }
      } catch (error) {
        console.log('Hardware acceleration not available:', error);
      }

      // Configure audio for fitness environment (if available)
      try {
        if (this.stream.setAudioNoiseSuppression) {
          await this.stream.setAudioNoiseSuppression(true);
        }
        if (this.stream.setAudioEchoCancellation) {
          await this.stream.setAudioEchoCancellation(true);
        }
      } catch (error) {
        console.log('Audio enhancement features not available:', error);
      }
    } catch (error) {
      console.error('Error optimizing for fitness class:', error);
    }
  }

  // Video control methods
  public async startVideo(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      console.log('🎥 Starting video stream...');

      // Check current video state before starting
      const currentUserId = this.client?.getCurrentUserInfo()?.userId;
      const allUsers = this.client?.getAllUser() || [];
      const currentUserBefore = allUsers.find(u => u.userId === currentUserId);
      console.log('📊 Video state BEFORE startVideo():', {
        currentUserId,
        bVideoOn: currentUserBefore?.bVideoOn,
        userCount: allUsers.length,
        streamIsVideoOn: this.stream.isVideoOn?.() // Check if stream has this method
      });

      // First check if camera permissions are granted
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          console.log('📹 Checking camera permissions...');
          await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          console.log('✅ Camera permissions granted');
        } catch (permError) {
          console.warn('⚠️ Camera permission denied or not available:', permError);
          console.warn('🔧 User needs to manually grant camera permissions');
          // Continue anyway - let Zoom SDK handle the permission request
        }
      }

      console.log('🎬 Calling stream.startVideo()...');
      await this.stream.startVideo();
      console.log('✅ stream.startVideo() completed');

      // Immediately check video state after starting
      const allUsersAfter = this.client?.getAllUser() || [];
      const currentUserAfter = allUsersAfter.find(u => u.userId === currentUserId);
      console.log('📊 Video state AFTER startVideo():', {
        currentUserId,
        bVideoOn: currentUserAfter?.bVideoOn,
        userCount: allUsersAfter.length,
        streamIsVideoOn: this.stream.isVideoOn?.() // Check if stream has this method
      });

      // CRITICAL: Force update current user's video state immediately
      const currentUser = this.client?.getCurrentUserInfo();
      if (currentUser && this.eventHandlers.onUserVideoStateChange) {
        console.log('🔄 Forcing video state update for current user after startVideo');
        this.eventHandlers.onUserVideoStateChange(currentUser.userId, true);
      }

      // Double-check video state after a short delay
      setTimeout(() => {
        const users = this.client?.getAllUser() || [];
        const currentUserId = this.client?.getCurrentUserInfo()?.userId;
        const currentUserData = users.find(u => u.userId === currentUserId);
        console.log('🔄 Final video state verification after 500ms:', {
          currentUserId,
          bVideoOn: currentUserData?.bVideoOn,
          streamIsVideoOn: this.stream.isVideoOn?.()
        });
        if (currentUserData && this.eventHandlers.onUserVideoStateChange) {
          this.eventHandlers.onUserVideoStateChange(currentUserId!, currentUserData.bVideoOn || false);
        }
      }, 500);
    } catch (error) {
      console.error('❌ Failed to start video stream:', error);
      console.error('❌ Video start error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        streamAvailable: !!this.stream,
        clientAvailable: !!this.client
      });
      console.error('💡 Users may need to click the video button manually to grant permissions');
      throw new Error(`Failed to start video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async stopVideo(): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');
    await this.stream.stopVideo();

    // CRITICAL: Force update current user's video state immediately
    const currentUser = this.client?.getCurrentUserInfo();
    if (currentUser && this.eventHandlers.onUserVideoStateChange) {
      console.log('🔄 Forcing video state update for current user after stopVideo');
      this.eventHandlers.onUserVideoStateChange(currentUser.userId, false);
    }
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
    videoElement: HTMLVideoElement,
    width: number,
    height: number,
    isSpotlight: boolean = false
  ): Promise<void> {
    if (!this.stream) {
      console.error('Stream not initialized - cannot render video');
      throw new Error('Stream not initialized');
    }

    if (!this.client) {
      console.error('Client not initialized - cannot render video');
      throw new Error('Client not initialized');
    }

    try {
      // Validate user exists in the session
      const allUsers = this.client.getAllUser();
      const userExists = allUsers.some(user => user.userId === userId);

      console.log(`🔍 Validating user ${userId} for video rendering:`, {
        userExists,
        totalUsers: allUsers.length,
        availableUsers: allUsers.map(u => ({
          id: u.userId,
          name: u.displayName,
          hasVideo: u.bVideoOn,
          isHost: u.isHost
        }))
      });

      if (!userExists) {
        console.warn(`❌ User ${userId} not found in session. Available users:`, allUsers.map(u => ({ id: u.userId, name: u.displayName })));
        return;
      }

      // Clean up existing rendering for this user
      if (this.renderingParticipants.has(userId)) {
        console.log(`Cleaning up existing render for user ${userId}`);
        await this.stopRenderVideo(userId, videoElement);
      }

      // Set video quality based on view mode
      const quality = isSpotlight ? '720p' : '360p';
      this.videoQualitySettings.set(userId, quality as VideoQuality);

      console.log(`Starting video render for user ${userId} on video element ${width}x${height}, quality: ${quality}`);

      // Convert userId to number as required by Zoom SDK
      const userIdNumber = parseInt(userId, 10);
      if (isNaN(userIdNumber)) {
        throw new Error(`Invalid userId: ${userId} - must be convertible to number`);
      }

      // Set video quality enum value
      const videoQuality = isSpotlight ? 2 : 1; // 0=90p, 1=180p, 2=360p, 3=720p, 4=1080p

      console.log(`🎬 Calling Zoom SDK attachVideo with params:`, {
        userIdNumber,
        width,
        height,
        videoQuality,
        elementType: videoElement.tagName
      });

      // Check if user has video enabled before attempting to render
      const user = allUsers.find(u => u.userId === userId);

      // IMPORTANT: For self-view, check if we're currently starting video
      const currentUserId = this.client.getCurrentUserInfo()?.userId;
      const isSelfView = userId === currentUserId;

      if (!user?.bVideoOn && !isSelfView) {
        console.warn(`⚠️ User ${userId} (${user?.displayName}) has video disabled. Cannot render video.`);
        console.warn(`🎥 User video status:`, { bVideoOn: user?.bVideoOn, userId, displayName: user?.displayName });
        return;
      }

      // For self-view, we might need to wait for video to be ready
      if (isSelfView && !user?.bVideoOn) {
        console.log(`🎥 Self-view detected, attempting to render even though bVideoOn is false (video might be starting)`);
      }

      console.log(`✅ User ${userId} ${isSelfView ? '(self)' : ''} proceeding with attachVideo...`);

      // Debug: Check video element state before rendering
      console.log(`🔍 Video element pre-render state:`, {
        element: videoElement.tagName,
        width: videoElement.width,
        height: videoElement.height,
        srcObject: videoElement.srcObject,
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        paused: videoElement.paused,
        muted: videoElement.muted,
        autoplay: videoElement.autoplay,
        playsInline: videoElement.playsInline
      });

      // Use attachVideo method for video elements (required by modern browsers)
      console.log(`🎬 Calling Zoom SDK attachVideo with exact parameters:`, {
        userIdNumber,
        videoElementTag: videoElement.tagName,
        videoQuality,
        streamAvailable: !!this.stream,
        attachVideoMethod: typeof this.stream.attachVideo
      });

      await this.stream.attachVideo(
        userIdNumber,        // userId as number
        videoElement,        // video element
        videoQuality         // video quality (VideoQuality enum)
      );

      // Debug: Check video element state after rendering
      console.log(`🔍 Video element post-render state:`, {
        element: videoElement.tagName,
        width: videoElement.width,
        height: videoElement.height,
        srcObject: videoElement.srcObject,
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        paused: videoElement.paused,
        muted: videoElement.muted,
        currentTime: videoElement.currentTime,
        duration: videoElement.duration
      });

      this.renderingParticipants.add(userId);
      this.videoCanvasMap.set(userId, videoElement as any);
      console.log(`✅ Successfully started video render for user ${userId}`);
    } catch (error) {
      console.error(`Error rendering video for user ${userId}:`, error);
      // Don't throw - let the fallback avatar show instead
    }
  }

  public async stopRenderVideo(userId: string, videoElement: HTMLVideoElement): Promise<void> {
    if (!this.stream) throw new Error('Stream not initialized');

    try {
      // Convert userId to number as required by Zoom SDK
      const userIdNumber = parseInt(userId, 10);
      console.log(`🛑 Stopping video render for user ${userId} (${userIdNumber})`);

      // Use detachVideo for video elements (corresponding to attachVideo)
      await this.stream.detachVideo(userIdNumber);
      this.renderingParticipants.delete(userId);
      this.videoCanvasMap.delete(userId);
      console.log(`✅ Successfully stopped video render for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error stopping video render for user ${userId}:`, error);
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

        // Convert participant ID to number for Zoom SDK
        const participantIdNumber = parseInt(participants[i], 10);
        await this.stream.renderVideo(
          canvas,
          participantIdNumber,
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
      const sessionInfo = this.client.getSessionInfo();

      console.log('📋 Getting all participants:', {
        totalUsers: users.length,
        currentUser: sessionInfo?.userId,
        userDetails: users.map(u => ({
          id: u.userId,
          name: u.displayName,
          bVideoOn: u.bVideoOn,
          muted: u.muted,
          isHost: u.isHost
        }))
      });

      const participants = users.map((user: ZoomParticipant) => {
        const participant = {
          id: user.userId,
          name: user.displayName || 'Unknown',
          isVideoOn: user.bVideoOn || false,
          isAudioOn: !user.muted,
          isHost: user.isHost || false,
          connectionQuality: this.getUserConnectionQuality(user.userId),
          hasRaisedHand: false,
          level: this.participantLevels.get(user.userId),
        };

        console.log(`👤 Participant ${participant.name} (${participant.id}):`, {
          isVideoOn: participant.isVideoOn,
          rawBVideoOn: user.bVideoOn,
          isAudioOn: participant.isAudioOn,
          rawMuted: user.muted,
          isHost: participant.isHost
        });

        return participant;
      });

      return participants;
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
    // Clean up video element
    const videoElement = this.videoCanvasMap.get(userId);
    if (videoElement && this.stream) {
      const userIdNumber = parseInt(userId, 10);
      this.stream.detachVideo(userIdNumber).catch(console.error);
    }

    // Clean up tracking maps
    this.videoCanvasMap.delete(userId);
    this.renderingParticipants.delete(userId);
    this.videoQualitySettings.delete(userId);
    this.participantLevels.delete(userId);
  }

  private async cleanup(): Promise<void> {
    // Stop all video renders
    for (const [userId, videoElement] of this.videoCanvasMap) {
      if (this.stream) {
        const userIdNumber = parseInt(userId, 10);
        await this.stream.detachVideo(userIdNumber).catch(console.error);
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