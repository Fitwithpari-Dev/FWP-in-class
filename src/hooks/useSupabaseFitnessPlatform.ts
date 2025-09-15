// Enhanced FitWithPari hook with Supabase integration
// Replaces mock data with real-time Supabase backend

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile, ClassSession as DBClassSession, SessionParticipant } from '../lib/supabase/supabase-client'
import { realtimeManager, realtimeActions } from '../lib/supabase/realtime-subscriptions'
import type {
  Participant,
  ClassSession,
  ViewMode,
  UserRole,
  CoachMode,
  StudentLevel,
  ExerciseContent,
  HealthConsideration
} from '../types/fitness-platform'

interface UseSupabaseFitnessPlatformProps {
  sessionId?: string
  autoJoin?: boolean
}

export function useSupabaseFitnessPlatform({
  sessionId,
  autoJoin = false
}: UseSupabaseFitnessPlatformProps = {}) {
  // Core state
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [classSession, setClassSession] = useState<ClassSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('gallery')
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(true)
  const [isLocalAudioOn, setIsLocalAudioOn] = useState(true)
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string>('')
  const [highlightedLevel, setHighlightedLevel] = useState<StudentLevel | null>(null)

  // Session timers
  const [elapsedTime, setElapsedTime] = useState(0)
  const [exerciseTimer, setExerciseTimer] = useState(0)

  // Initialize auth and user profile
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          setUser(authUser)
          await loadUserProfile(authUser.id)
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user)
              await loadUserProfile(session.user.id)
            } else if (event === 'SIGNED_OUT') {
              setUser(null)
              setUserProfile(null)
              setParticipants([])
              setClassSession(null)
            }
          }
        )

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError('Failed to initialize authentication')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Load session data when sessionId changes
  useEffect(() => {
    if (sessionId && userProfile) {
      loadSessionData(sessionId)
      if (autoJoin) {
        joinSession()
      }
    }
  }, [sessionId, userProfile, autoJoin])

  // Setup real-time subscriptions
  useEffect(() => {
    if (sessionId && userProfile) {
      const callbacks = {
        onParticipantJoined: (participant: Participant) => {
          setParticipants(prev => {
            const exists = prev.some(p => p.id === participant.id)
            if (exists) return prev
            return [...prev, participant]
          })
        },
        onParticipantLeft: (participantId: string) => {
          setParticipants(prev => prev.filter(p => p.id !== participantId))
        },
        onParticipantUpdated: (update: any) => {
          setParticipants(prev => prev.map(p => {
            if (p.id === update.user_id) {
              return {
                ...p,
                isVideoOn: update.update_data?.is_video_on ?? p.isVideoOn,
                isAudioOn: update.update_data?.is_audio_on ?? p.isAudioOn,
                connectionQuality: update.update_data?.connection_quality ?? p.connectionQuality,
                hasRaisedHand: update.update_data?.has_raised_hand ?? p.hasRaisedHand,
                repCount: update.update_data?.current_rep_count ?? p.repCount,
                variation: update.update_data?.current_variation ?? p.variation
              }
            }
            return p
          }))
        },
        onMessageReceived: (message: any) => {
          // Handle chat messages if needed
          console.log('Message received:', message)
        },
        onExerciseChanged: (sessionUpdate: any) => {
          if (classSession) {
            setClassSession(prev => prev ? {
              ...prev,
              currentExercise: sessionUpdate.current_exercise || prev.currentExercise,
              exerciseTimer: sessionUpdate.exercise_timer ?? prev.exerciseTimer,
              coachMode: sessionUpdate.coach_mode || prev.coachMode
            } : null)

            if (sessionUpdate.exercise_timer) {
              setExerciseTimer(sessionUpdate.exercise_timer)
            }
          }
        },
        onHandRaised: (participantId: string, raised: boolean) => {
          setParticipants(prev => prev.map(p =>
            p.id === participantId ? { ...p, hasRaisedHand: raised } : p
          ))
        }
      }

      realtimeManager.subscribeToSession(sessionId, callbacks)

      return () => {
        realtimeManager.unsubscribeFromSession(sessionId)
      }
    }
  }, [sessionId, userProfile, classSession])

  // Timer effects
  useEffect(() => {
    if (classSession?.startTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(classSession.startTime).getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [classSession?.startTime])

  useEffect(() => {
    if (exerciseTimer > 0) {
      const interval = setInterval(() => {
        setExerciseTimer(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [exerciseTimer])

  // Helper functions
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return
      }

      setUserProfile(data)
    } catch (err) {
      console.error('Error in loadUserProfile:', err)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    try {
      setIsLoading(true)

      // Load session details with exercise content
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          exercise_content (
            name,
            gif_url,
            benefits,
            target_audience,
            key_points
          ),
          user_profiles!class_sessions_coach_id_fkey (
            full_name,
            role
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError('Failed to load session data')
        return
      }

      // Transform database session to component format
      const transformedSession: ClassSession = {
        id: sessionData.id,
        title: sessionData.title,
        startTime: new Date(sessionData.scheduled_start_time),
        duration: sessionData.scheduled_duration,
        isRecording: sessionData.is_recording,
        currentExercise: sessionData.exercise_content?.name || '',
        exerciseTimer: sessionData.exercise_timer,
        coachMode: sessionData.coach_mode as CoachMode,
        exerciseGifUrl: sessionData.exercise_content?.gif_url || '',
        exerciseBenefits: sessionData.exercise_content?.benefits || '',
        currentExerciseContent: sessionData.exercise_content ? {
          name: sessionData.exercise_content.name,
          gifUrl: sessionData.exercise_content.gif_url,
          benefits: sessionData.exercise_content.benefits,
          targetAudience: sessionData.exercise_content.target_audience as StudentLevel,
          keyPoints: sessionData.exercise_content.key_points || []
        } : undefined
      }

      setClassSession(transformedSession)
      setExerciseTimer(sessionData.exercise_timer)

      // Load session participants
      await loadSessionParticipants(sessionId)

    } catch (err) {
      console.error('Error loading session data:', err)
      setError('Failed to load session data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionParticipants = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          *,
          user_profiles (
            full_name,
            role,
            fitness_level,
            avatar_url
          ),
          health_considerations (
            type,
            title,
            description,
            severity,
            recommended_modifications,
            affected_exercises
          )
        `)
        .eq('session_id', sessionId)
        .is('left_at', null) // Only active participants

      if (error) {
        console.error('Error loading participants:', error)
        return
      }

      const transformedParticipants: Participant[] = data.map(p => ({
        id: p.user_id,
        name: p.user_profiles.full_name,
        isVideoOn: p.is_video_on,
        isAudioOn: p.is_audio_on,
        isHost: p.user_profiles.role === 'coach',
        connectionQuality: p.connection_quality as 'excellent' | 'good' | 'poor',
        hasRaisedHand: p.has_raised_hand,
        variation: p.current_variation || undefined,
        repCount: p.current_rep_count || undefined,
        level: p.user_profiles.fitness_level as StudentLevel,
        healthConsiderations: p.health_considerations?.map((hc: any) => ({
          type: hc.type as 'injury' | 'condition' | 'modification' | 'preference',
          description: hc.description,
          affectedExercises: hc.affected_exercises || [],
          severity: hc.severity as 'low' | 'medium' | 'high',
          recommendedModifications: hc.recommended_modifications || []
        })) || []
      }))

      setParticipants(transformedParticipants)

      // Set initial spotlight to coach
      const coach = transformedParticipants.find(p => p.isHost)
      if (coach) {
        setSpotlightedParticipant(coach.id)
      }

    } catch (err) {
      console.error('Error loading participants:', err)
    }
  }

  // Action functions
  const joinSession = useCallback(async () => {
    if (!sessionId || !userProfile) return

    try {
      await realtimeActions.joinSession(sessionId, userProfile.id, {
        isVideoOn: isLocalVideoOn,
        isAudioOn: isLocalAudioOn,
        connectionQuality: 'good'
      })
    } catch (error) {
      console.error('Error joining session:', error)
      setError('Failed to join session')
    }
  }, [sessionId, userProfile, isLocalVideoOn, isLocalAudioOn])

  const leaveSession = useCallback(async () => {
    if (!sessionId || !userProfile) return

    try {
      await realtimeActions.leaveSession(sessionId, userProfile.id)
      // Cleanup local state
      realtimeManager.unsubscribeFromSession(sessionId)
    } catch (error) {
      console.error('Error leaving session:', error)
    }
  }, [sessionId, userProfile])

  const updateParticipantStatus = useCallback(async (updates: {
    isVideoOn?: boolean
    isAudioOn?: boolean
    currentRepCount?: number
    currentVariation?: string
  }) => {
    if (!sessionId || !userProfile) return

    try {
      await realtimeActions.updateParticipant(sessionId, userProfile.id, updates)

      // Update local state immediately for better UX
      if ('isVideoOn' in updates) setIsLocalVideoOn(updates.isVideoOn!)
      if ('isAudioOn' in updates) setIsLocalAudioOn(updates.isAudioOn!)

    } catch (error) {
      console.error('Error updating participant:', error)
    }
  }, [sessionId, userProfile])

  const toggleLocalVideo = useCallback(() => {
    const newVideoState = !isLocalVideoOn
    updateParticipantStatus({ isVideoOn: newVideoState })
  }, [isLocalVideoOn, updateParticipantStatus])

  const toggleLocalAudio = useCallback(() => {
    const newAudioState = !isLocalAudioOn
    updateParticipantStatus({ isAudioOn: newAudioState })
  }, [isLocalAudioOn, updateParticipantStatus])

  const raiseHand = useCallback(async () => {
    if (!sessionId || !userProfile) return

    const currentUser = participants.find(p => p.id === userProfile.id)
    const newHandState = !currentUser?.hasRaisedHand

    try {
      await realtimeActions.raiseHand(sessionId, userProfile.id, newHandState)
    } catch (error) {
      console.error('Error raising hand:', error)
    }
  }, [sessionId, userProfile, participants])

  const sendMessage = useCallback(async (message: string) => {
    if (!sessionId || !userProfile) return

    try {
      await realtimeActions.sendMessage(sessionId, userProfile.id, message)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [sessionId, userProfile])

  const updateExercise = useCallback(async (exerciseData: {
    exerciseId?: string
    currentExercise?: string
    exerciseTimer?: number
    coachMode?: CoachMode
  }) => {
    if (!sessionId || !userProfile || userProfile.role !== 'coach') return

    try {
      await realtimeActions.updateExercise(sessionId, userProfile.id, exerciseData)
    } catch (error) {
      console.error('Error updating exercise:', error)
    }
  }, [sessionId, userProfile])

  // Coach-only functions
  const coachActions = {
    muteParticipant: async (participantId: string) => {
      // This would be handled by Zoom SDK in real implementation
      console.log('Mute participant:', participantId)
    },

    muteAll: async () => {
      console.log('Mute all participants')
    },

    removeParticipant: async (participantId: string) => {
      console.log('Remove participant:', participantId)
    },

    spotlightParticipant: (participantId: string) => {
      setSpotlightedParticipant(participantId)
      setViewMode('spotlight')
    },

    setCoachMode: (mode: CoachMode) => {
      updateExercise({ coachMode: mode })
    },

    setExerciseContent: async (content: ExerciseContent) => {
      await updateExercise({
        currentExercise: content.name,
        exerciseTimer: 180 // Default 3 minutes
      })
    },

    highlightLevel: (level: StudentLevel | null) => {
      setHighlightedLevel(level)
    }
  }

  // Utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentUser = () => {
    if (!userProfile) return null
    return participants.find(p => p.id === userProfile.id)
  }

  const getSpotlightedParticipant = () => {
    return participants.find(p => p.id === spotlightedParticipant)
  }

  const getParticipantsByLevel = (level: StudentLevel) => {
    return participants.filter(p => p.level === level)
  }

  const getStudentLevels = (): StudentLevel[] => {
    return ['beginner', 'intermediate', 'advanced']
  }

  return {
    // User state
    user,
    userProfile,
    currentUser: {
      id: userProfile?.id || '',
      role: (userProfile?.role || 'student') as UserRole
    },

    // Session state
    participants,
    classSession,
    viewMode,
    isLocalVideoOn,
    isLocalAudioOn,
    spotlightedParticipant,
    highlightedLevel,

    // Timers
    elapsedTime,
    exerciseTimer,

    // Loading and error states
    isLoading,
    error,

    // Actions
    joinSession,
    leaveSession,
    toggleLocalVideo,
    toggleLocalAudio,
    raiseHand,
    sendMessage,
    updateExercise,

    // UI actions
    setViewMode,
    setCurrentUser: () => {}, // Not needed with Supabase auth

    // Coach actions
    mockSDK: {
      ...coachActions,
      muteLocalAudio: () => toggleLocalAudio(),
      unmuteLocalAudio: () => toggleLocalAudio(),
      startVideo: () => updateParticipantStatus({ isVideoOn: true }),
      stopVideo: () => updateParticipantStatus({ isVideoOn: false }),
      switchToGalleryView: () => setViewMode('gallery'),
      switchToSpotlightView: (participantId: string) => {
        setViewMode('spotlight')
        setSpotlightedParticipant(participantId)
      },
      sendChatMessage: sendMessage,
      raiseHand
    },

    // Utility functions
    formatTime,
    getCurrentUser,
    getSpotlightedParticipant,
    getParticipantsByLevel,
    getStudentLevels,

    // Clear error
    clearError: () => setError(null)
  }
}