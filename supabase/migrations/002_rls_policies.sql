-- Row Level Security Policies for FitWithPari
-- Comprehensive security policies for HIPAA-compliant health data handling

-- User Profiles Policies
-- Users can view their own profile and coaches can view student profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Coaches can view student profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'coach'
        )
        AND role = 'student'
    );

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Health Considerations Policies (HIPAA-compliant)
-- Only the user and their assigned coaches can access health data
CREATE POLICY "Users can manage own health considerations" ON health_considerations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view student health considerations in their sessions" ON health_considerations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles coach
            WHERE coach.id = auth.uid()
            AND coach.role = 'coach'
        )
        AND EXISTS (
            SELECT 1 FROM session_participants sp
            JOIN class_sessions cs ON sp.session_id = cs.id
            WHERE sp.user_id = health_considerations.user_id
            AND cs.coach_id = auth.uid()
            AND cs.status IN ('live', 'scheduled')
        )
    );

-- Exercise Content Policies
-- Public exercises visible to all, private exercises only to creator
CREATE POLICY "All users can view public exercises" ON exercise_content
    FOR SELECT USING (is_active = true);

CREATE POLICY "Coaches can manage exercise content" ON exercise_content
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('coach', 'admin')
        )
    );

-- Class Sessions Policies
-- Students can view public sessions they're enrolled in or all public sessions
-- Coaches can manage their own sessions
CREATE POLICY "Students can view public sessions" ON class_sessions
    FOR SELECT USING (is_public = true);

CREATE POLICY "Participants can view their enrolled sessions" ON class_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = id AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage own sessions" ON class_sessions
    FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Admins can manage all sessions" ON class_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Session Participants Policies
-- Users can see participants in sessions they're part of
CREATE POLICY "Session participants can view other participants" ON session_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp2
            WHERE sp2.session_id = session_participants.session_id
            AND sp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participation status" ON session_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Coaches can manage participants in their sessions" ON session_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM class_sessions cs
            WHERE cs.id = session_id AND cs.coach_id = auth.uid()
        )
    );

-- Participant Updates Policies (Real-time)
-- Only session participants can view/create updates for their session
CREATE POLICY "Session participants can view updates" ON participant_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = participant_updates.session_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own updates" ON participant_updates
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can create updates for their session participants" ON participant_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM class_sessions cs
            WHERE cs.id = session_id AND cs.coach_id = auth.uid()
        )
    );

-- Session Messages Policies
-- Participants can view all public messages and their private messages
CREATE POLICY "Session participants can view public messages" ON session_messages
    FOR SELECT USING (
        is_private = false
        AND EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = session_messages.session_id
            AND sp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their private messages" ON session_messages
    FOR SELECT USING (
        is_private = true
        AND (sender_id = auth.uid() OR recipient_id = auth.uid())
    );

CREATE POLICY "Session participants can send messages" ON session_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = session_messages.session_id
            AND sp.user_id = auth.uid()
        )
    );

-- Exercise Progress Policies
-- Users can view their own progress, coaches can view student progress
CREATE POLICY "Users can manage own exercise progress" ON exercise_progress
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Coaches can view student progress in their sessions" ON exercise_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles coach
            WHERE coach.id = auth.uid() AND coach.role = 'coach'
        )
        AND (
            session_id IS NULL
            OR EXISTS (
                SELECT 1 FROM class_sessions cs
                WHERE cs.id = exercise_progress.session_id
                AND cs.coach_id = auth.uid()
            )
        )
    );

-- Fitness Assessments Policies
-- Users can view their assessments, coaches who created them can manage
CREATE POLICY "Users can view own fitness assessments" ON fitness_assessments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Coaches can manage assessments they created" ON fitness_assessments
    FOR ALL USING (
        assessed_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('coach', 'admin')
        )
    );

-- Workout Plans Policies
-- Public plans visible to all, private plans only to creator
CREATE POLICY "All users can view public workout plans" ON workout_plans
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own workout plans" ON workout_plans
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Coaches can manage workout plans" ON workout_plans
    FOR ALL USING (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('coach', 'admin')
        )
    );

-- User Memberships Policies
-- Users can view their own membership, admins can manage all
CREATE POLICY "Users can view own membership" ON user_memberships
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all memberships" ON user_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Function to check if user is a coach in a specific session
CREATE OR REPLACE FUNCTION is_session_coach(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM class_sessions cs
        WHERE cs.id = session_uuid
        AND cs.coach_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is participant in a session
CREATE OR REPLACE FUNCTION is_session_participant(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.session_id = session_uuid
        AND sp.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM user_profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_session_coach(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;