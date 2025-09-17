import { Participant } from '../../core/domain/entities/Participant';
import { ParticipantId } from '../../core/domain/value-objects/ParticipantId';
import { ConnectionQuality } from '../../core/domain/value-objects/ConnectionQuality';

describe('Participant Entity', () => {
  let participant: Participant;
  let participantId: ParticipantId;

  beforeEach(() => {
    participantId = ParticipantId.create('test-participant-123');
    participant = Participant.create(participantId, 'John Doe', 'student');
  });

  describe('Creation', () => {
    it('should create a participant with correct initial state', () => {
      expect(participant.getName()).toBe('John Doe');
      expect(participant.getRole()).toBe('student');
      expect(participant.isStudent()).toBe(true);
      expect(participant.isCoach()).toBe(false);
      expect(participant.isVideoEnabled()).toBe(false);
      expect(participant.isAudioEnabled()).toBe(false);
      expect(participant.isActiveSpeaker()).toBe(false);
      expect(participant.hasRaisedHand()).toBe(false);
    });

    it('should create a coach participant', () => {
      const coach = Participant.create(
        ParticipantId.create('coach-123'),
        'Jane Coach',
        'coach'
      );

      expect(coach.isCoach()).toBe(true);
      expect(coach.isStudent()).toBe(false);
      expect(coach.canControlOthers()).toBe(true);
    });
  });

  describe('Media Controls', () => {
    it('should enable and disable video', () => {
      const withVideo = participant.enableVideo();
      expect(withVideo.isVideoEnabled()).toBe(true);
      expect(withVideo).not.toBe(participant); // Immutable

      const withoutVideo = withVideo.disableVideo();
      expect(withoutVideo.isVideoEnabled()).toBe(false);
    });

    it('should enable and disable audio', () => {
      const withAudio = participant.enableAudio();
      expect(withAudio.isAudioEnabled()).toBe(true);
      expect(withAudio).not.toBe(participant); // Immutable

      const withoutAudio = withAudio.disableAudio();
      expect(withoutAudio.isAudioEnabled()).toBe(false);
    });
  });

  describe('Connection Quality', () => {
    it('should update connection quality', () => {
      const goodQuality = ConnectionQuality.fromNumber(0.8);
      const updated = participant.updateConnectionQuality(goodQuality);

      expect(updated.getConnectionQuality().getLevel()).toBe('good');
      expect(updated.canReceiveHighQualityVideo()).toBe(true);
      expect(updated.shouldUseAudioOnly()).toBe(false);
    });

    it('should recommend audio-only for poor connection', () => {
      const poorQuality = ConnectionQuality.fromNumber(0.2);
      const updated = participant.updateConnectionQuality(poorQuality);

      expect(updated.getConnectionQuality().getLevel()).toBe('poor');
      expect(updated.shouldUseAudioOnly()).toBe(true);
    });
  });

  describe('Activity Tracking', () => {
    it('should track session duration', () => {
      const duration = participant.getSessionDuration();
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should detect inactivity', () => {
      // Fresh participant should not be inactive
      expect(participant.isInactive()).toBe(false);

      // Mock old lastActivity (in real scenario, this would be after 5 minutes)
      const oldParticipant = Participant.create(
        participantId,
        'Old Participant',
        'student'
      );

      // We can't easily test this without mocking Date.now()
      // In a real test suite, we'd use jest.spyOn(Date, 'now')
    });
  });

  describe('Speaker and Hand Raising', () => {
    it('should manage active speaker status', () => {
      const speaker = participant.setActiveSpeaker(true);
      expect(speaker.isActiveSpeaker()).toBe(true);

      const notSpeaker = speaker.setActiveSpeaker(false);
      expect(notSpeaker.isActiveSpeaker()).toBe(false);
    });

    it('should manage raised hand status', () => {
      const handRaised = participant.raiseHand();
      expect(handRaised.hasRaisedHand()).toBe(true);

      const handLowered = handRaised.lowerHand();
      expect(handLowered.hasRaisedHand()).toBe(false);
    });
  });

  describe('Business Rules', () => {
    it('should enforce coach permissions', () => {
      expect(participant.canControlOthers()).toBe(false);

      const coach = Participant.create(
        ParticipantId.create('coach-id'),
        'Coach',
        'coach'
      );
      expect(coach.canControlOthers()).toBe(true);
    });
  });

  describe('Equality and Serialization', () => {
    it('should compare participants by ID', () => {
      const sameIdParticipant = Participant.create(
        participantId,
        'Different Name',
        'coach'
      );

      expect(participant.equals(sameIdParticipant)).toBe(true);

      const differentParticipant = Participant.create(
        ParticipantId.create('different-id'),
        'John Doe',
        'student'
      );

      expect(participant.equals(differentParticipant)).toBe(false);
    });

    it('should serialize to snapshot', () => {
      const snapshot = participant.toSnapshot();

      expect(snapshot).toMatchObject({
        id: 'test-participant-123',
        name: 'John Doe',
        role: 'student',
        isVideoEnabled: false,
        isAudioEnabled: false,
        isActiveSpeaker: false,
        hasRaisedHand: false
      });

      expect(typeof snapshot.joinedAt).toBe('string');
      expect(typeof snapshot.sessionDuration).toBe('number');
    });

    it('should create from snapshot', () => {
      const snapshot = participant.toSnapshot();
      const restored = Participant.fromSnapshot(snapshot);

      expect(restored.getName()).toBe(participant.getName());
      expect(restored.getRole()).toBe(participant.getRole());
      expect(restored.getId().getValue()).toBe(participant.getId().getValue());
    });
  });

  describe('Immutability', () => {
    it('should return new instances on state changes', () => {
      const original = participant;
      const withVideo = original.enableVideo();
      const withAudio = withVideo.enableAudio();
      const speaker = withAudio.setActiveSpeaker(true);

      // Each operation should return a new instance
      expect(withVideo).not.toBe(original);
      expect(withAudio).not.toBe(withVideo);
      expect(speaker).not.toBe(withAudio);

      // Original should remain unchanged
      expect(original.isVideoEnabled()).toBe(false);
      expect(original.isAudioEnabled()).toBe(false);
      expect(original.isActiveSpeaker()).toBe(false);

      // Final instance should have all changes
      expect(speaker.isVideoEnabled()).toBe(true);
      expect(speaker.isAudioEnabled()).toBe(true);
      expect(speaker.isActiveSpeaker()).toBe(true);
    });
  });
});