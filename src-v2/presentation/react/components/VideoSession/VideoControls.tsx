import React from 'react';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onLeave: () => void;
  viewMode: 'gallery' | 'speaker' | 'spotlight';
  onViewModeChange: (mode: 'gallery' | 'speaker' | 'spotlight') => void;
  canChangeViewMode: boolean;
}

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
          {isVideoEnabled ? '📹' : '📷'}
        </button>
        
        <button
          className={`control-btn ${isAudioEnabled ? 'enabled' : 'disabled'}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        
        <button
          className="control-btn leave-btn"
          onClick={onLeave}
          title="Leave session"
        >
          📞
        </button>
      </div>
      
      {canChangeViewMode && (
        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'gallery' ? 'active' : ''}`}
            onClick={() => onViewModeChange('gallery')}
          >
            Gallery
          </button>
          <button
            className={`view-btn ${viewMode === 'speaker' ? 'active' : ''}`}
            onClick={() => onViewModeChange('speaker')}
          >
            Speaker
          </button>
          <button
            className={`view-btn ${viewMode === 'spotlight' ? 'active' : ''}`}
            onClick={() => onViewModeChange('spotlight')}
          >
            Spotlight
          </button>
        </div>
      )}
      
      <style jsx>{`
        .video-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .media-controls {
          display: flex;
          gap: 12px;
        }
        
        .control-btn {
          background: #4a4a4a;
          border: none;
          color: white;
          padding: 12px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .control-btn:hover {
          background: #5a5a5a;
        }
        
        .control-btn.enabled {
          background: #007bff;
        }
        
        .control-btn.disabled {
          background: #dc3545;
        }
        
        .leave-btn {
          background: #dc3545;
        }
        
        .view-controls {
          display: flex;
          gap: 8px;
        }
        
        .view-btn {
          background: #4a4a4a;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .view-btn.active {
          background: #007bff;
        }
      `}</style>
    </div>
  );
};