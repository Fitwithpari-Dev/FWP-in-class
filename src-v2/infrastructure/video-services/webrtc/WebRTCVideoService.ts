import { Observable, Subject } from 'rxjs';
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
import { Participant } from '../../../core/domain/entities/Participant';

/**
 * Native WebRTC Video Service Implementation
 * Direct peer-to-peer implementation for small group sessions
 * Suitable for up to 50 participants with mesh topology
 */
export class WebRTCVideoService implements IVideoService {
  readonly serviceName: VideoServiceType = 'webrtc';
  readonly capabilities: VideoServiceCapabilities = {
    maxParticipants: 50,
    supportsScreenShare: true,
    supportsRecording: false,
    supportsChat: false,
    supportsBreakoutRooms: false,
    supportsSelectiveStreaming: false,
    supportsLiveStreaming: false,
    supportedVideoQualities: ['low', 'medium', 'high'],
    supportedStreamTypes: ['camera', 'screen', 'audio-only']
  };

  private _isInitialized = false;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private currentParticipant: Participant | null = null;
  private participantsMap: Map<string, Participant> = new Map();
  private config: VideoServiceConfig | null = null;
  private signalingSocket: WebSocket | null = null;

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

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(config: VideoServiceConfig): Promise<void> {
    try {
      this.config = config;

      // Connect to signaling server
      if (config.serverUrl) {
        await this.connectToSignalingServer(config.serverUrl);
      }

      this._isInitialized = true;

      if (config.enableLogging) {
        console.log('[WebRTCVideoService] Initialized successfully');
      }
    } catch (error) {
      console.error('[WebRTCVideoService] Initialization failed:', error);
      throw new Error(`Failed to initialize WebRTC Video Service: ${error}`);
    }
  }

  async destroy(): Promise<void> {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close all peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();

      // Close signaling connection
      if (this.signalingSocket) {
        this.signalingSocket.close();
        this.signalingSocket = null;
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
      console.error('[WebRTCVideoService] Destroy failed:', error);
      throw error;
    }
  }

  async joinSession(request: JoinSessionRequest): Promise<SessionJoinResult> {
    try {
      if (!this._isInitialized) {
        throw new Error('Service not initialized');
      }

      // Create local participant
      this.currentParticipant = Participant.create(
        ParticipantId.create(this.generateUniqueId()),
        request.participantName,
        request.participantRole
      );

      // Get user media
      if (request.videoEnabled || request.audioEnabled) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: request.videoEnabled,
          audio: request.audioEnabled
        });
      }

      // Join signaling channel
      this.sendSignalingMessage({
        type: 'join-session',
        sessionId: request.sessionId.getValue(),
        participantId: this.currentParticipant.getId().getValue(),
        participantName: request.participantName,
        participantRole: request.participantRole
      });

      const sessionInfo = {
        participantCount: await this.getParticipantCount(),
        isRecording: false,
        sessionStartTime: new Date()
      };

      return {
        success: true,
        participant: this.currentParticipant,
        sessionInfo
      };
    } catch (error) {
      return {
        success: false,
        participant: this.currentParticipant!,
        sessionInfo: {
          participantCount: 0,
          isRecording: false,
          sessionStartTime: new Date()
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async leaveSession(): Promise<void> {
    if (this.signalingSocket && this.currentParticipant) {
      this.sendSignalingMessage({
        type: 'leave-session',
        participantId: this.currentParticipant.getId().getValue()
      });
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.participantsMap.clear();
    this.currentParticipant = null;
  }

  async getCurrentParticipant(): Promise<Participant | null> {
    return this.currentParticipant;
  }

  async getParticipants(): Promise<Participant[]> {
    return Array.from(this.participantsMap.values());
  }

  async getParticipantCount(): Promise<number> {
    return this.participantsMap.size + (this.currentParticipant ? 1 : 0);
  }

  async getParticipantById(id: ParticipantId): Promise<Participant | null> {
    return this.participantsMap.get(id.getValue()) || null;
  }

  // Media controls
  async enableVideo(): Promise<void> {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else if (!this.localStream.getVideoTracks().length) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.localStream.addTrack(videoStream.getVideoTracks()[0]);
      }

      // Enable video track
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });

      // Add track to all peer connections
      this.peerConnections.forEach(pc => {
        this.localStream!.getVideoTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      });

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableVideo();
        this.videoSubject.next({
          type: 'video-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[WebRTCVideoService] Enable video failed:', error);
      throw error;
    }
  }

  async disableVideo(): Promise<void> {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
    }

    if (this.currentParticipant) {
      this.currentParticipant = this.currentParticipant.disableVideo();
      this.videoSubject.next({
        type: 'video-disabled',
        participantId: this.currentParticipant.getId(),
        timestamp: new Date()
      });
    }
  }

  async enableAudio(): Promise<void> {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } else if (!this.localStream.getAudioTracks().length) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this.localStream.addTrack(audioStream.getAudioTracks()[0]);
      }

      // Enable audio track
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });

      // Add track to all peer connections
      this.peerConnections.forEach(pc => {
        this.localStream!.getAudioTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      });

      if (this.currentParticipant) {
        this.currentParticipant = this.currentParticipant.enableAudio();
        this.audioSubject.next({
          type: 'audio-enabled',
          participantId: this.currentParticipant.getId(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[WebRTCVideoService] Enable audio failed:', error);
      throw error;
    }
  }

  async disableAudio(): Promise<void> {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }

    if (this.currentParticipant) {
      this.currentParticipant = this.currentParticipant.disableAudio();
      this.audioSubject.next({
        type: 'audio-disabled',
        participantId: this.currentParticipant.getId(),
        timestamp: new Date()
      });
    }
  }

  async setVideoQuality(quality: VideoQuality): Promise<void> {
    if (!this.localStream) return;

    const constraints = {
      low: { width: 320, height: 240, frameRate: 15 },
      medium: { width: 640, height: 480, frameRate: 24 },
      high: { width: 1280, height: 720, frameRate: 30 }
    };

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints(constraints[quality]);
    }
  }

  // Advanced features (basic implementations)
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

      // Replace video track in peer connections
      this.peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });
    } catch (error) {
      console.error('[WebRTCVideoService] Screen share failed:', error);
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.localStream) return;

    // Replace screen share track back to camera
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      this.peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
    }
  }

  async setActiveSpeaker(participantId: ParticipantId): Promise<void> {
    // Basic implementation - just update participant state
    const participant = this.participantsMap.get(participantId.getValue());
    if (participant) {
      const updatedParticipant = participant.setActiveSpeaker(true);
      this.participantsMap.set(participantId.getValue(), updatedParticipant);
    }
  }

  // Coach controls (limited in P2P WebRTC)
  async muteParticipant(participantId: ParticipantId): Promise<void> {
    throw new Error('Peer-to-peer WebRTC does not support remote participant control');
  }

  async removeParticipant(participantId: ParticipantId): Promise<void> {
    // Close connection to specific participant
    const pc = this.peerConnections.get(participantId.getValue());
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId.getValue());
      this.participantsMap.delete(participantId.getValue());
    }
  }

  async spotlightParticipant(participantId: ParticipantId): Promise<void> {
    // UI-level implementation
  }

  async clearSpotlight(): Promise<void> {
    // UI-level implementation
  }

  // Scaling optimizations (limited for WebRTC)
  async enableSelectiveStreaming(config: StreamConfiguration): Promise<void> {
    throw new Error('Selective streaming not supported in basic WebRTC implementation');
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
    // Disable all video tracks
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  async getConnectionStatistics(): Promise<ConnectionStatistics> {
    const stats: ConnectionStatistics = {
      totalParticipants: this.participantsMap.size + 1,
      activeVideoStreams: 0,
      activeAudioStreams: 0,
      averageConnectionQuality: 0,
      bandwidthUsage: { upstream: 0, downstream: 0 },
      latencyStats: { average: 0, min: 0, max: 0 },
      cpuUsage: 0,
      memoryUsage: 0
    };

    // Gather stats from peer connections
    const statPromises = Array.from(this.peerConnections.values()).map(pc => pc.getStats());
    const allStats = await Promise.all(statPromises);

    // Basic aggregation (simplified)
    let totalRTT = 0;
    let connectionCount = 0;

    allStats.forEach(pcStats => {
      pcStats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime) {
            totalRTT += report.currentRoundTripTime * 1000; // Convert to ms
            connectionCount++;
          }
        }
      });
    });

    if (connectionCount > 0) {
      stats.averageConnectionQuality = 0.7; // Estimated
      stats.latencyStats.average = totalRTT / connectionCount;
    }

    return stats;
  }

  // Video rendering
  async renderParticipantVideo(participantId: ParticipantId, element: HTMLElement): Promise<void> {
    // For local participant
    if (this.currentParticipant?.getId().getValue() === participantId.getValue()) {
      if (this.localStream) {
        (element as HTMLVideoElement).srcObject = this.localStream;
      }
      return;
    }

    // For remote participants - would need to track remote streams
    // This is a simplified implementation
  }

  async stopRenderingVideo(participantId: ParticipantId): Promise<void> {
    // Implementation would stop rendering specific participant's video
  }

  // Recording not supported
  async startRecording(): Promise<void> {
    throw new Error('Recording not supported in basic WebRTC implementation');
  }

  async stopRecording(): Promise<void> {
    throw new Error('Recording not supported in basic WebRTC implementation');
  }

  // Private helper methods
  private async connectToSignalingServer(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalingSocket = new WebSocket(serverUrl);

      this.signalingSocket.onopen = () => {
        this.setupSignalingHandlers();
        resolve();
      };

      this.signalingSocket.onerror = (error) => {
        reject(error);
      };
    });
  }

  private setupSignalingHandlers(): void {
    if (!this.signalingSocket) return;

    this.signalingSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'participant-joined':
          await this.handleParticipantJoined(message);
          break;
        case 'participant-left':
          this.handleParticipantLeft(message);
          break;
        case 'offer':
          await this.handleOffer(message);
          break;
        case 'answer':
          await this.handleAnswer(message);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(message);
          break;
      }
    };
  }

  private async handleParticipantJoined(message: any): Promise<void> {
    const participant = Participant.create(
      ParticipantId.create(message.participantId),
      message.participantName,
      message.participantRole
    );

    this.participantsMap.set(message.participantId, participant);

    // Create peer connection for new participant
    await this.createPeerConnection(message.participantId);

    this.participantSubject.next({
      type: 'participant-joined',
      participant,
      timestamp: new Date()
    });
  }

  private handleParticipantLeft(message: any): void {
    const participant = this.participantsMap.get(message.participantId);
    if (participant) {
      this.participantsMap.delete(message.participantId);

      const pc = this.peerConnections.get(message.participantId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(message.participantId);
      }

      this.participantSubject.next({
        type: 'participant-left',
        participant,
        timestamp: new Date()
      });
    }
  }

  private async createPeerConnection(participantId: string): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          participantId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      // Handle incoming remote stream
      console.log('Received remote stream from:', participantId);
    };

    this.peerConnections.set(participantId, pc);
  }

  private async handleOffer(message: any): Promise<void> {
    const pc = this.peerConnections.get(message.fromParticipantId);
    if (pc) {
      await pc.setRemoteDescription(message.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        toParticipantId: message.fromParticipantId,
        answer
      });
    }
  }

  private async handleAnswer(message: any): Promise<void> {
    const pc = this.peerConnections.get(message.fromParticipantId);
    if (pc) {
      await pc.setRemoteDescription(message.answer);
    }
  }

  private async handleIceCandidate(message: any): Promise<void> {
    const pc = this.peerConnections.get(message.fromParticipantId);
    if (pc) {
      await pc.addIceCandidate(message.candidate);
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}