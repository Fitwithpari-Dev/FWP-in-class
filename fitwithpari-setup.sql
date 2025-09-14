-- FitWithPari Database Setup Script
-- Run this in your Supabase SQL Editor
-- Project: https://vzhpqjvkutveghznjgcf.supabase.co

-- ================================
-- FITNESS PLATFORM TABLES SETUP
-- ================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  user_role VARCHAR(20) DEFAULT 'student' CHECK (user_role IN ('student', 'coach', 'admin')),
  fitness_level VARCHAR(20) DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  date_of_birth DATE,
  phone_number VARCHAR(20),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_fitness_level ON user_profiles(fitness_level);

-- Create class_sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT false,
  is_recording BOOLEAN DEFAULT false,
  zoom_session_name VARCHAR(200),
  zoom_session_password VARCHAR(50),
  coach_mode VARCHAR(20) DEFAULT 'teach' CHECK (coach_mode IN ('teach', 'workout')),
  current_exercise VARCHAR(200),
  exercise_timer INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on class_sessions
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes for class_sessions
CREATE INDEX IF NOT EXISTS idx_class_sessions_coach_id ON class_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_is_active ON class_sessions(is_active);

-- Create session_participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_video_on BOOLEAN DEFAULT false,
  is_audio_on BOOLEAN DEFAULT false,
  has_raised_hand BOOLEAN DEFAULT false,
  connection_quality VARCHAR(20) DEFAULT 'good' CHECK (connection_quality IN ('poor', 'good', 'excellent')),
  rep_count INTEGER DEFAULT 0,
  variation VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS on session_participants
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Create indexes for session_participants
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_is_active ON session_participants(is_active);

-- Create health_considerations table
CREATE TABLE IF NOT EXISTS health_considerations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('injury', 'condition', 'modification', 'preference')),
  description TEXT NOT NULL,
  affected_exercises TEXT[],
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  recommended_modifications TEXT[],
  medical_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on health_considerations
ALTER TABLE health_considerations ENABLE ROW LEVEL SECURITY;

-- Create indexes for health_considerations
CREATE INDEX IF NOT EXISTS idx_health_considerations_user_id ON health_considerations(user_id);
CREATE INDEX IF NOT EXISTS idx_health_considerations_type ON health_considerations(type);
CREATE INDEX IF NOT EXISTS idx_health_considerations_severity ON health_considerations(severity);

-- Create exercise_content table
CREATE TABLE IF NOT EXISTS exercise_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  gif_url TEXT,
  benefits TEXT,
  target_audience VARCHAR(20) DEFAULT 'all' CHECK (target_audience IN ('all', 'beginner', 'intermediate', 'advanced')),
  key_points TEXT[],
  equipment_needed TEXT[],
  duration_seconds INTEGER DEFAULT 30,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on exercise_content
ALTER TABLE exercise_content ENABLE ROW LEVEL SECURITY;

-- Create indexes for exercise_content
CREATE INDEX IF NOT EXISTS idx_exercise_content_target_audience ON exercise_content(target_audience);
CREATE INDEX IF NOT EXISTS idx_exercise_content_difficulty_level ON exercise_content(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercise_content_category ON exercise_content(category);

-- ================================
-- ROW LEVEL SECURITY POLICIES
-- ================================

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Coaches can view all profiles" ON user_profiles;
CREATE POLICY "Coaches can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.user_role IN ('coach', 'admin')
    )
  );

-- Class sessions policies
DROP POLICY IF EXISTS "Anyone can view sessions" ON class_sessions;
CREATE POLICY "Anyone can view sessions" ON class_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coaches can manage own sessions" ON class_sessions;
CREATE POLICY "Coaches can manage own sessions" ON class_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = coach_id AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can insert sessions" ON class_sessions;
CREATE POLICY "Coaches can insert sessions" ON class_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = coach_id AND up.auth_user_id = auth.uid() AND up.user_role IN ('coach', 'admin')
    )
  );

-- Session participants policies
DROP POLICY IF EXISTS "Users can view own participation" ON session_participants;
CREATE POLICY "Users can view own participation" ON session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_id AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own participation" ON session_participants;
CREATE POLICY "Users can manage own participation" ON session_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_id AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can view session participants" ON session_participants;
CREATE POLICY "Coaches can view session participants" ON session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN user_profiles up ON cs.coach_id = up.id
      WHERE cs.id = session_id AND up.auth_user_id = auth.uid()
    )
  );

-- Health considerations policies
DROP POLICY IF EXISTS "Users can manage own health data" ON health_considerations;
CREATE POLICY "Users can manage own health data" ON health_considerations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_id AND up.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can view health data" ON health_considerations;
CREATE POLICY "Coaches can view health data" ON health_considerations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      WHERE coach.auth_user_id = auth.uid() AND coach.user_role IN ('coach', 'admin')
    )
  );

-- Exercise content policies
DROP POLICY IF EXISTS "Anyone can view exercises" ON exercise_content;
CREATE POLICY "Anyone can view exercises" ON exercise_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coaches can manage exercises" ON exercise_content;
CREATE POLICY "Coaches can manage exercises" ON exercise_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.user_role IN ('coach', 'admin')
    )
  );

-- ================================
-- SAMPLE FITNESS DATA
-- ================================

-- Insert sample exercise content
INSERT INTO exercise_content (name, description, benefits, target_audience, key_points, equipment_needed, duration_seconds, difficulty_level, category) VALUES
('Push-ups', 'Classic bodyweight chest exercise', 'Builds chest, shoulders, and triceps strength', 'all', ARRAY['Keep body straight', 'Full range of motion', 'Control the movement'], ARRAY[]::text[], 45, 2, 'Upper Body'),
('Squats', 'Fundamental lower body exercise', 'Strengthens legs, glutes, and core', 'all', ARRAY['Feet shoulder-width apart', 'Keep chest up', 'Knees track over toes'], ARRAY[]::text[], 60, 2, 'Lower Body'),
('Plank', 'Static core strengthening exercise', 'Builds core stability and strength', 'all', ARRAY['Keep body straight', 'Engage core', 'Breathe normally'], ARRAY[]::text[], 30, 1, 'Core'),
('Burpees', 'High-intensity full body exercise', 'Improves cardiovascular fitness and builds strength', 'intermediate', ARRAY['Move with control', 'Full squat position', 'Jump with power'], ARRAY[]::text[], 45, 4, 'Full Body'),
('Mountain Climbers', 'Dynamic core and cardio exercise', 'Builds core strength and cardiovascular endurance', 'intermediate', ARRAY['Keep hips level', 'Quick alternating legs', 'Maintain plank position'], ARRAY[]::text[], 40, 3, 'Core'),
('Jumping Jacks', 'Simple cardiovascular warm-up exercise', 'Improves cardiovascular health and coordination', 'all', ARRAY['Land softly', 'Keep rhythm steady', 'Full arm extension'], ARRAY[]::text[], 30, 1, 'Cardio'),
('Lunges', 'Unilateral lower body strength exercise', 'Builds leg strength and improves balance', 'beginner', ARRAY['Step forward with control', 'Keep front knee over ankle', 'Engage core'], ARRAY[]::text[], 50, 2, 'Lower Body'),
('Bear Crawl', 'Full body strength and mobility exercise', 'Builds strength and improves coordination', 'intermediate', ARRAY['Keep hips low', 'Move opposite hand and foot', 'Maintain neutral spine'], ARRAY[]::text[], 45, 3, 'Full Body'),
('High Knees', 'Dynamic cardio exercise', 'Improves cardiovascular fitness and leg strength', 'all', ARRAY['Bring knees to waist level', 'Stay on balls of feet', 'Pump arms naturally'], ARRAY[]::text[], 30, 2, 'Cardio'),
('Wall Sit', 'Isometric lower body exercise', 'Builds leg endurance and strength', 'beginner', ARRAY['Back flat against wall', 'Thighs parallel to ground', 'Keep core engaged'], ARRAY[]::text[], 60, 2, 'Lower Body')
ON CONFLICT (name) DO NOTHING;

-- ================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- ================================

-- Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE class_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE health_considerations;
ALTER PUBLICATION supabase_realtime ADD TABLE exercise_content;

-- ================================
-- DATABASE FUNCTIONS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_considerations_updated_at
  BEFORE UPDATE ON health_considerations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_content_updated_at
  BEFORE UPDATE ON exercise_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get active sessions
CREATE OR REPLACE FUNCTION get_active_sessions()
RETURNS TABLE (
  id UUID,
  title VARCHAR(200),
  description TEXT,
  coach_name VARCHAR(100),
  start_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  participant_count BIGINT,
  max_participants INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.title,
    cs.description,
    up.full_name,
    cs.start_time,
    cs.duration,
    COUNT(sp.id) AS participant_count,
    cs.max_participants
  FROM class_sessions cs
  JOIN user_profiles up ON cs.coach_id = up.id
  LEFT JOIN session_participants sp ON cs.id = sp.session_id AND sp.is_active = true
  WHERE cs.is_active = true
  GROUP BY cs.id, cs.title, cs.description, up.full_name, cs.start_time, cs.duration, cs.max_participants
  ORDER BY cs.start_time;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- SETUP COMPLETE MESSAGE
-- ================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FitWithPari Database Setup Complete!';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '✅ Tables: 5 fitness tables created';
    RAISE NOTICE '✅ Security: RLS policies active';
    RAISE NOTICE '✅ Sample Data: 10 exercises inserted';
    RAISE NOTICE '✅ Real-time: Enabled on all tables';
    RAISE NOTICE '✅ Triggers: Auto-update timestamps';
    RAISE NOTICE '✅ Functions: Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your fitness platform is ready!';
    RAISE NOTICE 'Project URL: https://vzhpqjvkutveghznjgcf.supabase.co';
END $$;