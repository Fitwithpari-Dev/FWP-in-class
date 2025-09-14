# FitWithPari AWS Deployment Guide

Complete guide for deploying the FitWithPari fitness platform to AWS with Zoom Video SDK integration.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   AWS Amplify   │    │  AWS Lambda     │
│   (CDN/Cache)   │    │   (Frontend)    │    │ (Token Server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │  Users  │             │  React  │             │  Zoom   │
    │(Global) │             │   App   │             │   SDK   │
    └─────────┘             └─────────┘             └─────────┘
```

### Components

1. **AWS Amplify**: Hosts React + TypeScript frontend with Vite build system
2. **AWS Lambda**: Handles Zoom Video SDK token generation (replaces Node.js server)
3. **CloudFront**: Optimized CDN for video streaming and global content delivery
4. **Supabase**: Database and authentication (external service)

## 🚀 Quick Start Deployment

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js** 18+ and npm
4. **Git** repository with your code
5. **Zoom Video SDK** credentials

### One-Command Deployment

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy everything (staging environment)
./scripts/full-deploy.sh staging

# Deploy to production
./scripts/full-deploy.sh production
```

## 📋 Step-by-Step Deployment

### Step 1: Prepare Environment

1. **Clone your repository** and navigate to project root
2. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure environment variables**:
   ```bash
   # Copy templates
   cp .env.production.template .env.production
   cp .env.staging.template .env.staging

   # Edit with your actual values
   nano .env.production
   ```

### Step 2: Deploy Lambda Function (Token Server)

```bash
# Deploy to staging
./scripts/deploy-lambda.sh staging us-east-1

# Deploy to production
./scripts/deploy-lambda.sh production us-east-1
```

**What this does:**
- Creates AWS Lambda function for Zoom token generation
- Sets up function URL for direct HTTP access
- Configures CORS for your frontend domain
- Replaces your Node.js server running on port 3001

**Output:** Lambda Function URL (e.g., `https://abc123.lambda-url.us-east-1.on.aws/`)

### Step 3: Deploy Frontend to Amplify

```bash
# Deploy to staging
./scripts/deploy-amplify.sh staging main

# Deploy to production
./scripts/deploy-amplify.sh production main
```

**What this does:**
- Creates AWS Amplify application
- Connects to your Git repository
- Configures build settings for Vite
- Sets up automatic deployments

**Output:** Amplify App URL (e.g., `https://main.d1a2b3c4d5e6f7.amplifyapp.com`)

### Step 4: Configure CloudFront CDN

```bash
# Setup CloudFront distribution
./scripts/setup-cloudfront.sh production your-amplify-domain.amplifyapp.com https://your-lambda-url.lambda-url.us-east-1.on.aws
```

**What this does:**
- Creates CloudFront distribution optimized for video streaming
- Configures cache behaviors for different content types
- Sets up origins for Amplify and Lambda
- Optimizes for real-time video communications

**Output:** CloudFront Distribution URL (e.g., `https://d111111abcdef8.cloudfront.net`)

## ⚙️ Configuration Details

### Environment Variables

#### Frontend (Amplify)
Set these in the Amplify Console under "Environment Variables":

```bash
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key
VITE_ZOOM_TOKEN_ENDPOINT=https://your-lambda-url.lambda-url.us-east-1.on.aws/

# Optional
VITE_APP_URL=https://app.fitwithpari.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_RECORDINGS=true
```

#### Backend (Lambda)
Set these via AWS CLI or Console:

```bash
# Required (keep secret!)
ZOOM_SDK_KEY=your-zoom-sdk-key
ZOOM_SDK_SECRET=your-zoom-sdk-secret

# Optional
NODE_ENV=production
CORS_ORIGIN=https://app.fitwithpari.com
LOG_LEVEL=info
```

### Manual Configuration Steps

#### 1. Amplify Environment Variables

```bash
# Via AWS CLI
aws amplify update-branch \
  --app-id your-app-id \
  --branch-name main \
  --environment-variables VITE_SUPABASE_URL=your-value,VITE_ZOOM_SDK_KEY=your-value

# Or via Amplify Console
# https://console.aws.amazon.com/amplify/home#/your-app-id/settings/environment
```

#### 2. Lambda Environment Variables

```bash
# Via AWS CLI
aws lambda update-function-configuration \
  --function-name fitwithpari-zoom-token-production \
  --environment Variables='{ZOOM_SDK_KEY=your-key,ZOOM_SDK_SECRET=your-secret}'
```

#### 3. Custom Domain (Optional)

1. **Request SSL Certificate** in AWS Certificate Manager:
   ```bash
   aws acm request-certificate \
     --domain-name app.fitwithpari.com \
     --validation-method DNS
   ```

2. **Configure CloudFront** to use custom domain
3. **Update DNS** to point to CloudFront:
   ```
   app.fitwithpari.com CNAME d111111abcdef8.cloudfront.net
   ```

## 🧪 Testing Your Deployment

### Health Checks

```bash
# Test Lambda function
curl https://your-lambda-url.lambda-url.us-east-1.on.aws/health

# Test Amplify deployment
curl https://main.your-amplify-domain.amplifyapp.com

# Test CloudFront
curl https://your-cloudfront-domain.cloudfront.net/health
```

### Video SDK Integration Test

```bash
# Test token generation
curl -X POST https://your-cloudfront-domain.cloudfront.net/api/zoom/token \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "test-session",
    "role": 1,
    "sessionKey": "test-key",
    "userIdentity": "test-user"
  }'
```

### Frontend Testing

1. **Open your deployed app** in browser
2. **Test camera/microphone permissions** (requires HTTPS)
3. **Create a test video session**
4. **Verify real-time video streaming**

## 🔧 Monitoring & Maintenance

### CloudWatch Logs

```bash
# Lambda function logs
aws logs tail /aws/lambda/fitwithpari-zoom-token-production --follow

# Amplify build logs
aws amplify list-jobs --app-id your-app-id --branch-name main
```

### Performance Monitoring

1. **CloudFront metrics** in AWS Console
2. **Lambda function metrics** (duration, errors, invocations)
3. **Amplify build metrics** (build time, success rate)

### Cost Optimization

- **Lambda**: Pay per request (very cost-effective for token generation)
- **Amplify**: Fixed monthly cost for hosting + build minutes
- **CloudFront**: Pay per data transfer (optimized caching reduces costs)

## 🚨 Troubleshooting

### Common Issues

#### 1. CORS Errors
```javascript
// Symptom: Browser blocks API requests
// Solution: Update Lambda CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-actual-domain.com',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};
```

#### 2. Environment Variables Not Loading
```bash
# Check Amplify build logs
aws amplify get-job --app-id your-app-id --branch-name main --job-id your-job-id

# Verify environment variables are set
aws amplify get-branch --app-id your-app-id --branch-name main
```

#### 3. Video SDK Initialization Fails
```javascript
// Check browser console for errors
// Verify HTTPS is enabled
// Confirm token endpoint is accessible
// Check Zoom SDK credentials
```

#### 4. Build Failures
```bash
# Common Vite build issues
# Solution: Update amplify.yml build commands
npm run build:check  # Type checking + build
```

### Debug Commands

```bash
# Test Lambda locally
cd lambda && node -e "
const handler = require('./zoom-token-handler');
handler.handler({
  httpMethod: 'GET',
  path: '/health'
}, {}).then(console.log);
"

# Test Amplify build locally
npm run build
npm run preview

# Clear CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id your-distribution-id \
  --paths "/*"
```

## 📈 Scaling Considerations

### High Traffic Scenarios

1. **Lambda Concurrency**: Default 1000 concurrent executions
2. **CloudFront**: Automatically scales globally
3. **Amplify**: Static hosting scales automatically

### Cost at Scale

- **Lambda**: ~$0.20 per 1M requests + compute time
- **CloudFront**: ~$0.085 per GB (decreases with volume)
- **Amplify**: ~$5/month hosting + $0.01 per build minute

### Performance Optimization

1. **CloudFront cache policies** for different content types
2. **Lambda cold start optimization** (keep functions warm)
3. **Amplify build optimization** (efficient bundling)

## 🔒 Security Best Practices

### 1. Secrets Management
- Never expose Zoom SDK secrets in frontend
- Use AWS Secrets Manager for sensitive data
- Rotate credentials regularly

### 2. CORS Configuration
- Restrict origins to your actual domains
- Don't use wildcard (*) in production

### 3. Content Security Policy
```html
<!-- Already configured in amplify.yml -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline' *.zoom.us;
               connect-src 'self' *.zoom.us *.supabase.co;">
```

### 4. HTTPS Everywhere
- CloudFront enforces HTTPS
- Lambda Function URLs use HTTPS
- Camera/microphone require HTTPS

## 📞 Support & Resources

### AWS Documentation
- [Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [Lambda Functions](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [CloudFront](https://docs.aws.amazon.com/cloudfront/latest/developerguide/Introduction.html)

### Zoom Video SDK
- [Web SDK Documentation](https://marketplace.zoom.us/docs/sdk/video/web)
- [JWT Token Generation](https://marketplace.zoom.us/docs/sdk/video/auth)

### Project Files
- `C:\Users\vijet\FWP-in-class\lambda\zoom-token-handler.js` - Lambda function
- `C:\Users\vijet\FWP-in-class\amplify.yml` - Amplify build configuration
- `C:\Users\vijet\FWP-in-class\cloudfront-config.json` - CloudFront settings
- `C:\Users\vijet\FWP-in-class\scripts\` - Deployment automation

---

**🎉 Your FitWithPari platform is now ready for production video streaming on AWS!**

For additional support or custom configurations, refer to the individual script files and AWS documentation.