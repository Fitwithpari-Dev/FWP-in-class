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
        mode: 'rtc', // Real-time communication mode
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

    // Network quality
    this.client.on('network-quality', (stats) => {
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
      console.log('🚪 Joining Agora channel:', { channel, uid, role });

      // Set client role
      await this.client.setClientRole(role);

      // Join the channel
      const assignedUID = await this.client.join(this.appId, channel, token, uid);

      this.currentChannel = channel;
      this.currentUID = assignedUID;

      console.log('✅ Successfully joined channel:', channel, 'with UID:', assignedUID);
      return assignedUID;

    } catch (error) {
      console.error('❌ Failed to join channel:', error);
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

  // Start local video
  public async startLocalVideo(): Promise<ICameraVideoTrack> {
    try {
      console.log('🎥 Starting local video...');

      if (this.localVideoTrack) {
        console.log('📹 Video track already exists, reusing...');
        return this.localVideoTrack;
      }

      // Create camera video track
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        optimizationMode: 'motion', // Optimized for fitness/movement
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 15, // Good balance for fitness classes
          bitrateMin: 400,
          bitrateMax: 1000
        }
      });

      console.log('✅ Local video track created successfully');

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

  // Start local audio
  public async startLocalAudio(): Promise<IMicrophoneAudioTrack> {
    try {
      console.log('🎤 Starting local audio...');

      if (this.localAudioTrack) {
        console.log('🔊 Audio track already exists, reusing...');
        return this.localAudioTrack;
      }

      // Create microphone audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'music_standard', // Good quality for fitness instruction
        AEC: true, // Acoustic Echo Cancellation
        ANS: true, // Automatic Noise Suppression
        AGC: true  // Automatic Gain Control
      });

      console.log('✅ Local audio track created successfully');

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