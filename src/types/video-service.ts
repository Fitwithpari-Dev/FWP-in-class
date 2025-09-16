// Unified Video Service Interface
// Both Zoom and Agora services implement this interface

import { UserRole } from './fitness-platform';

// Unified participant interface
export interface VideoParticipant {
  id: string;
  name: string;
  isHost: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  role: UserRole;
  avatar?: string;
}

// Video track types (generic across services)
export type VideoTrack = any; // Will be ICameraVideoTrack for Agora, HTMLVideoElement for Zoom
export type AudioTrack = any; // Will be IMicrophoneAudioTrack for Agora, HTMLAudioElement for Zoom

// Connection states (normalized across services)
export type ConnectionState = 'Connecting' | 'Connected' | 'Disconnected' | 'Failed' | 'Closed';

// Video service capabilities
export interface VideoServiceCapabilities {
  maxParticipants: number;
  supportsScreenShare: boolean;
  supportsRecording: boolean;
  supportsChat: boolean;
  name: string;
}

// Unified Video Service Interface
export interface IVideoService {
  // Service identification
  readonly serviceName: string;
  readonly capabilities: VideoServiceCapabilities;

  // Connection management
  initialize(): Promise<void>;
  joinSession(userName: string, userRole: UserRole, sessionId: string): Promise<void>;
  leaveSession(): Promise<void>;
  destroy(): Promise<void>;

  // Media controls
  toggleVideo(): Promise<void>;
  toggleAudio(): Promise<void>;
  startVideo(): Promise<void>;
  stopVideo(): Promise<void>;
  startAudio(): Promise<void>;
  stopAudio(): Promise<void>;

  // State getters
  isVideoEnabled(): boolean;
  isAudioEnabled(): boolean;
  getConnectionState(): ConnectionState;
  getCurrentUser(): VideoParticipant | null;
  getParticipants(): VideoParticipant[];

  // Video rendering
  renderVideo(participantId: string, element: HTMLElement): Promise<void>;
  stopRenderingVideo(participantId: string): Promise<void>;

  // Event callbacks (optional - services can override)
  onParticipantJoined?: (participant: VideoParticipant) => void;
  onParticipantLeft?: (participant: VideoParticipant) => void;
  onVideoStateChanged?: (participantId: string, isVideoOn: boolean) => void;
  onAudioStateChanged?: (participantId: string, isAudioOn: boolean) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

// Service factory type
export type VideoServiceFactory = () => IVideoService;

// Service provider configuration
export interface VideoServiceConfig {
  primary: VideoServiceFactory;
  fallback: VideoServiceFactory;
  primaryName: string;
  fallbackName: string;
}

// Error types specific to video services
export class VideoServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly code?: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'VideoServiceError';
  }
}

// Service-specific error codes
export const VIDEO_ERROR_CODES = {
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_SESSION: 'INVALID_SESSION'
} as const;

export type VideoErrorCode = typeof VIDEO_ERROR_CODES[keyof typeof VIDEO_ERROR_CODES];