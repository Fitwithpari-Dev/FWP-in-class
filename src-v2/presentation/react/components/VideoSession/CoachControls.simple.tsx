import React from 'react';
import { IVideoService } from '@core/interfaces/video-service/IVideoService';
import { VideoSession } from '@core/domain/entities/VideoSession';
import { Participant } from '@core/domain/entities/Participant';
import { ParticipantId } from '@core/domain/value-objects/ParticipantId';

interface CoachControlsProps {
  session: VideoSession;
  participants: Participant[];
  videoService: IVideoService | null;
  onSpotlightParticipant: (participantId: ParticipantId) => Promise<void>;
  onClearSpotlight: () => Promise<void>;
  onMuteParticipant: (participantId: ParticipantId) => Promise<void>;
  onRemoveParticipant: (participantId: ParticipantId) => Promise<void>;
}

/**
 * Simple Coach Controls Component
 * Basic coaching controls for testing V2 architecture
 */
export const CoachControls: React.FC<CoachControlsProps> = ({
  session,
  participants,
  videoService,
  onSpotlightParticipant,
  onClearSpotlight,
  onMuteParticipant,
  onRemoveParticipant
}) => {
  const spotlightedParticipant = session.getSpotlightedParticipant();

  return (
    <div className="coach-controls">
      <div className="coach-section">
        <h4>Coach Controls</h4>

        <div className="participants-list">
          <div className="section-header">
            Participants ({participants.length})
          </div>

          {participants.slice(0, 5).map(participant => (
            <div key={participant.getId().getValue()} className="participant-item">
              <span className="participant-name">
                {participant.getName()}
                {participant.getRole() === 'coach' && ' 👨‍🏫'}
              </span>

              <div className="participant-controls">
                <button
                  className="mini-btn"
                  onClick={() => onSpotlightParticipant(participant.getId())}
                  title="Spotlight"
                  disabled={spotlightedParticipant?.getId().equals(participant.getId())}
                >
                  ⭐
                </button>
                <button
                  className="mini-btn"
                  onClick={() => onMuteParticipant(participant.getId())}
                  title="Mute"
                >
                  🔇
                </button>
                <button
                  className="mini-btn danger"
                  onClick={() => onRemoveParticipant(participant.getId())}
                  title="Remove"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}

          {participants.length > 5 && (
            <div className="more-participants">
              +{participants.length - 5} more participants
            </div>
          )}
        </div>

        {spotlightedParticipant && (
          <div className="spotlight-section">
            <div className="spotlight-info">
              Spotlighted: {spotlightedParticipant.getName()}
            </div>
            <button
              className="control-btn"
              onClick={onClearSpotlight}
            >
              Clear Spotlight
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .coach-controls {
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 16px;
          max-width: 300px;
        }

        .coach-section h4 {
          margin: 0 0 12px 0;
          color: #007bff;
          font-size: 14px;
          font-weight: 600;
        }

        .section-header {
          color: #ccc;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #444;
        }

        .participants-list {
          margin-bottom: 12px;
        }

        .participant-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #333;
        }

        .participant-item:last-child {
          border-bottom: none;
        }

        .participant-name {
          color: white;
          font-size: 12px;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .participant-controls {
          display: flex;
          gap: 4px;
        }

        .mini-btn {
          background: #444;
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.2s ease;
        }

        .mini-btn:hover:not(:disabled) {
          background: #555;
        }

        .mini-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mini-btn.danger:hover {
          background: #dc3545;
        }

        .more-participants {
          color: #888;
          font-size: 11px;
          text-align: center;
          padding: 4px 0;
          font-style: italic;
        }

        .spotlight-section {
          background: #2d2d2d;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #ffd700;
        }

        .spotlight-info {
          color: #ffd700;
          font-size: 12px;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .control-btn {
          background: #007bff;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          width: 100%;
        }

        .control-btn:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
};