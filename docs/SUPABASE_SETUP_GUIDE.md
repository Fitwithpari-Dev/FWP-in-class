# FitWithPari Supabase Backend Setup Guide

This comprehensive guide will help you set up the complete Supabase backend for FitWithPari, a real-time fitness platform with coach-student interactions, health tracking, and live session management.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Schema](#database-schema)
4. [Authentication Setup](#authentication-setup)
5. [Real-time Configuration](#real-time-configuration)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)
8. [Testing](#testing)
9. [Production Optimization](#production-optimization)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 16+ and npm
- Supabase account (https://supabase.com)
- AWS Amplify account (for deployment)
- Basic understanding of PostgreSQL and React

## Project Setup

### 1. Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New project"
3. Choose organization and set project name: `fitwithpari`
4. Set database password (save this securely)
5. Choose region closest to your users
6. Click "Create new project"

### 2. Install Supabase CLI

```bash
npm install -g @supabase/cli
```

### 3. Initialize Supabase in Your Project

```bash
cd FWP-in-class
supabase init
supabase login
supabase link --project-ref your-project-ref
```

## Database Schema

### 1. Run Initial Migration

Execute the database schema by running the migration files in order:

```bash
# Run the main schema
supabase db push

# Or manually apply each migration
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase/migrations/002_rls_policies.sql
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase/migrations/003_production_optimizations.sql
```

### 2. Seed Development Data

```bash
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase/seed.sql
```

### 3. Key Tables Overview

- **user_profiles**: Extended user information beyond Supabase Auth
- **health_considerations**: HIPAA-compliant health data storage
- **class_sessions**: Live fitness sessions with real-time features
- **session_participants**: Real-time participant management
- **exercise_content**: Exercise library with targeting by fitness level
- **participant_updates**: Real-time event streaming
- **session_messages**: In-session chat system

## Authentication Setup

### 1. Configure Auth Settings

In Supabase Dashboard → Authentication → Settings:

- **Site URL**: `http://localhost:3000` (development) / `https://your-domain.com` (production)
- **Additional Redirect URLs**: Add your production and staging URLs
- **JWT Expiry**: `3600` (1 hour)
- **Enable email confirmations**: `false` for development, `true` for production

### 2. Setup OAuth Providers (Optional)

For Google OAuth:
1. Go to Authentication → Providers
2. Enable Google provider
3. Add your OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Redirect URL**: Use the one provided by Supabase

### 3. Row Level Security

All RLS policies are automatically created via migration. Key features:
- HIPAA-compliant health data access
- Coach-student relationship enforcement
- Session-based data visibility
- Role-based permissions

## Real-time Configuration

### 1. Enable Real-time

In Supabase Dashboard → Database → Replication:
- Enable replication for all fitness-related tables:
  - `session_participants`
  - `participant_updates`
  - `session_messages`
  - `class_sessions`

### 2. Deploy Edge Functions

```bash
supabase functions deploy realtime-session-manager
```

### 3. Configure Real-time Settings

Update `supabase/config.toml`:
```toml
[realtime]
enabled = true
max_header_length = 4096
```

## Environment Variables

### 1. Create Environment Files

Copy the example and fill in your values:
```bash
cp .env.example .env.local
```

### 2. Required Variables

```env
# Supabase (get from Project Settings → API)
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Service role key (for Edge Functions only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Zoom SDK (get from Zoom Marketplace)
REACT_APP_ZOOM_SDK_KEY=your-zoom-sdk-key
REACT_APP_ZOOM_SDK_SECRET=your-zoom-sdk-secret

# Feature flags
REACT_APP_USE_SUPABASE=true
REACT_APP_ENABLE_HEALTH_TRACKING=true
```

### 3. AWS Amplify Environment Variables

In AWS Amplify Console → App Settings → Environment Variables, add:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_ZOOM_SDK_KEY`
- `REACT_APP_ZOOM_SDK_SECRET`
- All other required variables from `.env.example`

## Deployment

### 1. AWS Amplify Setup

1. Connect your GitHub repository to AWS Amplify
2. Use the provided `amplify.yml` build configuration
3. Set environment variables in Amplify Console
4. Deploy

### 2. Supabase Production Configuration

1. **Database**: Ensure connection pooling is enabled
2. **Auth**: Update redirect URLs for production domain
3. **Storage**: Configure buckets for user avatars and exercise content
4. **Edge Functions**: Deploy all functions to production

### 3. Custom Domain (Optional)

1. Add custom domain in AWS Amplify
2. Update Supabase auth redirect URLs
3. Update CORS settings if needed

## Testing

### 1. Run Development Server

```bash
npm start
# App will run on http://localhost:3000
```

### 2. Test Database Connection

```javascript
// Test in browser console
import { supabase } from './src/lib/supabase/supabase-client'
const { data, error } = await supabase.from('user_profiles').select('*').limit(1)
console.log({ data, error })
```

### 3. Test Real-time Features

1. Open multiple browser tabs
2. Join a session from different tabs
3. Test real-time updates (video toggle, chat, hand raising)

### 4. Test Authentication

1. Sign up new user
2. Test role assignment (coach/student)
3. Verify RLS policies work correctly

## Production Optimization

### 1. Database Performance

- All necessary indexes are created via migrations
- Connection pooling enabled
- Query optimization for real-time features

### 2. Monitoring

Use the built-in health check functions:
```sql
SELECT * FROM check_database_health();
SELECT * FROM get_session_analytics('session-id');
```

### 3. Data Cleanup

Automated cleanup jobs for:
- Old participant updates
- Completed session data
- GDPR compliance (data anonymization)

### 4. Security Considerations

- All health data protected by RLS
- Session-based access control
- HIPAA-compliant data handling
- Secure authentication flows

## Troubleshooting

### Common Issues

1. **Connection Errors**
   ```javascript
   // Check if environment variables are set
   console.log(process.env.REACT_APP_SUPABASE_URL)
   ```

2. **RLS Policy Errors**
   ```sql
   -- Test policies directly
   SELECT * FROM user_profiles; -- Should only show your own profile
   ```

3. **Real-time Not Working**
   - Check if replication is enabled for tables
   - Verify websocket connection in browser dev tools
   - Check if user is authenticated

4. **Build Failures on Amplify**
   - Check that all environment variables are set
   - Verify `amplify.yml` configuration
   - Check build logs for specific errors

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [AWS Amplify Documentation](https://docs.amplify.aws)
- [Project GitHub Issues](link-to-your-repo/issues)

## Next Steps

After setup is complete:

1. **Customize Exercise Content**: Add your own exercise library
2. **Integrate Zoom SDK**: Replace mock SDK with real Zoom integration
3. **Add Payment Processing**: Integrate Stripe for memberships
4. **Analytics Setup**: Add user behavior tracking
5. **Mobile App**: Consider React Native version

## Security Notes

- Never commit `.env` files to version control
- Use service role key only in Edge Functions
- Regularly rotate API keys
- Monitor for suspicious activity
- Follow HIPAA compliance guidelines for health data

---

For additional support or questions, please refer to the project documentation or create an issue in the repository.