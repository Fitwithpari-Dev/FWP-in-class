// Real-time Session Manager Edge Function
// Handles live session events and real-time updates

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, sessionId, userId, updateData } = await req.json()

    switch (action) {
      case 'join_session':
        return await handleJoinSession(supabase, sessionId, userId, updateData)

      case 'leave_session':
        return await handleLeaveSession(supabase, sessionId, userId)

      case 'update_participant':
        return await handleParticipantUpdate(supabase, sessionId, userId, updateData)

      case 'send_message':
        return await handleSendMessage(supabase, sessionId, userId, updateData)

      case 'raise_hand':
        return await handleRaiseHand(supabase, sessionId, userId, updateData)

      case 'exercise_update':
        return await handleExerciseUpdate(supabase, sessionId, userId, updateData)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function handleJoinSession(supabase: any, sessionId: string, userId: string, updateData: any) {
  // Update or insert participant record
  const { error } = await supabase
    .from('session_participants')
    .upsert({
      session_id: sessionId,
      user_id: userId,
      joined_at: new Date().toISOString(),
      is_video_on: updateData.isVideoOn ?? true,
      is_audio_on: updateData.isAudioOn ?? true,
      connection_quality: updateData.connectionQuality ?? 'good'
    }, {
      onConflict: 'session_id,user_id'
    })

  if (error) throw error

  // Create participant update record
  await supabase
    .from('participant_updates')
    .insert({
      session_id: sessionId,
      user_id: userId,
      update_type: 'participant_joined',
      update_data: updateData
    })

  // Send system message
  await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      sender_id: userId,
      message: 'joined the session',
      message_type: 'system'
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Joined session successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleLeaveSession(supabase: any, sessionId: string, userId: string) {
  // Update participant record with leave time
  const { error } = await supabase
    .from('session_participants')
    .update({
      left_at: new Date().toISOString()
    })
    .match({ session_id: sessionId, user_id: userId })

  if (error) throw error

  // Create participant update record
  await supabase
    .from('participant_updates')
    .insert({
      session_id: sessionId,
      user_id: userId,
      update_type: 'participant_left',
      update_data: { left_at: new Date().toISOString() }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Left session successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleParticipantUpdate(supabase: any, sessionId: string, userId: string, updateData: any) {
  const updateFields: any = {}

  if ('isVideoOn' in updateData) updateFields.is_video_on = updateData.isVideoOn
  if ('isAudioOn' in updateData) updateFields.is_audio_on = updateData.isAudioOn
  if ('connectionQuality' in updateData) updateFields.connection_quality = updateData.connectionQuality
  if ('currentVariation' in updateData) updateFields.current_variation = updateData.currentVariation
  if ('currentRepCount' in updateData) updateFields.current_rep_count = updateData.currentRepCount

  // Update participant record
  const { error } = await supabase
    .from('session_participants')
    .update(updateFields)
    .match({ session_id: sessionId, user_id: userId })

  if (error) throw error

  // Create participant update record for real-time sync
  await supabase
    .from('participant_updates')
    .insert({
      session_id: sessionId,
      user_id: userId,
      update_type: 'participant_status_update',
      update_data: updateData
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Participant updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSendMessage(supabase: any, sessionId: string, userId: string, updateData: any) {
  const { message, messageType = 'text', isPrivate = false, recipientId } = updateData

  const { error } = await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      sender_id: userId,
      message: message,
      message_type: messageType,
      is_private: isPrivate,
      recipient_id: recipientId
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'Message sent successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRaiseHand(supabase: any, sessionId: string, userId: string, updateData: any) {
  const { hasRaisedHand } = updateData

  // Update participant record
  const { error } = await supabase
    .from('session_participants')
    .update({ has_raised_hand: hasRaisedHand })
    .match({ session_id: sessionId, user_id: userId })

  if (error) throw error

  // Create participant update record
  await supabase
    .from('participant_updates')
    .insert({
      session_id: sessionId,
      user_id: userId,
      update_type: hasRaisedHand ? 'hand_raised' : 'hand_lowered',
      update_data: { has_raised_hand: hasRaisedHand }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Hand status updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleExerciseUpdate(supabase: any, sessionId: string, userId: string, updateData: any) {
  const { exerciseId, currentExercise, exerciseTimer, coachMode } = updateData

  // Only coaches can update exercise for the session
  const { data: session } = await supabase
    .from('class_sessions')
    .select('coach_id')
    .eq('id', sessionId)
    .single()

  if (session?.coach_id !== userId) {
    return new Response(
      JSON.stringify({ error: 'Only the session coach can update exercises' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    )
  }

  // Update session with new exercise
  const { error } = await supabase
    .from('class_sessions')
    .update({
      current_exercise_id: exerciseId,
      exercise_timer: exerciseTimer,
      coach_mode: coachMode
    })
    .eq('id', sessionId)

  if (error) throw error

  // Create update record for real-time sync
  await supabase
    .from('participant_updates')
    .insert({
      session_id: sessionId,
      user_id: userId,
      update_type: 'exercise_changed',
      update_data: {
        exercise_id: exerciseId,
        current_exercise: currentExercise,
        exercise_timer: exerciseTimer,
        coach_mode: coachMode
      }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Exercise updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}