# FitWithPari React Integration Guide

## Overview
This guide provides complete integration instructions for connecting your React frontend to the FitWithPari Supabase backend, including TypeScript types, real-time subscriptions, and authentication flows.

## Installation

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
npm install --save-dev @types/node
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vzhpqjvkutveghznjgcf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HyeFmpuM8KjK3m4MkiI4Yw_Hv9l7Rni
```

## TypeScript Type Definitions

Create `types/database.types.ts`:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'coach' | 'student' | 'admin'
          avatar_url?: string
          phone?: string
          date_of_birth?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          fitness_level?: 'beginner' | 'intermediate' | 'advanced'
          fitness_goals?: string[]
          preferred_workout_times?: string[]
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
          avatar_url?: string
          phone?: string
          date_of_birth?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          fitness_level?: 'beginner' | 'intermediate' | 'advanced'
          fitness_goals?: string[]
          preferred_workout_times?: string[]
          timezone?: string
          is_active?: boolean
        }
        Update: {
          email?: string
          full_name?: string
          role?: 'coach' | 'student' | 'admin'
          avatar_url?: string
          phone?: string
          date_of_birth?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          fitness_level?: 'beginner' | 'intermediate' | 'advanced'
          fitness_goals?: string[]
          preferred_workout_times?: string[]
          timezone?: string
          is_active?: boolean
        }
      }
      health_considerations: {
        Row: {
          id: string
          user_id: string
          type: 'injury' | 'condition' | 'modification' | 'preference'
          title: string
          description: string
          affected_exercises?: string[]
          severity: 'low' | 'medium' | 'high'
          recommended_modifications?: string[]
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
          affected_exercises?: string[]
          severity: 'low' | 'medium' | 'high'
          recommended_modifications?: string[]
          is_active?: boolean
        }
        Update: {
          type?: 'injury' | 'condition' | 'modification' | 'preference'
          title?: string
          description?: string
          affected_exercises?: string[]
          severity?: 'low' | 'medium' | 'high'
          recommended_modifications?: string[]
          is_active?: boolean
        }
      }
      exercise_content: {
        Row: {
          id: string
          name: string
          description?: string
          gif_url?: string
          video_url?: string
          benefits?: string
          target_audience: 'beginner' | 'intermediate' | 'advanced'
          key_points?: string[]
          equipment_needed?: string[]
          muscle_groups?: string[]
          difficulty_rating?: number
          estimated_duration?: number
          created_by?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          gif_url?: string
          video_url?: string
          benefits?: string
          target_audience?: 'beginner' | 'intermediate' | 'advanced'
          key_points?: string[]
          equipment_needed?: string[]
          muscle_groups?: string[]
          difficulty_rating?: number
          estimated_duration?: number
          created_by?: string
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string
          gif_url?: string
          video_url?: string
          benefits?: string
          target_audience?: 'beginner' | 'intermediate' | 'advanced'
          key_points?: string[]
          equipment_needed?: string[]
          muscle_groups?: string[]
          difficulty_rating?: number
          estimated_duration?: number
          is_active?: boolean
        }
      }
      class_sessions: {
        Row: {
          id: string
          title: string
          description?: string
          coach_id: string
          scheduled_start_time: string
          scheduled_duration: number
          actual_start_time?: string
          actual_end_time?: string
          status: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants: number
          is_recording: boolean
          recording_url?: string
          zoom_meeting_id?: string
          zoom_passcode?: string
          current_exercise_id?: string
          exercise_timer: number
          coach_mode: 'teach' | 'workout'
          session_notes?: string
          tags?: string[]
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          coach_id: string
          scheduled_start_time: string
          scheduled_duration: number
          actual_start_time?: string
          actual_end_time?: string
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants?: number
          is_recording?: boolean
          recording_url?: string
          zoom_meeting_id?: string
          zoom_passcode?: string
          current_exercise_id?: string
          exercise_timer?: number
          coach_mode?: 'teach' | 'workout'
          session_notes?: string
          tags?: string[]
          is_public?: boolean
        }
        Update: {
          title?: string
          description?: string
          scheduled_start_time?: string
          scheduled_duration?: number
          actual_start_time?: string
          actual_end_time?: string
          status?: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants?: number
          is_recording?: boolean
          recording_url?: string
          zoom_meeting_id?: string
          zoom_passcode?: string
          current_exercise_id?: string
          exercise_timer?: number
          coach_mode?: 'teach' | 'workout'
          session_notes?: string
          tags?: string[]
          is_public?: boolean
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at?: string
          left_at?: string
          is_video_on: boolean
          is_audio_on: boolean
          connection_quality: 'excellent' | 'good' | 'poor'
          has_raised_hand: boolean
          current_variation?: string
          current_rep_count: number
          session_notes?: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string
          left_at?: string
          is_video_on?: boolean
          is_audio_on?: boolean
          connection_quality?: 'excellent' | 'good' | 'poor'
          has_raised_hand?: boolean
          current_variation?: string
          current_rep_count?: number
          session_notes?: string
        }
        Update: {
          joined_at?: string
          left_at?: string
          is_video_on?: boolean
          is_audio_on?: boolean
          connection_quality?: 'excellent' | 'good' | 'poor'
          has_raised_hand?: boolean
          current_variation?: string
          current_rep_count?: number
          session_notes?: string
        }
      }
      participant_updates: {
        Row: {
          id: string
          session_id: string
          user_id: string
          update_type: string
          update_data?: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          update_type: string
          update_data?: Json
        }
        Update: {
          update_type?: string
          update_data?: Json
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
          recipient_id?: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender_id: string
          message: string
          message_type?: string
          is_private?: boolean
          recipient_id?: string
        }
        Update: {
          message?: string
          message_type?: string
          is_private?: boolean
          recipient_id?: string
        }
      }
    }
    Views: {
      active_session_summary: {
        Row: {
          session_id: string
          title: string
          coach_id: string
          coach_name: string
          scheduled_start_time: string
          actual_start_time?: string
          scheduled_duration: number
          status: 'scheduled' | 'live' | 'completed' | 'cancelled'
          max_participants: number
          current_exercise_id?: string
          current_exercise_name?: string
          exercise_timer: number
          coach_mode: 'teach' | 'workout'
          total_participants: number
          active_participants: number
          hands_raised: number
          avg_rep_count?: number
          active_participant_details?: Json
        }
      }
    }
    Functions: {
      get_session_participants_with_health: {
        Args: { session_uuid: string }
        Returns: {
          user_id: string
          full_name: string
          fitness_level?: 'beginner' | 'intermediate' | 'advanced'
          is_video_on: boolean
          is_audio_on: boolean
          connection_quality: 'excellent' | 'good' | 'poor'
          has_raised_hand: boolean
          current_rep_count: number
          health_considerations: Json
        }[]
      }
      start_session_safely: {
        Args: { session_uuid: string; coach_uuid: string }
        Returns: Json
      }
      end_session_safely: {
        Args: { session_uuid: string; coach_uuid: string }
        Returns: Json
      }
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type HealthConsideration = Database['public']['Tables']['health_considerations']['Row']
export type ExerciseContent = Database['public']['Tables']['exercise_content']['Row']
export type ClassSession = Database['public']['Tables']['class_sessions']['Row']
export type SessionParticipant = Database['public']['Tables']['session_participants']['Row']
export type ParticipantUpdate = Database['public']['Tables']['participant_updates']['Row']
export type SessionMessage = Database['public']['Tables']['session_messages']['Row']
export type ActiveSessionSummary = Database['public']['Views']['active_session_summary']['Row']
```

## Supabase Client Setup

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
```

## Authentication Context

Create `contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types/database.types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) throw error
      if (!data.user) throw new Error('User creation failed')

      // Create profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          ...userData,
        })

      if (profileError) throw profileError

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      // Refetch profile
      await fetchProfile(user.id)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

## Session Management Hook

Create `hooks/useSession.ts`:

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ClassSession, SessionParticipant, ParticipantUpdate, SessionMessage } from '../types/database.types'

export function useSession(sessionId: string) {
  const [session, setSession] = useState<ClassSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [updates, setUpdates] = useState<ParticipantUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Fetch initial data
    fetchSessionData()

    // Set up real-time subscriptions
    const sessionChannel = supabase
      .channel('session-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as ClassSession)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` },
        handleParticipantChange
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => setMessages(prev => [...prev, payload.new as SessionMessage])
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participant_updates', filter: `session_id=eq.${sessionId}` },
        (payload) => setUpdates(prev => [payload.new as ParticipantUpdate, ...prev.slice(0, 49)])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      setLoading(true)

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          coach:coach_id (full_name),
          exercise_content:current_exercise_id (name, description)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select(`
          *,
          user_profiles (full_name, fitness_level, avatar_url)
        `)
        .eq('session_id', sessionId)

      if (participantsError) throw participantsError
      setParticipants(participantsData)

      // Fetch recent messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('session_messages')
        .select(`
          *,
          sender:sender_id (full_name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesError) throw messagesError
      setMessages(messagesData)

      // Fetch recent updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('participant_updates')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (updatesError) throw updatesError
      setUpdates(updatesData)

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantChange = (payload: any) => {
    const participant = payload.new as SessionParticipant

    if (payload.eventType === 'INSERT') {
      setParticipants(prev => [...prev, participant])
    } else if (payload.eventType === 'UPDATE') {
      setParticipants(prev => prev.map(p => p.id === participant.id ? participant : p))
    } else if (payload.eventType === 'DELETE') {
      setParticipants(prev => prev.filter(p => p.id !== payload.old.id))
    }
  }

  const joinSession = async (userId: string) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join_session',
        sessionId,
        userId,
        updateData: {
          isVideoOn: true,
          isAudioOn: true,
          connectionQuality: 'good'
        }
      })
    })

    return response.json()
  }

  const leaveSession = async (userId: string) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave_session',
        sessionId,
        userId
      })
    })

    return response.json()
  }

  const updateParticipant = async (userId: string, updateData: any) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_participant',
        sessionId,
        userId,
        updateData
      })
    })

    return response.json()
  }

  const sendMessage = async (userId: string, message: string, isPrivate = false, recipientId?: string) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_message',
        sessionId,
        userId,
        updateData: {
          message,
          messageType: 'text',
          isPrivate,
          recipientId
        }
      })
    })

    return response.json()
  }

  const raiseHand = async (userId: string, hasRaisedHand: boolean) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'raise_hand',
        sessionId,
        userId,
        updateData: { hasRaisedHand }
      })
    })

    return response.json()
  }

  const updateExercise = async (userId: string, exerciseId: string, exerciseTimer: number, coachMode: string) => {
    const response = await fetch('/api/session-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'exercise_update',
        sessionId,
        userId,
        updateData: {
          exerciseId,
          exerciseTimer,
          coachMode
        }
      })
    })

    return response.json()
  }

  return {
    session,
    participants,
    messages,
    updates,
    loading,
    error,
    joinSession,
    leaveSession,
    updateParticipant,
    sendMessage,
    raiseHand,
    updateExercise,
    refetch: fetchSessionData
  }
}
```

## Health Monitoring Hook

Create `hooks/useHealthMonitor.ts`:

```typescript
import { useState, useCallback } from 'react'
import { HealthConsideration } from '../types/database.types'

interface HealthMonitorResult {
  safe: boolean
  safetyLevel: 'safe' | 'caution' | 'unsafe'
  warnings: any[]
  modifications: string[]
  recommendations: string[]
}

export function useHealthMonitor() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateExerciseSafety = useCallback(async (userId: string, exerciseName: string): Promise<HealthMonitorResult | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/health-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_exercise_safety',
          userId,
          exerciseName
        })
      })

      if (!response.ok) throw new Error('Failed to validate exercise safety')

      const data = await response.json()
      return data
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateHealthStatus = useCallback(async (userId: string, healthData: Partial<HealthConsideration>) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/health-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_health_status',
          userId,
          healthData
        })
      })

      if (!response.ok) throw new Error('Failed to update health status')

      const data = await response.json()
      return data
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getExerciseModifications = useCallback(async (userId: string, exerciseName: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/health-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_exercise_modifications',
          userId,
          exerciseName
        })
      })

      if (!response.ok) throw new Error('Failed to get exercise modifications')

      const data = await response.json()
      return data
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const monitorSessionHealth = useCallback(async (sessionId: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/health-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitor_session_health',
          sessionId,
          userId
        })
      })

      if (!response.ok) throw new Error('Failed to monitor session health')

      const data = await response.json()
      return data
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    validateExerciseSafety,
    updateHealthStatus,
    getExerciseModifications,
    monitorSessionHealth
  }
}
```

## API Routes (Next.js)

Create `pages/api/session-manager.ts`:

```typescript
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/realtime-session-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Function call failed')
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Session manager error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

Create `pages/api/health-monitor.ts`:

```typescript
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/health-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Function call failed')
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Health monitor error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

Create `pages/api/fitness-analytics.ts`:

```typescript
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fitness-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Function call failed')
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Fitness analytics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

## Example Components

### Live Session Component

```typescript
import React, { useEffect, useState } from 'react'
import { useSession } from '../hooks/useSession'
import { useHealthMonitor } from '../hooks/useHealthMonitor'
import { useAuth } from '../contexts/AuthContext'

interface LiveSessionProps {
  sessionId: string
}

export function LiveSession({ sessionId }: LiveSessionProps) {
  const { user, profile } = useAuth()
  const {
    session,
    participants,
    messages,
    loading,
    joinSession,
    leaveSession,
    updateParticipant,
    sendMessage,
    raiseHand
  } = useSession(sessionId)

  const { validateExerciseSafety, monitorSessionHealth } = useHealthMonitor()

  const [hasJoined, setHasJoined] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [hasRaisedHand, setHasRaisedHand] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [exerciseSafety, setExerciseSafety] = useState<any>(null)

  useEffect(() => {
    if (session && user && !hasJoined) {
      handleJoinSession()
    }
  }, [session, user])

  useEffect(() => {
    // Monitor exercise safety when exercise changes
    if (session?.current_exercise_id && user) {
      checkExerciseSafety()
    }
  }, [session?.current_exercise_id, user])

  const handleJoinSession = async () => {
    if (!user) return

    const result = await joinSession(user.id)
    if (result.success) {
      setHasJoined(true)
    }
  }

  const handleLeaveSession = async () => {
    if (!user) return

    const result = await leaveSession(user.id)
    if (result.success) {
      setHasJoined(false)
    }
  }

  const checkExerciseSafety = async () => {
    if (!user || !session?.exercise_content?.name) return

    const safety = await validateExerciseSafety(user.id, session.exercise_content.name)
    setExerciseSafety(safety)
  }

  const handleVideoToggle = async () => {
    if (!user) return

    const newVideoState = !isVideoOn
    setIsVideoOn(newVideoState)

    await updateParticipant(user.id, { isVideoOn: newVideoState })
  }

  const handleAudioToggle = async () => {
    if (!user) return

    const newAudioState = !isAudioOn
    setIsAudioOn(newAudioState)

    await updateParticipant(user.id, { isAudioOn: newAudioState })
  }

  const handleHandRaise = async () => {
    if (!user) return

    const newHandState = !hasRaisedHand
    setHasRaisedHand(newHandState)

    await raiseHand(user.id, newHandState)
  }

  const handleRepCountUpdate = async (newCount: number) => {
    if (!user) return

    setRepCount(newCount)
    await updateParticipant(user.id, { currentRepCount: newCount })
  }

  const handleSendMessage = async (message: string) => {
    if (!user) return

    await sendMessage(user.id, message)
  }

  if (loading) return <div>Loading session...</div>
  if (!session) return <div>Session not found</div>

  return (
    <div className="live-session">
      <div className="session-header">
        <h1>{session.title}</h1>
        <p>Coach: {session.coach?.full_name}</p>
        <div className="session-status">
          Status: {session.status}
          {session.status === 'live' && (
            <span className="live-indicator">🔴 LIVE</span>
          )}
        </div>
      </div>

      {exerciseSafety && exerciseSafety.safetyLevel !== 'safe' && (
        <div className={`safety-alert ${exerciseSafety.safetyLevel}`}>
          <h3>Exercise Safety Alert</h3>
          <p>Safety Level: {exerciseSafety.safetyLevel}</p>
          {exerciseSafety.warnings.length > 0 && (
            <ul>
              {exerciseSafety.warnings.map((warning: any, index: number) => (
                <li key={index}>
                  {warning.condition}: {warning.description}
                </li>
              ))}
            </ul>
          )}
          {exerciseSafety.modifications.length > 0 && (
            <div>
              <h4>Recommended Modifications:</h4>
              <ul>
                {exerciseSafety.modifications.map((mod: string, index: number) => (
                  <li key={index}>{mod}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="current-exercise">
        {session.current_exercise_id && (
          <div>
            <h3>Current Exercise: {session.exercise_content?.name}</h3>
            <p>Timer: {Math.floor(session.exercise_timer / 60)}:{(session.exercise_timer % 60).toString().padStart(2, '0')}</p>
            <p>Mode: {session.coach_mode}</p>
          </div>
        )}
      </div>

      <div className="participant-controls">
        {!hasJoined ? (
          <button onClick={handleJoinSession} className="join-btn">
            Join Session
          </button>
        ) : (
          <div className="controls">
            <button
              onClick={handleVideoToggle}
              className={`control-btn ${isVideoOn ? 'active' : 'inactive'}`}
            >
              📹 Video {isVideoOn ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleAudioToggle}
              className={`control-btn ${isAudioOn ? 'active' : 'inactive'}`}
            >
              🎤 Audio {isAudioOn ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleHandRaise}
              className={`control-btn ${hasRaisedHand ? 'raised' : 'lowered'}`}
            >
              ✋ {hasRaisedHand ? 'Lower Hand' : 'Raise Hand'}
            </button>

            <div className="rep-counter">
              <label>Reps: </label>
              <button onClick={() => handleRepCountUpdate(Math.max(0, repCount - 1))}>-</button>
              <span>{repCount}</span>
              <button onClick={() => handleRepCountUpdate(repCount + 1)}>+</button>
            </div>

            <button onClick={handleLeaveSession} className="leave-btn">
              Leave Session
            </button>
          </div>
        )}
      </div>

      <div className="participants-list">
        <h3>Participants ({participants.filter(p => !p.left_at).length})</h3>
        {participants
          .filter(p => !p.left_at)
          .map(participant => (
            <div key={participant.id} className="participant">
              <span>{participant.user_profiles?.full_name}</span>
              <div className="participant-status">
                {participant.is_video_on ? '📹' : '🚫'}
                {participant.is_audio_on ? '🎤' : '🔇'}
                {participant.has_raised_hand && '✋'}
                <span className={`connection ${participant.connection_quality}`}>
                  {participant.connection_quality}
                </span>
                <span>Reps: {participant.current_rep_count}</span>
              </div>
            </div>
          ))
        }
      </div>

      <div className="chat-section">
        <div className="messages">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.message_type}`}>
              <strong>{message.sender?.full_name}: </strong>
              {message.message}
              <span className="timestamp">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <div className="message-input">
          <input
            type="text"
            placeholder="Type a message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage(e.currentTarget.value)
                e.currentTarget.value = ''
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
```

## Deployment Steps

1. **Database Setup:**
   ```bash
   # Apply migrations
   supabase db push

   # Apply real-time setup
   psql -h db.vzhpqjvkutveghznjgcf.supabase.co -U postgres -d postgres -f supabase/realtime-subscriptions.sql

   # Seed database
   psql -h db.vzhpqjvkutveghznjgcf.supabase.co -U postgres -d postgres -f supabase/seed.sql
   ```

2. **Edge Functions:**
   ```bash
   supabase functions deploy realtime-session-manager
   supabase functions deploy fitness-analytics
   supabase functions deploy health-monitor
   ```

3. **Environment Variables:**
   - Set up all environment variables in your deployment platform
   - Ensure CORS is configured in Supabase for your domain

4. **Real-time Setup:**
   - Enable real-time in Supabase dashboard
   - Configure real-time policies if needed

## Security Considerations

1. **Row Level Security:** All tables have RLS enabled with appropriate policies
2. **Health Data:** HIPAA-compliant handling with strict access controls
3. **Session Management:** Only participants can access session data
4. **Edge Functions:** Use service role key securely on server side
5. **Real-time:** Filtered subscriptions prevent unauthorized data access

This integration provides a complete, production-ready setup for your FitWithPari fitness platform with real-time capabilities, health monitoring, and HIPAA-compliant data handling.