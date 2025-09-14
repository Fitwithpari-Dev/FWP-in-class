import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Participant,
  ClassSession,
  ViewMode,
  UserRole,
  CoachMode,
  StudentLevel,
  ExerciseContent,
  HealthConsideration
} from '../types/fitness-platform';
import { ZoomSDKService, ZoomSDKEventHandlers } from '../services/zoomSDKService';
import { generateSessionToken, ZOOM_CONFIG } from '../config/zoom.config';
import { ConnectionState } from '@zoom/videosdk';

interface FitnessPlatformContextType {
  // State
  participants: Participant[];
  classSession: ClassSession;
  viewMode: ViewMode;
  currentUser: { id: string; role: UserRole } | null;
  isLocalVideoOn: boolean;
  isLocalAudioOn: boolean;
  spotlightedParticipant: string;
  elapsedTime: number;
  exerciseTimer: number;
  highlightedLevel: StudentLevel | null;
  connectionState: ConnectionState | null;
  isConnecting: boolean;
  error: string | null;

  // Methods
  joinSession: (userName: string, role: UserRole, sessionName?: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  spotlightParticipant: (participantId: string) => Promise<void>;
  muteParticipant: (participantId: string) => Promise<void>;
  muteAllParticipants: () => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  sendChatMessage: (message: string, toUserId?: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  setCoachMode: (mode: CoachMode) => void;
  setExerciseContent: (content: ExerciseContent) => void;
  highlightLevel: (level: StudentLevel | null) => void;
  raiseHand: () => void;
  getParticipantsByLevel: (level: StudentLevel) => Participant[];
  getStudentLevels: () => StudentLevel[];
  formatTime: (seconds: number) => string;
}

const FitnessPlatformContext = createContext<FitnessPlatformContextType | undefined>(undefined);

export const FitnessPlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // SDK instance
  const zoomSDK = useRef<ZoomSDKService | null>(null);

  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [classSession, setClassSession] = useState<ClassSession>({
    id: 'class-1',
    title: 'HIIT Cardio Blast',
    startTime: new Date(),
    duration: 45,
    isRecording: false,
    currentExercise: 'Warm-up',
    exerciseTimer: 180,
    coachMode: 'teach',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [currentUser, setCurrentUser] = useState<{ id: string; role: UserRole } | null>(null);
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(true);
  const [isLocalAudioOn, setIsLocalAudioOn] = useState(true);
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(180);
  const [highlightedLevel, setHighlightedLevel] = useState<StudentLevel | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handRaisedParticipants, setHandRaisedParticipants] = useState<Set<string>>(new Set());

  // Initialize SDK
  useEffect(() => {
    if (!zoomSDK.current) {
      zoomSDK.current = new ZoomSDKService();
      setupSDKEventHandlers();
    }

    return () => {
      if (zoomSDK.current) {
        zoomSDK.current.leaveSession().catch(console.error);
      }
    };
  }, []);

  // Setup SDK event handlers
  const setupSDKEventHandlers = useCallback(() => {
    if (!zoomSDK.current) return;

    const handlers: ZoomSDKEventHandlers = {
      onUserJoin: (userId, user) => {
        const newParticipant: Participant = {
          id: userId,
          name: user.displayName || 'Unknown',
          isVideoOn: user.bVideoOn || false,
          isAudioOn: !user.muted,
          isHost: false,
          connectionQuality: 'good',
          hasRaisedHand: false,
        };

        setParticipants(prev => [...prev, newParticipant]);
      },

      onUserLeave: (userId) => {
        setParticipants(prev => prev.filter(p => p.id !== userId));
        setHandRaisedParticipants(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      },

      onUserVideoStateChange: (userId, videoOn) => {
        setParticipants(prev =>
          prev.map(p => p.id === userId ? { ...p, isVideoOn: videoOn } : p)
        );
      },

      onUserAudioStateChange: (userId, audioOn) => {
        setParticipants(prev =>
          prev.map(p => p.id === userId ? { ...p, isAudioOn: audioOn } : p)
        );
      },

      onConnectionChange: (state) => {
        setConnectionState(state);
        if (state === 'Closed' || state === 'Failed') {
          setError('Connection lost. Please try rejoining the session.');
        }
      },

      onNetworkQualityChange: (userId, quality) => {
        setParticipants(prev =>
          prev.map(p => p.id === userId ? { ...p, connectionQuality: quality } : p)
        );
      },

      onRecordingStateChange: (recording) => {
        setClassSession(prev => ({ ...prev, isRecording: recording }));
      },

      onHandRaised: (userId, raised) => {
        setHandRaisedParticipants(prev => {
          const newSet = new Set(prev);
          if (raised) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });

        setParticipants(prev =>
          prev.map(p => p.id === userId ? { ...p, hasRaisedHand: raised } : p)
        );
      },

      onSessionClosed: () => {
        setError('Session has ended.');
        setParticipants([]);
        setCurrentUser(null);
      },
    };

    zoomSDK.current.setEventHandlers(handlers);
  }, []);

  // Timer effects
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (exerciseTimer > 0) {
      const interval = setInterval(() => {
        setExerciseTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [exerciseTimer]);

  // Join session
  const joinSession = async (userName: string, role: UserRole, sessionName?: string) => {
    if (!zoomSDK.current) {
      setError('SDK not initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const isHost = role === 'coach';
      const topic = sessionName || ZOOM_CONFIG.topic;

      // Generate token (in production, this should come from your backend)
      const token = await generateSessionToken(
        topic,
        isHost ? 1 : 0,
        ZOOM_CONFIG.password,
        userName
      );

      await zoomSDK.current.joinSession(topic, token, userName, isHost);

      // Get session info and set current user
      const sessionInfo = zoomSDK.current.getSessionInfo();
      if (sessionInfo) {
        setCurrentUser({
          id: sessionInfo.userId,
          role: isHost ? 'coach' : 'student',
        });

        // If host, set as spotlighted by default
        if (isHost) {
          setSpotlightedParticipant(sessionInfo.userId);
        }
      }

      // Get initial participants
      const allParticipants = zoomSDK.current.getAllParticipants();
      setParticipants(allParticipants);

      setConnectionState('Connected' as ConnectionState);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setIsConnecting(false);
    }
  };

  // Leave session
  const leaveSession = async () => {
    if (!zoomSDK.current) return;

    try {
      await zoomSDK.current.leaveSession();
      setParticipants([]);
      setCurrentUser(null);
      setConnectionState(null);
    } catch (err) {
      console.error('Error leaving session:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave session');
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!zoomSDK.current) return;

    try {
      if (isLocalVideoOn) {
        await zoomSDK.current.stopVideo();
        setIsLocalVideoOn(false);
      } else {
        await zoomSDK.current.startVideo();
        setIsLocalVideoOn(true);
      }
    } catch (err) {
      console.error('Error toggling video:', err);
      setError('Failed to toggle video');
    }
  };

  // Toggle audio
  const toggleAudio = async () => {
    if (!zoomSDK.current) return;

    try {
      if (isLocalAudioOn) {
        await zoomSDK.current.muteAudio();
        setIsLocalAudioOn(false);
      } else {
        await zoomSDK.current.unmuteAudio();
        setIsLocalAudioOn(true);
      }
    } catch (err) {
      console.error('Error toggling audio:', err);
      setError('Failed to toggle audio');
    }
  };

  // Spotlight participant
  const spotlightParticipant = async (participantId: string) => {
    setSpotlightedParticipant(participantId);
    setViewMode('spotlight');
  };

  // Mute participant (coach only)
  const muteParticipant = async (participantId: string) => {
    if (!zoomSDK.current || currentUser?.role !== 'coach') return;

    try {
      await zoomSDK.current.muteParticipant(participantId);
    } catch (err) {
      console.error('Error muting participant:', err);
      setError('Failed to mute participant');
    }
  };

  // Mute all participants (coach only)
  const muteAllParticipants = async () => {
    if (!zoomSDK.current || currentUser?.role !== 'coach') return;

    try {
      await zoomSDK.current.muteAllParticipants(true);
    } catch (err) {
      console.error('Error muting all participants:', err);
      setError('Failed to mute all participants');
    }
  };

  // Remove participant (coach only)
  const removeParticipant = async (participantId: string) => {
    if (!zoomSDK.current || currentUser?.role !== 'coach') return;

    try {
      await zoomSDK.current.removeParticipant(participantId);
    } catch (err) {
      console.error('Error removing participant:', err);
      setError('Failed to remove participant');
    }
  };

  // Send chat message
  const sendChatMessage = async (message: string, toUserId?: string) => {
    if (!zoomSDK.current) return;

    try {
      await zoomSDK.current.sendChatMessage(message, toUserId);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  // Recording controls
  const startRecording = async () => {
    if (!zoomSDK.current || currentUser?.role !== 'coach') return;

    try {
      await zoomSDK.current.startRecording();
      setClassSession(prev => ({ ...prev, isRecording: true }));
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!zoomSDK.current || currentUser?.role !== 'coach') return;

    try {
      await zoomSDK.current.stopRecording();
      setClassSession(prev => ({ ...prev, isRecording: false }));
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to stop recording');
    }
  };

  // Coach mode
  const setCoachMode = (mode: CoachMode) => {
    setClassSession(prev => ({ ...prev, coachMode: mode }));
  };

  // Exercise content
  const setExerciseContent = (content: ExerciseContent) => {
    setClassSession(prev => ({
      ...prev,
      currentExerciseContent: content,
      currentExercise: content.name,
      exerciseGifUrl: content.gifUrl,
      exerciseBenefits: content.benefits,
    }));
    setExerciseTimer(180); // Reset timer for new exercise
  };

  // Highlight level
  const highlightLevel = (level: StudentLevel | null) => {
    setHighlightedLevel(level);
  };

  // Raise hand
  const raiseHand = () => {
    if (!currentUser) return;

    const isRaised = handRaisedParticipants.has(currentUser.id);
    setHandRaisedParticipants(prev => {
      const newSet = new Set(prev);
      if (isRaised) {
        newSet.delete(currentUser.id);
      } else {
        newSet.add(currentUser.id);
      }
      return newSet;
    });

    setParticipants(prev =>
      prev.map(p =>
        p.id === currentUser.id
          ? { ...p, hasRaisedHand: !isRaised }
          : p
      )
    );
  };

  // Get participants by level
  const getParticipantsByLevel = (level: StudentLevel) => {
    return participants.filter(p => p.level === level);
  };

  // Get student levels
  const getStudentLevels = (): StudentLevel[] => {
    return ['beginner', 'intermediate', 'advanced'];
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const value: FitnessPlatformContextType = {
    // State
    participants,
    classSession,
    viewMode,
    currentUser,
    isLocalVideoOn,
    isLocalAudioOn,
    spotlightedParticipant,
    elapsedTime,
    exerciseTimer,
    highlightedLevel,
    connectionState,
    isConnecting,
    error,

    // Methods
    joinSession,
    leaveSession,
    toggleVideo,
    toggleAudio,
    setViewMode,
    spotlightParticipant,
    muteParticipant,
    muteAllParticipants,
    removeParticipant,
    sendChatMessage,
    startRecording,
    stopRecording,
    setCoachMode,
    setExerciseContent,
    highlightLevel,
    raiseHand,
    getParticipantsByLevel,
    getStudentLevels,
    formatTime,
  };

  return (
    <FitnessPlatformContext.Provider value={value}>
      {children}
    </FitnessPlatformContext.Provider>
  );
};

export const useFitnessPlatform = () => {
  const context = useContext(FitnessPlatformContext);
  if (context === undefined) {
    throw new Error('useFitnessPlatform must be used within a FitnessPlatformProvider');
  }
  return context;
};