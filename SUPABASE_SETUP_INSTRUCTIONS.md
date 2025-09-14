# FitWithPari Supabase Database Setup

## 🎯 Quick Setup Guide

Since we can't execute raw SQL directly with the new API key system, here's how to set up your database through the Supabase Dashboard:

### 1. **Access Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `vzhpqjvkutveghznjgcf`

### 2. **Enable Database Access**
1. Go to **Settings** → **API**
2. Make sure your service role key has full database access
3. Go to **Database** → **Tables**

### 3. **Create Tables (Copy/Paste into SQL Editor)**

Go to **Database** → **SQL Editor** and run these commands one by one:

#### **Step 1: User Profiles Table**
```sql
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
```

#### **Step 2: Class Sessions Table**
```sql
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

-- Enable RLS
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_class_sessions_coach_id ON class_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_is_active ON class_sessions(is_active);
```

#### **Step 3: Health Considerations Table**
```sql
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
```

#### **Step 4: Session Participants Table**
```sql
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
```

#### **Step 5: Exercise Content Table**
```sql
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
```

### 4. **Add Row Level Security Policies**

After creating the tables, add these RLS policies:

```sql
-- User Profiles Policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Session Participants Policies
CREATE POLICY "Participants can view session data" ON session_participants
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Health Considerations Policies (Private Data)
CREATE POLICY "Users can manage their own health data" ON health_considerations
  FOR ALL USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Class Sessions Policies
CREATE POLICY "Coaches can manage their sessions" ON class_sessions
  FOR ALL USING (
    coach_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Exercise Content Policies
CREATE POLICY "All users can view exercises" ON exercise_content
  FOR SELECT USING (true);
```

### 5. **Add Sample Data (Optional)**

```sql
-- Insert sample coach
INSERT INTO user_profiles (auth_user_id, email, full_name, user_role, fitness_level)
VALUES (
  gen_random_uuid(),
  'coach@fitwithpari.com',
  'Sarah Johnson',
  'coach',
  'advanced'
);

-- Insert sample student
INSERT INTO user_profiles (auth_user_id, email, full_name, user_role, fitness_level)
VALUES (
  gen_random_uuid(),
  'student@fitwithpari.com',
  'Mike Chen',
  'student',
  'beginner'
);

-- Insert sample exercise
INSERT INTO exercise_content (name, description, target_audience, duration_seconds, category)
VALUES (
  'Push-ups',
  'Classic upper body exercise',
  'all',
  60,
  'strength'
);
```

### 6. **Enable Real-time**

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - `session_participants`
   - `class_sessions`
   - `health_considerations`

### 7. **Verify Setup**

After setup, you should see 5 tables in **Database** → **Tables**:
- ✅ user_profiles
- ✅ class_sessions
- ✅ health_considerations
- ✅ session_participants
- ✅ exercise_content

### 🎉 **You're Ready!**

Once the database is set up, the React app will automatically connect using your environment variables:

```env
VITE_SUPABASE_URL=https://vzhpqjvkutveghznjgcf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HyeFmpuM8KjK3m4MkiI4Yw_Hv9l7Rni
```

The fitness platform will then have:
- ✅ User management with roles
- ✅ Live session tracking
- ✅ Health data protection
- ✅ Real-time participant updates
- ✅ Exercise content library

Let me know when you've completed the database setup!