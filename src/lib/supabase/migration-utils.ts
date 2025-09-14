// Migration utilities for transitioning from mock data to Supabase
// Helper functions to gradually integrate Supabase backend

import { supabase, UserProfile, ClassSession as DBClassSession } from './supabase-client'
import { AuthService } from './auth'
import type {
  Participant,
  ClassSession,
  HealthConsideration,
  ExerciseContent,
  StudentLevel,
  UserRole
} from '../../types/fitness-platform'

export class MigrationUtils {
  // Check if we should use Supabase or mock data
  static shouldUseSupabase(): boolean {
    return process.env.NODE_ENV === 'production' ||
           process.env.REACT_APP_USE_SUPABASE === 'true' ||
           process.env.NEXT_PUBLIC_USE_SUPABASE === 'true'
  }

  // Migrate mock participant data to Supabase user profiles
  static async migrateMockUsers(mockParticipants: Participant[]): Promise<UserProfile[]> {
    const migratedUsers: UserProfile[] = []

    for (const participant of mockParticipants) {
      try {
        // Skip if user already exists
        const existingUser = await AuthService.getUserProfile(participant.id)
        if (existingUser) {
          migratedUsers.push(existingUser)
          continue
        }

        // Create user profile (this would typically be done through signup)
        const userData = {
          id: participant.id,
          email: this.generateEmailFromName(participant.name),
          full_name: participant.name,
          role: participant.isHost ? 'coach' : 'student' as UserRole,
          fitness_level: participant.level as StudentLevel,
          is_active: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .insert(userData)
          .select()
          .single()

        if (error) {
          console.error(`Failed to migrate user ${participant.name}:`, error)
          continue
        }

        // Migrate health considerations if any
        if (participant.healthConsiderations?.length) {
          await this.migrateHealthConsiderations(participant.id, participant.healthConsiderations)
        }

        migratedUsers.push(data)
      } catch (error) {
        console.error(`Error migrating user ${participant.name}:`, error)
      }
    }

    return migratedUsers
  }

  // Migrate health considerations
  private static async migrateHealthConsiderations(
    userId: string,
    considerations: HealthConsideration[]
  ) {
    for (const consideration of considerations) {
      try {
        await supabase
          .from('health_considerations')
          .insert({
            user_id: userId,
            type: consideration.type,
            title: consideration.description.substring(0, 50), // Use first part as title
            description: consideration.description,
            affected_exercises: consideration.affectedExercises,
            severity: consideration.severity,
            recommended_modifications: consideration.recommendedModifications,
            is_active: true
          })
      } catch (error) {
        console.error(`Failed to migrate health consideration for user ${userId}:`, error)
      }
    }
  }

  // Migrate mock class session to Supabase
  static async migrateMockSession(mockSession: ClassSession, coachId: string): Promise<string | null> {
    try {
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('id', mockSession.id)
        .single()

      if (existingSession) {
        return existingSession.id
      }

      // Create new session
      const sessionData = {
        id: mockSession.id,
        title: mockSession.title,
        description: `Migrated session: ${mockSession.title}`,
        coach_id: coachId,
        scheduled_start_time: mockSession.startTime.toISOString(),
        scheduled_duration: mockSession.duration,
        actual_start_time: mockSession.startTime.toISOString(),
        status: 'live' as const,
        max_participants: 20,
        is_recording: mockSession.isRecording,
        exercise_timer: mockSession.exerciseTimer || 0,
        coach_mode: mockSession.coachMode || 'teach',
        is_public: true
      }

      const { data, error } = await supabase
        .from('class_sessions')
        .insert(sessionData)
        .select('id')
        .single()

      if (error) {
        console.error('Failed to migrate session:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error migrating session:', error)
      return null
    }
  }

  // Migrate session participants
  static async migrateSessionParticipants(
    sessionId: string,
    participants: Participant[]
  ) {
    for (const participant of participants) {
      try {
        const participantData = {
          session_id: sessionId,
          user_id: participant.id,
          joined_at: new Date().toISOString(),
          is_video_on: participant.isVideoOn,
          is_audio_on: participant.isAudioOn,
          connection_quality: participant.connectionQuality,
          has_raised_hand: participant.hasRaisedHand,
          current_variation: participant.variation,
          current_rep_count: participant.repCount || 0
        }

        await supabase
          .from('session_participants')
          .upsert(participantData, {
            onConflict: 'session_id,user_id'
          })

      } catch (error) {
        console.error(`Failed to migrate participant ${participant.name}:`, error)
      }
    }
  }

  // Create sample exercise content if it doesn't exist
  static async createSampleExerciseContent(): Promise<void> {
    const sampleExercises: Array<{
      name: string
      description: string
      benefits: string
      target_audience: StudentLevel
      key_points: string[]
      difficulty_rating: number
    }> = [
      {
        name: 'Push-ups',
        description: 'Classic bodyweight exercise for upper body strength',
        benefits: 'Build upper body and core strength, improve posture, and enhance functional movement patterns.',
        target_audience: 'beginner',
        key_points: [
          'Keep your body in a straight line from head to heels',
          'Lower your chest to within an inch of the floor',
          'Push through your palms, not fingertips',
          'Engage your core throughout the movement'
        ],
        difficulty_rating: 2
      },
      {
        name: 'Squats',
        description: 'Fundamental lower body exercise',
        benefits: 'Strengthen glutes, quadriceps, and core while improving functional movement',
        target_audience: 'beginner',
        key_points: [
          'Keep feet shoulder-width apart',
          'Lower until thighs are parallel to floor',
          'Keep knees aligned with toes',
          'Drive through heels to stand'
        ],
        difficulty_rating: 2
      },
      {
        name: 'Plank',
        description: 'Core strengthening isometric exercise',
        benefits: 'Build core strength, improve posture, and enhance stability',
        target_audience: 'beginner',
        key_points: [
          'Maintain straight line from head to heels',
          'Engage core muscles',
          'Keep shoulders over elbows',
          'Breathe normally'
        ],
        difficulty_rating: 1
      },
      {
        name: 'Burpees',
        description: 'High-intensity full-body exercise',
        benefits: 'Improve cardiovascular fitness, build strength, and enhance coordination',
        target_audience: 'intermediate',
        key_points: [
          'Start in standing position',
          'Drop to squat and place hands on floor',
          'Jump feet back to plank',
          'Jump feet forward and stand'
        ],
        difficulty_rating: 4
      }
    ]

    for (const exercise of sampleExercises) {
      try {
        // Check if exercise already exists
        const { data: existing } = await supabase
          .from('exercise_content')
          .select('id')
          .eq('name', exercise.name)
          .single()

        if (!existing) {
          await supabase
            .from('exercise_content')
            .insert({
              name: exercise.name,
              description: exercise.description,
              benefits: exercise.benefits,
              target_audience: exercise.target_audience,
              key_points: exercise.key_points,
              equipment_needed: ['none'],
              difficulty_rating: exercise.difficulty_rating,
              estimated_duration: 180, // 3 minutes default
              is_active: true
            })
        }
      } catch (error) {
        console.error(`Failed to create exercise ${exercise.name}:`, error)
      }
    }
  }

  // Transform Supabase session data to component format
  static transformSupabaseSession(dbSession: any): ClassSession {
    return {
      id: dbSession.id,
      title: dbSession.title,
      startTime: new Date(dbSession.scheduled_start_time),
      duration: dbSession.scheduled_duration,
      isRecording: dbSession.is_recording,
      currentExercise: dbSession.exercise_content?.name || '',
      exerciseTimer: dbSession.exercise_timer,
      coachMode: dbSession.coach_mode,
      exerciseGifUrl: dbSession.exercise_content?.gif_url || '',
      exerciseBenefits: dbSession.exercise_content?.benefits || '',
      currentExerciseContent: dbSession.exercise_content ? {
        name: dbSession.exercise_content.name,
        gifUrl: dbSession.exercise_content.gif_url,
        benefits: dbSession.exercise_content.benefits,
        targetAudience: dbSession.exercise_content.target_audience,
        keyPoints: dbSession.exercise_content.key_points || []
      } : undefined
    }
  }

  // Transform Supabase participant data to component format
  static transformSupabaseParticipant(dbParticipant: any): Participant {
    return {
      id: dbParticipant.user_id,
      name: dbParticipant.user_profiles.full_name,
      isVideoOn: dbParticipant.is_video_on,
      isAudioOn: dbParticipant.is_audio_on,
      isHost: dbParticipant.user_profiles.role === 'coach',
      connectionQuality: dbParticipant.connection_quality,
      hasRaisedHand: dbParticipant.has_raised_hand,
      variation: dbParticipant.current_variation,
      repCount: dbParticipant.current_rep_count,
      level: dbParticipant.user_profiles.fitness_level,
      healthConsiderations: dbParticipant.health_considerations?.map((hc: any) => ({
        type: hc.type,
        description: hc.description,
        affectedExercises: hc.affected_exercises || [],
        severity: hc.severity,
        recommendedModifications: hc.recommended_modifications || []
      })) || [],
      medicalNotes: dbParticipant.user_profiles.medical_notes
    }
  }

  // Helper function to generate email from name
  private static generateEmailFromName(name: string): string {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.')
    return `${cleanName}@fitwithpari.local`
  }

  // Validate that all required tables exist and are accessible
  static async validateSupabaseSetup(): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // Test user_profiles table
      const { error: profilesError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)

      if (profilesError) {
        errors.push(`user_profiles table: ${profilesError.message}`)
      }

      // Test class_sessions table
      const { error: sessionsError } = await supabase
        .from('class_sessions')
        .select('id')
        .limit(1)

      if (sessionsError) {
        errors.push(`class_sessions table: ${sessionsError.message}`)
      }

      // Test session_participants table
      const { error: participantsError } = await supabase
        .from('session_participants')
        .select('id')
        .limit(1)

      if (participantsError) {
        errors.push(`session_participants table: ${participantsError.message}`)
      }

      // Test auth
      const { error: authError } = await supabase.auth.getUser()
      if (authError && authError.message !== 'Invalid JWT') {
        errors.push(`Authentication: ${authError.message}`)
      }

    } catch (error) {
      errors.push(`Connection error: ${error}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Setup development data
  static async setupDevelopmentData(): Promise<void> {
    try {
      console.log('Setting up development data...')

      // Create sample exercise content
      await this.createSampleExerciseContent()

      console.log('Development data setup complete')
    } catch (error) {
      console.error('Failed to setup development data:', error)
    }
  }
}

// Hook for managing migration state
export function useMigration() {
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)
  const [migrationErrors, setMigrationErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const validateSetup = async () => {
      if (MigrationUtils.shouldUseSupabase()) {
        const { isValid, errors } = await MigrationUtils.validateSupabaseSetup()
        setIsSupabaseReady(isValid)
        setMigrationErrors(errors)

        if (isValid && process.env.NODE_ENV === 'development') {
          await MigrationUtils.setupDevelopmentData()
        }
      } else {
        setIsSupabaseReady(false)
      }
      setIsLoading(false)
    }

    validateSetup()
  }, [])

  return {
    isSupabaseReady,
    migrationErrors,
    isLoading,
    shouldUseSupabase: MigrationUtils.shouldUseSupabase()
  }
}