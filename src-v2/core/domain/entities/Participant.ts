import { ParticipantId } from '../value-objects/ParticipantId';
import { ConnectionQuality } from '../value-objects/ConnectionQuality';

export type ParticipantRole = 'coach' | 'student';
export type MediaState = 'enabled' | 'disabled';

export interface ParticipantData {
  id: ParticipantId;
  name: string;
  role: ParticipantRole;
  videoState: MediaState;
  audioState: MediaState;
  connectionQuality: ConnectionQuality;
  joinedAt: Date;
  lastActivity: Date;
  isActiveSpeaker: boolean;
  hasRaisedHand: boolean;
}

/**
 * Participant Domain Entity
 * Represents a person in a video session with all their state and behaviors
 */
export class Participant {
  private constructor(private data: ParticipantData) {}

  static create(
    id: ParticipantId,
    name: string,
    role: ParticipantRole
  ): Participant {
    return new Participant({
      id,
      name,
      role,
      videoState: 'disabled',
      audioState: 'disabled',
      connectionQuality: ConnectionQuality.unknown(),
      joinedAt: new Date(),
      lastActivity: new Date(),
      isActiveSpeaker: false,
      hasRaisedHand: false
    });
  }

  // Getters
  getId(): ParticipantId {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getRole(): ParticipantRole {
    return this.data.role;
  }

  isCoach(): boolean {
    return this.data.role === 'coach';
  }

  isStudent(): boolean {
    return this.data.role === 'student';
  }

  isVideoEnabled(): boolean {
    return this.data.videoState === 'enabled';
  }

  isAudioEnabled(): boolean {
    return this.data.audioState === 'enabled';
  }

  getConnectionQuality(): ConnectionQuality {
    return this.data.connectionQuality;
  }

  isActiveSpeaker(): boolean {
    return this.data.isActiveSpeaker;
  }

  hasRaisedHand(): boolean {
    return this.data.hasRaisedHand;
  }

  getJoinedAt(): Date {
    return this.data.joinedAt;
  }

  getSessionDuration(): number {
    return Date.now() - this.data.joinedAt.getTime();
  }

  // State mutations (return new instances - immutable)
  enableVideo(): Participant {
    return new Participant({
      ...this.data,
      videoState: 'enabled',
      lastActivity: new Date()
    });
  }

  disableVideo(): Participant {
    return new Participant({
      ...this.data,
      videoState: 'disabled',
      lastActivity: new Date()
    });
  }

  enableAudio(): Participant {
    return new Participant({
      ...this.data,
      audioState: 'enabled',
      lastActivity: new Date()
    });
  }

  disableAudio(): Participant {
    return new Participant({
      ...this.data,
      audioState: 'disabled',
      lastActivity: new Date()
    });
  }

  updateConnectionQuality(quality: ConnectionQuality): Participant {
    return new Participant({
      ...this.data,
      connectionQuality: quality,
      lastActivity: new Date()
    });
  }

  setActiveSpeaker(isActive: boolean): Participant {
    return new Participant({
      ...this.data,
      isActiveSpeaker: isActive,
      lastActivity: new Date()
    });
  }

  raiseHand(): Participant {
    return new Participant({
      ...this.data,
      hasRaisedHand: true,
      lastActivity: new Date()
    });
  }

  lowerHand(): Participant {
    return new Participant({
      ...this.data,
      hasRaisedHand: false,
      lastActivity: new Date()
    });
  }

  // Business rules
  canReceiveHighQualityVideo(): boolean {
    return this.data.connectionQuality.canReceiveHighQualityVideo();
  }

  shouldUseAudioOnly(): boolean {
    return this.data.connectionQuality.shouldUseAudioOnly();
  }

  canControlOthers(): boolean {
    return this.isCoach();
  }

  isInactive(): boolean {
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
    return Date.now() - this.data.lastActivity.getTime() > inactivityThreshold;
  }

  // Equality
  equals(other: Participant): boolean {
    return this.data.id.equals(other.data.id);
  }

  // Serialization for external layers
  toSnapshot(): ParticipantSnapshot {
    return {
      id: this.data.id.getValue(),
      name: this.data.name,
      role: this.data.role,
      isVideoEnabled: this.isVideoEnabled(),
      isAudioEnabled: this.isAudioEnabled(),
      connectionQuality: this.data.connectionQuality.getLevel(),
      joinedAt: this.data.joinedAt.toISOString(),
      isActiveSpeaker: this.data.isActiveSpeaker,
      hasRaisedHand: this.data.hasRaisedHand,
      sessionDuration: this.getSessionDuration()
    };
  }

  static fromSnapshot(snapshot: ParticipantSnapshot): Participant {
    return new Participant({
      id: ParticipantId.create(snapshot.id),
      name: snapshot.name,
      role: snapshot.role,
      videoState: snapshot.isVideoEnabled ? 'enabled' : 'disabled',
      audioState: snapshot.isAudioEnabled ? 'enabled' : 'disabled',
      connectionQuality: ConnectionQuality.fromNumber(
        snapshot.connectionQuality === 'excellent' ? 1 :
        snapshot.connectionQuality === 'good' ? 0.7 :
        snapshot.connectionQuality === 'fair' ? 0.5 :
        snapshot.connectionQuality === 'poor' ? 0.3 : 0
      ),
      joinedAt: new Date(snapshot.joinedAt),
      lastActivity: new Date(),
      isActiveSpeaker: snapshot.isActiveSpeaker,
      hasRaisedHand: snapshot.hasRaisedHand
    });
  }
}

// Data transfer object for external layers
export interface ParticipantSnapshot {
  id: string;
  name: string;
  role: ParticipantRole;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  connectionQuality: string;
  joinedAt: string;
  isActiveSpeaker: boolean;
  hasRaisedHand: boolean;
  sessionDuration: number;
}