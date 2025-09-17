import { SessionId } from '../value-objects/SessionId';
import { ParticipantId } from '../value-objects/ParticipantId';
import { Participant, ParticipantRole } from './Participant';

export type SessionStatus = 'waiting' | 'active' | 'ended';

export interface VideoSessionData {
  id: SessionId;
  name: string;
  status: SessionStatus;
  participants: Map<string, Participant>;
  coachId: ParticipantId | null;
  spotlightedParticipantId: ParticipantId | null;
  startedAt: Date | null;
  endedAt: Date | null;
  maxParticipants: number;
  allowLateJoin: boolean;
}

/**
 * VideoSession Domain Entity (Aggregate Root)
 * Manages the lifecycle and state of a video fitness session
 * Designed to scale to 1000+ participants efficiently
 */
export class VideoSession {
  private constructor(private data: VideoSessionData) {}

  static create(
    id: SessionId,
    name: string,
    maxParticipants: number = 1000
  ): VideoSession {
    return new VideoSession({
      id,
      name,
      status: 'waiting',
      participants: new Map(),
      coachId: null,
      spotlightedParticipantId: null,
      startedAt: null,
      endedAt: null,
      maxParticipants,
      allowLateJoin: true
    });
  }

  // Getters
  getId(): SessionId {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getStatus(): SessionStatus {
    return this.data.status;
  }

  getParticipantCount(): number {
    return this.data.participants.size;
  }

  getMaxParticipants(): number {
    return this.data.maxParticipants;
  }

  getCoach(): Participant | null {
    if (!this.data.coachId) return null;
    return this.data.participants.get(this.data.coachId.getValue()) || null;
  }

  getSpotlightedParticipant(): Participant | null {
    if (!this.data.spotlightedParticipantId) return null;
    return this.data.participants.get(this.data.spotlightedParticipantId.getValue()) || null;
  }

  getAllParticipants(): Participant[] {
    return Array.from(this.data.participants.values());
  }

  getStudents(): Participant[] {
    return this.getAllParticipants().filter(p => p.isStudent());
  }

  getActiveSpeakers(): Participant[] {
    return this.getAllParticipants()
      .filter(p => p.isActiveSpeaker())
      .slice(0, 6); // Max 6 active speakers for optimal performance
  }

  getParticipantsWithRaisedHands(): Participant[] {
    return this.getAllParticipants().filter(p => p.hasRaisedHand());
  }

  getSessionDuration(): number {
    if (!this.data.startedAt) return 0;
    const endTime = this.data.endedAt || new Date();
    return endTime.getTime() - this.data.startedAt.getTime();
  }

  // Participant management
  addParticipant(participant: Participant): VideoSession {
    if (!this.canAddParticipant(participant)) {
      throw new Error('Cannot add participant to session');
    }

    const newParticipants = new Map(this.data.participants);
    newParticipants.set(participant.getId().getValue(), participant);

    // If this is the first coach, set them as the coach
    let coachId = this.data.coachId;
    if (participant.isCoach() && !coachId) {
      coachId = participant.getId();
    }

    // Start session when coach joins
    let status = this.data.status;
    let startedAt = this.data.startedAt;
    if (participant.isCoach() && status === 'waiting') {
      status = 'active';
      startedAt = new Date();
    }

    return new VideoSession({
      ...this.data,
      participants: newParticipants,
      coachId,
      status,
      startedAt
    });
  }

  removeParticipant(participantId: ParticipantId): VideoSession {
    const newParticipants = new Map(this.data.participants);
    const participant = newParticipants.get(participantId.getValue());

    if (!participant) {
      return this; // Participant doesn't exist, no change needed
    }

    newParticipants.delete(participantId.getValue());

    // Update references
    let coachId = this.data.coachId;
    let spotlightedParticipantId = this.data.spotlightedParticipantId;
    let status = this.data.status;
    let endedAt = this.data.endedAt;

    // If coach leaves, end session or transfer coach role
    if (participant.isCoach()) {
      const remainingStudents = Array.from(newParticipants.values()).filter(p => p.isStudent());
      if (remainingStudents.length === 0) {
        status = 'ended';
        endedAt = new Date();
        coachId = null;
      } else {
        // Could implement coach transfer logic here
        status = 'ended';
        endedAt = new Date();
        coachId = null;
      }
    }

    // Clear spotlight if spotlighted participant leaves
    if (spotlightedParticipantId?.equals(participantId)) {
      spotlightedParticipantId = null;
    }

    return new VideoSession({
      ...this.data,
      participants: newParticipants,
      coachId,
      spotlightedParticipantId,
      status,
      endedAt
    });
  }

  updateParticipant(updatedParticipant: Participant): VideoSession {
    const participantId = updatedParticipant.getId().getValue();
    if (!this.data.participants.has(participantId)) {
      throw new Error('Participant not found in session');
    }

    const newParticipants = new Map(this.data.participants);
    newParticipants.set(participantId, updatedParticipant);

    return new VideoSession({
      ...this.data,
      participants: newParticipants
    });
  }

  // Session controls
  spotlightParticipant(participantId: ParticipantId): VideoSession {
    if (!this.data.participants.has(participantId.getValue())) {
      throw new Error('Cannot spotlight participant not in session');
    }

    return new VideoSession({
      ...this.data,
      spotlightedParticipantId: participantId
    });
  }

  clearSpotlight(): VideoSession {
    return new VideoSession({
      ...this.data,
      spotlightedParticipantId: null
    });
  }

  endSession(): VideoSession {
    if (this.data.status === 'ended') {
      return this; // Already ended
    }

    return new VideoSession({
      ...this.data,
      status: 'ended',
      endedAt: new Date()
    });
  }

  // Business rules
  canAddParticipant(participant: Participant): boolean {
    // Check session capacity
    if (this.data.participants.size >= this.data.maxParticipants) {
      return false;
    }

    // Check if session allows late join
    if (this.data.status === 'active' && !this.data.allowLateJoin) {
      return false;
    }

    // Don't allow joining ended sessions
    if (this.data.status === 'ended') {
      return false;
    }

    // Only one coach allowed
    if (participant.isCoach() && this.data.coachId) {
      return false;
    }

    // Check if participant already exists
    if (this.data.participants.has(participant.getId().getValue())) {
      return false;
    }

    return true;
  }

  canStart(): boolean {
    return this.data.status === 'waiting' && this.getCoach() !== null;
  }

  isActive(): boolean {
    return this.data.status === 'active';
  }

  isWaiting(): boolean {
    return this.data.status === 'waiting';
  }

  hasEnded(): boolean {
    return this.data.status === 'ended';
  }

  // Scaling optimizations
  getParticipantsPage(page: number, pageSize: number = 25): Participant[] {
    const participants = this.getAllParticipants();
    const start = page * pageSize;
    const end = start + pageSize;
    return participants.slice(start, end);
  }

  getHighPriorityParticipants(): Participant[] {
    // Coach + active speakers + raised hands for optimal rendering
    const coach = this.getCoach();
    const activeSpeakers = this.getActiveSpeakers();
    const raisedHands = this.getParticipantsWithRaisedHands();
    const spotlighted = this.getSpotlightedParticipant();

    const priorityParticipants = new Set<Participant>();

    if (coach) priorityParticipants.add(coach);
    if (spotlighted) priorityParticipants.add(spotlighted);
    activeSpeakers.forEach(p => priorityParticipants.add(p));
    raisedHands.forEach(p => priorityParticipants.add(p));

    return Array.from(priorityParticipants);
  }

  // Serialization
  toSnapshot(): VideoSessionSnapshot {
    return {
      id: this.data.id.getValue(),
      name: this.data.name,
      status: this.data.status,
      participantCount: this.getParticipantCount(),
      maxParticipants: this.data.maxParticipants,
      coachId: this.data.coachId?.getValue() || null,
      spotlightedParticipantId: this.data.spotlightedParticipantId?.getValue() || null,
      startedAt: this.data.startedAt?.toISOString() || null,
      endedAt: this.data.endedAt?.toISOString() || null,
      sessionDuration: this.getSessionDuration(),
      participants: this.getAllParticipants().map(p => p.toSnapshot())
    };
  }
}

export interface VideoSessionSnapshot {
  id: string;
  name: string;
  status: SessionStatus;
  participantCount: number;
  maxParticipants: number;
  coachId: string | null;
  spotlightedParticipantId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sessionDuration: number;
  participants: Array<any>; // ParticipantSnapshot[]
}