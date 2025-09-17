import React from 'react';
import { IVideoService } from '@core/interfaces/video-service/IVideoService';
import { Participant } from '@core/domain/entities/Participant';
import { ParticipantId } from '@core/domain/value-objects/ParticipantId';
import { ParticipantTile } from './ParticipantTile';

interface ParticipantGridProps {
  participants: Participant[];
  currentParticipant: Participant | null;
  spotlightedParticipant: Participant | null;
  viewMode: 'gallery' | 'speaker' | 'spotlight';
  videoService: IVideoService | null;
  isCoach: boolean;
  onSpotlightParticipant: (participantId: ParticipantId) => void;
  onMuteParticipant: (participantId: ParticipantId) => void;
  onRemoveParticipant: (participantId: ParticipantId) => void;
}

/**
 * Simple Participant Grid (Non-Virtualized)
 * Basic implementation for testing V2 architecture
 * TODO: Replace with virtualized version for production
 */
export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  currentParticipant,
  spotlightedParticipant,
  viewMode,
  videoService,
  isCoach,
  onSpotlightParticipant,
  onMuteParticipant,
  onRemoveParticipant
}) => {
  // Combine all participants including current participant
  const allParticipants = React.useMemo(() => {
    const combined = [...participants];
    if (currentParticipant && !combined.find(p => p.getId().equals(currentParticipant.getId()))) {
      combined.unshift(currentParticipant);
    }
    return combined;
  }, [participants, currentParticipant]);

  // Handle spotlight view mode
  if (viewMode === 'spotlight' && spotlightedParticipant) {
    return (
      <div className="participant-grid-container spotlight-mode">
        <div className="spotlight-participant">
          <ParticipantTile
            participant={spotlightedParticipant}
            isCurrentParticipant={currentParticipant?.getId().equals(spotlightedParticipant.getId()) || false}
            videoService={videoService}
            isCoach={isCoach}
            viewMode="spotlight"
            onSpotlight={() => onSpotlightParticipant(spotlightedParticipant.getId())}
            onMute={() => onMuteParticipant(spotlightedParticipant.getId())}
            onRemove={() => onRemoveParticipant(spotlightedParticipant.getId())}
          />
        </div>

        <div className="other-participants">
          {allParticipants
            .filter(p => !p.getId().equals(spotlightedParticipant.getId()))
            .slice(0, 6) // Show max 6 thumbnails
            .map(participant => (
              <div key={participant.getId().getValue()} className="thumbnail-participant">
                <ParticipantTile
                  participant={participant}
                  isCurrentParticipant={currentParticipant?.getId().equals(participant.getId()) || false}
                  videoService={videoService}
                  isCoach={isCoach}
                  viewMode="gallery"
                  onSpotlight={() => onSpotlightParticipant(participant.getId())}
                  onMute={() => onMuteParticipant(participant.getId())}
                  onRemove={() => onRemoveParticipant(participant.getId())}
                />
              </div>
            ))
          }
        </div>

        <style jsx>{`
          .participant-grid-container.spotlight-mode {
            display: flex;
            height: 100%;
            background: #1a1a1a;
          }

          .spotlight-participant {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px;
          }

          .other-participants {
            width: 200px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 20px;
            background: #2d2d2d;
            overflow-y: auto;
          }

          .thumbnail-participant {
            aspect-ratio: 16/9;
            border-radius: 8px;
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  // Gallery view mode
  return (
    <div className="participant-grid-container gallery-mode">
      <div className="participants-info">
        <span>Participants: {allParticipants.length}</span>
        <span>View: {viewMode}</span>
      </div>

      <div className="participants-grid">
        {allParticipants.map(participant => (
          <div key={participant.getId().getValue()} className="participant-slot">
            <ParticipantTile
              participant={participant}
              isCurrentParticipant={currentParticipant?.getId().equals(participant.getId()) || false}
              videoService={videoService}
              isCoach={isCoach}
              viewMode="gallery"
              onSpotlight={() => onSpotlightParticipant(participant.getId())}
              onMute={() => onMuteParticipant(participant.getId())}
              onRemove={() => onRemoveParticipant(participant.getId())}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .participant-grid-container.gallery-mode {
          height: 100%;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }

        .participants-info {
          display: flex;
          justify-content: space-between;
          color: #ccc;
          font-size: 14px;
          margin-bottom: 16px;
          padding: 8px 0;
          border-bottom: 1px solid #444;
        }

        .participants-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          grid-auto-rows: minmax(200px, auto);
          gap: 16px;
          overflow-y: auto;
        }

        .participant-slot {
          background: #2d2d2d;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #444;
          transition: all 0.2s ease;
        }

        .participant-slot:hover {
          border-color: #007bff;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .participants-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            grid-auto-rows: minmax(180px, auto);
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .participants-grid {
            grid-template-columns: 1fr;
            grid-auto-rows: minmax(200px, auto);
          }
        }
      `}</style>
    </div>
  );
};