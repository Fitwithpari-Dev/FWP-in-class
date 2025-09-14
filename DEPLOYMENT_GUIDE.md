# FitWithPari AWS Amplify Deployment Guide

This comprehensive guide will help you deploy the FitWithPari React fitness platform to AWS Amplify with production-ready configurations optimized for video streaming and global fitness class users.

## 📋 Pre-Deployment Checklist

### 1. Prerequisites
- [ ] AWS CLI installed and configured with appropriate permissions
- [ ] GitHub repository set up with your code
- [ ] Domain name purchased (optional but recommended)
- [ ] SSL certificate ready (Amplify provides free SSL)
- [ ] Environment variables prepared (see `.env.example`)

### 2. Required AWS Permissions
Ensure your AWS user/role has the following permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "cloudformation:*",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PassRole",
        "cloudfront:*",
        "route53:*",
        "acm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🚀 Step-by-Step Deployment Process

### Step 1: Prepare Your Repository

1. **Commit all changes to your main branch**
   ```bash
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **Verify build works locally**
   ```bash
   npm run build
   # Verify build directory contains all assets
   ```

### Step 2: Set Up AWS Amplify Application

#### Option A: Using AWS CLI (Recommended for CI/CD)

1. **Run the setup script**
   ```bash
   chmod +x scripts/deploy-setup.sh
   ./scripts/deploy-setup.sh --repo-url https://github.com/yourusername/fitwithpari --domain fitwithpari.com
   ```

2. **Alternative manual setup**
   ```bash
   aws amplify create-app \
     --name "FitWithPari" \
     --repository "https://github.com/yourusername/fitwithpari" \
     --platform "WEB" \
     --build-spec file://amplify.yml
   ```

#### Option B: Using AWS Amplify Console (GUI Method)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New App" → "Host web app"
3. Connect your GitHub repository
4. Select the `main` branch
5. Upload the `amplify.yml` file when prompted
6. Configure build settings (pre-filled from amplify.yml)

### Step 3: Configure Environment Variables

In the Amplify Console, go to **App Settings** → **Environment Variables** and add:

#### Required Production Variables
```bash
NODE_ENV=production
VITE_APP_NAME=FitWithPari
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

#### Optional but Recommended
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ZOOM_SDK_KEY=your-zoom-key
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Feature Flags
```bash
VITE_ENABLE_LIVE_STREAMING=true
VITE_ENABLE_RECORDED_CLASSES=true
VITE_ENABLE_PAYMENT_INTEGRATION=false  # Enable when ready
VITE_PERFORMANCE_MONITORING=true
VITE_ERROR_REPORTING=true
```

### Step 4: Configure Custom Domain (Optional)

1. **In Amplify Console**: App Settings → Domain Management
2. **Add domain**: Enter `fitwithpari.com`
3. **Configure subdomains**:
   - `www.fitwithpari.com` → main branch
   - `fitwithpari.com` → main branch (with redirect from www)
4. **DNS Configuration**: Add CNAME records to your DNS provider:
   ```
   CNAME www d1234567890abcdef.cloudfront.net
   CNAME @ d1234567890abcdef.cloudfront.net
   ```

### Step 5: Optimize CloudFront Distribution

1. **Access CloudFront Console**
2. **Find your Amplify distribution** (named amplify-...)
3. **Apply custom cache policies** using configurations from `aws-cache-policies.json`
4. **Configure behaviors**:
   - Static assets (`/assets/*`): Long-term caching (1 year)
   - Video files (`*.mp4`, `*.webm`): Medium-term caching (1 day)
   - HTML files: No caching for updates
   - API endpoints: No caching

### Step 6: Set Up Monitoring and Analytics

1. **Sentry Setup** (Error Tracking):
   - Create Sentry project at [sentry.io](https://sentry.io)
   - Add DSN to environment variables
   - Verify error reporting works

2. **Google Analytics Setup**:
   - Create GA4 property
   - Add tracking ID to environment variables
   - Verify tracking works

3. **Performance Monitoring**:
   - Configure Web Vitals tracking
   - Set up custom metrics
   - Monitor video streaming performance

## 🔍 Post-Deployment Verification

### Automated Testing Script (PowerShell)
```powershell
# Run post-deployment tests
.\scripts\deploy-production.ps1 -AppId your-app-id -WaitForCompletion -RunTests
```

### Manual Testing Checklist

#### Core Functionality
- [ ] Application loads successfully
- [ ] All routes work (test SPA routing)
- [ ] Static assets load properly
- [ ] CSS styles are applied correctly
- [ ] JavaScript functionality works

#### Performance Tests
- [ ] PageSpeed Insights score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

#### Security Tests
- [ ] HTTPS enforced (no HTTP access)
- [ ] Security headers present:
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] No sensitive data exposed in client

#### Video Streaming Tests (when implemented)
- [ ] Video files load from CDN
- [ ] Proper caching headers for video content
- [ ] Range requests supported
- [ ] Multiple quality options work
- [ ] Adaptive bitrate streaming functions

### Performance Monitoring Verification

1. **Check Real User Monitoring**:
   ```bash
   # Monitor Web Vitals
   curl -H "Accept: application/json" https://your-domain.com
   ```

2. **Verify Error Tracking**:
   - Trigger a test error
   - Check Sentry dashboard for error capture

3. **Analytics Verification**:
   - Visit site and perform actions
   - Check Google Analytics real-time reports

## 📊 Performance Optimization

### Build Optimization

1. **Bundle Analysis**:
   ```bash
   npm run build
   npx vite-bundle-analyzer build/assets
   ```

2. **Code Splitting**: Implement lazy loading for routes
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. **Asset Optimization**:
   - Images: Use WebP format where supported
   - Fonts: Preload critical fonts
   - Icons: Use SVG sprites

### CDN Optimization

1. **Cache Strategies**:
   - Static assets: `Cache-Control: public, max-age=31536000, immutable`
   - HTML: `Cache-Control: public, max-age=0, must-revalidate`
   - Video: `Cache-Control: public, max-age=86400`

2. **Compression**:
   - Enable Brotli compression for text assets
   - Pre-compress assets during build

3. **Global Distribution**:
   - Use all CloudFront edge locations
   - Configure origin shield for better performance

## 🛡️ Security Configuration

### Content Security Policy
Add to your HTML or configure in CloudFront:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' *.google-analytics.com *.googletagmanager.com;
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  img-src 'self' data: *.google-analytics.com;
  connect-src 'self' *.supabase.co *.sentry.io;
  media-src 'self' *.cloudfront.net;
">
```

### Environment Security
- [ ] No sensitive keys in client-side code
- [ ] API keys properly scoped (read-only where possible)
- [ ] Secrets stored in AWS Systems Manager Parameter Store
- [ ] Regular security audits scheduled

## 🚨 Troubleshooting Common Issues

### Build Failures

**Issue**: "Module not found" errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Issue**: Out of memory during build
```bash
# Solution: Increase Node.js memory
export NODE_OPTIONS="--max_old_space_size=4096"
npm run build
```

### Deployment Issues

**Issue**: CloudFront not updating
- Clear CloudFront cache: `aws cloudfront create-invalidation`
- Wait for cache TTL expiration
- Check browser cache (hard refresh)

**Issue**: Environment variables not working
- Verify variables are set in Amplify Console
- Check variable names (must start with `VITE_`)
- Restart build after adding variables

### Performance Issues

**Issue**: Slow loading times
- Check CloudFront hit rates
- Optimize image sizes and formats
- Implement code splitting
- Enable compression

**Issue**: Video streaming problems
- Verify CDN configuration
- Check video file formats and sizes
- Test range request support
- Monitor bandwidth usage

## 📈 Ongoing Maintenance

### Weekly Tasks
- [ ] Check error rates in Sentry
- [ ] Review performance metrics
- [ ] Monitor CDN costs and usage
- [ ] Update dependencies

### Monthly Tasks
- [ ] Security audit and updates
- [ ] Performance optimization review
- [ ] Cost optimization analysis
- [ ] Backup and disaster recovery testing

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Infrastructure review
- [ ] Capacity planning
- [ ] Security penetration testing

## 🔄 CI/CD Pipeline Enhancement

### GitHub Actions Integration
```yaml
name: Deploy to Amplify
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: aws amplify start-job --app-id ${{ secrets.AMPLIFY_APP_ID }} --branch-name main --job-type RELEASE
```

## 📞 Support and Documentation

- **AWS Amplify Documentation**: https://docs.amplify.aws/
- **CloudFront Documentation**: https://docs.aws.amazon.com/cloudfront/
- **Vite Documentation**: https://vitejs.dev/guide/
- **Performance Best Practices**: https://web.dev/performance/

---

## 🎯 Success Metrics

After successful deployment, you should achieve:
- **Performance**: PageSpeed score > 90
- **Availability**: 99.9% uptime
- **Security**: A+ SSL Labs rating
- **Cost**: < $50/month for moderate traffic
- **User Experience**: < 3s load time globally

Remember to monitor these metrics continuously and optimize based on real user data and feedback.