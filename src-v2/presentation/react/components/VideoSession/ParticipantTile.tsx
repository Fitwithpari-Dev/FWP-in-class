import React, { useEffect, useRef, useState } from 'react';
import { IVideoService } from '../../../core/interfaces/video-service/IVideoService';
import { Participant } from '../../../core/domain/entities/Participant';
import { ParticipantId } from '../../../core/domain/value-objects/ParticipantId';

interface ParticipantTileProps {
  participant: Participant;
  isCurrentParticipant: boolean;
  videoService: IVideoService | null;
  isCoach: boolean;
  viewMode: 'gallery' | 'speaker' | 'spotlight';
  onSpotlight: () => void;
  onMute: () => void;
  onRemove: () => void;
}

/**
 * Individual Participant Video Tile
 * Renders participant video with controls and status indicators
 */
export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isCurrentParticipant,
  videoService,
  isCoach,
  viewMode,
  onSpotlight,
  onMute,
  onRemove
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoRendering, setIsVideoRendering] = useState(false);

  // Render participant video
  useEffect(() => {
    if (!videoService || !videoRef.current) {
      setIsVideoRendering(false);
      return;
    }

    const renderVideo = async () => {
      try {
        console.log('[ParticipantTile] Attempting to render video for:', {
          participantId: participant.getId().getValue(),
          participantName: participant.getName(),
          isVideoEnabled: participant.isVideoEnabled(),
          isCurrentParticipant,
          hasVideoRef: !!videoRef.current
        });

        // Always attempt to render - let the video service handle the video state
        await videoService.renderParticipantVideo(
          participant.getId(),
          videoRef.current!
        );
        setIsVideoRendering(true);

        console.log('[ParticipantTile] ✅ Successfully rendered video for:', participant.getName());
      } catch (error) {
        console.warn('[ParticipantTile] Failed to render video for participant:', {
          participantName: participant.getName(),
          participantId: participant.getId().getValue(),
          error,
          isVideoEnabled: participant.isVideoEnabled()
        });
        setIsVideoRendering(false);
      }
    };

    // Always try to render, regardless of video enabled state
    // The video service should handle showing/hiding based on actual stream availability
    renderVideo();

    return () => {
      if (videoService && isVideoRendering) {
        console.log('[ParticipantTile] Cleaning up video rendering for:', participant.getName());
        videoService.stopRenderingVideo(participant.getId()).catch(console.warn);
      }
    };
  }, [participant.getId().getValue(), participant.isVideoEnabled(), videoService, isCurrentParticipant]);

  const connectionQuality = participant.getConnectionQuality();
  const qualityColor = {
    excellent: '#00ff00',
    good: '#ffff00',
    fair: '#ffa500',
    poor: '#ff0000',
    unknown: '#666'
  }[connectionQuality.getLevel()];

  return (
    <div
      className={`participant-tile ${
        isCurrentParticipant ? 'current-participant' : ''
      } ${
        participant.isActiveSpeaker() ? 'active-speaker' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Container */}
      <div className="video-container">
        {/* Always show video element for rendering, but show placeholder when disabled */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentParticipant}
          className="participant-video"
          style={{
            display: participant.isVideoEnabled() && isVideoRendering ? 'block' : 'none'
          }}
        />

        {/* Show placeholder when video is disabled or not rendering */}
        {(!participant.isVideoEnabled() || !isVideoRendering) && (
          <div className="video-placeholder">
            <div className="participant-avatar">
              {participant.getName().charAt(0).toUpperCase()}
            </div>
            <div className="video-status">
              {!participant.isVideoEnabled() ? 'Camera Off' : 'Connecting...'}
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="status-indicators">
          {/* Connection Quality */}
          <div 
            className="connection-indicator"
            style={{ backgroundColor: qualityColor }}
            title={`Connection: ${connectionQuality.getLevel()}`}
          />

          {/* Audio Status */}
          {!participant.isAudioEnabled() && (
            <div className="audio-indicator muted" title="Muted">
              🔇
            </div>
          )}

          {/* Active Speaker */}
          {participant.isActiveSpeaker() && (
            <div className="audio-indicator speaking" title="Speaking">
              🎤
            </div>
          )}

          {/* Raised Hand */}
          {participant.hasRaisedHand() && (
            <div className="hand-indicator" title="Hand Raised">
              ✋
            </div>
          )}

          {/* Coach Badge */}
          {participant.isCoach() && (
            <div className="coach-badge" title="Coach">
              👨‍🏫
            </div>
          )}
        </div>

        {/* Control Overlay (visible on hover for coaches) */}
        {isCoach && !isCurrentParticipant && isHovered && (
          <div className="control-overlay">
            <button
              className="control-button spotlight"
              onClick={onSpotlight}
              title="Spotlight Participant"
            >
              ⭐
            </button>
            <button
              className="control-button mute"
              onClick={onMute}
              title="Mute Participant"
            >
              🔇
            </button>
            <button
              className="control-button remove"
              onClick={onRemove}
              title="Remove Participant"
            >
              ❌
            </button>
          </div>
        )}
      </div>

      {/* Participant Name */}
      <div className="participant-name">
        {participant.getName()}
        {isCurrentParticipant && " (You)"}
      </div>

      <style jsx>{`
        .participant-tile {
          background: #2d2d2d;
          border-radius: 8px;
          overflow: hidden;
          margin: 4px;
          position: relative;
          transition: transform 0.2s ease;
        }

        .participant-tile:hover {
          transform: scale(1.02);
        }

        .current-participant {
          border: 2px solid #007bff;
        }

        .active-speaker {
          border: 2px solid #00ff00;
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
        }

        .video-container {
          position: relative;
          width: 100%;
          height: 120px;
          background: #1a1a1a;
          overflow: hidden;
        }

        .participant-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
          gap: 8px;
        }

        .participant-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #007bff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: bold;
        }

        .video-status {
          color: #ccc;
          font-size: 12px;
          text-align: center;
        }

        .status-indicators {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .connection-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .audio-indicator,
        .hand-indicator,
        .coach-badge {
          background: rgba(0, 0, 0, 0.7);
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 12px;
        }

        .audio-indicator.speaking {
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .control-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .control-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.2s ease;
        }

        .control-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .control-button.spotlight:hover {
          background: rgba(255, 193, 7, 0.3);
        }

        .control-button.mute:hover {
          background: rgba(220, 53, 69, 0.3);
        }

        .control-button.remove:hover {
          background: rgba(220, 53, 69, 0.3);
        }

        .participant-name {
          padding: 8px 12px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          background: #2d2d2d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .current-participant .participant-name {
          background: #007bff;
        }
      `}</style>
    </div>
  );
};