// Fitness Analytics Edge Function
// Provides advanced analytics for coaches and fitness progress tracking

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  action: string
  userId?: string
  sessionId?: string
  timeframe?: 'week' | 'month' | 'quarter'
  exerciseId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, sessionId, timeframe = 'month', exerciseId }: AnalyticsRequest = await req.json()

    switch (action) {
      case 'user_progress':
        return await getUserProgress(supabase, userId!, timeframe)

      case 'session_analytics':
        return await getSessionAnalytics(supabase, sessionId!)

      case 'coach_dashboard':
        return await getCoachDashboard(supabase, userId!)

      case 'exercise_effectiveness':
        return await getExerciseEffectiveness(supabase, exerciseId, timeframe)

      case 'health_insights':
        return await getHealthInsights(supabase, userId!)

      case 'attendance_trends':
        return await getAttendanceTrends(supabase, userId, timeframe)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Analytics Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getUserProgress(supabase: any, userId: string, timeframe: string) {
  const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90

  // Get exercise progress over time
  const { data: progressData } = await supabase
    .from('exercise_progress')
    .select(`
      *,
      exercise_content:exercise_id (name, muscle_groups),
      class_sessions:session_id (title, scheduled_start_time)
    `)
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  // Get fitness assessments
  const { data: assessments } = await supabase
    .from('fitness_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('assessment_date', { ascending: false })
    .limit(5)

  // Calculate improvement trends
  const exerciseStats = progressData?.reduce((acc: any, record: any) => {
    const exerciseName = record.exercise_content?.name || 'Unknown'

    if (!acc[exerciseName]) {
      acc[exerciseName] = {
        sessions: 0,
        totalReps: 0,
        maxReps: 0,
        improvements: []
      }
    }

    acc[exerciseName].sessions += 1
    if (record.reps_completed) {
      acc[exerciseName].totalReps += record.reps_completed
      acc[exerciseName].maxReps = Math.max(acc[exerciseName].maxReps, record.reps_completed)
      acc[exerciseName].improvements.push({
        date: record.created_at,
        reps: record.reps_completed,
        effort: record.effort_level
      })
    }

    return acc
  }, {})

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        timeframe,
        progressData,
        exerciseStats,
        assessments,
        summary: {
          totalSessions: progressData?.length || 0,
          avgEffortLevel: progressData?.reduce((sum: number, r: any) => sum + (r.effort_level || 0), 0) / (progressData?.length || 1),
          uniqueExercises: Object.keys(exerciseStats || {}).length
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getSessionAnalytics(supabase: any, sessionId: string) {
  // Get detailed session stats
  const { data: session } = await supabase
    .from('class_sessions')
    .select(`
      *,
      coach:coach_id (full_name),
      exercise_content:current_exercise_id (name)
    `)
    .eq('id', sessionId)
    .single()

  // Get participant analytics
  const { data: participants } = await supabase
    .from('session_participants')
    .select(`
      *,
      user_profiles (full_name, fitness_level)
    `)
    .eq('session_id', sessionId)

  // Get engagement metrics
  const { data: messages } = await supabase
    .from('session_messages')
    .select('sender_id, message_type, created_at')
    .eq('session_id', sessionId)

  // Get real-time updates
  const { data: updates } = await supabase
    .from('participant_updates')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  // Calculate metrics
  const totalParticipants = participants?.length || 0
  const activeParticipants = participants?.filter(p => !p.left_at).length || 0
  const avgRepCount = participants?.reduce((sum, p) => sum + (p.current_rep_count || 0), 0) / totalParticipants || 0
  const handsRaised = participants?.filter(p => p.has_raised_hand).length || 0

  const connectionQualityDistribution = participants?.reduce((acc: any, p) => {
    acc[p.connection_quality] = (acc[p.connection_quality] || 0) + 1
    return acc
  }, {})

  const messagesByType = messages?.reduce((acc: any, m) => {
    acc[m.message_type] = (acc[m.message_type] || 0) + 1
    return acc
  }, {})

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        session,
        metrics: {
          totalParticipants,
          activeParticipants,
          dropoutRate: totalParticipants > 0 ? ((totalParticipants - activeParticipants) / totalParticipants) * 100 : 0,
          avgRepCount,
          handsRaised,
          engagementScore: (messages?.length || 0) / Math.max(totalParticipants, 1),
          connectionQualityDistribution,
          messagesByType
        },
        participants,
        recentUpdates: updates?.slice(0, 20)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getCoachDashboard(supabase: any, coachId: string) {
  // Get coach's recent sessions
  const { data: sessions } = await supabase
    .from('class_sessions')
    .select(`
      *,
      session_participants (
        user_id,
        joined_at,
        left_at,
        current_rep_count
      )
    `)
    .eq('coach_id', coachId)
    .gte('scheduled_start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('scheduled_start_time', { ascending: false })

  // Get students with health considerations
  const { data: studentsWithHealth } = await supabase
    .from('health_considerations')
    .select(`
      *,
      user_profiles (full_name, fitness_level)
    `)
    .eq('is_active', true)
    .in('user_id',
      (await supabase
        .from('session_participants')
        .select('user_id')
        .in('session_id', sessions?.map(s => s.id) || [])
      ).data?.map(p => p.user_id) || []
    )

  // Calculate coach performance metrics
  const totalSessions = sessions?.length || 0
  const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0
  const avgParticipants = sessions?.reduce((sum, s) => sum + (s.session_participants?.length || 0), 0) / Math.max(totalSessions, 1)
  const totalStudents = new Set(sessions?.flatMap(s => s.session_participants?.map(p => p.user_id) || [])).size

  // Student retention rate
  const studentAttendance = sessions?.reduce((acc: any, session) => {
    session.session_participants?.forEach((p: any) => {
      if (!acc[p.user_id]) acc[p.user_id] = { attended: 0, total: 0 }
      acc[p.user_id].total += 1
      if (!p.left_at || (new Date(p.left_at).getTime() - new Date(p.joined_at).getTime()) > 300000) { // stayed > 5 min
        acc[p.user_id].attended += 1
      }
    })
    return acc
  }, {})

  const avgRetentionRate = Object.values(studentAttendance || {}).reduce((sum: number, student: any) =>
    sum + (student.attended / student.total), 0) / Math.max(totalStudents, 1) * 100

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        overview: {
          totalSessions,
          completedSessions,
          completionRate: (completedSessions / Math.max(totalSessions, 1)) * 100,
          avgParticipants: Math.round(avgParticipants * 10) / 10,
          totalStudents,
          avgRetentionRate: Math.round(avgRetentionRate * 10) / 10
        },
        recentSessions: sessions?.slice(0, 10),
        studentsWithHealthConsiderations: studentsWithHealth,
        studentAttendancePatterns: studentAttendance
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getExerciseEffectiveness(supabase: any, exerciseId: string, timeframe: string) {
  const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90

  // Get exercise data
  const { data: exercise } = await supabase
    .from('exercise_content')
    .select('*')
    .eq('id', exerciseId)
    .single()

  // Get progress data for this exercise
  const { data: progressData } = await supabase
    .from('exercise_progress')
    .select(`
      *,
      user_profiles (fitness_level),
      class_sessions (title)
    `)
    .eq('exercise_id', exerciseId)
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  // Analyze effectiveness by fitness level
  const effectivenessByLevel = progressData?.reduce((acc: any, record) => {
    const level = record.user_profiles?.fitness_level || 'unknown'
    if (!acc[level]) {
      acc[level] = {
        attempts: 0,
        avgReps: 0,
        avgEffort: 0,
        avgForm: 0,
        improvements: 0
      }
    }

    acc[level].attempts += 1
    acc[level].avgReps += record.reps_completed || 0
    acc[level].avgEffort += record.effort_level || 0
    acc[level].avgForm += record.form_rating || 0

    return acc
  }, {})

  // Calculate averages
  Object.keys(effectivenessByLevel || {}).forEach(level => {
    const data = effectivenessByLevel[level]
    data.avgReps = Math.round((data.avgReps / data.attempts) * 10) / 10
    data.avgEffort = Math.round((data.avgEffort / data.attempts) * 10) / 10
    data.avgForm = Math.round((data.avgForm / data.attempts) * 10) / 10
  })

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        exercise,
        timeframe,
        totalAttempts: progressData?.length || 0,
        effectivenessByLevel,
        overallStats: {
          avgReps: progressData?.reduce((sum, r) => sum + (r.reps_completed || 0), 0) / (progressData?.length || 1),
          avgEffort: progressData?.reduce((sum, r) => sum + (r.effort_level || 0), 0) / (progressData?.length || 1),
          avgForm: progressData?.reduce((sum, r) => sum + (r.form_rating || 0), 0) / (progressData?.length || 1)
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getHealthInsights(supabase: any, userId: string) {
  // Get user's health considerations
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get exercises that might be affected
  const affectedExercises = healthConditions?.flatMap(hc => hc.affected_exercises || []) || []

  // Get recent exercise progress for affected exercises
  const { data: exerciseProgress } = await supabase
    .from('exercise_progress')
    .select(`
      *,
      exercise_content (name, muscle_groups)
    `)
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Analyze adherence to modifications
  const modificationAdherence = exerciseProgress?.filter(ep =>
    affectedExercises.some(ae =>
      ep.exercise_content?.name?.toLowerCase().includes(ae.toLowerCase())
    )
  ).map(ep => ({
    exercise: ep.exercise_content?.name,
    modifications_used: ep.modifications_used || [],
    recommended_modifications: healthConditions?.find(hc =>
      hc.affected_exercises?.some(ae =>
        ep.exercise_content?.name?.toLowerCase().includes(ae.toLowerCase())
      )
    )?.recommended_modifications || []
  }))

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        healthConditions,
        affectedExercises,
        modificationAdherence,
        recommendations: generateHealthRecommendations(healthConditions, exerciseProgress)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getAttendanceTrends(supabase: any, userId?: string, timeframe: string = 'month') {
  const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90

  let query = supabase
    .from('session_participants')
    .select(`
      session_id,
      user_id,
      joined_at,
      left_at,
      class_sessions (
        scheduled_start_time,
        scheduled_duration,
        status,
        coach_id
      ),
      user_profiles (full_name, fitness_level)
    `)
    .gte('joined_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: attendanceData } = await query

  // Calculate trends
  const dailyAttendance = attendanceData?.reduce((acc: any, record) => {
    const date = new Date(record.joined_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const weeklyTrends = Object.entries(dailyAttendance || {}).reduce((acc: any, [date, count]) => {
    const weekStart = getWeekStart(new Date(date)).toISOString().split('T')[0]
    acc[weekStart] = (acc[weekStart] || 0) + count
    return acc
  }, {})

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        timeframe,
        totalSessions: attendanceData?.length || 0,
        dailyAttendance,
        weeklyTrends,
        avgSessionsPerWeek: Object.values(weeklyTrends).reduce((sum: number, count: any) => sum + count, 0) / Math.max(Object.keys(weeklyTrends).length, 1)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function generateHealthRecommendations(healthConditions: any[], exerciseProgress: any[]): string[] {
  const recommendations = []

  if (healthConditions?.length > 0) {
    const highSeverityConditions = healthConditions.filter(hc => hc.severity === 'high')
    if (highSeverityConditions.length > 0) {
      recommendations.push("High-severity health conditions detected. Please ensure modifications are strictly followed.")
    }

    const injuryConditions = healthConditions.filter(hc => hc.type === 'injury')
    if (injuryConditions.length > 0) {
      recommendations.push("Active injuries require careful monitoring. Consider reducing intensity until fully healed.")
    }
  }

  if (exerciseProgress) {
    const lowEffortSessions = exerciseProgress.filter(ep => ep.effort_level && ep.effort_level < 4).length
    if (lowEffortSessions > exerciseProgress.length * 0.5) {
      recommendations.push("Effort levels have been consistently low. Consider adjusting exercise difficulty or motivation techniques.")
    }

    const poorFormSessions = exerciseProgress.filter(ep => ep.form_rating && ep.form_rating < 3).length
    if (poorFormSessions > 0) {
      recommendations.push("Form issues detected. Focus on technique over intensity to prevent injury.")
    }
  }

  return recommendations
}

function getWeekStart(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day
  return new Date(start.setDate(diff))
}