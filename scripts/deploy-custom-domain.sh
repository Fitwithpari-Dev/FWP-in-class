#!/bin/bash

# Custom Domain Deployment Script for FitWithPari
# Deploys to classes.tribe.fit with Route 53 DNS management
# Usage: ./deploy-custom-domain.sh [environment]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
CUSTOM_DOMAIN="classes.tribe.fit"
HOSTED_ZONE_ID="Z01103173822LFRI0DKH"
REGION="ap-south-1"

echo "🚀 Deploying FitWithPari to custom domain: $CUSTOM_DOMAIN"
echo "Environment: $ENVIRONMENT"
echo "Route 53 Hosted Zone: $HOSTED_ZONE_ID"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Step 1: Deploy Lambda function
log_info "Step 1: Deploying Lambda function..."
./scripts/deploy-lambda.sh $ENVIRONMENT $REGION

# Get Lambda function URL
FUNCTION_NAME="fitwithpari-zoom-token-${ENVIRONMENT}"
LAMBDA_URL=$(aws lambda get-function-url-config \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'FunctionUrl' \
    --output text)

log_success "Lambda deployed: $LAMBDA_URL"

# Step 2: Create staging environment file with custom domain
log_info "Step 2: Configuring environment for custom domain..."
cp ".env.${ENVIRONMENT}.template" ".env.${ENVIRONMENT}"
sed -i "s|https://your-staging-lambda-function-url.lambda-url.ap-south-1.on.aws|$LAMBDA_URL|g" ".env.${ENVIRONMENT}"
sed -i "s|VITE_DEFAULT_SESSION_NAME=fitwithpari-staging-session|VITE_DEFAULT_SESSION_NAME=fitwithpari-${CUSTOM_DOMAIN}-session|g" ".env.${ENVIRONMENT}"

log_success "Environment configured for $CUSTOM_DOMAIN"

# Step 3: Deploy to Amplify
log_info "Step 3: Deploying to AWS Amplify..."
./scripts/deploy-amplify.sh $ENVIRONMENT main

# Get Amplify app domain
APP_NAME="fitwithpari-platform"
APP_ID=$(aws amplify list-apps \
    --query "apps[?name=='$APP_NAME'].appId" \
    --output text)

AMPLIFY_DOMAIN=$(aws amplify get-app \
    --app-id $APP_ID \
    --query 'app.defaultDomain' \
    --output text)

AMPLIFY_URL="https://main.${AMPLIFY_DOMAIN}"
log_success "Amplify deployed: $AMPLIFY_URL"

# Step 4: Setup CloudFront with custom domain
log_info "Step 4: Setting up CloudFront..."
./scripts/setup-cloudfront.sh $ENVIRONMENT "main.${AMPLIFY_DOMAIN}" $LAMBDA_URL

# Get CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='FitWithPari CloudFront Distribution - Optimized for Real-time Video Streaming and Zoom SDK'].Id" \
    --output text)

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' \
    --output text)

log_success "CloudFront deployed: https://$CLOUDFRONT_DOMAIN"

# Step 5: Create Route 53 DNS record
log_info "Step 5: Configuring Route 53 DNS for $CUSTOM_DOMAIN..."

# Create change batch for Route 53
cat > /tmp/dns-change-batch.json << EOF
{
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$CUSTOM_DOMAIN",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$CLOUDFRONT_DOMAIN"
                    }
                ]
            }
        }
    ]
}
EOF

# Apply DNS changes
CHANGE_ID=$(aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file:///tmp/dns-change-batch.json \
    --query 'ChangeInfo.Id' \
    --output text)

log_info "DNS change submitted: $CHANGE_ID"
log_info "Waiting for DNS propagation..."

# Wait for DNS change to propagate
aws route53 wait resource-record-sets-changed --id $CHANGE_ID
log_success "DNS propagation complete!"

# Step 6: Test deployment
log_info "Step 6: Testing deployment..."

# Wait a bit for CloudFront to pick up DNS changes
sleep 30

# Test endpoints
log_info "Testing Lambda health..."
curl -s "${LAMBDA_URL}health" | jq . || log_warning "Lambda health check failed"

log_info "Testing custom domain..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$CUSTOM_DOMAIN" || echo "failed")
if [ "$HTTP_STATUS" = "200" ]; then
    log_success "Custom domain accessible: https://$CUSTOM_DOMAIN"
else
    log_warning "Custom domain test returned: $HTTP_STATUS (may need time to propagate)"
fi

# Step 7: Generate deployment summary
log_info "Step 7: Generating deployment summary..."

SUMMARY_FILE="deployment-summary-custom-domain-$(date +%Y%m%d-%H%M%S).md"

cat > "$SUMMARY_FILE" << EOF
# FitWithPari Custom Domain Deployment

**Custom Domain:** $CUSTOM_DOMAIN
**Environment:** $ENVIRONMENT
**Deployment Date:** $(date)

## 🌐 Live URLs
- **Main Application:** https://$CUSTOM_DOMAIN
- **CloudFront Distribution:** https://$CLOUDFRONT_DOMAIN
- **Amplify Backend:** $AMPLIFY_URL
- **Lambda Token Service:** $LAMBDA_URL

## 🔧 AWS Resources
- **Lambda Function:** $FUNCTION_NAME
- **Amplify App ID:** $APP_ID
- **CloudFront Distribution:** $DISTRIBUTION_ID
- **Route 53 Hosted Zone:** $HOSTED_ZONE_ID

## 🧪 Test Endpoints
- Health Check: https://$CUSTOM_DOMAIN/health
- Token API: https://$CUSTOM_DOMAIN/api/zoom/token
- App Interface: https://$CUSTOM_DOMAIN

## 📋 Next Steps
1. **Request SSL Certificate:** Use AWS Console to request SSL for $CUSTOM_DOMAIN
2. **Configure Custom Domain in CloudFront:** Associate SSL certificate
3. **Test Video Streaming:** Verify Zoom SDK functionality
4. **Monitor Performance:** Check CloudWatch metrics

## 🔧 Management Commands

### Update deployment
\`\`\`bash
./scripts/deploy-custom-domain.sh $ENVIRONMENT
\`\`\`

### Invalidate CloudFront cache
\`\`\`bash
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
\`\`\`

### View logs
\`\`\`bash
aws logs tail /aws/lambda/$FUNCTION_NAME --follow
\`\`\`
EOF

log_success "Deployment summary: $SUMMARY_FILE"

# Clean up
rm -f /tmp/dns-change-batch.json

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Your FitWithPari platform is now live at:"
echo "   https://$CUSTOM_DOMAIN"
echo ""
echo "⚠️  Note: SSL certificate needs to be manually configured in AWS Console"
echo "   1. Go to AWS Certificate Manager"
echo "   2. Request certificate for $CUSTOM_DOMAIN"
echo "   3. Associate it with CloudFront distribution $DISTRIBUTION_ID"
echo ""
echo "📄 Full details: $SUMMARY_FILE"
