-- Production Optimizations for FitWithPari
-- Performance indexes, monitoring, and production-ready configurations

-- Additional performance indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_coach_status
ON class_sessions(coach_id, status) WHERE status IN ('scheduled', 'live');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_public_scheduled
ON class_sessions(is_public, scheduled_start_time) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_participants_session_active
ON session_participants(session_id) WHERE left_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_updates_session_time
ON participant_updates(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_messages_session_time
ON session_messages(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_messages_private
ON session_messages(session_id, is_private, recipient_id) WHERE is_private = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_progress_user_session
ON exercise_progress(user_id, session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_considerations_user_active
ON health_considerations(user_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_memberships_user_status
ON user_memberships(user_id, status) WHERE status = 'active';

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_coach_time_status
ON class_sessions(coach_id, scheduled_start_time, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_session_joined
ON session_participants(session_id, joined_at) WHERE left_at IS NULL;

-- Partial indexes for fitness levels
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_student_level
ON user_profiles(fitness_level, role) WHERE role = 'student' AND fitness_level IS NOT NULL;

-- Function to get session analytics
CREATE OR REPLACE FUNCTION get_session_analytics(session_uuid UUID)
RETURNS TABLE (
    total_participants INTEGER,
    active_participants INTEGER,
    avg_connection_quality NUMERIC,
    total_messages INTEGER,
    hands_raised INTEGER,
    avg_rep_count NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_participants,
        COUNT(*) FILTER (WHERE sp.left_at IS NULL)::INTEGER as active_participants,
        AVG(CASE
            WHEN sp.connection_quality = 'excellent' THEN 3
            WHEN sp.connection_quality = 'good' THEN 2
            ELSE 1
        END) as avg_connection_quality,
        (SELECT COUNT(*)::INTEGER FROM session_messages WHERE session_id = session_uuid) as total_messages,
        COUNT(*) FILTER (WHERE sp.has_raised_hand = true)::INTEGER as hands_raised,
        AVG(sp.current_rep_count) as avg_rep_count
    FROM session_participants sp
    WHERE sp.session_id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old data (for GDPR compliance and performance)
CREATE OR REPLACE FUNCTION cleanup_old_session_data(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old participant updates (keep only recent for debugging)
    DELETE FROM participant_updates
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete old session messages from completed sessions
    DELETE FROM session_messages sm
    USING class_sessions cs
    WHERE sm.session_id = cs.id
    AND cs.status = 'completed'
    AND cs.actual_end_time < NOW() - INTERVAL '1 day' * days_old;

    -- Update session participants left_at for very old sessions
    UPDATE session_participants
    SET left_at = COALESCE(left_at, NOW())
    WHERE left_at IS NULL
    AND session_id IN (
        SELECT id FROM class_sessions
        WHERE status = 'completed'
        AND actual_end_time < NOW() - INTERVAL '1 day' * (days_old / 2)
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user fitness progress
CREATE OR REPLACE FUNCTION get_user_fitness_progress(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    exercise_name TEXT,
    avg_reps NUMERIC,
    max_reps INTEGER,
    total_sessions INTEGER,
    improvement_trend NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.name as exercise_name,
        AVG(ep.reps_completed) as avg_reps,
        MAX(ep.reps_completed) as max_reps,
        COUNT(*)::INTEGER as total_sessions,
        -- Calculate improvement trend (slope of reps over time)
        CASE
            WHEN COUNT(*) > 1 THEN
                (COUNT(*) * SUM(extract(epoch from ep.created_at) * ep.reps_completed) -
                 SUM(extract(epoch from ep.created_at)) * SUM(ep.reps_completed)) /
                (COUNT(*) * SUM(power(extract(epoch from ep.created_at), 2)) -
                 power(SUM(extract(epoch from ep.created_at)), 2))
            ELSE 0
        END as improvement_trend
    FROM exercise_progress ep
    JOIN exercise_content ec ON ep.exercise_id = ec.id
    WHERE ep.user_id = user_uuid
    AND ep.created_at > NOW() - INTERVAL '1 day' * days_back
    AND ep.reps_completed IS NOT NULL
    GROUP BY ec.name, ec.id
    ORDER BY total_sessions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for session statistics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS session_statistics AS
SELECT
    cs.id as session_id,
    cs.title,
    cs.coach_id,
    cs.scheduled_start_time,
    cs.status,
    COUNT(sp.user_id) as total_participants,
    COUNT(sp.user_id) FILTER (WHERE sp.left_at IS NULL) as active_participants,
    AVG(CASE
        WHEN sp.connection_quality = 'excellent' THEN 3
        WHEN sp.connection_quality = 'good' THEN 2
        ELSE 1
    END) as avg_connection_quality,
    COUNT(sm.id) as total_messages,
    MAX(sp.current_rep_count) as max_reps,
    AVG(sp.current_rep_count) as avg_reps
FROM class_sessions cs
LEFT JOIN session_participants sp ON cs.id = sp.session_id
LEFT JOIN session_messages sm ON cs.id = sm.session_id
WHERE cs.created_at > NOW() - INTERVAL '30 days'
GROUP BY cs.id, cs.title, cs.coach_id, cs.scheduled_start_time, cs.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_statistics_id ON session_statistics(session_id);

-- Function to refresh session statistics
CREATE OR REPLACE FUNCTION refresh_session_statistics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY session_statistics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create monitoring views for health checks
CREATE OR REPLACE VIEW health_check_view AS
SELECT
    'user_profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_records
FROM user_profiles
UNION ALL
SELECT
    'class_sessions',
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')
FROM class_sessions
UNION ALL
SELECT
    'session_participants',
    COUNT(*),
    COUNT(*) FILTER (WHERE joined_at > NOW() - INTERVAL '24 hours')
FROM session_participants
UNION ALL
SELECT
    'participant_updates',
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')
FROM participant_updates;

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
    status TEXT,
    table_name TEXT,
    record_count BIGINT,
    recent_activity BIGINT,
    health_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN record_count > 0 AND recent_activity >= 0 THEN 'healthy'
            WHEN record_count > 0 AND recent_activity = 0 THEN 'stale'
            ELSE 'empty'
        END as status,
        hcv.table_name,
        hcv.total_records as record_count,
        hcv.recent_records as recent_activity,
        CASE
            WHEN hcv.total_records = 0 THEN 0
            ELSE (hcv.recent_records::NUMERIC / GREATEST(hcv.total_records, 1)) * 100
        END as health_score
    FROM health_check_view hcv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_metrics AS
SELECT
    schemaname,
    tablename,
    attname,
    inherited,
    null_frac,
    avg_width,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    histogram_bounds
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'class_sessions', 'session_participants', 'participant_updates');

-- Create stored procedure for session cleanup
CREATE OR REPLACE PROCEDURE cleanup_completed_sessions(session_age_days INTEGER DEFAULT 7)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark old live sessions as completed if they're really old
    UPDATE class_sessions
    SET status = 'completed',
        actual_end_time = COALESCE(actual_end_time, scheduled_start_time + INTERVAL '1 minute' * scheduled_duration)
    WHERE status = 'live'
    AND scheduled_start_time < NOW() - INTERVAL '1 day' * session_age_days;

    -- Close participant sessions for completed sessions
    UPDATE session_participants
    SET left_at = COALESCE(left_at, NOW())
    WHERE left_at IS NULL
    AND session_id IN (
        SELECT id FROM class_sessions
        WHERE status = 'completed'
        AND actual_end_time < NOW() - INTERVAL '1 day' * session_age_days
    );

    COMMIT;
END;
$$;

-- Create function for HIPAA-compliant data anonymization
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Anonymize personal data while keeping fitness metrics
    UPDATE user_profiles
    SET
        email = 'anonymized_' || id || '@deleted.local',
        full_name = 'Deleted User',
        phone = NULL,
        emergency_contact_name = NULL,
        emergency_contact_phone = NULL,
        avatar_url = NULL,
        is_active = false
    WHERE id = user_uuid;

    -- Keep health considerations for aggregate analytics but anonymize
    UPDATE health_considerations
    SET
        title = 'Anonymized Health Consideration',
        description = 'Data anonymized per user request'
    WHERE user_id = user_uuid;

    -- Remove personal messages but keep system messages
    DELETE FROM session_messages
    WHERE sender_id = user_uuid
    AND message_type != 'system';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION get_session_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_fitness_progress(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_database_health() TO authenticated;
GRANT SELECT ON health_check_view TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;
GRANT SELECT ON session_statistics TO authenticated;

-- Create scheduled job to refresh statistics (requires pg_cron extension)
-- SELECT cron.schedule('refresh-session-stats', '*/15 * * * *', 'SELECT refresh_session_statistics();');

-- Create scheduled job for cleanup (runs daily at 2 AM)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_session_data(90);');

-- Create scheduled job for session cleanup (runs every hour)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'CALL cleanup_completed_sessions(1);');