import React from 'react';
import { VideoSession } from '../../../core/domain/entities/VideoSession';
import { ConnectionStatistics, VideoServiceType } from '../../../core/interfaces/video-service/IVideoService';

interface SessionInfoProps {
  session: VideoSession;
  connectionStats: ConnectionStatistics | null;
  participantCount: number;
  videoServiceType: VideoServiceType;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
  session,
  connectionStats,
  participantCount,
  videoServiceType
}) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };
  
  const getServiceIcon = (type: VideoServiceType) => {
    switch (type) {
      case 'zoom': return '📹';
      case 'agora': return '🌐';
      case 'webrtc': return '🔗';
      default: return '📹';
    }
  };
  
  return (
    <div className="session-info">
      <div className="session-details">
        <h2 className="session-name">{session.getName()}</h2>
        <div className="session-stats">
          <span className="stat">
            {getServiceIcon(videoServiceType)} {videoServiceType.toUpperCase()}
          </span>
          <span className="stat">
            👥 {participantCount} participants
          </span>
          <span className="stat">
            ⏰ {formatDuration(session.getSessionDuration())}
          </span>
          <span className="stat status-active">
            ✅ {session.getStatus()}
          </span>
        </div>
      </div>
      
      {connectionStats && (
        <div className="connection-stats">
          <div className="stat-item">
            <span className="stat-label">Quality:</span>
            <span className="stat-value">
              {Math.round(connectionStats.averageConnectionQuality * 100)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Latency:</span>
            <span className="stat-value">{connectionStats.latencyStats.average}ms</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Video Streams:</span>
            <span className="stat-value">{connectionStats.activeVideoStreams}</span>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .session-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .session-details {
          flex: 1;
        }
        
        .session-name {
          margin: 0 0 8px 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }
        
        .session-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .stat {
          color: #ccc;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .status-active {
          color: #00ff00;
        }
        
        .connection-stats {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        
        .stat-label {
          color: #888;
          font-size: 11px;
          text-transform: uppercase;
        }
        
        .stat-value {
          color: #00ff00;
          font-size: 14px;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .session-info {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .connection-stats {
            align-self: stretch;
            justify-content: space-around;
          }
        }
      `}</style>
    </div>
  );
};