import { Observable } from 'rxjs';
import { ParticipantId } from '../../domain/value-objects/ParticipantId';
import { SessionId } from '../../domain/value-objects/SessionId';
import { Participant } from '../../domain/entities/Participant';

export type VideoServiceType = 'zoom' | 'agora' | 'webrtc';
export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra';
export type StreamType = 'camera' | 'screen' | 'audio-only';

// Configuration for video service initialization
export interface VideoServiceConfig {
  appId: string;
  appSecret?: string;
  serverUrl?: string;
  maxParticipants: number;
  enableLogging: boolean;
  region?: string;
}

// Request/Response types
export interface JoinSessionRequest {
  sessionId: SessionId;
  participantName: string;
  participantRole: 'coach' | 'student';
  videoEnabled?: boolean;
  audioEnabled?: boolean;
}

export interface SessionJoinResult {
  success: boolean;
  participant: Participant;
  sessionInfo: {
    participantCount: number;
    isRecording: boolean;
    sessionStartTime: Date;
  };
  error?: string;
}

// Event types for reactive programming
export interface ParticipantEvent {
  type: 'participant-joined' | 'participant-left' | 'participant-updated';
  participant: Participant;
  timestamp: Date;
}

export interface VideoEvent {
  type: 'video-enabled' | 'video-disabled' | 'video-quality-changed';
  participantId: ParticipantId;
  quality?: VideoQuality;
  timestamp: Date;
}

export interface AudioEvent {
  type: 'audio-enabled' | 'audio-disabled' | 'active-speaker-changed';
  participantId: ParticipantId;
  timestamp: Date;
}

export interface ConnectionEvent {
  type: 'connection-state-changed' | 'connection-quality-changed' | 'reconnecting' | 'reconnected';
  participantId?: ParticipantId;
  state?: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  quality?: number; // 0-1 scale
  timestamp: Date;
}

export interface ScalingEvent {
  type: 'participant-limit-reached' | 'selective-streaming-enabled' | 'performance-degradation';
  data: any;
  timestamp: Date;
}

// Service capabilities and metadata
export interface VideoServiceCapabilities {
  maxParticipants: number;
  supportsScreenShare: boolean;
  supportsRecording: boolean;
  supportsChat: boolean;
  supportsBreakoutRooms: boolean;
  supportsSelectiveStreaming: boolean;
  supportsLiveStreaming: boolean;
  supportedVideoQualities: VideoQuality[];
  supportedStreamTypes: StreamType[];
}

// Stream configuration for optimization
export interface StreamConfiguration {
  activeStreams: ParticipantId[];      // High quality video streams
  thumbnailStreams: ParticipantId[];   // Low quality thumbnail streams
  audioOnlyStreams: ParticipantId[];   // Audio only streams
}

/**
 * Main Video Service Interface
 * Designed for massive scalability (1000+ participants) with modular video service support
 */
export interface IVideoService {
  // Service metadata
  readonly serviceName: VideoServiceType;
  readonly capabilities: VideoServiceCapabilities;
  readonly isInitialized: boolean;

  // Core lifecycle methods
  initialize(config: VideoServiceConfig): Promise<void>;
  destroy(): Promise<void>;

  // Session management
  joinSession(request: JoinSessionRequest): Promise<SessionJoinResult>;
  leaveSession(): Promise<void>;

  // Participant management
  getCurrentParticipant(): Promise<Participant | null>;
  getParticipants(): Promise<Participant[]>;
  getParticipantCount(): Promise<number>;
  getParticipantById(id: ParticipantId): Promise<Participant | null>;

  // Media controls
  enableVideo(): Promise<void>;
  disableVideo(): Promise<void>;
  enableAudio(): Promise<void>;
  disableAudio(): Promise<void>;
  setVideoQuality(quality: VideoQuality): Promise<void>;

  // Advanced features
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  setActiveSpeaker(participantId: ParticipantId): Promise<void>;

  // Coach-specific controls
  muteParticipant(participantId: ParticipantId): Promise<void>;
  removeParticipant(participantId: ParticipantId): Promise<void>;
  spotlightParticipant(participantId: ParticipantId): Promise<void>;
  clearSpotlight(): Promise<void>;

  // Scaling optimizations for 1000+ participants
  enableSelectiveStreaming(config: StreamConfiguration): Promise<void>;
  setParticipantVideoLimit(limit: number): Promise<void>;
  enableAudioOnlyMode(): Promise<void>;
  getConnectionStatistics(): Promise<ConnectionStatistics>;

  // Video rendering for UI layer
  renderParticipantVideo(participantId: ParticipantId, element: HTMLElement): Promise<void>;
  stopRenderingVideo(participantId: ParticipantId): Promise<void>;

  // Recording (if supported)
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  // Event streams (reactive)
  participantEvents$: Observable<ParticipantEvent>;
  videoEvents$: Observable<VideoEvent>;
  audioEvents$: Observable<AudioEvent>;
  connectionEvents$: Observable<ConnectionEvent>;
  scalingEvents$: Observable<ScalingEvent>;
}

// Connection statistics for monitoring
export interface ConnectionStatistics {
  totalParticipants: number;
  activeVideoStreams: number;
  activeAudioStreams: number;
  averageConnectionQuality: number;
  bandwidthUsage: {
    upstream: number;    // KB/s
    downstream: number;  // KB/s
  };
  latencyStats: {
    average: number;     // ms
    min: number;         // ms
    max: number;         // ms
  };
  cpuUsage: number;      // percentage
  memoryUsage: number;   // MB
}