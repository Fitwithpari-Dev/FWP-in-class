-- Seed data for FitWithPari Fitness Platform
-- Includes sample users, exercises, and session data for development/testing

-- Sample coach profiles
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  fitness_level,
  phone,
  fitness_goals,
  is_active
) VALUES
(
  'coach-1-uuid-here',
  'sarah.johnson@fitwithpari.com',
  'Sarah Johnson',
  'coach',
  'advanced',
  '+1-555-0101',
  ARRAY['strength training', 'cardio', 'flexibility'],
  true
),
(
  'coach-2-uuid-here',
  'mike.trainer@fitwithpari.com',
  'Mike Trainer',
  'coach',
  'advanced',
  '+1-555-0102',
  ARRAY['HIIT', 'strength training', 'sports conditioning'],
  true
);

-- Sample student profiles (matching your mock data)
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  fitness_level,
  phone,
  emergency_contact_name,
  emergency_contact_phone,
  fitness_goals,
  is_active
) VALUES
-- Beginner students
(
  'student-1-uuid',
  'mike.chen@email.com',
  'Mike Chen',
  'student',
  'beginner',
  '+1-555-1001',
  'Lisa Chen',
  '+1-555-1002',
  ARRAY['weight loss', 'general fitness'],
  true
),
(
  'student-2-uuid',
  'emma.davis@email.com',
  'Emma Davis',
  'student',
  'beginner',
  '+1-555-1003',
  'John Davis',
  '+1-555-1004',
  ARRAY['rehabilitation', 'gentle exercise'],
  true
),
(
  'student-3-uuid',
  'james.wilson@email.com',
  'James Wilson',
  'student',
  'beginner',
  '+1-555-1005',
  'Mary Wilson',
  '+1-555-1006',
  ARRAY['weight loss', 'strength building'],
  true
),
-- Intermediate students
(
  'student-4-uuid',
  'alex.rodriguez@email.com',
  'Alex Rodriguez',
  'student',
  'intermediate',
  '+1-555-1007',
  'Carmen Rodriguez',
  '+1-555-1008',
  ARRAY['strength training', 'back health'],
  true
),
(
  'student-5-uuid',
  'lisa.park@email.com',
  'Lisa Park',
  'student',
  'intermediate',
  '+1-555-1009',
  'David Park',
  '+1-555-1010',
  ARRAY['prenatal fitness', 'gentle exercise'],
  true
),
(
  'student-6-uuid',
  'david.kim@email.com',
  'David Kim',
  'student',
  'intermediate',
  '+1-555-1011',
  'Sarah Kim',
  '+1-555-1012',
  ARRAY['cardio', 'strength training'],
  true
),
-- Advanced students
(
  'student-7-uuid',
  'maria.garcia@email.com',
  'Maria Garcia',
  'student',
  'advanced',
  '+1-555-1013',
  'Carlos Garcia',
  '+1-555-1014',
  ARRAY['competitive training', 'performance'],
  true
),
(
  'student-8-uuid',
  'tom.brown@email.com',
  'Tom Brown',
  'student',
  'advanced',
  '+1-555-1015',
  'Jenny Brown',
  '+1-555-1016',
  ARRAY['strength training', 'injury prevention'],
  true
),
(
  'student-9-uuid',
  'anna.lee@email.com',
  'Anna Lee',
  'student',
  'advanced',
  '+1-555-1017',
  'Kevin Lee',
  '+1-555-1018',
  ARRAY['endurance', 'strength training'],
  true
),
-- Unassigned student
(
  'student-10-uuid',
  'john.smith@email.com',
  'John Smith',
  'student',
  null, -- No level assigned yet
  '+1-555-1019',
  'Jane Smith',
  '+1-555-1020',
  ARRAY['general fitness', 'low impact'],
  true
);

-- Sample health considerations (matching your mock data)
INSERT INTO health_considerations (
  user_id,
  type,
  title,
  description,
  affected_exercises,
  severity,
  recommended_modifications
) VALUES
(
  'student-2-uuid',
  'injury',
  'Knee Surgery Recovery',
  'Recent knee surgery',
  ARRAY['lunges', 'squats', 'jumping jacks'],
  'high',
  ARRAY['Wall sits instead of squats', 'Step-ups instead of lunges']
),
(
  'student-4-uuid',
  'condition',
  'Lower Back Pain',
  'Chronic lower back pain',
  ARRAY['deadlifts', 'sit-ups', 'toe touches'],
  'medium',
  ARRAY['Planks instead of sit-ups', 'Wall sits for core work']
),
(
  'student-5-uuid',
  'condition',
  'Pregnancy (2nd Trimester)',
  'Pregnancy (2nd trimester)',
  ARRAY['ab exercises', 'twisting movements', 'lying on back'],
  'high',
  ARRAY['Standing core work', 'Prenatal modifications', 'Avoid supine position']
),
(
  'student-8-uuid',
  'injury',
  'Shoulder Impingement',
  'Shoulder impingement',
  ARRAY['overhead press', 'pull-ups', 'burpees'],
  'medium',
  ARRAY['Keep arms below shoulder height', 'Focus on form over intensity']
),
(
  'student-10-uuid',
  'preference',
  'Low-Impact Preference',
  'Prefers low-impact exercises',
  ARRAY['jumping', 'high-intensity moves'],
  'low',
  ARRAY['Walking instead of running', 'Step-touches instead of jumping jacks']
);

-- Sample exercise content
INSERT INTO exercise_content (
  name,
  description,
  gif_url,
  benefits,
  target_audience,
  key_points,
  equipment_needed,
  muscle_groups,
  difficulty_rating,
  estimated_duration,
  created_by
) VALUES
(
  'Push-ups',
  'Classic bodyweight exercise for upper body strength',
  'https://images.unsplash.com/photo-1734873477108-6837b02f2b9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwke2ZpdG5lc3MlMjBleGVyY2lzZSUyMGZpdG5lc3MlMjBkZW1vbnN0cmF0aW9ufGVufDF8fHx8MTc1NzgxMzEwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'Build upper body and core strength, improve posture, and enhance functional movement patterns.',
  'beginner',
  ARRAY['Keep your body in a straight line from head to heels', 'Lower your chest to within an inch of the floor', 'Push through your palms, not fingertips', 'Engage your core throughout the movement'],
  ARRAY['none'],
  ARRAY['chest', 'shoulders', 'triceps', 'core'],
  2,
  180,
  'coach-1-uuid-here'
),
(
  'Squats',
  'Fundamental lower body exercise',
  'https://example.com/squat.gif',
  'Strengthen glutes, quadriceps, and core while improving functional movement',
  'beginner',
  ARRAY['Keep feet shoulder-width apart', 'Lower until thighs are parallel to floor', 'Keep knees aligned with toes', 'Drive through heels to stand'],
  ARRAY['none'],
  ARRAY['glutes', 'quadriceps', 'hamstrings', 'core'],
  2,
  180,
  'coach-1-uuid-here'
),
(
  'Plank',
  'Core strengthening isometric exercise',
  'https://example.com/plank.gif',
  'Build core strength, improve posture, and enhance stability',
  'beginner',
  ARRAY['Maintain straight line from head to heels', 'Engage core muscles', 'Keep shoulders over elbows', 'Breathe normally'],
  ARRAY['none'],
  ARRAY['core', 'shoulders', 'back'],
  1,
  60,
  'coach-1-uuid-here'
),
(
  'Burpees',
  'High-intensity full-body exercise',
  'https://example.com/burpees.gif',
  'Improve cardiovascular fitness, build strength, and enhance coordination',
  'intermediate',
  ARRAY['Start in standing position', 'Drop to squat and place hands on floor', 'Jump feet back to plank', 'Jump feet forward and stand'],
  ARRAY['none'],
  ARRAY['full body', 'cardiovascular'],
  4,
  180,
  'coach-1-uuid-here'
),
(
  'Dead Bugs',
  'Core stability exercise safe for most conditions',
  'https://example.com/deadbugs.gif',
  'Improve core stability and coordination while being gentle on the back',
  'beginner',
  ARRAY['Lie on back with arms extended', 'Keep lower back pressed to floor', 'Move opposite arm and leg slowly', 'Control the movement'],
  ARRAY['none'],
  ARRAY['core', 'hip flexors'],
  1,
  120,
  'coach-1-uuid-here'
);

-- Sample class session
INSERT INTO class_sessions (
  id,
  title,
  description,
  coach_id,
  scheduled_start_time,
  scheduled_duration,
  actual_start_time,
  status,
  max_participants,
  is_recording,
  current_exercise_id,
  exercise_timer,
  coach_mode,
  session_notes,
  tags,
  is_public
) VALUES
(
  'class-session-1',
  'HIIT Cardio Blast',
  'High-intensity interval training session focusing on cardiovascular fitness and full-body strength',
  'coach-1-uuid-here',
  NOW(),
  45,
  NOW(),
  'live',
  20,
  true,
  (SELECT id FROM exercise_content WHERE name = 'Push-ups' LIMIT 1),
  180,
  'teach',
  'Focus on proper form over speed. Encourage modifications for all fitness levels.',
  ARRAY['HIIT', 'cardio', 'beginner-friendly'],
  true
);

-- Sample session participants (matching the active participants from your mock data)
INSERT INTO session_participants (
  session_id,
  user_id,
  joined_at,
  is_video_on,
  is_audio_on,
  connection_quality,
  has_raised_hand,
  current_variation,
  current_rep_count
) VALUES
-- Coach
(
  'class-session-1',
  'coach-1-uuid-here',
  NOW() - INTERVAL '5 minutes',
  true,
  true,
  'excellent',
  false,
  null,
  0
),
-- Beginner students
(
  'class-session-1',
  'student-1-uuid',
  NOW() - INTERVAL '4 minutes',
  true,
  false,
  'good',
  false,
  null,
  8
),
(
  'class-session-1',
  'student-2-uuid',
  NOW() - INTERVAL '3 minutes',
  true,
  true,
  'excellent',
  true,
  'Modified',
  6
),
(
  'class-session-1',
  'student-3-uuid',
  NOW() - INTERVAL '3 minutes',
  true,
  true,
  'good',
  false,
  null,
  7
),
-- Intermediate students
(
  'class-session-1',
  'student-4-uuid',
  NOW() - INTERVAL '2 minutes',
  false,
  true,
  'poor',
  false,
  null,
  12
),
(
  'class-session-1',
  'student-5-uuid',
  NOW() - INTERVAL '2 minutes',
  true,
  false,
  'good',
  false,
  null,
  15
),
(
  'class-session-1',
  'student-6-uuid',
  NOW() - INTERVAL '1 minute',
  true,
  true,
  'excellent',
  false,
  null,
  14
),
-- Advanced students
(
  'class-session-1',
  'student-7-uuid',
  NOW() - INTERVAL '1 minute',
  true,
  true,
  'excellent',
  false,
  'Advanced',
  20
),
(
  'class-session-1',
  'student-8-uuid',
  NOW() - INTERVAL '1 minute',
  true,
  true,
  'good',
  false,
  null,
  22
),
(
  'class-session-1',
  'student-9-uuid',
  NOW() - INTERVAL '1 minute',
  true,
  false,
  'excellent',
  false,
  null,
  18
),
-- Unassigned student
(
  'class-session-1',
  'student-10-uuid',
  NOW() - INTERVAL '30 seconds',
  true,
  true,
  'good',
  false,
  null,
  10
);

-- Sample chat messages
INSERT INTO session_messages (
  session_id,
  sender_id,
  message,
  message_type,
  is_private
) VALUES
(
  'class-session-1',
  'coach-1-uuid-here',
  'Welcome everyone! Let''s start with some warm-up movements.',
  'text',
  false
),
(
  'class-session-1',
  'student-2-uuid',
  'Should I modify the push-ups due to my knee issue?',
  'text',
  false
),
(
  'class-session-1',
  'coach-1-uuid-here',
  'Yes Emma, try wall push-ups or knee push-ups. Whatever feels comfortable.',
  'text',
  false
),
(
  'class-session-1',
  'student-1-uuid',
  'Great class so far!',
  'text',
  false
);

-- Sample fitness assessments
INSERT INTO fitness_assessments (
  user_id,
  assessed_by,
  fitness_level,
  strength_rating,
  cardio_rating,
  flexibility_rating,
  balance_rating,
  notes,
  is_current
) VALUES
(
  'student-2-uuid',
  'coach-1-uuid-here',
  'beginner',
  3,
  4,
  5,
  4,
  'Good flexibility, needs to build strength gradually due to knee recovery. Focus on low-impact exercises.',
  true
),
(
  'student-5-uuid',
  'coach-1-uuid-here',
  'intermediate',
  6,
  5,
  7,
  6,
  'Excellent flexibility and balance. Modify exercises for pregnancy. Focus on stability and gentle strength.',
  true
),
(
  'student-7-uuid',
  'coach-1-uuid-here',
  'advanced',
  9,
  8,
  7,
  8,
  'Strong athlete with excellent form. Can handle advanced variations and high intensity workouts.',
  true
);

-- Sample workout plan
INSERT INTO workout_plans (
  name,
  description,
  created_by,
  target_level,
  estimated_duration,
  exercises,
  is_template,
  is_public,
  tags
) VALUES
(
  'Beginner Full Body',
  'A gentle introduction to fitness focusing on form and building basic strength',
  'coach-1-uuid-here',
  'beginner',
  30,
  '[
    {
      "exercise_id": "exercise-1",
      "name": "Push-ups",
      "sets": 3,
      "reps": 8,
      "duration": 30,
      "rest": 60
    },
    {
      "exercise_id": "exercise-2",
      "name": "Squats",
      "sets": 3,
      "reps": 10,
      "duration": 30,
      "rest": 60
    },
    {
      "exercise_id": "exercise-3",
      "name": "Plank",
      "sets": 3,
      "reps": 1,
      "duration": 30,
      "rest": 60
    }
  ]'::jsonb,
  true,
  true,
  ARRAY['beginner', 'full-body', 'strength']
);

-- Sample user memberships
INSERT INTO user_memberships (
  user_id,
  membership_type,
  status,
  started_at,
  expires_at
) VALUES
-- Coach memberships (unlimited)
(
  'coach-1-uuid-here',
  'coach',
  'active',
  NOW() - INTERVAL '6 months',
  NULL
),
(
  'coach-2-uuid-here',
  'coach',
  'active',
  NOW() - INTERVAL '3 months',
  NULL
),
-- Student memberships
(
  'student-1-uuid',
  'basic',
  'active',
  NOW() - INTERVAL '2 months',
  NOW() + INTERVAL '10 months'
),
(
  'student-2-uuid',
  'premium',
  'active',
  NOW() - INTERVAL '1 month',
  NOW() + INTERVAL '11 months'
),
(
  'student-5-uuid',
  'premium',
  'active',
  NOW() - INTERVAL '3 months',
  NOW() + INTERVAL '9 months'
),
(
  'student-7-uuid',
  'premium',
  'active',
  NOW() - INTERVAL '6 months',
  NOW() + INTERVAL '6 months'
);

-- Create some historical participant updates for testing
INSERT INTO participant_updates (
  session_id,
  user_id,
  update_type,
  update_data
) VALUES
(
  'class-session-1',
  'student-2-uuid',
  'hand_raised',
  '{"has_raised_hand": true, "timestamp": "' || NOW() || '"}'::jsonb
),
(
  'class-session-1',
  'student-1-uuid',
  'participant_status_update',
  '{"is_audio_on": false, "timestamp": "' || NOW() || '"}'::jsonb
),
(
  'class-session-1',
  'coach-1-uuid-here',
  'exercise_changed',
  '{"exercise_id": "exercise-1", "current_exercise": "Push-ups", "exercise_timer": 180}'::jsonb
);