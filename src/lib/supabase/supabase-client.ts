// Supabase Client Configuration for FitWithPari
// Main client setup with TypeScript types

import { createClient } from '@supabase/supabase-js'

// Database type definitions based on our schema
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'coach' | 'student' | 'admin'
          avatar_url: string | null
          phone: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fitness_level: 'beginner' | 'intermediate' | 'advanced' | null
          fitness_goals: string[] | null
          preferred_workout_times: string[] | null
          timezone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'coach' | 'student' | 'admin'
          avatar_url?: string | null
          phone?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null
          fitness_goals?: string[] | null
          preferred_workout_times?: string[] | null
          timezone?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'coach' | 'student' | 'admin'
          avatar_url?: string | null
          phone?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null
          fitness_goals?: string[] | null
          preferred_workout_times?: string[] | null
          timezone?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      health_considerations: {
        Row: {
          id: string
          user_id: string
          type: 'injury' | 'condition' | 'modification' | 'preference'
          title: string
          description: string
          affected_exercises: string[] | null
          severity: 'low' | 'medium' | 'high'
          recommended_modifications: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'injury' | 'condition' | 'modification' | 'preference'
          title: string
          description: string
          affected_exercises?: string[] | null
          severity: 'low' | 'medium' | 'high'
          recommended_modifications?: string[] | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'injury' | 'condition' | 'modification' | 'preference'
          title?: string
          description?: string
          affected_exercises?: string[] | null
          severity?: 'low' | 'medium' | 'high'
          recommended_modifications?: string[] | null
          is_active?: boolean
          updated_at?: string
        }
      }
      exercise_content: {
        Row: {
          id: string
          name: string
          description: string | null
          gif_url: string | null
          video_url: string | null
          benefits: string | null
          target_audience: 'beginner' | 'intermediate' | 'advanced'
          key_points: string[] | null
          equipment_needed: string[] | null
          muscle_groups: string[] | null
          difficulty_rating: number | null
          estimated_duration: number | null
          created_by: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          gif_url?: string | null
          video_url?: string | null
          benefits?: string | null
          target_audience?: 'beginner' | 'intermediate' | 'advanced'
          key_points?: string[] | null
          equipment_needed?: string[] | null
          muscle_groups?: string[] | null
          difficulty_rating?: number | null
          estimated_duration?: number | null
          created_by?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          gif_url?: string | null
          video_url?: string | null
          benefits?: string | null
          target_audience?: 'beginner' | 'intermediate' | 'advanced'
          key_points?: string[] | null
          equipment_needed?: string[] | null
          muscle_groups?: string[] | null
          difficulty_rating?: number | null
          estimated_duration?: number | null
          created_by?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      class_sessions: {
        Row: {
          id: string
          title: string
          description: string | null
          coach_id: string
          scheduled_start_time: string
          scheduled_duration: number
          actual_start_time: string | null
          actual_end_time: string | null
          status: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants: number
          is_recording: boolean
          recording_url: string | null
          zoom_meeting_id: string | null
          zoom_passcode: string | null
          current_exercise_id: string | null
          exercise_timer: number
          coach_mode: 'teach' | 'workout'
          session_notes: string | null
          tags: string[] | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          coach_id: string
          scheduled_start_time: string
          scheduled_duration: number
          actual_start_time?: string | null
          actual_end_time?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants?: number
          is_recording?: boolean
          recording_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          current_exercise_id?: string | null
          exercise_timer?: number
          coach_mode?: 'teach' | 'workout'
          session_notes?: string | null
          tags?: string[] | null
          is_public?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          coach_id?: string
          scheduled_start_time?: string
          scheduled_duration?: number
          actual_start_time?: string | null
          actual_end_time?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants?: number
          is_recording?: boolean
          recording_url?: string | null
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          current_exercise_id?: string | null
          exercise_timer?: number
          coach_mode?: 'teach' | 'workout'
          session_notes?: string | null
          tags?: string[] | null
          is_public?: boolean
          updated_at?: string
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at: string | null
          left_at: string | null
          is_video_on: boolean
          is_audio_on: boolean
          connection_quality: 'excellent' | 'good' | 'poor'
          has_raised_hand: boolean
          current_variation: string | null
          current_rep_count: number
          session_notes: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string | null
          left_at?: string | null
          is_video_on?: boolean
          is_audio_on?: boolean
          connection_quality?: 'excellent' | 'good' | 'poor'
          has_raised_hand?: boolean
          current_variation?: string | null
          current_rep_count?: number
          session_notes?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          joined_at?: string | null
          left_at?: string | null
          is_video_on?: boolean
          is_audio_on?: boolean
          connection_quality?: 'excellent' | 'good' | 'poor'
          has_raised_hand?: boolean
          current_variation?: string | null
          current_rep_count?: number
          session_notes?: string | null
        }
      }
      session_messages: {
        Row: {
          id: string
          session_id: string
          sender_id: string
          message: string
          message_type: string
          is_private: boolean
          recipient_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender_id: string
          message: string
          message_type?: string
          is_private?: boolean
          recipient_id?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          sender_id?: string
          message?: string
          message_type?: string
          is_private?: boolean
          recipient_id?: string | null
        }
      }
      participant_updates: {
        Row: {
          id: string
          session_id: string
          user_id: string
          update_type: string
          update_data: any | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          update_type: string
          update_data?: any | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          update_type?: string
          update_data?: any | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'coach' | 'student' | 'admin'
      student_level: 'beginner' | 'intermediate' | 'advanced'
      connection_quality: 'excellent' | 'good' | 'poor'
      health_consideration_type: 'injury' | 'condition' | 'modification' | 'preference'
      health_severity: 'low' | 'medium' | 'high'
      coach_mode: 'teach' | 'workout'
      session_status: 'scheduled' | 'live' | 'completed' | 'cancelled'
    }
  }
}

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Please check your environment variables.')
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase Anon Key. Please check your environment variables.')
}

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Optimize for fitness sessions with frequent updates
    }
  }
})

// Export types for use in components
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type HealthConsideration = Database['public']['Tables']['health_considerations']['Row']
export type ExerciseContent = Database['public']['Tables']['exercise_content']['Row']
export type ClassSession = Database['public']['Tables']['class_sessions']['Row']
export type SessionParticipant = Database['public']['Tables']['session_participants']['Row']
export type SessionMessage = Database['public']['Tables']['session_messages']['Row']
export type ParticipantUpdate = Database['public']['Tables']['participant_updates']['Row']

// Helper type for user roles
export type UserRole = Database['public']['Enums']['user_role']
export type StudentLevel = Database['public']['Enums']['student_level']
export type ConnectionQuality = Database['public']['Enums']['connection_quality']
export type CoachMode = Database['public']['Enums']['coach_mode']
export type SessionStatus = Database['public']['Enums']['session_status']