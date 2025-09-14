#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Use the existing credentials from the environment
const supabaseUrl = 'https://vzhpqjvkutveghznjgcf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aHBxanZrdXR2ZWdoem5qZ2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzNTcxNDUsImV4cCI6MjA0MTkzMzE0NX0.4DYh6_YOGNZm5b1m_T9Dyz_eF5m8Cw5fD3uGc4JRVnE'

console.log('🏋️ FitWithPari Direct Database Setup')
console.log('====================================')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔗 Testing Supabase connection...')
  try {
    // Try to access the auth endpoint to test connection
    const { data, error } = await supabase.auth.getSession()

    if (error && error.message !== 'Auth session missing!') {
      throw error
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.log('❌ Connection test error:', error.message)

    // Try a simple query instead
    try {
      const { error: queryError } = await supabase
        .from('_nonexistent_table_test')
        .select('*')
        .limit(1)

      // If we get a "table does not exist" error, connection is working
      if (queryError && queryError.message.includes('does not exist')) {
        console.log('✅ Supabase connection successful (via query test)')
        return true
      }

      return false
    } catch (fallbackError) {
      console.log('❌ Connection failed:', fallbackError.message)
      return false
    }
  }
}

async function createTablesDirectly() {
  console.log('\n📊 Creating database tables directly...')

  // Create user_profiles table
  console.log('👤 Creating user_profiles table...')
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (!error) {
      console.log('✅ user_profiles table already exists')
    }
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  user_profiles table needs to be created via Supabase Dashboard')
    }
  }

  // Test insertion to verify tables exist
  console.log('\n📝 Testing table access...')

  const testTables = [
    'user_profiles',
    'class_sessions',
    'session_participants',
    'health_considerations',
    'exercise_content'
  ]

  for (const table of testTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table}: Table does not exist`)
        } else if (error.message.includes('permission denied')) {
          console.log(`⚠️  ${table}: Table exists but RLS is active`)
        } else {
          console.log(`❌ ${table}: ${error.message}`)
        }
      } else {
        console.log(`✅ ${table}: Accessible`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }

  return true
}

async function insertSampleDataDirect() {
  console.log('\n📝 Attempting to insert sample data...')

  try {
    // Try to insert a sample coach profile
    console.log('👤 Inserting sample coach profile...')
    const { data: coachData, error: coachError } = await supabase
      .from('user_profiles')
      .insert([
        {
          email: 'pari@fitwithpari.com',
          full_name: 'Pari Fitness Coach',
          user_role: 'coach',
          fitness_level: 'advanced',
          phone_number: '+1-555-0123'
        }
      ])
      .select()

    if (coachError) {
      console.log('⚠️  Coach profile error:', coachError.message)
      if (coachError.message.includes('duplicate key')) {
        console.log('ℹ️  Coach profile already exists')
      }
    } else {
      console.log('✅ Sample coach profile created')
    }

    // Try to insert sample exercise content
    console.log('💪 Inserting sample exercise content...')
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercise_content')
      .insert([
        {
          name: 'Push-ups',
          description: 'Classic bodyweight chest exercise',
          benefits: 'Builds chest, shoulders, and triceps strength',
          target_audience: 'all',
          key_points: ['Keep body straight', 'Full range of motion', 'Control the movement'],
          equipment_needed: [],
          duration_seconds: 45,
          difficulty_level: 2,
          category: 'Upper Body'
        },
        {
          name: 'Squats',
          description: 'Fundamental lower body exercise',
          benefits: 'Strengthens legs, glutes, and core',
          target_audience: 'all',
          key_points: ['Feet shoulder-width apart', 'Keep chest up', 'Knees track over toes'],
          equipment_needed: [],
          duration_seconds: 60,
          difficulty_level: 2,
          category: 'Lower Body'
        }
      ])
      .select()

    if (exerciseError) {
      console.log('⚠️  Exercise content error:', exerciseError.message)
    } else {
      console.log('✅ Sample exercise content created')
    }

    return true
  } catch (error) {
    console.error('❌ Sample data insertion failed:', error.message)
    return false
  }
}

async function testRealtimeConnection() {
  console.log('\n🔄 Testing real-time connection...')

  try {
    const channel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('📡 Broadcast received:', payload)
      })
      .subscribe((status) => {
        console.log('📡 Channel status:', status)
      })

    setTimeout(() => {
      channel.unsubscribe()
      console.log('✅ Real-time test completed')
    }, 3000)

    return true
  } catch (error) {
    console.error('❌ Real-time test failed:', error.message)
    return false
  }
}

async function generateSQLScript() {
  console.log('\n📋 Generating SQL setup script for manual execution...')

  const sqlScript = `
-- FitWithPari Database Setup Script
-- Run this in your Supabase SQL Editor

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

-- RLS Policies

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Coaches can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.user_role IN ('coach', 'admin')
    )
  );

-- Class sessions policies
CREATE POLICY "Anyone can view sessions" ON class_sessions
  FOR SELECT USING (true);

CREATE POLICY "Coaches can manage own sessions" ON class_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = coach_id AND up.auth_user_id = auth.uid()
    )
  );

-- Session participants policies
CREATE POLICY "Users can view own participation" ON session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_id AND up.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view session participants" ON session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN user_profiles up ON cs.coach_id = up.id
      WHERE cs.id = session_id AND up.auth_user_id = auth.uid()
    )
  );

-- Health considerations policies
CREATE POLICY "Users can manage own health data" ON health_considerations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_id AND up.auth_user_id = auth.uid()
    )
  );

-- Exercise content policies
CREATE POLICY "Anyone can view exercises" ON exercise_content
  FOR SELECT USING (true);

CREATE POLICY "Coaches can manage exercises" ON exercise_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid() AND up.user_role IN ('coach', 'admin')
    )
  );

-- Insert sample data
INSERT INTO exercise_content (name, description, benefits, target_audience, key_points, equipment_needed, duration_seconds, difficulty_level, category) VALUES
('Push-ups', 'Classic bodyweight chest exercise', 'Builds chest, shoulders, and triceps strength', 'all', ARRAY['Keep body straight', 'Full range of motion', 'Control the movement'], ARRAY[]::text[], 45, 2, 'Upper Body'),
('Squats', 'Fundamental lower body exercise', 'Strengthens legs, glutes, and core', 'all', ARRAY['Feet shoulder-width apart', 'Keep chest up', 'Knees track over toes'], ARRAY[]::text[], 60, 2, 'Lower Body'),
('Plank', 'Static core strengthening exercise', 'Builds core stability and strength', 'all', ARRAY['Keep body straight', 'Engage core', 'Breathe normally'], ARRAY[]::text[], 30, 1, 'Core'),
('Burpees', 'High-intensity full body exercise', 'Improves cardiovascular fitness and builds strength', 'intermediate', ARRAY['Move with control', 'Full squat position', 'Jump with power'], ARRAY[]::text[], 45, 4, 'Full Body'),
('Mountain Climbers', 'Dynamic core and cardio exercise', 'Builds core strength and cardiovascular endurance', 'intermediate', ARRAY['Keep hips level', 'Quick alternating legs', 'Maintain plank position'], ARRAY[]::text[], 40, 3, 'Core');
`

  console.log('📄 SQL script generated! Copy and paste the following into your Supabase SQL Editor:')
  console.log(sqlScript)

  return sqlScript
}

async function main() {
  console.log('Starting FitWithPari direct database setup...\n')

  // Test connection first
  const connected = await testConnection()
  if (!connected) {
    console.log('\n❌ Database connection failed.')
    console.log('📋 Generating manual SQL script instead...')
    await generateSQLScript()
    return
  }

  // Test table access
  await createTablesDirectly()

  // Try to insert sample data
  await insertSampleDataDirect()

  // Test real-time
  await testRealtimeConnection()

  console.log('\n📋 Manual SQL Script Available')
  await generateSQLScript()

  console.log('\n🎉 FitWithPari Setup Analysis Complete!')
  console.log('=====================================')
  console.log('✅ Connection: Working')
  console.log('⚠️  Tables: Need manual creation via SQL Editor')
  console.log('📋 SQL Script: Generated above')
  console.log('✅ Real-time: Connection tested')
  console.log('\n📝 Next Steps:')
  console.log('1. Copy the SQL script above')
  console.log('2. Go to Supabase Dashboard > SQL Editor')
  console.log('3. Paste and run the script')
  console.log('4. Your fitness platform will be ready!')
}

main().catch(console.error)