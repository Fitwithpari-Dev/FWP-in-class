# FitWithPari Supabase Backend

Complete Supabase backend implementation for the FitWithPari fitness platform with real-time capabilities, HIPAA-compliant health monitoring, and comprehensive analytics.

## 🏗️ Architecture Overview

### Database Schema
- **User Management**: Role-based access (coaches, students, admins)
- **Health Monitoring**: HIPAA-compliant health considerations and progress tracking
- **Live Sessions**: Real-time fitness classes with participant management
- **Exercise Library**: Comprehensive exercise content with difficulty levels
- **Analytics**: Progress tracking and session analytics
- **Security**: Row Level Security (RLS) on all tables

### Real-time Features
- Live session participant updates
- Real-time chat messaging
- Exercise timer synchronization
- Health status monitoring
- Connection quality tracking

### Edge Functions
- **realtime-session-manager**: Handles live session events
- **fitness-analytics**: Advanced analytics and progress tracking
- **health-monitor**: HIPAA-compliant health data processing

## 🚀 Quick Setup

### Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL client (`psql`)
- Node.js and npm/yarn

### Automated Setup
```bash
# Make the script executable
chmod +x setup-fitwithpari.sh

# Run the complete setup
./setup-fitwithpari.sh
```

### Manual Setup
1. **Deploy Database Schema**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.vzhpqjvkutveghznjgcf.supabase.co:5432/postgres" -f supabase/deploy-database.sql
   ```

2. **Setup Real-time Subscriptions**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.vzhpqjvkutveghznjgcf.supabase.co:5432/postgres" -f supabase/realtime-subscriptions.sql
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy realtime-session-manager --project-ref vzhpqjvkutveghznjgcf
   supabase functions deploy fitness-analytics --project-ref vzhpqjvkutveghznjgcf
   supabase functions deploy health-monitor --project-ref vzhpqjvkutveghznjgcf
   ```

4. **Seed Test Data**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.vzhpqjvkutveghznjgcf.supabase.co:5432/postgres" -f supabase/seed.sql
   ```

## 📁 File Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql        # Core database schema
│   ├── 002_rls_policies.sql          # Row Level Security policies
│   └── 003_production_optimizations.sql # Performance optimizations
├── functions/
│   ├── realtime-session-manager/     # Live session management
│   ├── fitness-analytics/            # Analytics and insights
│   └── health-monitor/               # Health data processing
├── seed.sql                          # Test data
├── deploy-database.sql               # Complete deployment script
├── realtime-subscriptions.sql       # Real-time setup
├── react-integration-guide.md       # Frontend integration guide
└── README.md                         # This file
```

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with comprehensive policies:

- **User Profiles**: Users see own profile, coaches see students
- **Health Data**: Strict HIPAA-compliant access controls
- **Sessions**: Coach/participant-based access
- **Messages**: Session participants only
- **Progress**: User and coach access

### Health Data Compliance
- Encrypted storage of health considerations
- Audit trails for health data access
- Coach access only during active sessions
- Automatic data anonymization functions

### Authentication
- Supabase Auth integration
- Role-based permissions (coach/student/admin)
- Session-based access controls

## 📊 Database Schema

### Core Tables

#### `user_profiles`
- User information and roles
- Fitness levels and goals
- Emergency contacts
- Activity status

#### `health_considerations`
- Medical conditions and injuries
- Exercise modifications
- Severity levels (low/medium/high)
- Affected exercises

#### `class_sessions`
- Live fitness sessions
- Coach assignments
- Exercise tracking
- Recording capabilities

#### `session_participants`
- Real-time participant status
- Audio/video settings
- Connection quality
- Rep counting

#### `exercise_content`
- Exercise library
- Difficulty levels
- Equipment requirements
- Target muscle groups

### Analytics Tables

#### `exercise_progress`
- Performance tracking
- Form ratings
- Effort levels
- Modifications used

#### `fitness_assessments`
- Coach evaluations
- Strength/cardio/flexibility ratings
- Progress over time

## ⚡ Real-time Features

### Subscriptions Setup
```sql
-- Enable real-time for live sessions
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE participant_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
```

### Live Session Events
- Participant join/leave
- Exercise changes
- Rep count updates
- Hand raising
- Chat messages
- Connection quality changes

### Real-time Functions
- `notify_session_status_change()`: Session state changes
- `notify_participant_change()`: Participant updates
- `notify_exercise_change()`: Exercise transitions
- `broadcast_urgent_message()`: Priority messaging

## 🏥 Health Monitoring

### HIPAA Compliance
- Encrypted health data storage
- Access logging and audit trails
- Automatic data retention policies
- Consent management

### Health Checks
- Exercise safety validation
- Contraindication checking
- Real-time health monitoring
- Modification recommendations

### Health Analytics
- Progress trend analysis
- Risk factor identification
- Modification adherence tracking
- Health improvement metrics

## 📈 Analytics & Insights

### Session Analytics
```typescript
// Get comprehensive session metrics
const analytics = await fetch('/api/fitness-analytics', {
  method: 'POST',
  body: JSON.stringify({
    action: 'session_analytics',
    sessionId: 'session-uuid'
  })
});
```

### User Progress
```typescript
// Track user fitness progress
const progress = await fetch('/api/fitness-analytics', {
  method: 'POST',
  body: JSON.stringify({
    action: 'user_progress',
    userId: 'user-uuid',
    timeframe: 'month'
  })
});
```

### Coach Dashboard
```typescript
// Get coach performance metrics
const dashboard = await fetch('/api/fitness-analytics', {
  method: 'POST',
  body: JSON.stringify({
    action: 'coach_dashboard',
    userId: 'coach-uuid'
  })
});
```

## 🔧 Edge Functions

### Realtime Session Manager
**Endpoint**: `/functions/v1/realtime-session-manager`

**Actions**:
- `join_session`: Add participant to session
- `leave_session`: Remove participant from session
- `update_participant`: Update participant status
- `send_message`: Send chat message
- `raise_hand`: Raise/lower hand
- `exercise_update`: Change current exercise (coaches only)

### Fitness Analytics
**Endpoint**: `/functions/v1/fitness-analytics`

**Actions**:
- `user_progress`: Get user fitness progress
- `session_analytics`: Session performance metrics
- `coach_dashboard`: Coach performance overview
- `exercise_effectiveness`: Exercise performance analysis
- `health_insights`: Health-based recommendations
- `attendance_trends`: Attendance pattern analysis

### Health Monitor
**Endpoint**: `/functions/v1/health-monitor`

**Actions**:
- `validate_exercise_safety`: Check exercise safety for user
- `update_health_status`: Update health considerations
- `get_exercise_modifications`: Get exercise modifications
- `monitor_session_health`: Real-time health monitoring
- `generate_health_report`: Comprehensive health report
- `check_exercise_contraindications`: Contraindication analysis

## 🎯 API Usage Examples

### Join a Session
```typescript
const response = await fetch('/api/session-manager', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'join_session',
    sessionId: 'session-uuid',
    userId: 'user-uuid',
    updateData: {
      isVideoOn: true,
      isAudioOn: true,
      connectionQuality: 'good'
    }
  })
});
```

### Check Exercise Safety
```typescript
const safety = await fetch('/api/health-monitor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'validate_exercise_safety',
    userId: 'user-uuid',
    exerciseName: 'Push-ups'
  })
});
```

### Get Session Analytics
```typescript
const analytics = await fetch('/api/fitness-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'session_analytics',
    sessionId: 'session-uuid'
  })
});
```

## 🚀 Frontend Integration

### React Setup
1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-react
   ```

2. Configure environment:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://vzhpqjvkutveghznjgcf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HyeFmpuM8KjK3m4MkiI4Yw_Hv9l7Rni
   ```

3. Follow the complete integration guide:
   - [React Integration Guide](./react-integration-guide.md)

### Key Hooks
- `useAuth()`: Authentication and user management
- `useSession(sessionId)`: Live session management
- `useHealthMonitor()`: Health data monitoring

## 🧪 Testing

### Test Users
The seed data includes test users for development:

**Coaches**:
- sarah.johnson@fitwithpari.com (Coach)
- mike.trainer@fitwithpari.com (Coach)

**Students**:
- mike.chen@email.com (Beginner)
- emma.davis@email.com (Beginner, knee surgery)
- alex.rodriguez@email.com (Intermediate, back pain)
- lisa.park@email.com (Intermediate, pregnancy)
- maria.garcia@email.com (Advanced)

### Test Session
A live test session is created with participants across all fitness levels and various health considerations.

## 📊 Performance Optimizations

### Database Indexes
- Optimized queries for real-time operations
- Composite indexes for complex queries
- Partial indexes for filtered data
- Materialized views for analytics

### Real-time Optimization
- Filtered subscriptions to reduce bandwidth
- Connection pooling and management
- Automatic cleanup of old data
- Performance monitoring views

### Caching Strategy
- Session statistics materialized view
- Automatic refresh schedules
- Edge function caching
- Query result optimization

## 🔍 Monitoring & Maintenance

### Health Checks
```sql
-- Database health status
SELECT * FROM check_database_health();

-- Session statistics
SELECT * FROM session_statistics;

-- Performance metrics
SELECT * FROM performance_metrics;
```

### Maintenance Tasks
- Automatic cleanup of old session data
- Health data anonymization
- Session statistics refresh
- Performance monitoring

### Scheduled Jobs
```sql
-- Refresh statistics every 15 minutes
SELECT cron.schedule('refresh-session-stats', '*/15 * * * *', 'SELECT refresh_session_statistics();');

-- Cleanup old data daily at 2 AM
SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_session_data(90);');

-- Session cleanup every hour
SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'CALL cleanup_completed_sessions(1);');
```

## 🆘 Troubleshooting

### Common Issues

1. **Real-time not working**
   - Check publication settings
   - Verify RLS policies
   - Ensure proper authentication

2. **Health data access denied**
   - Verify user roles
   - Check session participation
   - Review RLS policies

3. **Edge function errors**
   - Check environment variables
   - Verify function deployment
   - Review error logs

### Support
- Review setup-report.txt for configuration details
- Check Supabase logs for errors
- Verify environment variables
- Test with provided seed data

## 📝 License

This backend implementation is part of the FitWithPari fitness platform and includes HIPAA-compliant health data handling.

---

**Need help?** Check the React integration guide or review the setup report for detailed configuration information.