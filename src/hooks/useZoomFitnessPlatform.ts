import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Participant,
  ClassSession,
  ViewMode,
  UserRole,
  CoachMode,
  StudentLevel,
  ExerciseContent,
} from '../types/fitness-platform';
import { ZoomSDKService } from '../services/zoomSDKService';
import { generateSessionToken, ZOOM_CONFIG } from '../config/zoom.config';
import { ConnectionState } from '@zoom/videosdk';
import {
  validateSessionConfig,
  checkBrowserSupport,
  sanitizeUserInput
} from '../utils/sessionValidator';
import { PerformanceMonitor } from '../utils/performanceMonitor';
import { simpleSessionManager } from '../services/SimpleSessionManager';

export function useZoomFitnessPlatform() {
  // SDK instance
  const zoomSDK = useRef<ZoomSDKService | null>(null);
  const performanceMonitor = useRef<PerformanceMonitor | null>(null);

  // System compatibility state
  const [systemRequirements, setSystemRequirements] = useState<{
    audio: boolean;
    video: boolean;
    webAssembly: boolean;
    isSupported: boolean;
  } | null>(null);
  const [networkStrength, setNetworkStrength] = useState<'excellent' | 'good' | 'poor' | null>(null);

  // State management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [classSession, setClassSession] = useState<ClassSession>({
    id: 'waiting-to-join',
    title: 'Connecting to Session...',
    startTime: new Date(),
    duration: 45,
    isRecording: false,
    currentExercise: 'Waiting to start',
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
  const [sessionRetryCount, setSessionRetryCount] = useState(0);
  const [lastSessionError, setLastSessionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SDK with pre-flight checks
  useEffect(() => {
    const initSDK = async () => {
      try {
        console.log('🔧 Initializing Zoom SDK...');
        console.log('🔧 SDK Key exists:', !!ZOOM_CONFIG.sdkKey);
        console.log('🔧 SDK Secret exists:', !!ZOOM_CONFIG.sdkSecret);

        // Pre-flight system requirements check
        const requirements = await checkSystemRequirements();
        setSystemRequirements(requirements);

        if (!requirements.isSupported) {
          console.warn('⚠️ System requirements check failed:', requirements);
          console.warn('⚠️ Proceeding with SDK initialization (development mode)');
          // In development, we'll proceed anyway and let the user handle permissions
        }

        zoomSDK.current = new ZoomSDKService();

        // Set up event handlers
        zoomSDK.current.setEventHandlers({
          onUserJoin: (userId, user) => {
            console.log(`👤 User joined: ${userId} (${user.displayName})`);

            // Refresh entire participant list from Zoom SDK to ensure consistency
            setTimeout(() => {
              try {
                const allParticipants = zoomSDK.current?.getAllParticipants() || [];
                console.log('🔄 Refreshing full participant list after user join:', allParticipants.length);
                setParticipants(allParticipants);

                // Auto-start session when multiple participants are present
                if (allParticipants.length >= 1) {
                  setClassSession(current => {
                    const shouldTransition =
                      current.currentExercise === 'Waiting to start' ||
                      current.currentExercise === 'Joining session...' ||
                      current.title === 'Connecting to Session...';

                    if (shouldTransition) {
                      console.log('🏃 Session auto-starting - multiple participants detected', {
                        participantCount: allParticipants.length,
                        currentExercise: current.currentExercise,
                        currentTitle: current.title
                      });
                      return {
                        ...current,
                        currentExercise: 'Full Body Workout',
                        title: 'Live Fitness Session - Active Workout'
                      };
                    }
                    return current;
                  });
                }
              } catch (error) {
                console.error('Error refreshing participants after user join:', error);
              }
            }, 500);
          },

          onUserLeave: (userId) => {
            console.log(`👤 User left: ${userId}`);
            // Refresh entire participant list to ensure consistency
            setTimeout(() => {
              try {
                const allParticipants = zoomSDK.current?.getAllParticipants() || [];
                console.log('🔄 Refreshing full participant list after user leave:', allParticipants.length);
                setParticipants(allParticipants);
              } catch (error) {
                console.error('Error refreshing participants after user leave:', error);
              }
            }, 300);
          },

          onUserVideoStateChange: (userId, videoOn) => {
            console.log(`📹 Video state change: ${userId} -> ${videoOn ? 'ON' : 'OFF'}`);

            // Update participant video state
            setParticipants(prev => {
              const updated = prev.map(p => p.id === userId ? { ...p, isVideoOn: videoOn } : p);
              console.log(`👥 Updated participants after video state change:`, updated.map(p => ({
                id: p.id,
                name: p.name,
                isVideoOn: p.isVideoOn,
                isHost: p.isHost
              })));
              return updated;
            });

            // Update local video state if it's the current user
            if (userId === currentUser?.id) {
              setIsLocalVideoOn(videoOn);
              console.log(`🎥 Local video state updated: ${videoOn}`);
            }

            // Force a participant list refresh after video state change to ensure synchronization
            setTimeout(() => {
              try {
                if (zoomSDK.current) {
                  const refreshedParticipants = zoomSDK.current.getAllParticipants();
                  console.log(`🔄 Refreshing participant list after video state change:`, refreshedParticipants.map(p => ({
                    id: p.id,
                    name: p.name,
                    isVideoOn: p.isVideoOn,
                    isHost: p.isHost
                  })));
                  setParticipants(refreshedParticipants);
                }
              } catch (error) {
                console.error('Error refreshing participants after video state change:', error);
              }
            }, 500); // Small delay to let Zoom SDK sync
          },

          onUserAudioStateChange: (userId, audioOn) => {
            setParticipants(prev =>
              prev.map(p => p.id === userId ? { ...p, isAudioOn: audioOn } : p)
            );
            if (userId === currentUser?.id) {
              setIsLocalAudioOn(audioOn);
            }
          },

          onConnectionChange: (state) => {
            setConnectionState(state);
            if (state === 'Closed' || state === 'Failed') {
              handleConnectionFailure(state);
            } else if (state === 'Connected') {
              // Reset retry count on successful connection
              setSessionRetryCount(0);
              setLastSessionError(null);
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

          onSessionClosed: () => {
            setError('Session has ended.');
            setParticipants([]);
            setCurrentUser(null);
            setConnectionState(null);
          },
        });
      } catch (err) {
        console.error('❌ ZOOM SDK INIT ERROR:', err);
        setError(`Failed to initialize video SDK: ${err instanceof Error ? err.message : String(err)}`);
        setConnectionState('Failed' as any);
      }
    };

    initSDK();

    return () => {
      // Clean up reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (zoomSDK.current) {
        zoomSDK.current.leaveSession().catch(console.error);
      }
    };
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

  // Handle connection failures with automatic retry
  const handleConnectionFailure = async (state: ConnectionState) => {
    const maxRetries = ZOOM_CONFIG.networkConfig?.reconnectAttempts || 3;
    const retryDelay = ZOOM_CONFIG.networkConfig?.reconnectDelay || 2000;

    if (sessionRetryCount < maxRetries) {
      setError(`Connection ${state.toLowerCase()}. Attempting to reconnect (${sessionRetryCount + 1}/${maxRetries})...`);
      setSessionRetryCount(prev => prev + 1);

      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Attempt reconnection after delay
      reconnectTimeoutRef.current = setTimeout(async () => {
        if (currentUser && zoomSDK.current) {
          try {
            // Try to rejoin with existing session info
            await sdk.joinSession(
              getCurrentUser()?.name || 'User',
              currentUser.role,
              ZOOM_CONFIG.topic
            );
          } catch (err) {
            console.error('Reconnection attempt failed:', err);
            setLastSessionError(err instanceof Error ? err.message : 'Reconnection failed');
          }
        }
      }, retryDelay * (sessionRetryCount + 1)) as any; // Exponential backoff
    } else {
      setError('Connection lost. Maximum reconnection attempts reached. Please refresh and try again.');
      setLastSessionError('Maximum reconnection attempts exceeded');
    }
  };

  // Helper function to check system requirements
  const checkSystemRequirements = async (): Promise<{
    audio: boolean;
    video: boolean;
    webAssembly: boolean;
    isSupported: boolean;
  }> => {
    try {
      // Check WebAssembly support (required for Zoom SDK)
      const webAssembly = typeof WebAssembly === 'object' &&
                          typeof WebAssembly.instantiate === 'function';

      // Check media device availability (without requesting permissions)
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      let audio = hasMediaDevices;
      let video = hasMediaDevices;

      // For development, we'll assume media devices are available if the API exists
      // The actual permission request will happen when users join the session

      const isSupported = webAssembly && hasMediaDevices;

      return { audio, video, webAssembly, isSupported };
    } catch (error) {
      console.error('Error checking system requirements:', error);
      return { audio: false, video: false, webAssembly: false, isSupported: false };
    }
  };

  // Test network strength before joining
  const testNetworkStrength = async (): Promise<'excellent' | 'good' | 'poor'> => {
    try {
      const start = performance.now();
      // Simulate a network test by loading a small resource
      await fetch('https://zoom.us/test', { mode: 'no-cors' }).catch(() => {});
      const latency = performance.now() - start;

      if (latency < 150) return 'excellent';
      if (latency < 300) return 'good';
      return 'poor';
    } catch {
      return 'poor';
    }
  };

  // SDK Methods wrapped for React
  const sdk = {
    // Session management
    joinSession: async (userName: string, role: UserRole, sessionName?: string) => {
      if (!zoomSDK.current) {
        setError('SDK not initialized');
        return;
      }

      // Pre-join network test
      const strength = await testNetworkStrength();
      setNetworkStrength(strength);

      if (strength === 'poor') {
        console.warn('Poor network conditions detected. Video quality may be affected.');
      }

      setIsConnecting(true);
      setError(null);
      let isRetryingAsHost = false;

      try {
        // Sanitize user inputs
        const sanitizedUserName = sanitizeUserInput(userName);
        const isHost = role === 'coach';
        // Use default session name from config, or generate a unique one if needed
        const sessionTopic = sessionName || ZOOM_CONFIG.topic;

        console.log('🎯 Using session management for role-based joining:', {
          sessionTopic,
          userName: sanitizedUserName,
          role,
          isHost
        });

        // Use our new session management system for coordination
        const sessionResult = await simpleSessionManager.handleRoleBasedJoin(
          sessionTopic,
          sanitizedUserName,
          role
        );

        console.log('🎯 Session coordination result:', sessionResult);

        // Check if we should retry (student waiting for coach)
        if (sessionResult.shouldRetry && role === 'student') {
          setError(sessionResult.error || 'Waiting for instructor to start the class...');
          // Set a timeout to retry after a few seconds with exponential backoff
          const retryDelay = Math.min(3000 + (sessionRetryCount * 1000), 10000);
          console.log('🔄 Student retrying session join in', retryDelay, 'ms, attempt:', sessionRetryCount + 1);
          setTimeout(() => {
            if (sessionRetryCount < 10) { // Limit retries to prevent infinite loop
              sdk.joinSession(userName, role, sessionName);
            } else {
              setError('Unable to join session. Please refresh the page and try again.');
            }
          }, retryDelay);
          return;
        }

        // Use the coordinated session details
        const topic = sessionResult.sessionId;
        const sessionDisplayName = sessionResult.sessionName;

        // Validate session configuration
        const validation = validateSessionConfig({
          sessionName: topic,
          userName: sanitizedUserName,
          role: isHost ? 1 : 0,
          password: ZOOM_CONFIG.password
        });

        if (!validation.isValid) {
          throw new Error(`Session validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.warn('Session validation warnings:', validation.warnings);
        }

        console.log('🔧 Final session details:', {
          topic,
          sessionDisplayName,
          userName: sanitizedUserName,
          isHost,
          sessionKey: ZOOM_CONFIG.password
        });

        // Generate token (in production, this should come from your backend)
        const token = await generateSessionToken(
          topic,
          isHost ? 1 : 0,
          ZOOM_CONFIG.password,
          sanitizedUserName
        );

        console.log('🔧 Generated token:', token ? 'Success' : 'Failed');

        // Validate token before attempting to join
        if (!token || token.split('.').length !== 3) {
          throw new Error('Invalid token format received');
        }

        await zoomSDK.current.joinSession(topic, token, sanitizedUserName, isHost);

        // Set connection state immediately after successful join
        setConnectionState('Connected' as ConnectionState);
        console.log('✅ Successfully joined Zoom session!');

        // Get session info
        const sessionInfo = zoomSDK.current.getSessionInfo();
        if (sessionInfo) {
          setCurrentUser({
            id: sessionInfo.userId,
            role: isHost ? 'coach' : 'student',
          });

          if (isHost) {
            setSpotlightedParticipant(sessionInfo.userId);
          }
        }

        // Update session info with real data
        setClassSession(prev => ({
          ...prev,
          id: topic,
          title: `Live Fitness Session - ${sessionDisplayName}`,
          startTime: new Date(),
          currentExercise: isHost ? 'Full Body Workout' : 'Joining session...',
        }));

        // For students, add multiple transition mechanisms for reliability
        if (!isHost) {
          // Immediate transition
          setTimeout(() => {
            setClassSession(prev => ({
              ...prev,
              currentExercise: 'Full Body Workout',
              title: 'Live Fitness Session - Active Workout'
            }));
            console.log('🏃 Student session state updated to active (2s timeout)');
          }, 2000);

          // Backup transition for students joining existing sessions
          setTimeout(() => {
            setClassSession(prev => {
              if (prev.currentExercise === 'Joining session...' || prev.title === 'Connecting to Session...') {
                console.log('🔄 Backup transition: Student joining existing active session');
                return {
                  ...prev,
                  currentExercise: 'Full Body Workout',
                  title: 'Live Fitness Session - Active Workout'
                };
              }
              return prev;
            });
          }, 5000); // Longer timeout for slower connections
        }

        // Get initial participants (this may fail but shouldn't prevent connection)
        try {
          const allParticipants = zoomSDK.current.getAllParticipants();
          setParticipants(allParticipants);
        } catch (participantError) {
          console.warn('Could not get initial participants:', participantError);
          // Initialize with empty array, participants will be updated via events
          setParticipants([]);
        }

        // Clear any previous errors on successful connection
        setError(null);

        // Auto-start video and audio for fitness sessions
        try {
          console.log('🎥 Auto-starting video and audio...');
          await zoomSDK.current.startVideo();
          await zoomSDK.current.unmuteAudio();
          setIsLocalVideoOn(true);
          setIsLocalAudioOn(true);

          // Force refresh participants to trigger video rendering
          setTimeout(() => {
            try {
              const updatedParticipants = zoomSDK.current?.getAllParticipants() || [];
              setParticipants(updatedParticipants);
              console.log('🔄 Refreshed participants for video rendering:', updatedParticipants.length);

              // If student, always update session state to active after successful join
              if (!isHost) {
                setClassSession(prev => ({
                  ...prev,
                  currentExercise: 'Full Body Workout',
                  title: 'Live Fitness Session - Active Workout'
                }));
                console.log('🏃 Student session now active - after successful join');
              }
            } catch (e) {
              console.warn('Could not refresh participants:', e);
            }
          }, 1000);

          console.log('✅ Video and audio started successfully');
        } catch (mediaError) {
          console.warn('Could not auto-start media (permissions may be needed):', mediaError);
          // This is non-critical - users can manually enable via UI controls
        }
      } catch (err) {
        console.error('❌ Failed to join session:', err);
        console.error('❌ Join failure context:', {
          topic,
          userName,
          isHost,
          sessionDisplayName,
          currentState: connectionState
        });

        // Handle Zoom SDK specific errors
        if (err && typeof err === 'object' && 'type' in err) {
          const zoomError = err as { type: string; reason?: string };
          console.error('❌ Zoom SDK Error Details:', zoomError);

          if (zoomError.type === 'IMPROPER_MEETING_STATE' && zoomError.reason === 'closed') {
            if (role === 'coach') {
              // Host should try again immediately - session creation issue
              console.log('🔄 Host session creation failed, retrying...');
              setError('Session creation failed. Retrying...');
              isRetryingAsHost = true;

              // Retry as host after short delay
              setTimeout(async () => {
                try {
                  setIsConnecting(true);
                  const retryToken = await generateSessionToken(topic, 1, ZOOM_CONFIG.password, sanitizedUserName);
                  await zoomSDK.current!.joinSession(topic, retryToken, sanitizedUserName, true);

                  // Set connection state immediately after successful join
                  setConnectionState('Connected' as ConnectionState);
                  console.log('✅ Successfully joined Zoom session on retry!');

                  // Success - update session state
                  const sessionInfo = zoomSDK.current!.getSessionInfo();
                  if (sessionInfo) {
                    setCurrentUser({ id: sessionInfo.userId, role: 'coach' });
                    setSpotlightedParticipant(sessionInfo.userId);
                  }
                  setClassSession(prev => ({ ...prev, id: topic, title: `Live Fitness Session - ${topic}`, startTime: new Date() }));
                  setError(null);

                  // Auto-start video and audio for retry case
                  try {
                    console.log('🎥 Auto-starting video and audio (retry)...');
                    await zoomSDK.current!.startVideo();
                    await zoomSDK.current!.unmuteAudio();
                    setIsLocalVideoOn(true);
                    setIsLocalAudioOn(true);

                    // Force refresh participants for retry case
                    setTimeout(() => {
                      try {
                        const updatedParticipants = zoomSDK.current?.getAllParticipants() || [];
                        setParticipants(updatedParticipants);
                        console.log('🔄 Refreshed participants for video rendering (retry):', updatedParticipants.length);
                      } catch (e) {
                        console.warn('Could not refresh participants on retry:', e);
                      }
                    }, 1000);

                    console.log('✅ Video and audio started successfully (retry)');
                  } catch (mediaError) {
                    console.warn('Could not auto-start media on retry:', mediaError);
                  }
                } catch (retryErr) {
                  console.error('Host retry failed:', retryErr);
                  setError('Unable to create session. Please check your configuration and try again.');
                } finally {
                  setIsConnecting(false);
                }
              }, 1000);
              return; // Don't set error state immediately, let retry run
            } else {
              // Student should wait for host
              setError('Session not started yet. Please wait for the instructor to begin the class.');
            }
          } else if (zoomError.type === 'INVALID_PARAMETER') {
            setError('Session configuration error. Please check your setup and try again.');
          } else {
            setError(`Zoom error: ${zoomError.type} ${zoomError.reason ? `- ${zoomError.reason}` : ''}`);
          }
        } else {
          // Handle other error types including session coordination errors
          const errorMessage = err instanceof Error ? err.message : 'Failed to join session';

          // Check for session coordination specific errors
          if (errorMessage.includes('Session not available yet') ||
              errorMessage.includes('Please wait for the instructor')) {
            // Student trying to join before coach - this is handled by the retry logic above
            setError(errorMessage);
          } else if (errorMessage.includes('token')) {
            setError('Authentication failed. Please check your credentials and try again.');
          } else if (errorMessage.includes('network')) {
            setError('Network error. Please check your internet connection.');
          } else if (errorMessage.includes('browser')) {
            setError('Browser not supported. Please use Chrome, Firefox, or Safari.');
          } else if (errorMessage.includes('Session is at full capacity')) {
            setError('This class is full. Please try joining another session.');
          } else {
            setError(errorMessage);
          }
        }

        // Attempt to clean up on failure
        if (zoomSDK.current) {
          await zoomSDK.current.leaveSession().catch(() => {});
        }
      } finally {
        // Only set isConnecting to false if we're not doing a host retry
        if (!isRetryingAsHost) {
          setIsConnecting(false);
        }
      }
    },

    leaveSession: async () => {
      if (!zoomSDK.current) return;

      try {
        await zoomSDK.current.leaveSession();

        // Clean up session management
        if (currentUser) {
          const sessionId = classSession.id;
          const userId = currentUser.id;
          await simpleSessionManager.leaveSession(sessionId, userId);
          console.log('🚪 Left session via session manager:', { sessionId, userId });
        }

        setParticipants([]);
        setCurrentUser(null);
        setConnectionState(null);
        setError(null);
      } catch (err) {
        console.error('Error leaving session:', err);
      }
    },

    // Video/Audio controls
    toggleVideo: async () => {
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
    },

    toggleAudio: async () => {
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
    },

    // View controls
    switchToGalleryView: () => setViewMode('gallery'),

    switchToSpotlightView: (participantId: string) => {
      setViewMode('spotlight');
      setSpotlightedParticipant(participantId);
    },

    // Coach controls
    muteParticipant: async (participantId: string) => {
      if (!zoomSDK.current || currentUser?.role !== 'coach') return;

      try {
        await zoomSDK.current.muteParticipant(participantId);
        setParticipants(prev =>
          prev.map(p => p.id === participantId ? { ...p, isAudioOn: false } : p)
        );
      } catch (err) {
        console.error('Error muting participant:', err);
      }
    },

    muteAll: async () => {
      if (!zoomSDK.current || currentUser?.role !== 'coach') return;

      try {
        await zoomSDK.current.muteAllParticipants(true);
        setParticipants(prev =>
          prev.map(p => p.isHost ? p : { ...p, isAudioOn: false })
        );
      } catch (err) {
        console.error('Error muting all:', err);
      }
    },

    removeParticipant: async (participantId: string) => {
      if (!zoomSDK.current || currentUser?.role !== 'coach') return;

      try {
        await zoomSDK.current.removeParticipant(participantId);
        setParticipants(prev => prev.filter(p => p.id !== participantId));
      } catch (err) {
        console.error('Error removing participant:', err);
      }
    },

    spotlightParticipant: async (participantId: string) => {
      setSpotlightedParticipant(participantId);
      setViewMode('spotlight');
    },

    // Recording
    startRecording: async () => {
      if (!zoomSDK.current || currentUser?.role !== 'coach') return;

      try {
        await zoomSDK.current.startRecording();
        setClassSession(prev => ({ ...prev, isRecording: true }));
      } catch (err) {
        console.error('Error starting recording:', err);
      }
    },

    stopRecording: async () => {
      if (!zoomSDK.current || currentUser?.role !== 'coach') return;

      try {
        await zoomSDK.current.stopRecording();
        setClassSession(prev => ({ ...prev, isRecording: false }));
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    },

    // Chat
    sendChatMessage: async (message: string, toUserId?: string) => {
      if (!zoomSDK.current) return;

      try {
        await zoomSDK.current.sendChatMessage(message, toUserId);
      } catch (err) {
        console.error('Error sending message:', err);
      }
    },

    // Screen sharing
    startScreenShare: async () => {
      if (!zoomSDK.current) return;

      try {
        await zoomSDK.current.startScreenShare();
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    },

    stopScreenShare: async () => {
      if (!zoomSDK.current) return;

      try {
        await zoomSDK.current.stopScreenShare();
      } catch (err) {
        console.error('Error stopping screen share:', err);
      }
    },

    // Fitness-specific
    setCoachMode: (mode: CoachMode) => {
      setClassSession(prev => ({ ...prev, coachMode: mode }));
    },

    setExerciseContent: (content: ExerciseContent) => {
      setClassSession(prev => ({
        ...prev,
        currentExerciseContent: content,
        currentExercise: content.name,
        exerciseGifUrl: content.gifUrl,
        exerciseBenefits: content.benefits,
      }));
      setExerciseTimer(180); // Reset timer
    },

    highlightLevel: (level: StudentLevel | null) => {
      setHighlightedLevel(level);
    },

    raiseHand: () => {
      if (!currentUser) return;
      setParticipants(prev =>
        prev.map(p =>
          p.id === currentUser.id
            ? { ...p, hasRaisedHand: !p.hasRaisedHand }
            : p
        )
      );
    },
  };

  // Helper methods
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentUser = () => {
    if (!currentUser) return null;
    return participants.find(p => p.id === currentUser.id);
  };

  const getSpotlightedParticipant = () => {
    return participants.find(p => p.id === spotlightedParticipant);
  };

  const getParticipantsByLevel = (level: StudentLevel) => {
    return participants.filter(p => p.level === level);
  };

  const getStudentLevels = (): StudentLevel[] => {
    return ['beginner', 'intermediate', 'advanced'];
  };

  return {
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

    // SDK instance for direct access
    zoomSDK: zoomSDK.current,

    // Methods
    sdk,
    setCurrentUser,
    setViewMode,
    formatTime,
    getCurrentUser,
    getSpotlightedParticipant,
    getParticipantsByLevel,
    getStudentLevels,

    // Mock SDK methods for compatibility with existing components
    mockSDK: {
      muteLocalAudio: () => sdk.toggleAudio(),
      unmuteLocalAudio: () => sdk.toggleAudio(),
      startVideo: () => sdk.toggleVideo(),
      stopVideo: () => sdk.toggleVideo(),
      switchToGalleryView: () => setViewMode('gallery'),
      switchToSpotlightView: (participantId: string) => {
        setViewMode('spotlight');
        setSpotlightedParticipant(participantId);
      },
      sendChatMessage: (message: string) => sdk.sendChatMessage(message),
      muteParticipant: (participantId: string) => sdk.muteParticipant(participantId),
      muteAll: () => sdk.muteAllParticipants(),
      removeParticipant: (participantId: string) => sdk.removeParticipant(participantId),
      spotlightParticipant: (participantId: string) => sdk.spotlightParticipant(participantId),
      raiseHand: () => {
        // Implementation for raise hand
      },
      setCoachMode: (mode: 'teach' | 'workout') => {
        setClassSession(prev => ({ ...prev, coachMode: mode }));
      },
      setExerciseContent: (content: any) => {
        setClassSession(prev => ({
          ...prev,
          currentExerciseContent: content,
          currentExercise: content.name,
          exerciseGifUrl: content.gifUrl,
          exerciseBenefits: content.benefits
        }));
      },
      highlightLevel: (level: any) => {
        setHighlightedLevel(level);
      },
    }
  };
}