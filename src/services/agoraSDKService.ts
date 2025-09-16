import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ClientRole,
  UID
} from 'agora-rtc-sdk-ng';

// Agora Event Handlers Interface
export interface AgoraEventHandlers {
  onUserJoined?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser, reason: string) => void;
  onUserPublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
  onUserUnpublished?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
  onConnectionStateChange?: (curState: string, revState: string, reason?: string) => void;
  onNetworkQuality?: (stats: any) => void;
  onError?: (error: any) => void;
}

export class AgoraSDKService {
  private client: IAgoraRTCClient | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private isInitialized = false;
  private eventHandlers: AgoraEventHandlers = {};
  private appId: string = '';
  private currentChannel: string = '';
  private currentUID: UID | null = null;

  constructor() {
    console.log('🚀 Agora SDK Service initializing...');
  }

  // Initialize Agora client
  public async initialize(appId: string, eventHandlers?: AgoraEventHandlers): Promise<void> {
    try {
      console.log('🔧 Initializing Agora RTC client...');

      this.appId = appId;
      this.eventHandlers = eventHandlers || {};

      // Create Agora client
      this.client = AgoraRTC.createClient({
        mode: 'rtc', // RTC mode allows all participants to publish/subscribe
        codec: 'vp8' // Use VP8 codec for better compatibility
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Agora RTC client initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Agora client:', error);
      throw error;
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    if (!this.client) return;

    // User joined channel
    this.client.on('user-joined', (user) => {
      console.log('👤 User joined:', user.uid);
      if (this.eventHandlers.onUserJoined) {
        this.eventHandlers.onUserJoined(user, 'audio');
      }
    });

    // User left channel
    this.client.on('user-left', (user, reason) => {
      console.log('👋 User left:', user.uid, 'Reason:', reason);
      if (this.eventHandlers.onUserLeft) {
        this.eventHandlers.onUserLeft(user, reason);
      }
    });

    // User published track
    this.client.on('user-published', async (user, mediaType) => {
      console.log('📡 User published:', user.uid, 'Media type:', mediaType);

      // Subscribe to the user's track
      await this.client!.subscribe(user, mediaType);
      console.log('✅ Subscribed to user:', user.uid, mediaType);

      if (this.eventHandlers.onUserPublished) {
        this.eventHandlers.onUserPublished(user, mediaType);
      }
    });

    // User unpublished track
    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('📴 User unpublished:', user.uid, 'Media type:', mediaType);
      if (this.eventHandlers.onUserUnpublished) {
        this.eventHandlers.onUserUnpublished(user, mediaType);
      }
    });

    // Connection state change
    this.client.on('connection-state-change', (curState, revState, reason) => {
      console.log('🔗 Connection state changed:', { curState, revState, reason });
      if (this.eventHandlers.onConnectionStateChange) {
        this.eventHandlers.onConnectionStateChange(curState, revState, reason);
      }
    });

    // Network quality monitoring with adaptive bitrate
    this.client.on('network-quality', (stats) => {
      const { uplinkNetworkQuality, downlinkNetworkQuality } = stats;

      // Log network quality
      console.log('📊 Network Quality:', {
        uplink: uplinkNetworkQuality,
        downlink: downlinkNetworkQuality,
        // Quality levels: 0 (unknown), 1 (excellent), 2 (good),
        // 3 (poor), 4 (bad), 5 (very bad), 6 (disconnected)
      });

      // Auto-adjust video quality based on network conditions
      if (uplinkNetworkQuality >= 4 || downlinkNetworkQuality >= 4) {
        console.warn('⚠️ Poor network quality detected, adjusting video settings...');

        // Reduce video quality for poor network
        if (this.localVideoTrack && this.localVideoTrack.enabled) {
          this.localVideoTrack.setEncoderConfiguration({
            width: 480,
            height: 360,
            frameRate: 15,
            bitrateMax: 500
          });
          console.log('📉 Video quality reduced for better stability');
        }
      } else if (uplinkNetworkQuality <= 2 && downlinkNetworkQuality <= 2) {
        // Restore video quality for good network
        if (this.localVideoTrack && this.localVideoTrack.enabled) {
          const role = this.client?.role || 'audience';
          if (role === 'host') {
            this.localVideoTrack.setEncoderConfiguration({
              width: 1280,
              height: 720,
              frameRate: 30,
              bitrateMax: 2500
            });
          } else {
            this.localVideoTrack.setEncoderConfiguration({
              width: 640,
              height: 480,
              frameRate: 24,
              bitrateMax: 1200
            });
          }
          console.log('📈 Video quality restored for good network');
        }
      }

      // Pass to event handler
      if (this.eventHandlers.onNetworkQuality) {
        this.eventHandlers.onNetworkQuality(stats);
      }
    });

    // Exception/Error handling
    this.client.on('exception', (error) => {
      console.error('🚨 Agora exception:', error);
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error);
      }
    });
  }

  // Join channel
  public async joinChannel(
    channel: string,
    token: string | null,
    uid: UID | null = null,
    role: ClientRole = 'host'
  ): Promise<UID> {
    if (!this.client || !this.isInitialized) {
      throw new Error('Agora client not initialized');
    }

    try {
      console.log('🚪 AgoraSDKService: Joining Agora channel:', { channel, uid, role });
      console.log('🔍 AgoraSDKService: Client state:', {
        clientExists: !!this.client,
        isInitialized: this.isInitialized,
        appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'MISSING',
        currentChannel: this.currentChannel,
        currentUID: this.currentUID
      });

      // In RTC mode, all users can publish/subscribe without role restrictions
      console.log('👑 AgoraSDKService: Using RTC mode - all users can publish/subscribe');

      // Join the channel
      console.log('🚀 AgoraSDKService: Calling client.join with:', {
        appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'MISSING',
        channel,
        token: token || 'null',
        uid: uid || 'null'
      });

      // Use provided token (null for testing mode, proper token for production)
      console.log('🔑 AgoraSDKService: Using token:', token ? `${token.substring(0, 20)}...` : 'testing mode (null token)');

      const assignedUID = await this.client.join(this.appId, channel, token, uid);

      this.currentChannel = channel;
      this.currentUID = assignedUID;

      console.log('✅ AgoraSDKService: Successfully joined channel:', channel, 'with UID:', assignedUID);
      return assignedUID;

    } catch (error) {
      console.error('❌ AgoraSDKService: Failed to join channel - DETAILED ERROR:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: typeof error,
        clientState: {
          exists: !!this.client,
          initialized: this.isInitialized,
          appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'MISSING'
        },
        joinParams: { channel, token, uid, role }
      });
      throw error;
    }
  }

  // Leave channel
  public async leaveChannel(): Promise<void> {
    try {
      console.log('🚪 Leaving Agora channel...');

      // Stop local tracks
      await this.stopLocalVideo();
      await this.stopLocalAudio();

      // Leave channel
      if (this.client) {
        await this.client.leave();
      }

      this.currentChannel = '';
      this.currentUID = null;

      console.log('✅ Successfully left channel');

    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
      throw error;
    }
  }

  // Start local video with role-based optimization
  public async startLocalVideo(role: 'host' | 'audience' = 'audience'): Promise<ICameraVideoTrack> {
    try {
      console.log('🎥 Starting local video for role:', role);

      if (this.localVideoTrack) {
        console.log('📹 Video track already exists, reusing...');
        return this.localVideoTrack;
      }

      // Role-based video configuration for fitness streaming
      const videoConfig = role === 'host' ? {
        // Coach configuration - high quality for instruction
        optimizationMode: 'detail' as const, // Better for stationary coaching position
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 30, // Smooth movement demonstration
          bitrateMin: 1000,
          bitrateMax: 2500
        }
      } : {
        // Student configuration - balanced for exercise
        optimizationMode: 'motion' as const, // Better for exercise movements
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 24, // Good balance for movement
          bitrateMin: 600,
          bitrateMax: 1200
        }
      };

      // Create camera video track with role-based config
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack(videoConfig);

      console.log('✅ Local video track created successfully with config:', videoConfig);

      // Publish if we're in a channel
      if (this.client && this.currentChannel) {
        await this.client.publish(this.localVideoTrack);
        console.log('📡 Local video published to channel');
      }

      return this.localVideoTrack;

    } catch (error) {
      console.error('❌ Failed to start local video:', error);
      throw error;
    }
  }

  // Stop local video
  public async stopLocalVideo(): Promise<void> {
    try {
      console.log('🛑 Stopping local video...');

      if (this.localVideoTrack) {
        // Unpublish if published
        if (this.client && this.currentChannel) {
          await this.client.unpublish(this.localVideoTrack);
          console.log('📴 Local video unpublished');
        }

        // Close the track
        this.localVideoTrack.close();
        this.localVideoTrack = null;
        console.log('✅ Local video track closed');
      }

    } catch (error) {
      console.error('❌ Failed to stop local video:', error);
      throw error;
    }
  }

  // Start local audio with role-based optimization
  public async startLocalAudio(role: 'host' | 'audience' = 'audience'): Promise<IMicrophoneAudioTrack> {
    try {
      console.log('🎤 Starting local audio for role:', role);

      if (this.localAudioTrack) {
        console.log('🔊 Audio track already exists, reusing...');
        return this.localAudioTrack;
      }

      // Role-based audio configuration for fitness classes
      const audioConfig = role === 'host' ? {
        // Coach configuration - high quality for instruction with music
        encoderConfig: 'music_high_quality_stereo', // Best quality for music + voice
        AEC: true,  // Acoustic Echo Cancellation
        ANS: true,  // Automatic Noise Suppression (moderate for music)
        AGC: true,  // Automatic Gain Control
        audioProfile: 'music_high_quality_stereo' as const
      } : {
        // Student configuration - optimized for voice feedback
        encoderConfig: 'speech_standard', // Optimized for voice
        AEC: true,  // Strong echo cancellation
        ANS: true,  // Strong noise suppression
        AGC: true   // Automatic gain control
      };

      // Create microphone audio track with role-based config
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioConfig);

      console.log('✅ Local audio track created successfully with config:', audioConfig);

      // Publish if we're in a channel
      if (this.client && this.currentChannel) {
        await this.client.publish(this.localAudioTrack);
        console.log('📡 Local audio published to channel');
      }

      return this.localAudioTrack;

    } catch (error) {
      console.error('❌ Failed to start local audio:', error);
      throw error;
    }
  }

  // Stop local audio
  public async stopLocalAudio(): Promise<void> {
    try {
      console.log('🛑 Stopping local audio...');

      if (this.localAudioTrack) {
        // Unpublish if published
        if (this.client && this.currentChannel) {
          await this.client.unpublish(this.localAudioTrack);
          console.log('📴 Local audio unpublished');
        }

        // Close the track
        this.localAudioTrack.close();
        this.localAudioTrack = null;
        console.log('✅ Local audio track closed');
      }

    } catch (error) {
      console.error('❌ Failed to stop local audio:', error);
      throw error;
    }
  }

  // Toggle local video
  public async toggleVideo(): Promise<boolean> {
    try {
      if (this.localVideoTrack) {
        const enabled = this.localVideoTrack.enabled;
        await this.localVideoTrack.setEnabled(!enabled);
        console.log('🎥 Video toggled:', !enabled);
        return !enabled;
      } else {
        // Start video if not started
        await this.startLocalVideo();
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
      throw error;
    }
  }

  // Toggle local audio
  public async toggleAudio(): Promise<boolean> {
    try {
      if (this.localAudioTrack) {
        const enabled = this.localAudioTrack.enabled;
        await this.localAudioTrack.setEnabled(!enabled);
        console.log('🎤 Audio toggled:', !enabled);
        return !enabled;
      } else {
        // Start audio if not started
        await this.startLocalAudio();
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to toggle audio:', error);
      throw error;
    }
  }

  // Play video track to HTML element
  public playVideoTrack(track: ICameraVideoTrack | IRemoteVideoTrack, element: HTMLElement): void {
    try {
      console.log('▶️ Playing video track to element:', element.tagName);
      track.play(element);
    } catch (error) {
      console.error('❌ Failed to play video track:', error);
      throw error;
    }
  }

  // Play audio track
  public playAudioTrack(track: IMicrophoneAudioTrack | IRemoteAudioTrack): void {
    try {
      console.log('▶️ Playing audio track');
      track.play();
    } catch (error) {
      console.error('❌ Failed to play audio track:', error);
      throw error;
    }
  }

  // Get all remote users
  public getRemoteUsers(): IAgoraRTCRemoteUser[] {
    if (!this.client) return [];
    return this.client.remoteUsers;
  }

  // Get local video track
  public getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  // Get local audio track
  public getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  // Get connection state
  public getConnectionState(): string {
    if (!this.client) return 'DISCONNECTED';
    return this.client.connectionState;
  }

  // Check if local video is enabled
  public isLocalVideoEnabled(): boolean {
    return this.localVideoTrack?.enabled ?? false;
  }

  // Check if local audio is enabled
  public isLocalAudioEnabled(): boolean {
    return this.localAudioTrack?.enabled ?? false;
  }

  // Get current channel
  public getCurrentChannel(): string {
    return this.currentChannel;
  }

  // Get current UID
  public getCurrentUID(): UID | null {
    return this.currentUID;
  }

  // Cleanup
  public async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Agora SDK...');

      await this.leaveChannel();

      this.client = null;
      this.isInitialized = false;
      this.eventHandlers = {};

      console.log('✅ Agora SDK cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const agoraService = new AgoraSDKService();