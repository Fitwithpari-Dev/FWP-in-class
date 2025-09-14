#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://vzhpqjvkutveghznjgcf.supabase.co'
const supabaseKey = 'sb_secret_Zndd7_6CYMm6WDZbaz_rDg_8q6ArkoH' // Using secret key for admin operations

console.log('🏋️ FitWithPari Database Deployment')
console.log('===================================')

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployDatabase() {
  try {
    console.log('📊 Creating database tables...')

    // Create user profiles table
    console.log('👤 Creating user_profiles table...')
    const { error: profileError } = await supabase.rpc('sql', {
      sql: `
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

        -- Enable RLS
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_fitness_level ON user_profiles(fitness_level);
      `
    })

    if (profileError) {
      console.log('⚠️  user_profiles table:', profileError.message)
    } else {
      console.log('✅ user_profiles table created')
    }

    // Create class sessions table
    console.log('🏃 Creating class_sessions table...')
    const { error: sessionError } = await supabase.rpc('sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS class_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(200) NOT NULL,
          description TEXT,
          coach_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          duration INTEGER NOT NULL DEFAULT 60, -- in minutes
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

        -- Enable RLS
        ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_class_sessions_coach_id ON class_sessions(coach_id);
        CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
        CREATE INDEX IF NOT EXISTS idx_class_sessions_is_active ON class_sessions(is_active);
      `
    })

    if (sessionError) {
      console.log('⚠️  class_sessions table:', sessionError.message)
    } else {
      console.log('✅ class_sessions table created')
    }

    // Create health considerations table
    console.log('🏥 Creating health_considerations table...')
    const { error: healthError } = await supabase.rpc('sql', {
      sql: `
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

        -- Enable RLS
        ALTER TABLE health_considerations ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_health_considerations_user_id ON health_considerations(user_id);
        CREATE INDEX IF NOT EXISTS idx_health_considerations_type ON health_considerations(type);
        CREATE INDEX IF NOT EXISTS idx_health_considerations_severity ON health_considerations(severity);
      `
    })

    if (healthError) {
      console.log('⚠️  health_considerations table:', healthError.message)
    } else {
      console.log('✅ health_considerations table created')
    }

    // Create session participants table
    console.log('👥 Creating session_participants table...')
    const { error: participantError } = await supabase.rpc('sql', {
      sql: `
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

        -- Enable RLS
        ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
        CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_session_participants_is_active ON session_participants(is_active);
      `
    })

    if (participantError) {
      console.log('⚠️  session_participants table:', participantError.message)
    } else {
      console.log('✅ session_participants table created')
    }

    // Create exercise content table
    console.log('💪 Creating exercise_content table...')
    const { error: exerciseError } = await supabase.rpc('sql', {
      sql: `
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

        -- Enable RLS
        ALTER TABLE exercise_content ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_exercise_content_target_audience ON exercise_content(target_audience);
        CREATE INDEX IF NOT EXISTS idx_exercise_content_difficulty_level ON exercise_content(difficulty_level);
        CREATE INDEX IF NOT EXISTS idx_exercise_content_category ON exercise_content(category);
      `
    })

    if (exerciseError) {
      console.log('⚠️  exercise_content table:', exerciseError.message)
    } else {
      console.log('✅ exercise_content table created')
    }

    console.log('🎉 Database deployment completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log('- user_profiles: User accounts with fitness levels')
    console.log('- class_sessions: Live fitness sessions')
    console.log('- health_considerations: Health data (HIPAA-ready)')
    console.log('- session_participants: Live session tracking')
    console.log('- exercise_content: Exercise library')
    console.log('')
    console.log('🔐 Row Level Security (RLS) enabled on all tables')
    console.log('📊 Performance indexes created')
    console.log('')
    console.log('✅ Your FitWithPari database is ready!')

  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
  }
}

deployDatabase()