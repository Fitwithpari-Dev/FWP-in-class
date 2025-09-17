import React from 'react';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => Promise<void>;
  onToggleAudio: () => Promise<void>;
  onLeave: () => Promise<void>;
  viewMode: 'gallery' | 'speaker' | 'spotlight';
  onViewModeChange: (mode: 'gallery' | 'speaker' | 'spotlight') => void;
  canChangeViewMode: boolean;
}

/**
 * Simple Video Controls Component
 * Basic media controls for testing V2 architecture
 */
export const VideoControls: React.FC<VideoControlsProps> = ({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
  viewMode,
  onViewModeChange,
  canChangeViewMode
}) => {
  return (
    <div className="video-controls">
      <div className="media-controls">
        <button
          className={`control-btn ${isVideoEnabled ? 'enabled' : 'disabled'}`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? '📹' : '📹❌'}
        </button>

        <button
          className={`control-btn ${isAudioEnabled ? 'enabled' : 'disabled'}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        <button
          className="control-btn leave-btn"
          onClick={onLeave}
          title="Leave session"
        >
          📞❌
        </button>
      </div>

      {canChangeViewMode && (
        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'gallery' ? 'active' : ''}`}
            onClick={() => onViewModeChange('gallery')}
            title="Gallery view"
          >
            🔳 Gallery
          </button>
          <button
            className={`view-btn ${viewMode === 'speaker' ? 'active' : ''}`}
            onClick={() => onViewModeChange('speaker')}
            title="Speaker view"
          >
            👤 Speaker
          </button>
          <button
            className={`view-btn ${viewMode === 'spotlight' ? 'active' : ''}`}
            onClick={() => onViewModeChange('spotlight')}
            title="Spotlight view"
          >
            ⭐ Spotlight
          </button>
        </div>
      )}

      <style jsx>{`
        .video-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .media-controls {
          display: flex;
          gap: 12px;
        }

        .control-btn {
          background: #444;
          border: none;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          min-width: 60px;
        }

        .control-btn:hover {
          background: #555;
          transform: translateY(-1px);
        }

        .control-btn.enabled {
          background: #007bff;
        }

        .control-btn.enabled:hover {
          background: #0056b3;
        }

        .control-btn.disabled {
          background: #dc3545;
        }

        .control-btn.disabled:hover {
          background: #c82333;
        }

        .leave-btn {
          background: #dc3545 !important;
        }

        .leave-btn:hover {
          background: #c82333 !important;
        }

        .view-controls {
          display: flex;
          gap: 8px;
        }

        .view-btn {
          background: #2d2d2d;
          border: 1px solid #444;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .view-btn:hover {
          background: #444;
          border-color: #007bff;
        }

        .view-btn.active {
          background: #007bff;
          border-color: #007bff;
        }

        @media (max-width: 768px) {
          .video-controls {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};