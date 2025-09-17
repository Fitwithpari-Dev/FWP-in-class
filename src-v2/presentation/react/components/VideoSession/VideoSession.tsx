import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IVideoService, VideoServiceType } from '@core/interfaces/video-service/IVideoService';
import { VideoServiceFactory } from '@infrastructure/video-services/factory/VideoServiceFactory';
import { SessionId } from '@core/domain/value-objects/SessionId';
import { ParticipantId } from '@core/domain/value-objects/ParticipantId';
// Removed unused imports
import { ParticipantGrid } from './ParticipantGrid.simple';
import { VideoControls } from './VideoControls.simple';
import { CoachControls } from './CoachControls.simple';
import { SessionInfo } from './SessionInfo.simple';
import { useVideoSession } from '@presentation/react/hooks/useVideoSession';

interface VideoSessionProps {
  sessionId: string;
  participantName: string;
  participantRole: 'coach' | 'student';
  videoServiceType?: VideoServiceType;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

/**
 * Main Video Session Component
 * Orchestrates the entire video session experience using clean architecture
 * Supports 1000+ participants with optimized rendering
 */
export const VideoSession: React.FC<VideoSessionProps> = ({
  sessionId,
  participantName,
  participantRole,
  videoServiceType = 'zoom',
  onLeave,
  onError
}) => {
  // Video service and session state
  const [videoService, setVideoService] = useState<IVideoService | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Custom hook for session management
  const {
    session,
    currentParticipant,
    participants,
    isConnected,
    connectionStats,
    joinSession,
    leaveSession,
    enableVideo,
    disableVideo,
    enableAudio,
    disableAudio,
    spotlightParticipant,
    clearSpotlight,
    muteParticipant,
    removeParticipant
  } = useVideoSession(videoService);

  // UI state
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker' | 'spotlight'>('gallery');

  // Performance optimization: virtualized rendering
  const participantGridRef = useRef<HTMLDivElement>(null);

  // Initialize video service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);

        const factory = VideoServiceFactory.getInstance();

        // Configure based on selected video service
        let config;
        if (videoServiceType === 'zoom') {
          config = {
            appId: (import.meta as any).env?.VITE_ZOOM_SDK_KEY || '',
            appSecret: (import.meta as any).env?.VITE_ZOOM_SDK_SECRET || '',
            maxParticipants: 1000,
            enableLogging: (import.meta as any).env?.DEV === true,
            region: 'US'
          };
        } else if (videoServiceType === 'agora') {
          config = {
            appId: (import.meta as any).env?.VITE_AGORA_APP_ID || '',
            appSecret: (import.meta as any).env?.VITE_AGORA_APP_CERTIFICATE || '',
            maxParticipants: 1000,
            enableLogging: (import.meta as any).env?.DEV === true,
            region: 'US'
          };
        } else {
          config = {
            appId: '',
            serverUrl: (import.meta as any).env?.VITE_WEBRTC_SIGNALING_SERVER || 'ws://localhost:8080',
            maxParticipants: 50,
            enableLogging: (import.meta as any).env?.DEV === true
          };
        }

        console.log('[VideoSession] Video service config:', {
          type: videoServiceType,
          hasAppId: !!config.appId,
          hasAppSecret: !!config.appSecret,
          env: {
            zoom_key: !!(import.meta as any).env?.VITE_ZOOM_SDK_KEY,
            zoom_secret: !!(import.meta as any).env?.VITE_ZOOM_SDK_SECRET,
            agora_id: !!(import.meta as any).env?.VITE_AGORA_APP_ID
          }
        });

        const service = await factory.createService(videoServiceType, config);

        setVideoService(service);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize video service';
        setInitError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeService();

    // Cleanup on unmount
    return () => {
      if (videoService) {
        videoService.destroy().catch(console.error);
      }
    };
  }, [videoServiceType, onError]);

  // Join session once service is ready
  useEffect(() => {
    if (videoService && !isConnected) {
      const join = async () => {
        try {
          // Validate sessionId parameter
          if (!sessionId) {
            console.error('[VideoSession] sessionId is missing');
            return;
          }

          const trimmedSessionId = sessionId.trim();
          if (trimmedSessionId.length === 0) {
            console.error('[VideoSession] sessionId is empty');
            return;
          }

          // Enhanced parameter validation logging
          console.log('[VideoSession] Parameter validation:', {
            sessionIdType: typeof sessionId,
            sessionIdValue: sessionId,
            sessionIdLength: sessionId?.length,
            trimmedValue: trimmedSessionId,
            trimmedLength: trimmedSessionId.length,
            hasSpecialChars: /[^a-zA-Z0-9_-]/.test(sessionId || ''),
            participantNameType: typeof participantName,
            participantNameValue: participantName,
            participantRoleType: typeof participantRole,
            participantRoleValue: participantRole,
            videoServiceType,
            hasVideoService: !!videoService,
            hasJoinSession: !!joinSession
          });

          console.log('[VideoSession] Attempting to join session:', {
            sessionId: sessionId,
            participantName,
            participantRole,
            videoServiceType,
            hasVideoService: !!videoService
          });

          // FIXED: Use the joinSession from useVideoSession hook (proper state management)
          // instead of calling videoService.joinSession directly

          // Create SessionId with additional validation
          let sessionIdObject;
          try {
            sessionIdObject = SessionId.create(trimmedSessionId);
            console.log('[VideoSession] SessionId created successfully:', {
              value: sessionIdObject.getValue(),
              type: typeof sessionIdObject.getValue()
            });
          } catch (sessionIdError) {
            console.error('[VideoSession] ❌ Failed to create SessionId:', {
              trimmedSessionId,
              sessionIdError
            });
            throw new Error(`Invalid session ID format: ${trimmedSessionId}`);
          }

          // Prepare join request with defensive validation
          const joinRequest = {
            sessionId: sessionIdObject,
            participantName,
            participantRole,
            videoEnabled: false, // Start with media disabled for better UX
            audioEnabled: false
          };

          console.log('[VideoSession] Prepared join request:', {
            sessionId: joinRequest.sessionId.getValue(),
            participantName: joinRequest.participantName,
            participantRole: joinRequest.participantRole,
            videoEnabled: joinRequest.videoEnabled,
            audioEnabled: joinRequest.audioEnabled
          });

          await joinSession(joinRequest);

          console.log('[VideoSession] ✅ Successfully joined session via useVideoSession hook', {
            sessionJoined: true,
            hasSession: !!session,
            hasCurrentParticipant: !!currentParticipant,
            isConnectedState: isConnected,
            sessionData: session ? {
              id: session.getId().getValue(),
              name: session.getName(),
              status: session.getStatus(),
              participantCount: session.getParticipantCount()
            } : null
          });
        } catch (error) {
          // Enhanced error logging to capture exact failure point
          console.error('[VideoSession] 🚨 Detailed join error:', {
            error,
            errorMessage: (error as any)?.message,
            errorStack: (error as any)?.stack,
            errorName: (error as any)?.name,
            errorToString: error?.toString(),
            errorType: typeof error,
            isErrorObject: error instanceof Error,
            originalError: error,
            sessionId,
            sessionIdType: typeof sessionId,
            sessionIdValue: sessionId,
            participantName,
            participantNameType: typeof participantName,
            participantRole,
            participantRoleType: typeof participantRole,
            videoServiceType,
            hasVideoService: !!videoService,
            hasJoinSession: !!joinSession,
            videoServiceState: videoService?.isInitialized,
            isConnectedState: isConnected,
            currentTimestamp: new Date().toISOString(),
            // Check if this is a sessionName-related error
            isSessionNameError: (error as any)?.message?.includes('sessionName'),
            containsUndefined: (error as any)?.message?.includes('undefined'),
            // Capture any mention of sessionName in error context
            sessionNameContext: {
              errorContainsSessionName: JSON.stringify(error).includes('sessionName'),
              errorStringified: JSON.stringify(error, null, 2)
            }
          });

          // Critical error analysis for sessionName issues
          let errorMessage = error instanceof Error ? error.message : 'Failed to join session';

          // Special handling for sessionName undefined errors
          if (errorMessage.includes('sessionName') && errorMessage.includes('undefined')) {
            console.error('[VideoSession] 🔴 DETECTED: sessionName undefined error - this is the bug we\'re fixing:', {
              originalError: error,
              errorMessage,
              context: 'This error occurs when SDK expects sessionName but gets undefined',
              diagnosis: 'Parameter transformation or validation failure in video service layer',
              sessionId: sessionId,
              participantName,
              participantRole
            });

            errorMessage = `Session join failed: Invalid session configuration. Session ID: ${sessionId.trim()}. Please try again.`;
          }

          // Enhanced error reporting for debugging
          if (errorMessage.includes('sessionName')) {
            console.error('[VideoSession] 🔍 SessionName error detected - providing enhanced context:', {
              errorType: 'sessionName_related',
              originalErrorMessage: error instanceof Error ? error.message : 'Unknown',
              sessionId: sessionId,
              sessionIdLength: sessionId.trim()?.length,
              participantName,
              participantRole,
              hasVideoService: !!videoService,
              videoServiceType,
              timestamp: new Date().toISOString(),
              stackTrace: error instanceof Error ? error.stack : undefined
            });
          }

          onError?.(errorMessage);
        }
      };

      join();
    }
  }, [videoService, isConnected, sessionId, participantName, participantRole, joinSession]);

  // Media control handlers
  const handleToggleVideo = useCallback(async () => {
    try {
      if (isVideoEnabled) {
        await disableVideo();
        setIsVideoEnabled(false);
      } else {
        await enableVideo();
        setIsVideoEnabled(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle video';
      onError?.(errorMessage);
    }
  }, [isVideoEnabled, enableVideo, disableVideo, onError]);

  const handleToggleAudio = useCallback(async () => {
    try {
      if (isAudioEnabled) {
        await disableAudio();
        setIsAudioEnabled(false);
      } else {
        await enableAudio();
        setIsAudioEnabled(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle audio';
      onError?.(errorMessage);
    }
  }, [isAudioEnabled, enableAudio, disableAudio, onError]);

  const handleLeaveSession = useCallback(async () => {
    try {
      await leaveSession();
      onLeave?.();
    } catch (error) {
      console.error('Error leaving session:', error);
      onLeave?.(); // Still call onLeave even if there's an error
    }
  }, [leaveSession, onLeave]);

  // Coach-specific handlers
  const handleSpotlightParticipant = useCallback(async (participantId: ParticipantId) => {
    if (participantRole === 'coach') {
      try {
        await spotlightParticipant(participantId);
        setViewMode('spotlight');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to spotlight participant';
        onError?.(errorMessage);
      }
    }
  }, [participantRole, spotlightParticipant, onError]);

  const handleMuteParticipant = useCallback(async (participantId: ParticipantId) => {
    if (participantRole === 'coach') {
      try {
        await muteParticipant(participantId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to mute participant';
        onError?.(errorMessage);
      }
    }
  }, [participantRole, muteParticipant, onError]);

  const handleRemoveParticipant = useCallback(async (participantId: ParticipantId) => {
    if (participantRole === 'coach') {
      try {
        await removeParticipant(participantId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove participant';
        onError?.(errorMessage);
      }
    }
  }, [participantRole, removeParticipant, onError]);

  // Rendering states
  if (isInitializing) {
    return (
      <div className="video-session-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing video service...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="video-session-error">
        <div className="error-message">
          <h3>Unable to Initialize Video Session</h3>
          <p>{initError}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !session) {
    return (
      <div className="video-session-connecting">
        <div className="connecting-message">
          <div className="spinner"></div>
          <p>Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-session-container">
      {/* Session Header */}
      <div className="session-header">
        <SessionInfo
          session={session}
          connectionStats={connectionStats}
          participantCount={participants.length}
          videoServiceType={videoServiceType}
        />
      </div>

      {/* Main Video Area */}
      <div className="video-main-area" ref={participantGridRef}>
        <ParticipantGrid
          participants={participants}
          currentParticipant={currentParticipant}
          spotlightedParticipant={session.getSpotlightedParticipant()}
          viewMode={viewMode}
          videoService={videoService}
          isCoach={participantRole === 'coach'}
          onSpotlightParticipant={handleSpotlightParticipant}
          onMuteParticipant={handleMuteParticipant}
          onRemoveParticipant={handleRemoveParticipant}
        />
      </div>

      {/* Control Panels */}
      <div className="session-controls">
        {/* Basic Media Controls */}
        <VideoControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          onLeave={handleLeaveSession}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canChangeViewMode={participantRole === 'coach'}
        />

        {/* Coach-specific Controls */}
        {participantRole === 'coach' && (
          <CoachControls
            session={session}
            participants={participants}
            videoService={videoService}
            onSpotlightParticipant={handleSpotlightParticipant}
            onClearSpotlight={clearSpotlight}
            onMuteParticipant={handleMuteParticipant}
            onRemoveParticipant={handleRemoveParticipant}
          />
        )}
      </div>

      {/* CSS Styles */}
      <style jsx>{`
        .video-session-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1a1a1a;
          color: white;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .session-header {
          background: #2d2d2d;
          padding: 12px 20px;
          border-bottom: 1px solid #444;
          flex-shrink: 0;
        }

        .video-main-area {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        .session-controls {
          background: #2d2d2d;
          padding: 16px 20px;
          border-top: 1px solid #444;
          flex-shrink: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .video-session-loading,
        .video-session-error,
        .video-session-connecting {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #1a1a1a;
          color: white;
          text-align: center;
        }

        .loading-spinner,
        .connecting-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .error-message {
          background: #2d2d2d;
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #444;
          max-width: 400px;
        }

        .error-message h3 {
          margin: 0 0 16px 0;
          color: #ff6b6b;
        }

        .error-message p {
          margin: 0 0 20px 0;
          color: #ccc;
          line-height: 1.5;
        }

        .retry-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .retry-button:hover {
          background: #0056b3;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #444;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .session-controls {
            flex-direction: column;
            gap: 12px;
          }

          .session-header {
            padding: 8px 16px;
          }
        }
      `}</style>
    </div>
  );
};