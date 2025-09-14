# FitWithPari Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Build & Deployment](#build--deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Required Services
- [x] AWS Account with Amplify access
- [x] Supabase project configured
- [x] Zoom Video SDK credentials
- [x] Domain name (optional but recommended)

### Local Prerequisites
```bash
# Install required tools
npm install -g @aws-amplify/cli
npm install -g @supabase/cli

# Verify installations
amplify --version
supabase --version
```

### Environment Variables
Ensure all production environment variables are set in AWS Amplify Console:

```env
# Critical Variables (MUST be set)
VITE_ZOOM_SDK_KEY=<your_zoom_sdk_key>
VITE_ZOOM_SDK_SECRET=<your_zoom_sdk_secret>
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_JWT_SECRET=<your_jwt_secret_min_32_chars>
```

---

## Environment Setup

### 1. Configure AWS Amplify

```bash
# Initialize Amplify (if not done)
amplify init

# Configure hosting
amplify add hosting

# Select: Hosting with Amplify Console
# Select: Manual deployment
```

### 2. Configure Supabase

```bash
# Link to existing project
supabase link --project-ref <your-project-ref>

# Push database schema
supabase db push

# Verify RLS policies
supabase db remote commit
```

### 3. Configure Zoom SDK

1. Log in to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Navigate to your Video SDK App
3. Add production domain to allowed origins
4. Copy SDK credentials to environment variables

---

## Build & Deployment

### Automated Deployment (Recommended)

#### For Windows:
```powershell
# Run the deployment script
.\scripts\deploy.ps1
```

#### For macOS/Linux:
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run the deployment script
./scripts/deploy.sh
```

### Manual Deployment

1. **Install Dependencies**
```bash
npm ci --production=false
```

2. **Build Production Bundle**
```bash
npm run build
```

3. **Deploy to AWS Amplify**
```bash
# Using Amplify CLI
amplify publish

# Or using AWS Console
# 1. Navigate to AWS Amplify Console
# 2. Select your app
# 3. Click "Deploy"
# 4. Upload build folder
```

### CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_ZOOM_SDK_KEY: ${{ secrets.VITE_ZOOM_SDK_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Deploy to Amplify
        uses: aws-amplify/amplify-cli-action@v1.2.0
        with:
          amplify_command: publish
          amplify_env: production
```

---

## Post-Deployment Verification

### 1. Functional Testing

```bash
# Test production build locally first
npm run build
npm run preview
```

### 2. Integration Testing Checklist

- [ ] **Authentication Flow**
  - [ ] User registration works
  - [ ] Login/logout functions properly
  - [ ] Password reset emails sent

- [ ] **Zoom SDK Integration**
  - [ ] Video sessions can be created
  - [ ] Multiple participants can join
  - [ ] Audio/video toggles work
  - [ ] Screen sharing functions

- [ ] **Supabase Integration**
  - [ ] Real-time subscriptions active
  - [ ] Database queries execute properly
  - [ ] File uploads work
  - [ ] RLS policies enforced

- [ ] **Performance Checks**
  - [ ] Page load time < 3 seconds
  - [ ] Video stream latency < 500ms
  - [ ] No memory leaks detected

### 3. Security Verification

```bash
# Check security headers
curl -I https://your-app-url.amplifyapp.com

# Verify SSL certificate
openssl s_client -connect your-app-url.amplifyapp.com:443
```

---

## Monitoring & Maintenance

### CloudWatch Monitoring

1. Navigate to AWS CloudWatch
2. Create dashboard for:
   - Application errors
   - API response times
   - CDN cache hit rates
   - Lambda function invocations

### Supabase Monitoring

```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_database_size('postgres');

-- Monitor slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Performance Monitoring

```javascript
// Add to your app for real user monitoring
import { reportWebVitals } from './utils/monitoring';

reportWebVitals(console.log);
```

### Error Tracking (Optional - Sentry)

```bash
# Install Sentry
npm install @sentry/react

# Configure in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Zoom SDK Connection Issues
- Verify SDK credentials are correct
- Check domain is whitelisted in Zoom App
- Ensure JWT token generation is working

#### 3. Supabase Connection Errors
- Verify CORS settings in Supabase dashboard
- Check RLS policies aren't blocking queries
- Ensure anon key has proper permissions

#### 4. CloudFront CDN Issues
```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### 5. Large Bundle Size
```bash
# Analyze bundle
npm run build -- --analyze

# Common optimizations:
# - Enable code splitting
# - Lazy load components
# - Optimize images
# - Remove unused dependencies
```

### Debug Mode

Add to `.env.production` for debugging:
```env
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Rollback Procedure

```bash
# Revert to previous version
amplify env checkout production
amplify publish --invalidate-cloudfront

# Or use Git tags
git checkout v1.0.0
npm run build
amplify publish
```

---

## Production Configuration Summary

### Current Implementation Status

✅ **Completed:**
- AWS Amplify deployment pipeline with CloudFront CDN
- Supabase backend with RLS policies and real-time subscriptions
- Zoom Video SDK integration for 50+ participants
- React + TypeScript application with role-based views
- Production build optimization with code splitting
- Environment configuration management
- Automated deployment scripts

### Environment Variables Required

```env
# Copy .env.example and fill in production values
cp .env.example .env.production

# Critical variables that MUST be set:
VITE_ZOOM_SDK_KEY=
VITE_ZOOM_SDK_SECRET=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_JWT_SECRET=
```

### Quick Deploy Commands

```bash
# One-line deployment
npm ci && npm run build && amplify publish

# With tests
npm ci && npm run type-check && npm run build && amplify publish
```

### Support & Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Supabase Documentation](https://supabase.com/docs)
- [Zoom Video SDK Documentation](https://developers.zoom.us/docs/video-sdk/)
- [React Documentation](https://react.dev/)

---

## Final Notes

The FitWithPari platform is now ready for production deployment. All core integrations have been completed and tested:

1. **Frontend**: React application with TypeScript, optimized for production
2. **Backend**: Supabase with complete schema, RLS policies, and real-time features
3. **Video**: Zoom SDK integrated with single canvas rendering for efficiency
4. **Hosting**: AWS Amplify with CloudFront CDN for global distribution
5. **Security**: Basic security measures implemented, JWT authentication ready

For questions or issues, refer to the troubleshooting section or consult the platform documentation.