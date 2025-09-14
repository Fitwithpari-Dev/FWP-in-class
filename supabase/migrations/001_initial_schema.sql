-- FitWithPari Fitness Platform Database Schema
-- Complete migration for Supabase backend

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('coach', 'student', 'admin');
CREATE TYPE student_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE connection_quality AS ENUM ('excellent', 'good', 'poor');
CREATE TYPE health_consideration_type AS ENUM ('injury', 'condition', 'modification', 'preference');
CREATE TYPE health_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE coach_mode AS ENUM ('teach', 'workout');
CREATE TYPE session_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');

-- Users table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    phone TEXT,
    date_of_birth DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    fitness_level student_level,
    fitness_goals TEXT[],
    preferred_workout_times TEXT[],
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health considerations table
CREATE TABLE health_considerations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type health_consideration_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_exercises TEXT[],
    severity health_severity NOT NULL,
    recommended_modifications TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise content library
CREATE TABLE exercise_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    gif_url TEXT,
    video_url TEXT,
    benefits TEXT,
    target_audience student_level DEFAULT 'beginner',
    key_points TEXT[],
    equipment_needed TEXT[],
    muscle_groups TEXT[],
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
    estimated_duration INTEGER, -- in seconds
    created_by UUID REFERENCES user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class sessions
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL REFERENCES user_profiles(id),
    scheduled_start_time TIMESTAMPTZ NOT NULL,
    scheduled_duration INTEGER NOT NULL, -- in minutes
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    status session_status DEFAULT 'scheduled',
    max_participants INTEGER DEFAULT 20,
    is_recording BOOLEAN DEFAULT false,
    recording_url TEXT,
    zoom_meeting_id TEXT,
    zoom_passcode TEXT,
    current_exercise_id UUID REFERENCES exercise_content(id),
    exercise_timer INTEGER DEFAULT 0, -- in seconds
    coach_mode coach_mode DEFAULT 'teach',
    session_notes TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session participants (many-to-many)
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    is_video_on BOOLEAN DEFAULT true,
    is_audio_on BOOLEAN DEFAULT true,
    connection_quality connection_quality DEFAULT 'good',
    has_raised_hand BOOLEAN DEFAULT false,
    current_variation TEXT,
    current_rep_count INTEGER DEFAULT 0,
    session_notes TEXT, -- coach notes about this participant
    UNIQUE(session_id, user_id)
);

-- Real-time participant updates during sessions
CREATE TABLE participant_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL, -- 'video_toggle', 'audio_toggle', 'hand_raise', 'rep_count', etc.
    update_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session chat messages
CREATE TABLE session_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'emoji', 'system'
    is_private BOOLEAN DEFAULT false, -- for coach-to-student private messages
    recipient_id UUID REFERENCES user_profiles(id), -- for private messages
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise progress tracking
CREATE TABLE exercise_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercise_content(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    reps_completed INTEGER,
    duration_seconds INTEGER,
    difficulty_used student_level,
    modifications_used TEXT[],
    form_rating INTEGER CHECK (form_rating BETWEEN 1 AND 5),
    effort_level INTEGER CHECK (effort_level BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User fitness assessments
CREATE TABLE fitness_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assessed_by UUID REFERENCES user_profiles(id), -- coach who did assessment
    fitness_level student_level NOT NULL,
    strength_rating INTEGER CHECK (strength_rating BETWEEN 1 AND 10),
    cardio_rating INTEGER CHECK (cardio_rating BETWEEN 1 AND 10),
    flexibility_rating INTEGER CHECK (flexibility_rating BETWEEN 1 AND 10),
    balance_rating INTEGER CHECK (balance_rating BETWEEN 1 AND 10),
    notes TEXT,
    assessment_date DATE DEFAULT CURRENT_DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout plans
CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    target_level student_level NOT NULL,
    estimated_duration INTEGER, -- in minutes
    exercises JSONB NOT NULL, -- array of exercise_id with sets, reps, duration
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions/memberships
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    membership_type TEXT NOT NULL, -- 'basic', 'premium', 'coach'
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX idx_class_sessions_coach ON class_sessions(coach_id);
CREATE INDEX idx_class_sessions_status ON class_sessions(status);
CREATE INDEX idx_class_sessions_start_time ON class_sessions(scheduled_start_time);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_messages_session ON session_messages(session_id);
CREATE INDEX idx_session_messages_created ON session_messages(created_at);
CREATE INDEX idx_participant_updates_session ON participant_updates(session_id);
CREATE INDEX idx_participant_updates_created ON participant_updates(created_at);
CREATE INDEX idx_health_considerations_user ON health_considerations(user_id);
CREATE INDEX idx_health_considerations_active ON health_considerations(is_active);
CREATE INDEX idx_exercise_progress_user ON exercise_progress(user_id);
CREATE INDEX idx_exercise_progress_session ON exercise_progress(session_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_considerations_updated_at BEFORE UPDATE ON health_considerations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_content_updated_at BEFORE UPDATE ON exercise_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at BEFORE UPDATE ON class_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON workout_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON user_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_considerations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;