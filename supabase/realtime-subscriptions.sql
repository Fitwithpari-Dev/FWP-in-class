-- Real-time Subscriptions Setup for FitWithPari
-- Configure Supabase real-time for live fitness sessions

-- Enable real-time for all necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE class_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE participant_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE exercise_content;
ALTER PUBLICATION supabase_realtime ADD TABLE health_considerations;

-- Create function to notify on session status changes
CREATE OR REPLACE FUNCTION notify_session_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on status changes to/from 'live'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND (OLD.status = 'live' OR NEW.status = 'live')) THEN
        PERFORM pg_notify('session_status_changed',
            json_build_object(
                'session_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'coach_id', NEW.coach_id,
                'title', NEW.title
            )::text
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session status changes
CREATE TRIGGER session_status_change_trigger
    AFTER UPDATE ON class_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_session_status_change();

-- Create function to notify on participant changes
CREATE OR REPLACE FUNCTION notify_participant_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify('participant_joined',
            json_build_object(
                'session_id', NEW.session_id,
                'user_id', NEW.user_id,
                'joined_at', NEW.joined_at
            )::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
        PERFORM pg_notify('participant_left',
            json_build_object(
                'session_id', NEW.session_id,
                'user_id', NEW.user_id,
                'left_at', NEW.left_at
            )::text
        );
        RETURN NEW;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for participant changes
CREATE TRIGGER participant_change_trigger
    AFTER INSERT OR UPDATE ON session_participants
    FOR EACH ROW
    EXECUTE FUNCTION notify_participant_change();

-- Create function to handle real-time exercise updates
CREATE OR REPLACE FUNCTION notify_exercise_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.current_exercise_id != NEW.current_exercise_id OR
        OLD.exercise_timer != NEW.exercise_timer OR
        OLD.coach_mode != NEW.coach_mode
    ) THEN
        PERFORM pg_notify('exercise_updated',
            json_build_object(
                'session_id', NEW.id,
                'current_exercise_id', NEW.current_exercise_id,
                'exercise_timer', NEW.exercise_timer,
                'coach_mode', NEW.coach_mode,
                'coach_id', NEW.coach_id
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for exercise changes
CREATE TRIGGER exercise_change_trigger
    AFTER UPDATE ON class_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_exercise_change();

-- Create function to broadcast urgent messages
CREATE OR REPLACE FUNCTION broadcast_urgent_message()
RETURNS TRIGGER AS $$
BEGIN
    -- If message contains "urgent" or is from coach, broadcast immediately
    IF NEW.message ILIKE '%urgent%' OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = NEW.sender_id AND role = 'coach'
    ) THEN
        PERFORM pg_notify('urgent_message',
            json_build_object(
                'session_id', NEW.session_id,
                'sender_id', NEW.sender_id,
                'message', NEW.message,
                'message_type', NEW.message_type,
                'is_private', NEW.is_private,
                'created_at', NEW.created_at
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for urgent messages
CREATE TRIGGER urgent_message_trigger
    AFTER INSERT ON session_messages
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_urgent_message();

-- Function to get real-time session participants with health considerations
CREATE OR REPLACE FUNCTION get_session_participants_with_health(session_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    fitness_level student_level,
    is_video_on BOOLEAN,
    is_audio_on BOOLEAN,
    connection_quality connection_quality,
    has_raised_hand BOOLEAN,
    current_rep_count INTEGER,
    health_considerations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.user_id,
        up.full_name,
        up.fitness_level,
        sp.is_video_on,
        sp.is_audio_on,
        sp.connection_quality,
        sp.has_raised_hand,
        sp.current_rep_count,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', hc.type,
                    'title', hc.title,
                    'severity', hc.severity,
                    'affected_exercises', hc.affected_exercises,
                    'recommended_modifications', hc.recommended_modifications
                )
            ) FILTER (WHERE hc.id IS NOT NULL),
            '[]'::jsonb
        ) as health_considerations
    FROM session_participants sp
    JOIN user_profiles up ON sp.user_id = up.id
    LEFT JOIN health_considerations hc ON sp.user_id = hc.user_id AND hc.is_active = true
    WHERE sp.session_id = session_uuid
    AND sp.left_at IS NULL
    GROUP BY sp.user_id, up.full_name, up.fitness_level, sp.is_video_on,
             sp.is_audio_on, sp.connection_quality, sp.has_raised_hand, sp.current_rep_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update participant rep count with validation
CREATE OR REPLACE FUNCTION update_participant_reps(
    session_uuid UUID,
    participant_uuid UUID,
    new_rep_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    is_participant BOOLEAN;
    is_session_live BOOLEAN;
BEGIN
    -- Verify participant is in session
    SELECT EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = session_uuid
        AND user_id = participant_uuid
        AND left_at IS NULL
    ) INTO is_participant;

    -- Verify session is live
    SELECT EXISTS (
        SELECT 1 FROM class_sessions
        WHERE id = session_uuid
        AND status = 'live'
    ) INTO is_session_live;

    IF NOT is_participant OR NOT is_session_live THEN
        RETURN FALSE;
    END IF;

    -- Update rep count
    UPDATE session_participants
    SET current_rep_count = new_rep_count
    WHERE session_id = session_uuid
    AND user_id = participant_uuid;

    -- Log the update
    INSERT INTO participant_updates (
        session_id,
        user_id,
        update_type,
        update_data
    ) VALUES (
        session_uuid,
        participant_uuid,
        'rep_count_updated',
        jsonb_build_object('new_rep_count', new_rep_count, 'timestamp', NOW())
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_session_participants_with_health(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_participant_reps(UUID, UUID, INTEGER) TO authenticated;

-- Create indexes for real-time performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_updates_realtime
ON participant_updates (session_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '1 hour';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_messages_realtime
ON session_messages (session_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '2 hours';

-- Create view for active session summary (useful for real-time dashboard)
CREATE OR REPLACE VIEW active_session_summary AS
SELECT
    cs.id as session_id,
    cs.title,
    cs.coach_id,
    up.full_name as coach_name,
    cs.scheduled_start_time,
    cs.actual_start_time,
    cs.scheduled_duration,
    cs.status,
    cs.max_participants,
    cs.current_exercise_id,
    ec.name as current_exercise_name,
    cs.exercise_timer,
    cs.coach_mode,
    COUNT(sp.user_id) as total_participants,
    COUNT(sp.user_id) FILTER (WHERE sp.left_at IS NULL) as active_participants,
    COUNT(sp.user_id) FILTER (WHERE sp.has_raised_hand = true AND sp.left_at IS NULL) as hands_raised,
    AVG(sp.current_rep_count) FILTER (WHERE sp.left_at IS NULL) as avg_rep_count,
    json_agg(
        json_build_object(
            'user_id', sp.user_id,
            'full_name', up2.full_name,
            'is_video_on', sp.is_video_on,
            'is_audio_on', sp.is_audio_on,
            'connection_quality', sp.connection_quality,
            'has_raised_hand', sp.has_raised_hand,
            'current_rep_count', sp.current_rep_count
        ) ORDER BY sp.joined_at
    ) FILTER (WHERE sp.left_at IS NULL) as active_participant_details
FROM class_sessions cs
JOIN user_profiles up ON cs.coach_id = up.id
LEFT JOIN exercise_content ec ON cs.current_exercise_id = ec.id
LEFT JOIN session_participants sp ON cs.id = sp.session_id
LEFT JOIN user_profiles up2 ON sp.user_id = up2.id
WHERE cs.status IN ('live', 'scheduled')
GROUP BY cs.id, cs.title, cs.coach_id, up.full_name, cs.scheduled_start_time,
         cs.actual_start_time, cs.scheduled_duration, cs.status, cs.max_participants,
         cs.current_exercise_id, ec.name, cs.exercise_timer, cs.coach_mode;

-- Grant access to the view
GRANT SELECT ON active_session_summary TO authenticated;

-- Function to safely start a session (handles race conditions)
CREATE OR REPLACE FUNCTION start_session_safely(session_uuid UUID, coach_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    session_record RECORD;
    result JSONB;
BEGIN
    -- Lock the session row to prevent race conditions
    SELECT * FROM class_sessions
    WHERE id = session_uuid AND coach_id = coach_uuid
    FOR UPDATE INTO session_record;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or unauthorized');
    END IF;

    -- Check if already started
    IF session_record.status = 'live' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Session already live');
    END IF;

    -- Check if can be started (must be scheduled and within time window)
    IF session_record.status != 'scheduled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session cannot be started');
    END IF;

    -- Start the session
    UPDATE class_sessions
    SET
        status = 'live',
        actual_start_time = NOW()
    WHERE id = session_uuid;

    -- Create system message
    INSERT INTO session_messages (
        session_id,
        sender_id,
        message,
        message_type
    ) VALUES (
        session_uuid,
        coach_uuid,
        'Session has started! Welcome everyone!',
        'system'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Session started successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely end a session
CREATE OR REPLACE FUNCTION end_session_safely(session_uuid UUID, coach_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Lock the session row
    SELECT * FROM class_sessions
    WHERE id = session_uuid AND coach_id = coach_uuid
    FOR UPDATE INTO session_record;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or unauthorized');
    END IF;

    IF session_record.status != 'live' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session is not live');
    END IF;

    -- End the session
    UPDATE class_sessions
    SET
        status = 'completed',
        actual_end_time = NOW()
    WHERE id = session_uuid;

    -- Mark all participants as left
    UPDATE session_participants
    SET left_at = NOW()
    WHERE session_id = session_uuid AND left_at IS NULL;

    -- Create system message
    INSERT INTO session_messages (
        session_id,
        sender_id,
        message,
        message_type
    ) VALUES (
        session_uuid,
        coach_uuid,
        'Session has ended. Thank you for participating!',
        'system'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Session ended successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION start_session_safely(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_session_safely(UUID, UUID) TO authenticated;