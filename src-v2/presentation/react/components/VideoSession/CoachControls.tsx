import React from 'react';
import { VideoSession } from '../../../core/domain/entities/VideoSession';
import { Participant } from '../../../core/domain/entities/Participant';
import { ParticipantId } from '../../../core/domain/value-objects/ParticipantId';
import { IVideoService } from '../../../core/interfaces/video-service/IVideoService';

interface CoachControlsProps {
  session: VideoSession;
  participants: Participant[];
  videoService: IVideoService | null;
  onSpotlightParticipant: (participantId: ParticipantId) => void;
  onClearSpotlight: () => void;
  onMuteParticipant: (participantId: ParticipantId) => void;
  onRemoveParticipant: (participantId: ParticipantId) => void;
}

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
  const participantsWithRaisedHands = session.getParticipantsWithRaisedHands();
  
  return (
    <div className="coach-controls">
      <div className="coach-section">
        <h4>Coach Controls</h4>
        
        {spotlightedParticipant ? (
          <div className="spotlight-info">
            <span>Spotlight: {spotlightedParticipant.getName()}</span>
            <button onClick={onClearSpotlight} className="clear-spotlight-btn">
              Clear
            </button>
          </div>
        ) : (
          <span className="no-spotlight">No participant spotlighted</span>
        )}
        
        {participantsWithRaisedHands.length > 0 && (
          <div className="raised-hands">
            <span>✋ {participantsWithRaisedHands.length} raised hands</span>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .coach-controls {
          background: #2d2d2d;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #444;
        }
        
        .coach-section h4 {
          margin: 0 0 8px 0;
          color: #ffd700;
          font-size: 14px;
        }
        
        .spotlight-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .clear-spotlight-btn {
          background: #dc3545;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .no-spotlight {
          color: #888;
          font-size: 12px;
        }
        
        .raised-hands {
          color: #ffd700;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};