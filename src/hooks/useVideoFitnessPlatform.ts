// Unified Video Fitness Platform Hook
// Uses configurable video service (Zoom or Agora) through single interface

import { useState, useEffect, useCallback, useRef } from 'react';
import { IVideoService, VideoParticipant, ConnectionState } from '../types/video-service';
import { UserRole } from '../types/fitness-platform';
import { getVideoService, switchToFallbackService, getVideoServiceInfo } from '../services/videoServiceProvider';

interface UseVideoFitnessPlatformReturn {
  // Video service instance
  videoService: IVideoService | null;

  // Connection state
  connectionState: ConnectionState;
  isConnecting: boolean;
  error: Error | null;

  // Participants
  participants: VideoParticipant[];
  currentUser: VideoParticipant | null;

  // Media states
  isLocalVideoOn: boolean;
  isLocalAudioOn: boolean;

  // Actions
  joinSession: (userName: string, userRole: UserRole, sessionId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;

  // Service management
  switchToFallback: () => Promise<void>;
  getServiceInfo: () => any;

  // Legacy compatibility (for existing components)
  sdk: {
    joinSession: (userName: string, userRole: UserRole, sessionId: string) => Promise<void>;
    toggleVideo: () => Promise<void>;
    toggleAudio: () => Promise<void>;
    startVideo: () => Promise<void>;
    stopVideo: () => Promise<void>;
    startAudio: () => Promise<void>;
    stopAudio: () => Promise<void>;
  };
}

export function useVideoFitnessPlatform(): UseVideoFitnessPlatformReturn {
  // State
  const [videoService, setVideoService] = useState<IVideoService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('Disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [currentUser, setCurrentUser] = useState<VideoParticipant | null>(null);
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(false);
  const [isLocalAudioOn, setIsLocalAudioOn] = useState(false);

  // Refs for cleanup
  const serviceRef = useRef<IVideoService | null>(null);

  // Initialize video service
  useEffect(() => {
    let mounted = true;

    const initializeService = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        console.log('🎯 useVideoFitnessPlatform: Initializing video service...');

        const service = await getVideoService();
        serviceRef.current = service;

        if (!mounted) return;

        // Set up event handlers
        service.onConnectionStateChanged = (state: ConnectionState) => {
          console.log('🔗 useVideoFitnessPlatform: Connection state changed:', state);
          setConnectionState(state);
          setIsConnecting(state === 'Connecting');
        };

        service.onParticipantJoined = (participant: VideoParticipant) => {
          console.log('👤 useVideoFitnessPlatform: Participant joined:', participant.name);
          setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
        };

        service.onParticipantLeft = (participant: VideoParticipant) => {
          console.log('👋 useVideoFitnessPlatform: Participant left:', participant.name);
          setParticipants(prev => prev.filter(p => p.id !== participant.id));
        };

        service.onVideoStateChanged = (participantId: string, isVideoOn: boolean) => {
          console.log('🎥 useVideoFitnessPlatform: Video state changed:', participantId, isVideoOn);

          setParticipants(prev => prev.map(p =>
            p.id === participantId ? { ...p, isVideoOn } : p
          ));

          // Update local states
          if (service.getCurrentUser()?.id === participantId) {
            setIsLocalVideoOn(isVideoOn);
          }
        };

        service.onAudioStateChanged = (participantId: string, isAudioOn: boolean) => {
          console.log('🎤 useVideoFitnessPlatform: Audio state changed:', participantId, isAudioOn);

          setParticipants(prev => prev.map(p =>
            p.id === participantId ? { ...p, isAudioOn } : p
          ));

          // Update local states
          if (service.getCurrentUser()?.id === participantId) {
            setIsLocalAudioOn(isAudioOn);
          }
        };

        service.onError = (error: Error) => {
          console.error('❌ useVideoFitnessPlatform: Service error:', error);
          setError(error);
        };

        // Initialize the service
        await service.initialize();

        if (mounted) {
          setVideoService(service);
          setConnectionState(service.getConnectionState());
          setIsConnecting(false);

          console.log('✅ useVideoFitnessPlatform: Video service initialized:', service.serviceName);
        }

      } catch (err) {
        console.error('❌ useVideoFitnessPlatform: Failed to initialize video service:', err);

        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
        }
      }
    };

    initializeService();

    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        console.log('🧹 useVideoFitnessPlatform: Cleaning up video service...');
        serviceRef.current.destroy().catch(console.error);
      }
    };
  }, []);

  // Actions
  const joinSession = useCallback(async (userName: string, userRole: UserRole, sessionId: string) => {
    if (!videoService) {
      throw new Error('Video service not initialized');
    }

    try {
      setIsConnecting(true);
      setError(null);

      console.log('🚪 useVideoFitnessPlatform: Joining session:', { userName, userRole, sessionId });

      await videoService.joinSession(userName, userRole, sessionId);

      // Update states
      const user = videoService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        setParticipants(prev => [...prev.filter(p => p.id !== user.id), user]);
      }

      setIsConnecting(false);

      console.log('✅ useVideoFitnessPlatform: Joined session successfully');
    } catch (err) {
      console.error('❌ useVideoFitnessPlatform: Failed to join session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsConnecting(false);
      throw err;
    }
  }, [videoService]);

  const leaveSession = useCallback(async () => {
    if (!videoService) return;

    try {
      console.log('🚪 useVideoFitnessPlatform: Leaving session...');

      await videoService.leaveSession();

      // Reset states
      setCurrentUser(null);
      setParticipants([]);
      setIsLocalVideoOn(false);
      setIsLocalAudioOn(false);

      console.log('✅ useVideoFitnessPlatform: Left session successfully');
    } catch (err) {
      console.error('❌ useVideoFitnessPlatform: Failed to leave session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [videoService]);

  const toggleVideo = useCallback(async () => {
    if (!videoService) return;

    try {
      console.log('🎥 useVideoFitnessPlatform: Toggling video...');
      await videoService.toggleVideo();
      setIsLocalVideoOn(videoService.isVideoEnabled());
    } catch (err) {
      console.error('❌ useVideoFitnessPlatform: Failed to toggle video:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [videoService]);

  const toggleAudio = useCallback(async () => {
    if (!videoService) return;

    try {
      console.log('🎤 useVideoFitnessPlatform: Toggling audio...');
      await videoService.toggleAudio();
      setIsLocalAudioOn(videoService.isAudioEnabled());
    } catch (err) {
      console.error('❌ useVideoFitnessPlatform: Failed to toggle audio:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [videoService]);

  const switchToFallback = useCallback(async () => {
    try {
      console.log('🔄 useVideoFitnessPlatform: Switching to fallback service...');

      const fallbackService = await switchToFallbackService();
      setVideoService(fallbackService);

      console.log('✅ useVideoFitnessPlatform: Switched to fallback service:', fallbackService.serviceName);
    } catch (err) {
      console.error('❌ useVideoFitnessPlatform: Failed to switch to fallback:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  const getServiceInfo = useCallback(() => {
    return {
      ...getVideoServiceInfo(),
      currentServiceName: videoService?.serviceName || 'None',
      connectionState,
      participantCount: participants.length,
      isLocalVideoOn,
      isLocalAudioOn
    };
  }, [videoService, connectionState, participants.length, isLocalVideoOn, isLocalAudioOn]);

  // Legacy SDK compatibility object
  const legacySDK = {
    joinSession,
    toggleVideo,
    toggleAudio,
    startVideo: async () => {
      if (videoService && !videoService.isVideoEnabled()) {
        await videoService.startVideo();
        setIsLocalVideoOn(true);
      }
    },
    stopVideo: async () => {
      if (videoService && videoService.isVideoEnabled()) {
        await videoService.stopVideo();
        setIsLocalVideoOn(false);
      }
    },
    startAudio: async () => {
      if (videoService && !videoService.isAudioEnabled()) {
        await videoService.startAudio();
        setIsLocalAudioOn(true);
      }
    },
    stopAudio: async () => {
      if (videoService && videoService.isAudioEnabled()) {
        await videoService.stopAudio();
        setIsLocalAudioOn(false);
      }
    }
  };

  return {
    videoService,
    connectionState,
    isConnecting,
    error,
    participants,
    currentUser,
    isLocalVideoOn,
    isLocalAudioOn,
    joinSession,
    leaveSession,
    toggleVideo,
    toggleAudio,
    switchToFallback,
    getServiceInfo,
    sdk: legacySDK
  };
}