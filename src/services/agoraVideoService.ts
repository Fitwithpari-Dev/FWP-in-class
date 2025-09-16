// Agora Video Service - Implements Unified Video Service Interface
// Wraps AgoraSDKService to provide consistent interface

import { IVideoService, VideoParticipant, ConnectionState, VideoServiceCapabilities, VideoServiceError, VIDEO_ERROR_CODES } from '../types/video-service';
import { UserRole } from '../types/fitness-platform';
import { agoraService } from './agoraSDKService';
import { generateChannelName } from '../config/agora.config';
import { getAgoraTokenService } from './agoraTokenService';

export class AgoraVideoService implements IVideoService {
  readonly serviceName = 'Agora RTC SDK';
  readonly capabilities: VideoServiceCapabilities = {
    maxParticipants: 50,
    supportsScreenShare: true,
    supportsRecording: true,
    supportsChat: false,
    name: 'Agora RTC SDK'
  };

  private participants: Map<string, VideoParticipant> = new Map();
  private currentUser: VideoParticipant | null = null;
  private connectionState: ConnectionState = 'Disconnected';
  private isVideoOn = false;
  private isAudioOn = false;
  private currentChannel = '';
  private localVideoTrack: any = null;

  // Event callbacks
  onParticipantJoined?: (participant: VideoParticipant) => void;
  onParticipantLeft?: (participant: VideoParticipant) => void;
  onVideoStateChanged?: (participantId: string, isVideoOn: boolean) => void;
  onAudioStateChanged?: (participantId: string, isAudioOn: boolean) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;

  async initialize(): Promise<void> {
    try {
      console.log('🚀 AgoraVideoService: Initializing...');

      const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
      console.log('🔧 AgoraVideoService: Agora App ID check:', {
        appId: agoraAppId ? `${agoraAppId.substring(0, 8)}...` : 'MISSING',
        appIdExists: !!agoraAppId,
        appIdLength: agoraAppId?.length || 0,
        envVars: Object.keys(import.meta.env).filter(key => key.includes('AGORA'))
      });

      if (!agoraAppId) {
        throw new Error('VITE_AGORA_APP_ID environment variable is not set');
      }

      console.log('🎯 AgoraVideoService: Initializing agoraService with App ID...');
      await agoraService.initialize(agoraAppId, {
        onUserJoined: (user, mediaType) => {
          console.log('👤 AgoraVideoService: User joined:', user.uid);

          const participant: VideoParticipant = {
            id: String(user.uid),
            name: `User ${user.uid}`,
            isHost: false,
            isVideoOn: !!user.videoTrack,
            isAudioOn: !!user.audioTrack,
            role: 'student' // Default, will be updated
          };

          this.participants.set(participant.id, participant);
          this.onParticipantJoined?.(participant);
        },

        onUserLeft: (user, reason) => {
          console.log('👋 AgoraVideoService: User left:', user.uid);

          const participant = this.participants.get(String(user.uid));
          if (participant) {
            this.participants.delete(String(user.uid));
            this.onParticipantLeft?.(participant);
          }
        },

        onUserPublished: (user, mediaType) => {
          console.log('📡 AgoraVideoService: User published:', user.uid, mediaType);

          const participant = this.participants.get(String(user.uid));
          if (participant) {
            if (mediaType === 'video') {
              participant.isVideoOn = true;
              this.onVideoStateChanged?.(participant.id, true);
            } else if (mediaType === 'audio') {
              participant.isAudioOn = true;
              this.onAudioStateChanged?.(participant.id, true);
            }
          }
        },

        onUserUnpublished: (user, mediaType) => {
          console.log('📴 AgoraVideoService: User unpublished:', user.uid, mediaType);

          const participant = this.participants.get(String(user.uid));
          if (participant) {
            if (mediaType === 'video') {
              participant.isVideoOn = false;
              this.onVideoStateChanged?.(participant.id, false);
            } else if (mediaType === 'audio') {
              participant.isAudioOn = false;
              this.onAudioStateChanged?.(participant.id, false);
            }
          }
        },

        onConnectionStateChange: (curState, revState, reason) => {
          console.log('🔗 AgoraVideoService: Connection state:', curState);

          // Map Agora states to unified states
          const stateMap: Record<string, ConnectionState> = {
            'DISCONNECTED': 'Disconnected',
            'CONNECTING': 'Connecting',
            'CONNECTED': 'Connected',
            'RECONNECTING': 'Connecting',
            'DISCONNECTING': 'Disconnected'
          };

          this.connectionState = stateMap[curState] || 'Disconnected';
          this.onConnectionStateChanged?.(this.connectionState);
        }
      });

      console.log('✅ AgoraVideoService: Initialized successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Initialization failed:', error);
      throw new VideoServiceError(
        'Failed to initialize Agora service',
        this.serviceName,
        VIDEO_ERROR_CODES.INITIALIZATION_FAILED,
        error
      );
    }
  }

  async joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void> {
    try {
      console.log('🚪 AgoraVideoService: Joining session:', { userName, userRole, sessionId });
      console.log('🔍 AgoraVideoService: Current state before join:', {
        isInitialized: this.connectionState !== 'Disconnected',
        currentChannel: this.currentChannel,
        participants: this.participants.size
      });

      this.currentChannel = generateChannelName(sessionId);
      console.log('📺 AgoraVideoService: Generated channel name:', this.currentChannel);

      // In RTC mode, all users are effectively hosts and can publish/subscribe
      // Role is passed for optimization purposes but doesn't restrict functionality
      const agoraRole = userRole === 'coach' ? 'host' : 'host'; // Set all as host for visibility
      console.log('📝 AgoraVideoService: Role mapping (RTC mode - all can publish):', { userRole, agoraRole });

      // Generate token using token service
      console.log('🔑 AgoraVideoService: Generating token...');
      const tokenService = getAgoraTokenService();

      let token: string | null;
      try {
        token = await tokenService.generateRtcToken({
          channelName: this.currentChannel,
          uid: null, // Let Agora assign UID
          role: agoraRole,
          expirationTimeInSeconds: 3600 // 1 hour
        });
        console.log('✅ AgoraVideoService: Token generated successfully');
      } catch (error) {
        console.warn('⚠️ AgoraVideoService: Token generation failed, using testing mode:', error);
        token = null; // Use null for testing mode (Agora requirement)
      }

      // Join the channel with correct Agora role and token
      console.log('🚀 AgoraVideoService: Attempting to join channel...');
      const uid = await agoraService.joinChannel(this.currentChannel, token, null, agoraRole);
      console.log('✅ AgoraVideoService: Successfully joined channel with UID:', uid);

      // Create current user participant
      this.currentUser = {
        id: String(uid),
        name: userName,
        isHost: userRole === 'coach',
        isVideoOn: false,
        isAudioOn: false,
        role: userRole
      };

      // Add to participants
      this.participants.set(this.currentUser.id, this.currentUser);

      this.connectionState = 'Connected';
      this.onConnectionStateChanged?.(this.connectionState);

      console.log('✅ AgoraVideoService: Joined session successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to join session - DETAILED ERROR:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: typeof error,
        agoraServiceState: {
          initialized: !!agoraService,
          currentChannel: this.currentChannel
        }
      });

      // Log additional context for debugging
      console.error('🔍 AgoraVideoService: Additional error context:', {
        userName: userName,
        userRole: userRole,
        sessionId: sessionId,
        generatedChannel: this.currentChannel,
        connectionState: this.connectionState
      });

      throw new VideoServiceError(
        `Failed to join session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.serviceName,
        VIDEO_ERROR_CODES.CONNECTION_FAILED,
        error
      );
    }
  }

  async leaveSession(): Promise<void> {
    try {
      console.log('🚪 AgoraVideoService: Leaving session...');

      await agoraService.leaveChannel();

      // Clean up state
      this.participants.clear();
      this.currentUser = null;
      this.currentChannel = '';
      this.isVideoOn = false;
      this.isAudioOn = false;
      this.connectionState = 'Disconnected';

      this.onConnectionStateChanged?.(this.connectionState);

      console.log('✅ AgoraVideoService: Left session successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to leave session:', error);
      throw new VideoServiceError(
        'Failed to leave session',
        this.serviceName,
        VIDEO_ERROR_CODES.CONNECTION_FAILED,
        error
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      console.log('🧹 AgoraVideoService: Destroying...');

      if (this.connectionState === 'Connected') {
        await this.leaveSession();
      }

      // Additional cleanup if needed
      this.participants.clear();
      this.currentUser = null;

      console.log('✅ AgoraVideoService: Destroyed successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Destroy failed:', error);
    }
  }

  async toggleVideo(): Promise<void> {
    if (this.isVideoOn) {
      await this.stopVideo();
    } else {
      await this.startVideo();
    }
  }

  async toggleAudio(): Promise<void> {
    if (this.isAudioOn) {
      await this.stopAudio();
    } else {
      await this.startAudio();
    }
  }

  async startVideo(): Promise<void> {
    try {
      console.log('🎥 AgoraVideoService: Starting video...');

      // Pass role to optimize video settings
      const role = this.currentUser?.role === 'coach' ? 'host' : 'audience';
      this.localVideoTrack = await agoraService.startLocalVideo(role);
      this.isVideoOn = true;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isVideoOn = true;
        this.onVideoStateChanged?.(this.currentUser.id, true);
      }

      console.log('✅ AgoraVideoService: Video started successfully with role:', role);
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to start video:', error);
      throw new VideoServiceError(
        'Failed to start video',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  async stopVideo(): Promise<void> {
    try {
      console.log('🛑 AgoraVideoService: Stopping video...');

      await agoraService.stopLocalVideo();
      this.localVideoTrack = null;
      this.isVideoOn = false;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isVideoOn = false;
        this.onVideoStateChanged?.(this.currentUser.id, false);
      }

      console.log('✅ AgoraVideoService: Video stopped successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to stop video:', error);
    }
  }

  async startAudio(): Promise<void> {
    try {
      console.log('🎤 AgoraVideoService: Starting audio...');

      // Pass role to optimize audio settings
      const role = this.currentUser?.role === 'coach' ? 'host' : 'audience';
      await agoraService.startLocalAudio(role);
      this.isAudioOn = true;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isAudioOn = true;
        this.onAudioStateChanged?.(this.currentUser.id, true);
      }

      console.log('✅ AgoraVideoService: Audio started successfully with role:', role);
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to start audio:', error);
      throw new VideoServiceError(
        'Failed to start audio',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  async stopAudio(): Promise<void> {
    try {
      console.log('🔇 AgoraVideoService: Stopping audio...');

      await agoraService.stopLocalAudio();
      this.isAudioOn = false;

      // Update current user state
      if (this.currentUser) {
        this.currentUser.isAudioOn = false;
        this.onAudioStateChanged?.(this.currentUser.id, false);
      }

      console.log('✅ AgoraVideoService: Audio stopped successfully');
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to stop audio:', error);
    }
  }

  isVideoEnabled(): boolean {
    return this.isVideoOn;
  }

  isAudioEnabled(): boolean {
    return this.isAudioOn;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getCurrentUser(): VideoParticipant | null {
    return this.currentUser;
  }

  getParticipants(): VideoParticipant[] {
    return Array.from(this.participants.values());
  }

  async renderVideo(participantId: string, element: HTMLElement): Promise<void> {
    try {
      console.log('🎬 AgoraVideoService: Rendering video for participant:', participantId);

      const participant = this.participants.get(participantId);
      if (!participant) {
        throw new Error(`Participant ${participantId} not found`);
      }

      // For local video (current user)
      if (this.currentUser && participantId === this.currentUser.id && this.localVideoTrack) {
        console.log('📹 AgoraVideoService: Rendering local video track');
        this.localVideoTrack.play(element);
        return;
      }

      // For remote video
      const remoteUsers = agoraService.getRemoteUsers();
      const remoteUser = remoteUsers.find(user => String(user.uid) === participantId);

      if (remoteUser && remoteUser.videoTrack) {
        console.log('📹 AgoraVideoService: Rendering remote video track for user:', remoteUser.uid);
        remoteUser.videoTrack.play(element);
        return;
      }

      console.warn('⚠️ AgoraVideoService: No video track found for participant:', participantId);
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to render video:', error);
      throw new VideoServiceError(
        'Failed to render video',
        this.serviceName,
        VIDEO_ERROR_CODES.DEVICE_NOT_FOUND,
        error
      );
    }
  }

  // Expose local video track for components
  getLocalVideoTrack() {
    return this.localVideoTrack;
  }

  // Expose remote users for components
  getRemoteUsers() {
    return agoraService.getRemoteUsers();
  }

  async stopRenderingVideo(participantId: string): Promise<void> {
    try {
      console.log('🛑 AgoraVideoService: Stopping video rendering for participant:', participantId);
      // Implementation would stop video rendering
    } catch (error) {
      console.error('❌ AgoraVideoService: Failed to stop video rendering:', error);
    }
  }
}