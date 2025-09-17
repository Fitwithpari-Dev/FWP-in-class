import React from 'react';
import { VideoSession } from '@core/domain/entities/VideoSession';
import { VideoServiceType, ConnectionStatistics } from '@core/interfaces/video-service/IVideoService';

interface SessionInfoProps {
  session: VideoSession;
  connectionStats: ConnectionStatistics | null;
  participantCount: number;
  videoServiceType: VideoServiceType;
}

/**
 * Simple Session Info Component
 * Basic session information for testing V2 architecture
 */
export const SessionInfo: React.FC<SessionInfoProps> = ({
  session,
  connectionStats,
  participantCount,
  videoServiceType
}) => {
  const formatBandwidth = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getServiceIcon = (type: VideoServiceType) => {
    switch (type) {
      case 'zoom': return '💼 Zoom';
      case 'agora': return '🌐 Agora';
      case 'webrtc': return '🔗 WebRTC';
      default: return '🎥 Video';
    }
  };

  return (
    <div className="session-info">
      <div className="session-basic">
        <div className="session-title">
          Session: {session.getName()}
        </div>
        <div className="session-id">
          ID: {session.getId().getValue()}
        </div>
      </div>

      <div className="session-stats">
        <div className="stat-item">
          <span className="stat-label">Participants:</span>
          <span className="stat-value">{participantCount}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Service:</span>
          <span className="stat-value">{getServiceIcon(videoServiceType)}</span>
        </div>

        {connectionStats && (
          <>
            <div className="stat-item">
              <span className="stat-label">Quality:</span>
              <span className={`stat-value quality-${Math.round(connectionStats.averageConnectionQuality * 100)}`}>
                {Math.round(connectionStats.averageConnectionQuality * 100)}%
              </span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Latency:</span>
              <span className="stat-value">{Math.round(connectionStats.latencyStats.average)}ms</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Bandwidth:</span>
              <span className="stat-value">
                ↑{formatBandwidth(connectionStats.bandwidthUsage.upstream)}
                ↓{formatBandwidth(connectionStats.bandwidthUsage.downstream)}
              </span>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .session-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .session-basic {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .session-title {
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .session-id {
          color: #888;
          font-size: 12px;
          font-family: monospace;
        }

        .session-stats {
          display: flex;
          gap: 20px;
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
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .stat-value {
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .quality-100, .quality-90 { color: #00ff9f; }
        .quality-80, .quality-70 { color: #ffeb3b; }
        .quality-60, .quality-50 { color: #ff9500; }
        .quality-40, .quality-30, .quality-20, .quality-10, .quality-0 { color: #ff6b6b; }

        @media (max-width: 768px) {
          .session-info {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .session-stats {
            gap: 12px;
            flex-wrap: wrap;
          }

          .stat-item {
            flex-direction: row;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};