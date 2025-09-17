import { useState, useEffect, useCallback, useRef } from 'react';
import { IVideoService, JoinSessionRequest, ConnectionStatistics } from '../../../core/interfaces/video-service/IVideoService';
import { VideoSession } from '../../../core/domain/entities/VideoSession';
import { Participant } from '../../../core/domain/entities/Participant';
import { ParticipantId } from '../../../core/domain/value-objects/ParticipantId';
// Removed unused SessionId import
import { ConnectionQuality } from '../../../core/domain/value-objects/ConnectionQuality';

interface UseVideoSessionState {
  session: VideoSession | null;
  currentParticipant: Participant | null;
  participants: Participant[];
  isConnected: boolean;
  connectionStats: ConnectionStatistics | null;
  isLoading: boolean;
  error: string | null;
}

interface UseVideoSessionActions {
  joinSession: (request: JoinSessionRequest) => Promise<void>;
  leaveSession: () => Promise<void>;
  enableVideo: () => Promise<void>;
  disableVideo: () => Promise<void>;
  enableAudio: () => Promise<void>;
  disableAudio: () => Promise<void>;
  spotlightParticipant: (participantId: ParticipantId) => Promise<void>;
  clearSpotlight: () => Promise<void>;
  muteParticipant: (participantId: ParticipantId) => Promise<void>;
  removeParticipant: (participantId: ParticipantId) => Promise<void>;
}

type UseVideoSessionReturn = UseVideoSessionState & UseVideoSessionActions;

/**
 * Custom React Hook for Video Session Management
 * Provides reactive state management for video sessions with clean architecture
 * Handles all video service interactions and participant synchronization
 */
export const useVideoSession = (videoService: IVideoService | null): UseVideoSessionReturn => {
  // Core state
  const [session, setSession] = useState<VideoSession | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStats, setConnectionStats] = useState<ConnectionStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const eventSubscriptions = useRef<(() => void)[]>([]);
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to video service events
  useEffect(() => {
    if (!videoService) return;

    // Clear previous subscriptions
    eventSubscriptions.current.forEach(unsubscribe => unsubscribe());
    eventSubscriptions.current = [];

    // Participant events
    const participantSub = videoService.participantEvents$.subscribe(event => {
      switch (event.type) {
        case 'participant-joined':
          setParticipants(prev => {
            // Avoid duplicates
            if (prev.find(p => p.getId().equals(event.participant.getId()))) {
              return prev;
            }
            return [...prev, event.participant];
          });

          // Update session entity
          setSession(prevSession => {
            if (prevSession) {
              try {
                return prevSession.addParticipant(event.participant);
              } catch {
                // Participant might already be in session
                return prevSession;
              }
            }
            return prevSession;
          });
          break;

        case 'participant-left':
          setParticipants(prev =>
            prev.filter(p => !p.getId().equals(event.participant.getId()))
          );

          // Update session entity
          setSession(prevSession => {
            if (prevSession) {
              return prevSession.removeParticipant(event.participant.getId());
            }
            return prevSession;
          });
          break;

        case 'participant-updated':
          setParticipants(prev =>
            prev.map(p =>
              p.getId().equals(event.participant.getId()) ? event.participant : p
            )
          );

          // Update session entity
          setSession(prevSession => {
            if (prevSession) {
              return prevSession.updateParticipant(event.participant);
            }
            return prevSession;
          });

          // Update current participant if it's us
          setCurrentParticipant(prevCurrent => {
            if (prevCurrent?.getId().equals(event.participant.getId())) {
              return event.participant;
            }
            return prevCurrent;
          });
          break;
      }
    });

    // Video events
    const videoSub = videoService.videoEvents$.subscribe(event => {
      // Update participant video state
      setParticipants(prev =>
        prev.map(p => {
          if (p.getId().equals(event.participantId)) {
            return event.type === 'video-enabled' ? p.enableVideo() : p.disableVideo();
          }
          return p;
        })
      );

      // Update current participant if it's us
      setCurrentParticipant(prevCurrent => {
        if (prevCurrent?.getId().equals(event.participantId)) {
          return event.type === 'video-enabled' ?
            prevCurrent.enableVideo() : prevCurrent.disableVideo();
        }
        return prevCurrent;
      });
    });

    // Audio events
    const audioSub = videoService.audioEvents$.subscribe(event => {
      // Update participant audio state
      setParticipants(prev =>
        prev.map(p => {
          if (p.getId().equals(event.participantId)) {
            switch (event.type) {
              case 'audio-enabled':
                return p.enableAudio();
              case 'audio-disabled':
                return p.disableAudio();
              case 'active-speaker-changed':
                return p.setActiveSpeaker(true);
              default:
                return p;
            }
          } else if (event.type === 'active-speaker-changed') {
            // Clear active speaker status for others
            return p.setActiveSpeaker(false);
          }
          return p;
        })
      );

      // Update current participant if it's us
      setCurrentParticipant(prevCurrent => {
        if (prevCurrent?.getId().equals(event.participantId)) {
          switch (event.type) {
            case 'audio-enabled':
              return prevCurrent.enableAudio();
            case 'audio-disabled':
              return prevCurrent.disableAudio();
            case 'active-speaker-changed':
              return prevCurrent.setActiveSpeaker(true);
            default:
              return prevCurrent;
          }
        } else if (event.type === 'active-speaker-changed') {
          return prevCurrent?.setActiveSpeaker(false) || prevCurrent;
        }
        return prevCurrent;
      });
    });

    // Connection events
    const connectionSub = videoService.connectionEvents$.subscribe(event => {
      if (event.type === 'connection-state-changed') {
        setIsConnected(event.state === 'connected');

        if (event.state === 'failed' || event.state === 'disconnected') {
          setError('Connection lost. Attempting to reconnect...');
        } else {
          setError(null);
        }
      }

      // Update participant connection quality if specified
      if (event.participantId && event.quality !== undefined) {
        const quality = ConnectionQuality.fromNumber(event.quality);

        setParticipants(prev =>
          prev.map(p =>
            p.getId().equals(event.participantId!) ?
              p.updateConnectionQuality(quality) : p
          )
        );

        setCurrentParticipant(prevCurrent => {
          if (prevCurrent?.getId().equals(event.participantId!)) {
            return prevCurrent.updateConnectionQuality(quality);
          }
          return prevCurrent;
        });
      }
    });

    // Store subscriptions for cleanup
    eventSubscriptions.current = [
      () => participantSub.unsubscribe(),
      () => videoSub.unsubscribe(),
      () => audioSub.unsubscribe(),
      () => connectionSub.unsubscribe()
    ];

    // Start connection statistics polling
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
    }

    statsInterval.current = setInterval(async () => {
      try {
        const stats = await videoService.getConnectionStatistics();
        setConnectionStats(stats);
      } catch (error) {
        console.warn('Failed to get connection statistics:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => {
      eventSubscriptions.current.forEach(unsubscribe => unsubscribe());
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
    };
  }, [videoService]);

  // Actions
  const joinSession = useCallback(async (request: JoinSessionRequest) => {
    if (!videoService) {
      throw new Error('Video service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await videoService.joinSession(request);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to join session';
        console.error('[useVideoSession] Join failed:', {
          result,
          error: errorMsg,
          hasParticipant: !!result.participant,
          sessionInfo: result.sessionInfo
        });
        throw new Error(errorMsg);
      }

      // Validate the successful result has required data
      if (!result.participant) {
        console.error('[useVideoSession] ❌ Success result missing participant:', result);
        throw new Error('Join succeeded but participant data is missing');
      }

      // Enhanced logging for successful state transition
      console.log('[useVideoSession] ✅ Join result validation:', {
        success: result.success,
        hasParticipant: !!result.participant,
        participantId: result.participant.getId().getValue(),
        participantName: result.participant.getName(),
        participantRole: result.participant.getRole(),
        sessionInfo: result.sessionInfo,
        requestSessionId: request.sessionId.getValue(),
        requestSessionIdType: typeof request.sessionId.getValue()
      });

      // Create session entity with defensive checks
      console.log('[useVideoSession] Creating session entity:', {
        sessionId: request.sessionId.getValue(),
        sessionIdValid: !!request.sessionId.getValue(),
        maxParticipants: videoService.capabilities.maxParticipants
      });

      const sessionEntity = VideoSession.create(
        request.sessionId,
        `Session ${request.sessionId.getValue()}`,
        videoService.capabilities.maxParticipants
      );

      console.log('[useVideoSession] Adding participant to session:', {
        sessionCreated: !!sessionEntity,
        sessionId: sessionEntity.getId().getValue(),
        sessionName: sessionEntity.getName(),
        participant: {
          id: result.participant.getId().getValue(),
          name: result.participant.getName(),
          role: result.participant.getRole()
        }
      });

      const sessionWithParticipant = sessionEntity.addParticipant(result.participant);

      console.log('[useVideoSession] Final session state:', {
        sessionId: sessionWithParticipant.getId().getValue(),
        sessionName: sessionWithParticipant.getName(),
        participantCount: sessionWithParticipant.getParticipantCount(),
        hasCoach: !!sessionWithParticipant.getCoach(),
        status: sessionWithParticipant.getStatus()
      });

      setSession(sessionWithParticipant);
      setCurrentParticipant(result.participant);
      setIsConnected(true);

      console.log('[useVideoSession] ✅ State updated successfully - join complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[useVideoSession] 🚨 Join session error - detailed context:', {
        error,
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        originalError: error,
        requestData: {
          sessionId: request.sessionId.getValue(),
          participantName: request.participantName,
          participantRole: request.participantRole,
          videoEnabled: request.videoEnabled,
          audioEnabled: request.audioEnabled
        },
        videoServiceInfo: {
          isInitialized: videoService.isInitialized,
          serviceName: videoService.serviceName,
          capabilities: videoService.capabilities
        },
        currentState: {
          hasSession: !!session,
          hasCurrentParticipant: !!currentParticipant,
          isConnected,
          isLoading,
          error: error
        },
        timestamp: new Date().toISOString()
      });

      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [videoService]);

  const leaveSession = useCallback(async () => {
    if (!videoService) return;

    setIsLoading(true);

    try {
      await videoService.leaveSession();

      // Clear all state
      setSession(null);
      setCurrentParticipant(null);
      setParticipants([]);
      setIsConnected(false);
      setConnectionStats(null);
      setError(null);
    } catch (error) {
      console.error('Error leaving session:', error);
      // Still clear state even on error
      setSession(null);
      setCurrentParticipant(null);
      setParticipants([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [videoService]);

  const enableVideo = useCallback(async () => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.enableVideo();
  }, [videoService]);

  const disableVideo = useCallback(async () => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.disableVideo();
  }, [videoService]);

  const enableAudio = useCallback(async () => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.enableAudio();
  }, [videoService]);

  const disableAudio = useCallback(async () => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.disableAudio();
  }, [videoService]);

  const spotlightParticipant = useCallback(async (participantId: ParticipantId) => {
    if (!videoService) throw new Error('Video service not initialized');

    await videoService.spotlightParticipant(participantId);

    // Update session entity
    setSession(prevSession => {
      if (prevSession) {
        return prevSession.spotlightParticipant(participantId);
      }
      return prevSession;
    });
  }, [videoService]);

  const clearSpotlight = useCallback(async () => {
    if (!videoService) throw new Error('Video service not initialized');

    await videoService.clearSpotlight();

    // Update session entity
    setSession(prevSession => {
      if (prevSession) {
        return prevSession.clearSpotlight();
      }
      return prevSession;
    });
  }, [videoService]);

  const muteParticipant = useCallback(async (participantId: ParticipantId) => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.muteParticipant(participantId);
  }, [videoService]);

  const removeParticipant = useCallback(async (participantId: ParticipantId) => {
    if (!videoService) throw new Error('Video service not initialized');
    await videoService.removeParticipant(participantId);
  }, [videoService]);

  return {
    // State
    session,
    currentParticipant,
    participants,
    isConnected,
    connectionStats,
    isLoading,
    error,

    // Actions
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
  };
};