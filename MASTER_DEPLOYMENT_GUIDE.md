# FitWithPari Master Deployment Guide 🚀

> **The definitive guide for deploying FitWithPari video fitness platform to production**

This comprehensive guide consolidates all deployment knowledge into a single, authoritative source for production-ready deployment on AWS Amplify with optimized video streaming capabilities.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [AWS Amplify Deployment](#aws-amplify-deployment)
5. [Domain & SSL Setup](#domain--ssl-setup)
6. [Video Service Configuration](#video-service-configuration)
7. [Production Optimization](#production-optimization)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

---

## 🎯 Overview

FitWithPari is a React-based fitness platform featuring:
- **Unified Video Architecture**: Supports both Zoom and Agora video services
- **Event-Driven State Management**: WebRTC best practices for participant synchronization
- **AWS Amplify Hosting**: Serverless deployment with global CDN
- **Production-Ready**: TypeScript, comprehensive error handling, monitoring

### Architecture Stack
```
Frontend: React 18 + TypeScript + Tailwind CSS
Video Services: Zoom Video SDK / Agora RTC SDK (configurable)
Hosting: AWS Amplify + CloudFront CDN
CI/CD: GitHub Actions + Amplify Auto-Deploy
Monitoring: CloudWatch + Custom analytics
```

---

## ✅ Prerequisites

### Required Software
- [ ] **Node.js 18.x+** - [Download here](https://nodejs.org/)
- [ ] **npm 9.x+** - Comes with Node.js
- [ ] **Git** - [Download here](https://git-scm.com/)
- [ ] **AWS CLI** - [Installation guide](https://aws.amazon.com/cli/)

### AWS Requirements
- [ ] **AWS Account** with appropriate permissions
- [ ] **AWS CLI configured** with valid credentials
- [ ] **GitHub repository** connected to AWS Amplify

### Video Service Keys
- [ ] **Zoom Video SDK** credentials (if using Zoom)
- [ ] **Agora RTC** credentials (if using Agora)

### Verification Commands
```bash
# Verify installations
node --version        # Should be 18.x+
npm --version         # Should be 9.x+
git --version        # Any recent version
aws --version        # Any recent version
aws sts get-caller-identity  # Should return your AWS account info
```

---

## 🔧 Environment Configuration

### 1. Clone Repository
```bash
git clone https://github.com/Fitwithpari-Dev/FWP-in-class.git
cd FWP-in-class
npm install
```

### 2. Environment Variables Setup

Create `.env.production` file:
```env
# Video Service Configuration (choose one)
VITE_VIDEO_SERVICE=agora  # or 'zoom'

# Agora Configuration (if using Agora)
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_APP_CERTIFICATE=your_agora_certificate

# Zoom Configuration (if using Zoom)
VITE_ZOOM_SDK_KEY=your_zoom_sdk_key
VITE_ZOOM_SDK_SECRET=your_zoom_sdk_secret

# Application Configuration
VITE_APP_ENV=production
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_DOMAIN=https://your-app-domain.com

# Analytics & Monitoring
VITE_ANALYTICS_ID=your_analytics_id
VITE_SENTRY_DSN=your_sentry_dsn

# Feature Flags
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_RECORDING=true
VITE_MAX_PARTICIPANTS=50
```

### 3. Validate Configuration
```bash
# Test build locally
npm run build

# Test type checking
npm run type-check

# Test locally
npm run dev
```

---

## ☁️ AWS Amplify Deployment

### Step 1: Create Amplify Application

#### Option A: AWS Console (Recommended)
1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Choose **GitHub** as source
4. Select your **FWP-in-class** repository
5. Choose **master** branch

#### Option B: AWS CLI
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify app
amplify init
# Follow prompts:
# - Project name: fitwithpari-platform
# - Environment: production
# - Default editor: Visual Studio Code
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Build command: npm run build
# - Start command: npm run dev
```

### Step 2: Configure Build Settings

In Amplify Console, set build specification:
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
            - echo "Node version:" && node --version
            - echo "NPM version:" && npm --version
        build:
          commands:
            - echo "Starting production build..."
            - npm run type-check
            - npm run build
            - echo "Build completed successfully"
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: .
```

### Step 3: Environment Variables

In Amplify Console → App Settings → Environment Variables:
```
VITE_VIDEO_SERVICE = agora
VITE_AGORA_APP_ID = your_agora_app_id
VITE_APP_ENV = production
VITE_ENABLE_DEBUG_PANEL = false
# Add all your production environment variables
```

### Step 4: Deploy
```bash
# Manual deployment
git push origin master

# Or trigger build in Amplify Console
```

---

## 🌐 Domain & SSL Setup

### 1. Custom Domain Configuration

#### In Amplify Console:
1. Go to **App Settings** → **Domain Management**
2. Click **"Add domain"**
3. Enter your domain (e.g., `classes.fitwithpari.com`)
4. Configure DNS records as shown

#### DNS Configuration:
```dns
Type: CNAME
Name: classes (or your subdomain)
Value: your-amplify-domain.amplifyapp.com
TTL: 300
```

### 2. SSL Certificate
- Amplify automatically provisions SSL certificates
- Wait 24-48 hours for DNS propagation
- Verify HTTPS is working

### 3. Redirects Setup
Add to Amplify Console → App Settings → Rewrites and redirects:
```
Source: /<*>
Target: /index.html
Type: 200 (Rewrite)
Country Code: (leave blank)
```

---

## 🎥 Video Service Configuration

### Agora Setup (Recommended)
```typescript
// In your environment
VITE_VIDEO_SERVICE=agora
VITE_AGORA_APP_ID=your_app_id
VITE_AGORA_APP_CERTIFICATE=your_certificate

// Token server setup (required for production)
// Deploy token server to separate service
```

### Zoom Setup (Alternative)
```typescript
// In your environment
VITE_VIDEO_SERVICE=zoom
VITE_ZOOM_SDK_KEY=your_sdk_key
VITE_ZOOM_SDK_SECRET=your_sdk_secret
```

### Video Service Selection
The platform automatically uses the configured service based on `VITE_VIDEO_SERVICE` environment variable.

---

## ⚡ Production Optimization

### 1. Performance Configuration

#### Vite Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', 'lucide-react'],
          video: ['agora-rtc-sdk-ng']
        }
      }
    },
    target: 'es2020',
    minify: 'terser',
    sourcemap: false
  }
})
```

#### CloudFront Optimization
- Gzip compression: **Enabled**
- Brotli compression: **Enabled**
- Cache behaviors: Optimized for static assets
- Origin request timeout: 30 seconds

### 2. Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Monitor performance
npm run lighthouse
```

### 3. CDN Configuration
- **Assets caching**: 1 year for static assets
- **HTML caching**: No cache for HTML files
- **API caching**: Configured per endpoint

---

## 📊 Monitoring & Maintenance

### 1. CloudWatch Integration

#### Custom Metrics
```typescript
// Track video session metrics
const sessionMetrics = {
  participantCount: participants.length,
  connectionQuality: getAverageQuality(),
  sessionDuration: Date.now() - sessionStart
};

// Send to CloudWatch
sendCustomMetric('FitnessPlatform/VideoSessions', sessionMetrics);
```

#### Alarms Setup
- **High error rate**: > 5% in 5 minutes
- **Low performance**: Load time > 3 seconds
- **Video failures**: Connection failures > 10%

### 2. Application Monitoring

#### Health Checks
```typescript
// Health endpoint monitoring
GET /health
Response: {
  status: "healthy",
  videoService: "agora",
  timestamp: "2024-01-15T10:30:00Z",
  uptime: 86400
}
```

#### Error Tracking
- **Sentry integration**: Real-time error monitoring
- **Console logging**: Structured logging for debugging
- **Performance tracking**: Core Web Vitals monitoring

### 3. Maintenance Schedule

#### Weekly Tasks
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Update dependencies (if needed)
- [ ] Backup configuration

#### Monthly Tasks
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning
- [ ] Documentation updates

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build

# Check for TypeScript errors
npm run type-check
```

#### 2. Video Connection Issues
```typescript
// Debug video service initialization
console.log('Video service:', getVideoServiceInfo());
console.log('Connection state:', connectionState);
console.log('Participants:', participants.length);
```

#### 3. Environment Variable Issues
```bash
# Verify environment variables
echo $VITE_VIDEO_SERVICE
echo $VITE_AGORA_APP_ID

# Check build environment
npm run build -- --mode production
```

#### 4. Performance Issues
- **Check bundle size**: Use Vite bundle analyzer
- **Monitor network**: Check CloudFront cache hit ratio
- **Profile video**: Monitor WebRTC connection quality

### Support Resources

#### Development Support
- **Architecture Guide**: See `ARCHITECTURE.md`
- **API Documentation**: See `DEVELOPER_GUIDE.md`
- **Video Integration**: See unified video service documentation

#### Production Support
- **AWS Support**: Use AWS Support Center
- **Amplify Issues**: Check Amplify Console logs
- **Video Services**: Agora/Zoom support channels

---

## 🔐 Security Checklist

### Pre-Deployment Security
- [ ] **Environment variables**: No secrets in code
- [ ] **HTTPS enforced**: All traffic over SSL
- [ ] **CSP headers**: Content Security Policy configured
- [ ] **CORS setup**: Proper origin restrictions
- [ ] **Token security**: Video tokens properly secured

### Production Security
- [ ] **Access logs**: Enabled and monitored
- [ ] **WAF rules**: Web Application Firewall configured
- [ ] **Rate limiting**: API rate limits in place
- [ ] **DDoS protection**: CloudFront protection enabled
- [ ] **Security headers**: HSTS, X-Frame-Options, etc.

### Video Security
- [ ] **Token validation**: Server-side token generation
- [ ] **Session isolation**: Participants can't join wrong sessions
- [ ] **Recording permissions**: Proper recording consent
- [ ] **Data privacy**: GDPR/privacy compliance

---

## 🚀 Deployment Commands Summary

```bash
# Complete deployment workflow
git clone https://github.com/Fitwithpari-Dev/FWP-in-class.git
cd FWP-in-class
npm install

# Set up environment
cp .env.example .env.production
# Edit .env.production with your values

# Test locally
npm run dev

# Deploy to production
git add .
git commit -m "Production deployment"
git push origin master

# Monitor deployment
# Check Amplify Console for build status
```

---

## 📋 Post-Deployment Verification

### 1. Functional Testing
- [ ] **Homepage loads**: Check main application page
- [ ] **Video service**: Test video connection
- [ ] **Participant sync**: Verify cross-browser participant visibility
- [ ] **Mobile responsive**: Test on mobile devices
- [ ] **Performance**: Run Lighthouse audit

### 2. Integration Testing
- [ ] **Video quality**: Test HD video streaming
- [ ] **Audio quality**: Verify clear audio transmission
- [ ] **Concurrent users**: Test with multiple participants
- [ ] **Session management**: Test join/leave functionality
- [ ] **Cross-browser**: Test Chrome, Firefox, Safari, Edge

### 3. Performance Verification
- [ ] **Load time**: < 3 seconds initial load
- [ ] **Bundle size**: < 2MB total
- [ ] **CDN**: 95%+ cache hit ratio
- [ ] **Core Web Vitals**: All metrics in green
- [ ] **Video latency**: < 200ms for video streams

---

## 🎯 Success Metrics

### Technical KPIs
- **Build success rate**: > 99%
- **Deployment time**: < 5 minutes
- **Application uptime**: > 99.9%
- **Video connection success**: > 95%
- **Average session quality**: > 90%

### Performance KPIs
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Video startup time**: < 2s
- **Participant sync time**: < 1s

---

## 📖 Additional Resources

### Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System architecture and patterns
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**: Development setup and guidelines
- **[TECHNICAL_DIAGRAMS.md](./TECHNICAL_DIAGRAMS.md)**: Visual system overview

### External Resources
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Agora Video SDK Documentation](https://docs.agora.io/en/video-calling/overview/core-concepts?platform=web)
- [React Performance Best Practices](https://react.dev/learn/render-and-commit)
- [WebRTC Best Practices](https://web.dev/webrtc/)

---

**This guide supersedes all previous deployment documentation. For questions or issues, refer to this master guide first.**

*Last updated: January 2024*
*Version: 2.0.0*