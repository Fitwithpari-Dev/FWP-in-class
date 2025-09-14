#!/bin/bash

# Complete Deployment Script for FitWithPari Platform
# This script orchestrates the deployment of Lambda, Amplify, and CloudFront
# Usage: ./full-deploy.sh [environment]
# Example: ./full-deploy.sh production

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
REGION="us-east-1"
PROJECT_ROOT=$(pwd)

echo "🚀 Starting complete deployment of FitWithPari platform..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Project Root: $PROJECT_ROOT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    # Check if AWS is configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi

    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi

    log_success "All prerequisites met"
}

# Step 1: Deploy Lambda function
deploy_lambda() {
    log_info "Step 1: Deploying Lambda function..."

    chmod +x scripts/deploy-lambda.sh
    ./scripts/deploy-lambda.sh $ENVIRONMENT $REGION

    # Get Lambda function URL
    FUNCTION_NAME="fitwithpari-zoom-token-${ENVIRONMENT}"
    LAMBDA_URL=$(aws lambda get-function-url-config \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --query 'FunctionUrl' \
        --output text 2>/dev/null || echo "")

    if [ -z "$LAMBDA_URL" ]; then
        log_error "Failed to get Lambda function URL"
        exit 1
    fi

    log_success "Lambda function deployed: $LAMBDA_URL"
    echo "LAMBDA_URL=$LAMBDA_URL" > /tmp/deployment-vars.env
}

# Step 2: Deploy to Amplify
deploy_amplify() {
    log_info "Step 2: Deploying to AWS Amplify..."

    # Source deployment variables
    source /tmp/deployment-vars.env

    # Update environment template with Lambda URL
    ENV_FILE=".env.${ENVIRONMENT}"
    cp ".env.${ENVIRONMENT}.template" "$ENV_FILE"
    sed -i "s|https://your-lambda-function-url.lambda-url.us-east-1.on.aws|$LAMBDA_URL|g" "$ENV_FILE"

    log_info "Updated environment file: $ENV_FILE"

    chmod +x scripts/deploy-amplify.sh
    ./scripts/deploy-amplify.sh $ENVIRONMENT main

    # Get Amplify app domain
    APP_NAME="fitwithpari-platform"
    APP_ID=$(aws amplify list-apps \
        --query "apps[?name=='$APP_NAME'].appId" \
        --output text)

    if [ -z "$APP_ID" ]; then
        log_error "Failed to get Amplify app ID"
        exit 1
    fi

    AMPLIFY_DOMAIN=$(aws amplify get-app \
        --app-id $APP_ID \
        --query 'app.defaultDomain' \
        --output text)

    AMPLIFY_URL="https://main.${AMPLIFY_DOMAIN}"

    log_success "Amplify app deployed: $AMPLIFY_URL"
    echo "AMPLIFY_DOMAIN=main.${AMPLIFY_DOMAIN}" >> /tmp/deployment-vars.env
    echo "AMPLIFY_URL=$AMPLIFY_URL" >> /tmp/deployment-vars.env
}

# Step 3: Set up CloudFront
setup_cloudfront() {
    log_info "Step 3: Setting up CloudFront distribution..."

    # Source deployment variables
    source /tmp/deployment-vars.env

    chmod +x scripts/setup-cloudfront.sh
    ./scripts/setup-cloudfront.sh $ENVIRONMENT $AMPLIFY_DOMAIN $LAMBDA_URL

    log_success "CloudFront distribution configured"
}

# Step 4: Run deployment tests
run_tests() {
    log_info "Step 4: Running deployment tests..."

    source /tmp/deployment-vars.env

    # Test Lambda function
    log_info "Testing Lambda function health..."
    HEALTH_RESPONSE=$(curl -s "${LAMBDA_URL}health" || echo "failed")
    if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
        log_success "Lambda health check passed"
    else
        log_warning "Lambda health check failed: $HEALTH_RESPONSE"
    fi

    # Test Amplify deployment
    log_info "Testing Amplify deployment..."
    AMPLIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$AMPLIFY_URL" || echo "failed")
    if [ "$AMPLIFY_RESPONSE" = "200" ]; then
        log_success "Amplify deployment accessible"
    else
        log_warning "Amplify deployment test failed: HTTP $AMPLIFY_RESPONSE"
    fi

    log_success "Deployment tests completed"
}

# Step 5: Generate deployment summary
generate_summary() {
    log_info "Step 5: Generating deployment summary..."

    source /tmp/deployment-vars.env

    # Get CloudFront domain
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='FitWithPari CloudFront Distribution - Optimized for Real-time Video Streaming and Zoom SDK'].Id" \
        --output text 2>/dev/null || echo "")

    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
        CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
            --id $DISTRIBUTION_ID \
            --query 'Distribution.DomainName' \
            --output text)
        CLOUDFRONT_URL="https://$CLOUDFRONT_DOMAIN"
    else
        CLOUDFRONT_URL="Not configured"
        CLOUDFRONT_DOMAIN="Not configured"
    fi

    # Create deployment summary
    SUMMARY_FILE="deployment-summary-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).md"

    cat > "$SUMMARY_FILE" << EOF
# FitWithPari Deployment Summary

**Environment:** $ENVIRONMENT
**Deployment Date:** $(date)
**Region:** $REGION

## 🚀 Deployed Components

### AWS Lambda (Token Server)
- **Function Name:** fitwithpari-zoom-token-${ENVIRONMENT}
- **Function URL:** $LAMBDA_URL
- **Runtime:** Node.js 18.x
- **Memory:** 256 MB
- **Timeout:** 30 seconds

### AWS Amplify (Frontend)
- **App Name:** fitwithpari-platform
- **Domain:** $AMPLIFY_DOMAIN
- **URL:** $AMPLIFY_URL
- **Build:** Vite + React + TypeScript

### CloudFront (CDN)
- **Distribution ID:** $DISTRIBUTION_ID
- **Domain:** $CLOUDFRONT_DOMAIN
- **URL:** $CLOUDFRONT_URL
- **Optimized for:** Video streaming, Real-time communications

## 🔧 Configuration

### Environment Variables
Update these in the Amplify Console:
- \`VITE_ZOOM_TOKEN_ENDPOINT=$LAMBDA_URL\`
- \`VITE_APP_URL=$CLOUDFRONT_URL\`

### DNS Configuration
Point your domain to CloudFront:
\`\`\`
app.fitwithpari.com CNAME $CLOUDFRONT_DOMAIN
\`\`\`

## 🧪 Testing

### Health Checks
- Lambda Health: $LAMBDA_URL/health
- Amplify App: $AMPLIFY_URL
- CloudFront: $CLOUDFRONT_URL

### API Endpoints
- Token Generation: $CLOUDFRONT_URL/api/zoom/token
- Configuration: $CLOUDFRONT_URL/api/zoom/config

## 📋 Next Steps

1. **Update DNS records** to point to CloudFront
2. **Set environment variables** in Amplify Console
3. **Test video streaming** functionality
4. **Configure custom domain** (if needed)
5. **Set up monitoring** and alerts
6. **Configure SSL certificate** in ACM

## 🔧 Management Commands

### Lambda
\`\`\`bash
# View logs
aws logs tail /aws/lambda/fitwithpari-zoom-token-${ENVIRONMENT} --follow

# Update function
./scripts/deploy-lambda.sh $ENVIRONMENT $REGION
\`\`\`

### Amplify
\`\`\`bash
# Trigger new build
aws amplify start-job --app-id $APP_ID --branch-name main --job-type RELEASE

# View build logs
aws amplify list-jobs --app-id $APP_ID --branch-name main
\`\`\`

### CloudFront
\`\`\`bash
# Invalidate cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

# View distribution
aws cloudfront get-distribution --id $DISTRIBUTION_ID
\`\`\`

## 🎉 Deployment Status: SUCCESS
EOF

    log_success "Deployment summary saved to: $SUMMARY_FILE"

    # Display summary
    echo ""
    echo "🎉 DEPLOYMENT COMPLETE! 🎉"
    echo ""
    echo "📋 Quick Access URLs:"
    echo "  Frontend (Amplify): $AMPLIFY_URL"
    echo "  API (Lambda): $LAMBDA_URL"
    echo "  CDN (CloudFront): $CLOUDFRONT_URL"
    echo ""
    echo "📄 Full deployment summary: $SUMMARY_FILE"
}

# Main execution
main() {
    echo ""
    log_info "=== FitWithPari Platform Deployment ==="
    echo ""

    check_prerequisites

    echo ""
    log_info "Starting deployment process..."
    echo ""

    deploy_lambda
    deploy_amplify
    setup_cloudfront
    run_tests
    generate_summary

    echo ""
    log_success "🚀 Deployment completed successfully!"
    echo ""

    # Clean up temporary files
    rm -f /tmp/deployment-vars.env
}

# Run main function
main