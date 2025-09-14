// Health Monitor Edge Function
// HIPAA-compliant health data processing and monitoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthRequest {
  action: string
  userId?: string
  sessionId?: string
  healthData?: any
  exerciseName?: string
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

    const { action, userId, sessionId, healthData, exerciseName }: HealthRequest = await req.json()

    switch (action) {
      case 'validate_exercise_safety':
        return await validateExerciseSafety(supabase, userId!, exerciseName!)

      case 'update_health_status':
        return await updateHealthStatus(supabase, userId!, healthData)

      case 'get_exercise_modifications':
        return await getExerciseModifications(supabase, userId!, exerciseName!)

      case 'monitor_session_health':
        return await monitorSessionHealth(supabase, sessionId!, userId!)

      case 'generate_health_report':
        return await generateHealthReport(supabase, userId!)

      case 'check_exercise_contraindications':
        return await checkExerciseContraindications(supabase, userId!, exerciseName!)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Health Monitor Error:', error)
    return new Response(
      JSON.stringify({ error: 'Health monitoring service unavailable' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function validateExerciseSafety(supabase: any, userId: string, exerciseName: string) {
  // Get user's active health considerations
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get exercise details
  const { data: exercise } = await supabase
    .from('exercise_content')
    .select('*')
    .ilike('name', `%${exerciseName}%`)
    .single()

  if (!exercise) {
    return new Response(
      JSON.stringify({
        safe: true,
        message: 'Exercise not found in database, proceed with caution',
        modifications: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check for contraindications
  const warnings = []
  const modifications = []
  let safetyLevel = 'safe' // safe, caution, unsafe

  for (const condition of healthConditions || []) {
    // Check if exercise is in affected exercises list
    const isAffected = condition.affected_exercises?.some((affectedExercise: string) =>
      exerciseName.toLowerCase().includes(affectedExercise.toLowerCase()) ||
      affectedExercise.toLowerCase().includes(exerciseName.toLowerCase())
    )

    if (isAffected) {
      warnings.push({
        condition: condition.title,
        severity: condition.severity,
        description: condition.description,
        type: condition.type
      })

      // Add recommended modifications
      modifications.push(...(condition.recommended_modifications || []))

      // Determine safety level
      if (condition.severity === 'high') {
        safetyLevel = 'unsafe'
      } else if (condition.severity === 'medium' && safetyLevel === 'safe') {
        safetyLevel = 'caution'
      }
    }

    // Special checks for common conditions
    if (condition.type === 'injury') {
      // Check muscle groups affected by injury
      const injuryAffectsExercise = exercise.muscle_groups?.some((muscle: string) =>
        condition.description.toLowerCase().includes(muscle.toLowerCase())
      )

      if (injuryAffectsExercise && safetyLevel === 'safe') {
        safetyLevel = 'caution'
        warnings.push({
          condition: condition.title,
          severity: condition.severity,
          description: `Exercise targets muscles affected by ${condition.title}`,
          type: condition.type
        })
      }
    }

    // Pregnancy considerations
    if (condition.title.toLowerCase().includes('pregnancy')) {
      const unsafeForPregnancy = [
        'ab exercises', 'twisting', 'supine', 'high impact', 'jumping'
      ].some(unsafe =>
        exerciseName.toLowerCase().includes(unsafe) ||
        exercise.description?.toLowerCase().includes(unsafe)
      )

      if (unsafeForPregnancy) {
        safetyLevel = 'unsafe'
        warnings.push({
          condition: 'Pregnancy Safety',
          severity: 'high',
          description: 'Exercise not recommended during pregnancy',
          type: 'condition'
        })
        modifications.push('Consider prenatal-specific alternatives')
      }
    }
  }

  // Generate safety recommendations
  const recommendations = generateSafetyRecommendations(safetyLevel, warnings, exercise)

  return new Response(
    JSON.stringify({
      safe: safetyLevel === 'safe',
      safetyLevel,
      exercise: exercise.name,
      warnings,
      modifications: [...new Set(modifications)], // Remove duplicates
      recommendations
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateHealthStatus(supabase: any, userId: string, healthData: any) {
  const { type, title, description, severity, affectedExercises, modifications } = healthData

  // Validate input
  const validTypes = ['injury', 'condition', 'modification', 'preference']
  const validSeverities = ['low', 'medium', 'high']

  if (!validTypes.includes(type) || !validSeverities.includes(severity)) {
    return new Response(
      JSON.stringify({ error: 'Invalid health data format' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Insert or update health consideration
  const { data, error } = await supabase
    .from('health_considerations')
    .upsert({
      user_id: userId,
      type,
      title,
      description,
      affected_exercises: affectedExercises || [],
      severity,
      recommended_modifications: modifications || [],
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,title'
    })
    .select()
    .single()

  if (error) throw error

  // Log health status change
  await supabase
    .from('participant_updates')
    .insert({
      session_id: null, // Not session-specific
      user_id: userId,
      update_type: 'health_status_updated',
      update_data: {
        health_consideration_id: data.id,
        type,
        severity,
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Health status updated successfully',
      healthConsiderationId: data.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getExerciseModifications(supabase: any, userId: string, exerciseName: string) {
  // Get user's health conditions
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get exercise details
  const { data: exercise } = await supabase
    .from('exercise_content')
    .select('*')
    .ilike('name', `%${exerciseName}%`)
    .single()

  // Find relevant modifications
  const relevantModifications = []
  const generalModifications = []

  for (const condition of healthConditions || []) {
    const isRelevant = condition.affected_exercises?.some((affected: string) =>
      exerciseName.toLowerCase().includes(affected.toLowerCase())
    )

    if (isRelevant) {
      relevantModifications.push({
        condition: condition.title,
        severity: condition.severity,
        modifications: condition.recommended_modifications || []
      })
    }

    // Add general modifications for conditions
    if (condition.type === 'injury' && condition.severity === 'high') {
      generalModifications.push('Reduce range of motion and intensity')
      generalModifications.push('Focus on pain-free movement only')
    }

    if (condition.title.toLowerCase().includes('pregnancy')) {
      generalModifications.push('Avoid lying on back after first trimester')
      generalModifications.push('Maintain comfortable intensity')
      generalModifications.push('Stay hydrated and avoid overheating')
    }

    if (condition.title.toLowerCase().includes('back')) {
      generalModifications.push('Maintain neutral spine position')
      generalModifications.push('Avoid sudden twisting movements')
    }
  }

  // Exercise-specific modifications based on difficulty and muscle groups
  const exerciseModifications = generateExerciseSpecificModifications(exercise, healthConditions)

  return new Response(
    JSON.stringify({
      success: true,
      exercise: exerciseName,
      modifications: {
        specific: relevantModifications,
        general: [...new Set(generalModifications)],
        exercise_specific: exerciseModifications
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function monitorSessionHealth(supabase: any, sessionId: string, userId: string) {
  // Get current session participant data
  const { data: participant } = await supabase
    .from('session_participants')
    .select(`
      *,
      user_profiles (full_name),
      class_sessions (current_exercise_id, coach_id)
    `)
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single()

  if (!participant) {
    return new Response(
      JSON.stringify({ error: 'Participant not found in session' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    )
  }

  // Get health considerations
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get current exercise if available
  let currentExercise = null
  if (participant.class_sessions?.current_exercise_id) {
    const { data: exercise } = await supabase
      .from('exercise_content')
      .select('*')
      .eq('id', participant.class_sessions.current_exercise_id)
      .single()
    currentExercise = exercise
  }

  // Health monitoring checks
  const healthAlerts = []

  // Check connection quality for high-severity conditions
  const criticalConditions = healthConditions?.filter(hc => hc.severity === 'high') || []
  if (criticalConditions.length > 0 && participant.connection_quality === 'poor') {
    healthAlerts.push({
      level: 'warning',
      message: 'Poor connection detected for participant with high-severity health conditions',
      recommendation: 'Coach should check on participant verbally'
    })
  }

  // Monitor rep count vs effort for injury recovery
  const injuryConditions = healthConditions?.filter(hc => hc.type === 'injury') || []
  if (injuryConditions.length > 0 && participant.current_rep_count > 15) {
    healthAlerts.push({
      level: 'caution',
      message: 'High rep count detected for participant with active injury',
      recommendation: 'Suggest modification or rest break'
    })
  }

  // Check current exercise safety
  let exerciseSafety = null
  if (currentExercise) {
    const safetyResponse = await validateExerciseSafety(supabase, userId, currentExercise.name)
    exerciseSafety = await safetyResponse.json()
  }

  return new Response(
    JSON.stringify({
      success: true,
      participant: {
        name: participant.user_profiles?.full_name,
        connectionQuality: participant.connection_quality,
        currentRepCount: participant.current_rep_count,
        hasRaisedHand: participant.has_raised_hand
      },
      healthStatus: {
        activateConditions: healthConditions?.length || 0,
        criticalConditions: criticalConditions.length,
        exerciseSafety,
        alerts: healthAlerts
      },
      recommendations: generateSessionHealthRecommendations(participant, healthConditions, exerciseSafety)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function generateHealthReport(supabase: any, userId: string) {
  // Get comprehensive health data
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const { data: assessments } = await supabase
    .from('fitness_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('assessment_date', { ascending: false })
    .limit(3)

  const { data: recentProgress } = await supabase
    .from('exercise_progress')
    .select(`
      *,
      exercise_content (name, muscle_groups)
    `)
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  // Generate health insights
  const insights = {
    overallHealthScore: calculateHealthScore(healthConditions, assessments, recentProgress),
    riskFactors: identifyRiskFactors(healthConditions),
    progressTrends: analyzeProgressTrends(recentProgress),
    recommendations: generateHealthRecommendations(healthConditions, recentProgress)
  }

  return new Response(
    JSON.stringify({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        healthConditions: {
          active: healthConditions?.filter(hc => hc.is_active) || [],
          inactive: healthConditions?.filter(hc => !hc.is_active) || []
        },
        assessments,
        recentActivity: {
          totalSessions: recentProgress?.length || 0,
          uniqueExercises: new Set(recentProgress?.map(rp => rp.exercise_content?.name)).size,
          avgEffortLevel: recentProgress?.reduce((sum, rp) => sum + (rp.effort_level || 0), 0) / (recentProgress?.length || 1)
        },
        insights
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkExerciseContraindications(supabase: any, userId: string, exerciseName: string) {
  // Get detailed health conditions
  const { data: healthConditions } = await supabase
    .from('health_considerations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  const contraindications = []
  const precautions = []

  for (const condition of healthConditions || []) {
    // Check specific contraindications
    if (condition.severity === 'high') {
      const isContraindicated = condition.affected_exercises?.some((exercise: string) =>
        exerciseName.toLowerCase().includes(exercise.toLowerCase())
      )

      if (isContraindicated) {
        contraindications.push({
          condition: condition.title,
          reason: condition.description,
          severity: condition.severity,
          alternatives: condition.recommended_modifications || []
        })
      }
    }

    // Check precautions for medium severity
    if (condition.severity === 'medium') {
      const needsPrecaution = condition.affected_exercises?.some((exercise: string) =>
        exerciseName.toLowerCase().includes(exercise.toLowerCase())
      )

      if (needsPrecaution) {
        precautions.push({
          condition: condition.title,
          precaution: 'Monitor closely and modify as needed',
          modifications: condition.recommended_modifications || []
        })
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      exercise: exerciseName,
      contraindicated: contraindications.length > 0,
      contraindications,
      precautions,
      safeToPerform: contraindications.length === 0,
      requiresSupervision: precautions.length > 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper functions
function generateSafetyRecommendations(safetyLevel: string, warnings: any[], exercise: any): string[] {
  const recommendations = []

  switch (safetyLevel) {
    case 'unsafe':
      recommendations.push('Do not perform this exercise')
      recommendations.push('Consult with coach for alternative exercises')
      break
    case 'caution':
      recommendations.push('Perform with modifications only')
      recommendations.push('Have coach monitor your form closely')
      recommendations.push('Stop immediately if you experience any discomfort')
      break
    case 'safe':
      recommendations.push('Exercise appears safe for you')
      recommendations.push('Maintain proper form throughout')
      break
  }

  return recommendations
}

function generateExerciseSpecificModifications(exercise: any, healthConditions: any[]): string[] {
  const modifications = []

  if (!exercise) return modifications

  // Modify based on exercise difficulty
  if (exercise.difficulty_rating >= 4) {
    modifications.push('Consider beginner variation first')
    modifications.push('Reduce repetitions initially')
  }

  // Modify based on muscle groups and health conditions
  healthConditions?.forEach(condition => {
    if (condition.type === 'injury') {
      if (exercise.muscle_groups?.includes('core') && condition.title.toLowerCase().includes('back')) {
        modifications.push('Avoid spinal flexion and rotation')
        modifications.push('Maintain neutral spine throughout')
      }

      if (exercise.muscle_groups?.includes('shoulders') && condition.title.toLowerCase().includes('shoulder')) {
        modifications.push('Keep arms below shoulder level')
        modifications.push('Use lighter resistance or body weight only')
      }
    }
  })

  return modifications
}

function generateSessionHealthRecommendations(participant: any, healthConditions: any[], exerciseSafety: any): string[] {
  const recommendations = []

  if (participant.connection_quality === 'poor') {
    recommendations.push('Check audio/video quality with participant')
  }

  if (participant.has_raised_hand) {
    recommendations.push('Participant has raised hand - check for assistance needed')
  }

  if (exerciseSafety && exerciseSafety.safetyLevel !== 'safe') {
    recommendations.push('Current exercise requires modifications for this participant')
  }

  if (healthConditions?.some(hc => hc.severity === 'high')) {
    recommendations.push('Monitor participant closely due to high-severity health conditions')
  }

  return recommendations
}

function calculateHealthScore(healthConditions: any[], assessments: any[], progress: any[]): number {
  let score = 100

  // Reduce score for health conditions
  healthConditions?.forEach(condition => {
    if (condition.severity === 'high') score -= 20
    else if (condition.severity === 'medium') score -= 10
    else score -= 5
  })

  // Adjust based on latest assessment
  if (assessments && assessments.length > 0) {
    const latest = assessments[0]
    const avgRating = (latest.strength_rating + latest.cardio_rating + latest.flexibility_rating + latest.balance_rating) / 4
    score = Math.max(score, avgRating * 10) // Don't let health conditions override good fitness
  }

  return Math.max(0, Math.min(100, score))
}

function identifyRiskFactors(healthConditions: any[]): string[] {
  const riskFactors = []

  const highSeverity = healthConditions?.filter(hc => hc.severity === 'high') || []
  if (highSeverity.length > 0) {
    riskFactors.push('High-severity health conditions present')
  }

  const injuries = healthConditions?.filter(hc => hc.type === 'injury') || []
  if (injuries.length > 2) {
    riskFactors.push('Multiple active injuries')
  }

  return riskFactors
}

function analyzeProgressTrends(progress: any[]): any {
  if (!progress || progress.length < 2) {
    return { trend: 'insufficient_data' }
  }

  const avgEffort = progress.reduce((sum, p) => sum + (p.effort_level || 0), 0) / progress.length
  const recentEffort = progress.slice(0, Math.floor(progress.length / 2)).reduce((sum, p) => sum + (p.effort_level || 0), 0) / Math.floor(progress.length / 2)

  return {
    trend: recentEffort > avgEffort ? 'improving' : 'declining',
    avgEffort,
    recentEffort
  }
}

function generateHealthRecommendations(healthConditions: any[], progress: any[]): string[] {
  const recommendations = []

  if (healthConditions?.some(hc => hc.type === 'injury' && hc.severity === 'high')) {
    recommendations.push('Focus on rehabilitation exercises until injury heals')
  }

  if (progress?.some(p => p.form_rating < 3)) {
    recommendations.push('Work with coach to improve exercise form')
  }

  if (progress?.every(p => p.effort_level < 5)) {
    recommendations.push('Consider gradually increasing exercise intensity')
  }

  return recommendations
}