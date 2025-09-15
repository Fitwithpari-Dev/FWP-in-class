# AWS Production Deployment Guide for FitWithPari

This guide provides step-by-step instructions to deploy your React fitness platform with Zoom Video SDK to AWS, resolving WebSocket connectivity issues and optimizing for video streaming performance.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18.x** or higher
4. **Git** repository ready for deployment
5. **Domain name** (optional but recommended)

## Quick Start Commands

```bash
# 1. Deploy Lambda function for token generation
cd scripts
chmod +x deploy-lambda.sh
./deploy-lambda.sh production ap-south-1

# 2. Deploy to Amplify (after setting up the app)
git add .
git commit -m "Production deployment setup"
git push origin main
```

## Step-by-Step Deployment

### Step 1: Set Up AWS Amplify Application

1. **Create Amplify App**:
```bash
aws amplify create-app \
  --name "fitwithpari-platform" \
  --description "FitWithPari Video Fitness Platform with Zoom SDK" \
  --platform WEB \
  --repository "https://github.com/YOUR_USERNAME/FWP-in-class" \
  --access-token "YOUR_GITHUB_TOKEN" \
  --region ap-south-1
```

2. **Create Branch**:
```bash
aws amplify create-branch \
  --app-id "YOUR_APP_ID" \
  --branch-name "main" \
  --description "Production branch" \
  --enable-auto-build \
  --region ap-south-1
```

### Step 2: Configure Environment Variables in Amplify Console

Navigate to your Amplify app in AWS Console and add these environment variables:

#### Required Production Variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://vzhpqjvkutveghznjgcf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HyeFmpuM8KjK3m4MkiI4Yw_Hv9l7Rni

# Zoom Video SDK Configuration
VITE_ZOOM_SDK_KEY=Hfg9TGvcT5LutNnUGETcmoswIXNeCxHJsVm6
VITE_ZOOM_SDK_SECRET=GYcKilkH05kkorqhqUFwrh1a4GEofW2s0SC4

# Lambda Token Endpoint (will be set after Lambda deployment)
VITE_ZOOM_TOKEN_ENDPOINT=https://YOUR_LAMBDA_URL.lambda-url.ap-south-1.on.aws

# Application Configuration
VITE_APP_NAME=FitWithPari
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
NODE_ENV=production

# Session Configuration
VITE_DEFAULT_SESSION_NAME=fitwithpari-production
VITE_SESSION_PASSWORD=YOUR_SECURE_PASSWORD

# Feature Flags
VITE_ENABLE_LIVE_STREAMING=true
VITE_ENABLE_RECORDED_CLASSES=true
VITE_ENABLE_PAYMENT_INTEGRATION=true
VITE_ENABLE_SOCIAL_LOGIN=true

# Performance Settings
VITE_PERFORMANCE_MONITORING=true
VITE_ERROR_REPORTING=true
VITE_DEBUG_MODE=false

# Build Optimizations
VITE_BUILD_TARGET=production
VITE_OPTIMIZE_DEPS=true
NODE_OPTIONS=--max-old-space-size=4096
GENERATE_SOURCEMAP=false
```

### Step 3: Deploy Lambda Function

1. **Navigate to project root and deploy Lambda**:
```bash
cd C:\Users\vijet\FWP-in-class
chmod +x scripts/deploy-lambda.sh
./scripts/deploy-lambda.sh production ap-south-1
```

2. **Note the Function URL** from the output and update Amplify environment variables:
```bash
# Example output:
# Function URL: https://abc123.lambda-url.ap-south-1.on.aws/
```

3. **Update Amplify Environment Variable**:
   - Go to Amplify Console → Your App → Environment variables
   - Update `VITE_ZOOM_TOKEN_ENDPOINT` with the Lambda Function URL

### Step 4: Configure Build Settings

The `amplify.yml` file is already optimized. Ensure your Amplify app uses it:

1. In Amplify Console → Your App → Build settings
2. Verify it's using the `amplify.yml` from your repository
3. If needed, you can override in the console

### Step 5: Set Up CloudFront for Video Optimization

1. **Create CloudFront Distribution**:
```bash
# Get your Amplify domain first
AMPLIFY_DOMAIN=$(aws amplify get-app --app-id YOUR_APP_ID --query 'app.defaultDomain' --output text)

# Update the CloudFront config with your domain
sed -i "s/YOUR_AMPLIFY_DOMAIN.amplifyapp.com/$AMPLIFY_DOMAIN/g" aws/cloudfront-video-optimized.json

# Create distribution
aws cloudfront create-distribution --distribution-config file://aws/cloudfront-video-optimized.json
```

2. **Note the CloudFront Domain** for use as your main domain

### Step 6: Domain and SSL Configuration

#### Option A: Use Amplify's Default Domain
Your app will be available at: `https://main.YOUR_APP_ID.amplifyapp.com`

#### Option B: Custom Domain with ACM Certificate

1. **Request SSL Certificate**:
```bash
aws acm request-certificate \
  --domain-name "fitwithpari.com" \
  --subject-alternative-names "*.fitwithpari.com" \
  --validation-method DNS \
  --region us-east-1
```

2. **Add Domain to Amplify**:
```bash
aws amplify create-domain-association \
  --app-id "YOUR_APP_ID" \
  --domain-name "fitwithpari.com" \
  --sub-domain-settings prefix=www,branchName=main \
  --region ap-south-1
```

### Step 7: Deploy Application

1. **Commit and Push**:
```bash
git add .
git commit -m "🚀 Production deployment configuration

- Added optimized Amplify build configuration
- Configured environment variables for production
- Set up Lambda function for Zoom token generation
- Added CloudFront distribution for video optimization

🎥 Ready for Zoom Video SDK in production environment"
git push origin main
```

2. **Monitor Deployment**:
   - Go to Amplify Console → Your App → Build history
   - Watch the build progress

### Step 8: Test Production Deployment

1. **Test Lambda Function**:
```bash
curl -X POST "https://YOUR_LAMBDA_URL.lambda-url.ap-south-1.on.aws/token" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "test-session",
    "role": 1,
    "sessionKey": "test-key",
    "userIdentity": "test-user"
  }'
```

2. **Test Application**:
   - Open your Amplify URL
   - Try joining a Zoom session
   - Check browser developer tools for WebSocket connections
   - Verify Zoom media server connectivity

### Step 9: Configure CI/CD Pipeline

Your repository is already configured for CI/CD with Amplify. Each push to `main` will:

1. Install dependencies
2. Build with optimization
3. Deploy automatically
4. Run health checks

#### Advanced CI/CD with GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS Amplify

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test:build

    - name: Build application
      run: npm run build

    - name: Deploy Lambda function
      if: github.ref == 'refs/heads/main'
      run: |
        chmod +x scripts/deploy-lambda.sh
        ./scripts/deploy-lambda.sh production ap-south-1
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        ZOOM_SDK_KEY: ${{ secrets.ZOOM_SDK_KEY }}
        ZOOM_SDK_SECRET: ${{ secrets.ZOOM_SDK_SECRET }}
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to version control
2. **Lambda Function**: Restrict access with proper IAM roles
3. **CORS Configuration**: Limit origins in production
4. **SSL/TLS**: Always use HTTPS in production
5. **Rate Limiting**: Consider implementing rate limiting for token generation

## Performance Optimizations

1. **CloudFront Caching**: Static assets cached for 1 year
2. **Gzip/Brotli Compression**: Enabled for all text assets
3. **Code Splitting**: Zoom SDK isolated in separate chunk
4. **Edge Locations**: Global CDN distribution
5. **Origin Shield**: Enabled for better cache hit ratios

## Monitoring and Logging

1. **CloudWatch Logs**: Lambda function logs
2. **Amplify Console**: Build and deployment logs
3. **CloudFront Logs**: Access and performance logs
4. **Application Monitoring**: Built-in Amplify monitoring

## Troubleshooting

### Common Issues:

1. **WebSocket Connection Fails**:
   - Check CORS configuration
   - Verify Zoom SDK credentials
   - Test from production domain, not localhost

2. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Review build logs in Amplify Console

3. **Lambda Function Errors**:
   - Check CloudWatch logs
   - Verify environment variables
   - Test function URL directly

### Support Commands:

```bash
# Check Amplify app status
aws amplify get-app --app-id YOUR_APP_ID

# View recent builds
aws amplify list-jobs --app-id YOUR_APP_ID --branch-name main

# Test Lambda function
aws lambda invoke --function-name fitwithpari-zoom-token-production --payload '{}' response.json

# View CloudFront distribution
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`FitWithPari CloudFront Distribution - Optimized for Zoom Video SDK and Live Streaming`]'
```

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Zoom Video SDK initializes without errors
- [ ] WebSocket connections to Zoom servers work
- [ ] Token generation via Lambda function works
- [ ] All video features function properly
- [ ] Performance is acceptable on various devices
- [ ] SSL certificate is valid and trusted
- [ ] Monitoring and logging are active

## Cost Optimization

- **Amplify**: Pay per build minute and hosting
- **Lambda**: Pay per request and execution time
- **CloudFront**: Pay for data transfer and requests
- **Expected monthly cost**: $10-50 for moderate traffic

## Next Steps

1. Set up monitoring and alerting
2. Configure backup and disaster recovery
3. Implement user analytics
4. Set up staging environment
5. Plan for scaling based on user growth

---

**Support**: For deployment issues, check the troubleshooting section or review AWS service documentation.

**Last Updated**: September 2024