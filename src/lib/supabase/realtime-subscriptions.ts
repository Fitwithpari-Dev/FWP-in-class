// Real-time Subscriptions for FitWithPari
// Handles all real-time features for live fitness sessions

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase-client'
import type {
  ClassSession,
  Participant,
  SessionMessage,
  ParticipantUpdate
} from '../../types/fitness-platform'

export class RealtimeSessionManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private callbacks: Map<string, Function[]> = new Map()

  // Subscribe to live session updates
  subscribeToSession(
    sessionId: string,
    callbacks: {
      onParticipantJoined?: (participant: Participant) => void
      onParticipantLeft?: (participantId: string) => void
      onParticipantUpdated?: (update: ParticipantUpdate) => void
      onMessageReceived?: (message: SessionMessage) => void
      onExerciseChanged?: (sessionUpdate: Partial<ClassSession>) => void
      onHandRaised?: (participantId: string, raised: boolean) => void
    }
  ) {
    const channelName = `session-${sessionId}`

    // Remove existing channel if it exists
    this.unsubscribeFromSession(sessionId)

    const channel = supabase.channel(channelName)

    // Subscribe to participant updates
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participant_updates',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          this.handleParticipantUpdate(payload.new as ParticipantUpdate, callbacks)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          this.handleParticipantStatusUpdate(payload.new, callbacks)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (callbacks.onMessageReceived) {
            callbacks.onMessageReceived(payload.new as SessionMessage)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'class_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (callbacks.onExerciseChanged) {
            callbacks.onExerciseChanged(payload.new as Partial<ClassSession>)
          }
        }
      )

    channel.subscribe((status) => {
      console.log(`Session ${sessionId} subscription status:`, status)
    })

    this.channels.set(sessionId, channel)
    return channel
  }

  // Subscribe to participant-specific updates (for individual user perspective)
  subscribeToParticipantUpdates(
    sessionId: string,
    userId: string,
    callbacks: {
      onVideoToggle?: (isOn: boolean) => void
      onAudioToggle?: (isOn: boolean) => void
      onConnectionQualityChange?: (quality: 'excellent' | 'good' | 'poor') => void
      onRepCountUpdate?: (count: number) => void
    }
  ) {
    const channelName = `participant-${sessionId}-${userId}`

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId},user_id=eq.${userId}`
        },
        (payload) => {
          const participant = payload.new

          if (callbacks.onVideoToggle && 'is_video_on' in participant) {
            callbacks.onVideoToggle(participant.is_video_on)
          }
          if (callbacks.onAudioToggle && 'is_audio_on' in participant) {
            callbacks.onAudioToggle(participant.is_audio_on)
          }
          if (callbacks.onConnectionQualityChange && 'connection_quality' in participant) {
            callbacks.onConnectionQualityChange(participant.connection_quality)
          }
          if (callbacks.onRepCountUpdate && 'current_rep_count' in participant) {
            callbacks.onRepCountUpdate(participant.current_rep_count)
          }
        }
      )

    channel.subscribe()
    this.channels.set(`${sessionId}-${userId}`, channel)
    return channel
  }

  // Subscribe to coach-specific updates
  subscribeToCoachUpdates(
    sessionId: string,
    callbacks: {
      onStudentNeedsAttention?: (studentId: string, reason: string) => void
      onSessionMetrics?: (metrics: any) => void
      onEmergencyAlert?: (alert: any) => void
    }
  ) {
    const channelName = `coach-${sessionId}`

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participant_updates',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const update = payload.new as ParticipantUpdate

          // Handle coach-specific notifications
          if (update.update_type === 'hand_raised' && callbacks.onStudentNeedsAttention) {
            callbacks.onStudentNeedsAttention(update.user_id, 'hand_raised')
          }

          if (update.update_type === 'emergency' && callbacks.onEmergencyAlert) {
            callbacks.onEmergencyAlert(update.update_data)
          }
        }
      )

    channel.subscribe()
    this.channels.set(`coach-${sessionId}`, channel)
    return channel
  }

  // Unsubscribe from session
  unsubscribeFromSession(sessionId: string) {
    const channelKeys = Array.from(this.channels.keys()).filter(key => key.includes(sessionId))

    channelKeys.forEach(key => {
      const channel = this.channels.get(key)
      if (channel) {
        channel.unsubscribe()
        this.channels.delete(key)
      }
    })
  }

  // Unsubscribe from all channels
  unsubscribeFromAll() {
    this.channels.forEach((channel, key) => {
      channel.unsubscribe()
      this.channels.delete(key)
    })
  }

  // Helper method to handle participant updates
  private handleParticipantUpdate(update: ParticipantUpdate, callbacks: any) {
    switch (update.update_type) {
      case 'participant_joined':
        if (callbacks.onParticipantJoined) {
          // Fetch full participant data
          this.fetchParticipantData(update.session_id, update.user_id)
            .then(participant => {
              if (participant && callbacks.onParticipantJoined) {
                callbacks.onParticipantJoined(participant)
              }
            })
        }
        break

      case 'participant_left':
        if (callbacks.onParticipantLeft) {
          callbacks.onParticipantLeft(update.user_id)
        }
        break

      case 'hand_raised':
      case 'hand_lowered':
        if (callbacks.onHandRaised) {
          callbacks.onHandRaised(
            update.user_id,
            update.update_type === 'hand_raised'
          )
        }
        break

      case 'exercise_changed':
        if (callbacks.onExerciseChanged && update.update_data) {
          callbacks.onExerciseChanged(update.update_data)
        }
        break

      default:
        if (callbacks.onParticipantUpdated) {
          callbacks.onParticipantUpdated(update)
        }
    }
  }

  // Helper method to handle participant status updates
  private handleParticipantStatusUpdate(participant: any, callbacks: any) {
    if (callbacks.onParticipantUpdated) {
      callbacks.onParticipantUpdated({
        id: Date.now().toString(), // Generate temp ID
        session_id: participant.session_id,
        user_id: participant.user_id,
        update_type: 'participant_status_update',
        update_data: participant,
        created_at: new Date().toISOString()
      })
    }
  }

  // Fetch full participant data
  private async fetchParticipantData(sessionId: string, userId: string): Promise<Participant | null> {
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
            recommended_modifications
          )
        `)
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching participant data:', error)
        return null
      }

      // Transform to Participant interface
      const participant: Participant = {
        id: data.user_id,
        name: data.user_profiles.full_name,
        isVideoOn: data.is_video_on,
        isAudioOn: data.is_audio_on,
        isHost: data.user_profiles.role === 'coach',
        connectionQuality: data.connection_quality,
        hasRaisedHand: data.has_raised_hand,
        variation: data.current_variation,
        repCount: data.current_rep_count,
        level: data.user_profiles.fitness_level,
        healthConsiderations: data.health_considerations?.map((hc: any) => ({
          type: hc.type,
          description: hc.description,
          severity: hc.severity,
          recommendedModifications: hc.recommended_modifications
        }))
      }

      return participant
    } catch (error) {
      console.error('Error in fetchParticipantData:', error)
      return null
    }
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeSessionManager()

// Utility functions for real-time actions
export const realtimeActions = {
  async joinSession(sessionId: string, userId: string, options: {
    isVideoOn?: boolean
    isAudioOn?: boolean
    connectionQuality?: 'excellent' | 'good' | 'poor'
  } = {}) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'join_session',
        sessionId,
        userId,
        updateData: options
      }
    })

    if (error) throw error
    return data
  },

  async leaveSession(sessionId: string, userId: string) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'leave_session',
        sessionId,
        userId
      }
    })

    if (error) throw error
    return data
  },

  async updateParticipant(sessionId: string, userId: string, updates: {
    isVideoOn?: boolean
    isAudioOn?: boolean
    connectionQuality?: 'excellent' | 'good' | 'poor'
    currentVariation?: string
    currentRepCount?: number
  }) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'update_participant',
        sessionId,
        userId,
        updateData: updates
      }
    })

    if (error) throw error
    return data
  },

  async sendMessage(sessionId: string, userId: string, message: string, options: {
    messageType?: 'text' | 'emoji' | 'system'
    isPrivate?: boolean
    recipientId?: string
  } = {}) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'send_message',
        sessionId,
        userId,
        updateData: {
          message,
          ...options
        }
      }
    })

    if (error) throw error
    return data
  },

  async raiseHand(sessionId: string, userId: string, raised: boolean) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'raise_hand',
        sessionId,
        userId,
        updateData: {
          hasRaisedHand: raised
        }
      }
    })

    if (error) throw error
    return data
  },

  async updateExercise(sessionId: string, userId: string, exercise: {
    exerciseId?: string
    currentExercise?: string
    exerciseTimer?: number
    coachMode?: 'teach' | 'workout'
  }) {
    const { data, error } = await supabase.functions.invoke('realtime-session-manager', {
      body: {
        action: 'exercise_update',
        sessionId,
        userId,
        updateData: exercise
      }
    })

    if (error) throw error
    return data
  }
}