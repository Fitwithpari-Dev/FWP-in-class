import React, { useState, useEffect } from 'react';
import { VideoSession } from './presentation/react/components/VideoSession/VideoSession';
import { VideoServiceType } from './core/interfaces/video-service/IVideoService';

/**
 * Main Application Component for V2 Architecture
 * Demonstrates the new clean architecture with video session management
 */
export const App: React.FC = () => {
  // Parse URL parameters for session configuration
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);

    // Get all possible parameter names
    const session = params.get('session') || params.get('sessionId');
    const name = params.get('name') || params.get('participantName') || params.get('username');
    const role = params.get('role') || params.get('participantRole');
    const service = params.get('service') || params.get('videoService');

    console.log('[App] Raw URL parameters:', {
      url: window.location.href,
      search: window.location.search,
      allParams: Object.fromEntries(params.entries()),
      parsed: { session, name, role, service }
    });

    return {
      session,
      name,
      role: role as 'coach' | 'student' | null,
      service: service as VideoServiceType | null
    };
  };

  const urlParams = getUrlParams();

  // Generate realistic participant name fallback
  const generateFallbackName = (role: 'coach' | 'student') => {
    const studentNames = ['Alex', 'Jordan', 'Sam', 'Riley', 'Taylor', 'Morgan', 'Casey', 'Avery'];
    const coachNames = ['Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'John', 'Maya', 'Chris'];
    const names = role === 'coach' ? coachNames : studentNames;
    const randomName = names[Math.floor(Math.random() * names.length)];
    const rolePrefix = role === 'coach' ? 'Coach' : 'Student';
    return `${rolePrefix}-${randomName}`;
  };

  // Demo state - enhanced to read from URL parameters with better fallbacks
  const [isInSession, setIsInSession] = useState(!!urlParams.session);
  const defaultRole = (urlParams.role || 'student') as 'coach' | 'student';
  const [sessionConfig, setSessionConfig] = useState({
    sessionId: urlParams.session || 'demo-session-' + Date.now(),
    participantName: urlParams.name || generateFallbackName(defaultRole),
    participantRole: defaultRole,
    videoServiceType: (urlParams.service || 'zoom') as VideoServiceType
  });

  // Log session configuration for debugging
  useEffect(() => {
    console.log('[App] Session configuration:', {
      urlParams,
      sessionConfig,
      isInSession,
      currentUrl: window.location.href
    });
  }, [sessionConfig, isInSession]);

  const handleJoinSession = () => {
    setIsInSession(true);
  };

  const handleLeaveSession = () => {
    setIsInSession(false);
  };

  const handleError = (error: string) => {
    console.error('[App] Video session error:', error);
    alert(`Video session error: ${error}`);
  };

  if (isInSession) {
    return (
      <VideoSession
        sessionId={sessionConfig.sessionId}
        participantName={sessionConfig.participantName}
        participantRole={sessionConfig.participantRole}
        videoServiceType={sessionConfig.videoServiceType}
        onLeave={handleLeaveSession}
        onError={handleError}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>FitWithPari V2 - Clean Architecture Demo</h1>
        <p>Modern video fitness platform with scalable architecture</p>
      </header>

      <main className="app-main">
        <div className="demo-controls">
          <div className="config-section">
            <h3>Session Configuration</h3>

            <div className="form-group">
              <label>Session ID:</label>
              <input
                type="text"
                value={sessionConfig.sessionId}
                onChange={(e) => setSessionConfig(prev => ({
                  ...prev,
                  sessionId: e.target.value
                }))}
              />
            </div>

            <div className="form-group">
              <label>Your Name:</label>
              <input
                type="text"
                value={sessionConfig.participantName}
                onChange={(e) => setSessionConfig(prev => ({
                  ...prev,
                  participantName: e.target.value
                }))}
              />
            </div>

            <div className="form-group">
              <label>Role:</label>
              <select
                value={sessionConfig.participantRole}
                onChange={(e) => setSessionConfig(prev => ({
                  ...prev,
                  participantRole: e.target.value as 'coach' | 'student'
                }))}
              >
                <option value="student">Student</option>
                <option value="coach">Coach</option>
              </select>
            </div>

            <div className="form-group">
              <label>Video Service:</label>
              <select
                value={sessionConfig.videoServiceType}
                onChange={(e) => setSessionConfig(prev => ({
                  ...prev,
                  videoServiceType: e.target.value as VideoServiceType
                }))}
              >
                <option value="zoom">Zoom SDK (Recommended)</option>
                <option value="agora">Agora RTC</option>
                <option value="webrtc">Native WebRTC</option>
              </select>
            </div>

            <button
              className="join-button"
              onClick={handleJoinSession}
              disabled={!sessionConfig.sessionId || !sessionConfig.participantName}
            >
              Join Session
            </button>
          </div>

          <div className="architecture-info">
            <h3>Architecture Features</h3>
            <ul>
              <li>✅ Clean Architecture with Domain-Driven Design</li>
              <li>✅ Video Service Abstraction (Zoom/Agora/WebRTC)</li>
              <li>✅ Immutable Domain Entities</li>
              <li>✅ Reactive State Management (RxJS)</li>
              <li>✅ Virtualized Rendering for 1000+ participants</li>
              <li>✅ Type-Safe with TypeScript</li>
              <li>✅ Scalable Component Architecture</li>
              <li>✅ Modern React Hooks & Patterns</li>
            </ul>

            <div className="performance-notes">
              <h4>Performance Optimizations:</h4>
              <ul>
                <li>Virtual scrolling for participant grid</li>
                <li>Selective video streaming</li>
                <li>Connection quality monitoring</li>
                <li>Efficient state management</li>
                <li>Lazy loading and code splitting ready</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
          color: white;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .app-header {
          text-align: center;
          padding: 40px 20px;
          border-bottom: 1px solid #444;
        }

        .app-header h1 {
          margin: 0 0 16px 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #007bff, #00d4ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .app-header p {
          margin: 0;
          color: #ccc;
          font-size: 16px;
        }

        .app-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .demo-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: start;
        }

        .config-section {
          background: #2d2d2d;
          padding: 32px;
          border-radius: 12px;
          border: 1px solid #444;
        }

        .config-section h3 {
          margin: 0 0 24px 0;
          color: #007bff;
          font-size: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #ccc;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          background: #1a1a1a;
          border: 1px solid #555;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .join-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .join-button:hover:not(:disabled) {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .join-button:disabled {
          background: #555;
          cursor: not-allowed;
        }

        .architecture-info {
          background: #1a1a1a;
          padding: 32px;
          border-radius: 12px;
          border: 1px solid #333;
        }

        .architecture-info h3 {
          margin: 0 0 20px 0;
          color: #00d4ff;
          font-size: 20px;
        }

        .architecture-info ul {
          margin: 0;
          padding-left: 20px;
          line-height: 1.6;
        }

        .architecture-info li {
          margin-bottom: 8px;
          color: #ccc;
        }

        .performance-notes {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #333;
        }

        .performance-notes h4 {
          margin: 0 0 12px 0;
          color: #00ff9f;
          font-size: 16px;
        }

        .performance-notes ul {
          margin: 0;
          padding-left: 20px;
        }

        .performance-notes li {
          margin-bottom: 6px;
          color: #aaa;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .demo-controls {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .app-header h1 {
            font-size: 24px;
          }

          .config-section,
          .architecture-info {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};