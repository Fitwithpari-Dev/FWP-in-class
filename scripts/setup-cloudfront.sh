#!/bin/bash

# CloudFront Distribution Setup Script for FitWithPari
# Usage: ./setup-cloudfront.sh [environment] [amplify-domain] [lambda-url]
# Example: ./setup-cloudfront.sh production main.d1a2b3c4d5e6f7.amplifyapp.com https://abc123.lambda-url.us-east-1.on.aws

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
AMPLIFY_DOMAIN=${2}
LAMBDA_URL=${3}
DISTRIBUTION_TAG="fitwithpari-${ENVIRONMENT}"

echo "🌐 Setting up CloudFront distribution for FitWithPari..."
echo "Environment: $ENVIRONMENT"
echo "Amplify Domain: $AMPLIFY_DOMAIN"
echo "Lambda URL: $LAMBDA_URL"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it first."
    exit 1
fi

# Validate inputs
if [ -z "$AMPLIFY_DOMAIN" ]; then
    echo "❌ Amplify domain is required"
    echo "Usage: $0 [environment] [amplify-domain] [lambda-url]"
    exit 1
fi

if [ -z "$LAMBDA_URL" ]; then
    echo "❌ Lambda URL is required"
    echo "Usage: $0 [environment] [amplify-domain] [lambda-url]"
    exit 1
fi

# Extract domain from Lambda URL
LAMBDA_DOMAIN=$(echo $LAMBDA_URL | sed 's|https\?://||' | sed 's|/.*||')

echo "📝 Creating CloudFront distribution configuration..."

# Create temporary CloudFront configuration
TEMP_CONFIG="/tmp/cloudfront-config-${ENVIRONMENT}.json"

# Read base configuration and replace placeholders
cat cloudfront-config.json | \
    sed "s/your-amplify-app.amplifyapp.com/$AMPLIFY_DOMAIN/g" | \
    sed "s|your-lambda-function-url.lambda-url.us-east-1.on.aws|$LAMBDA_DOMAIN|g" > $TEMP_CONFIG

# Check if distribution already exists
EXISTING_DISTRIBUTION=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='FitWithPari CloudFront Distribution - Optimized for Real-time Video Streaming and Zoom SDK'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DISTRIBUTION" ] && [ "$EXISTING_DISTRIBUTION" != "None" ]; then
    echo "🔄 Found existing distribution: $EXISTING_DISTRIBUTION"

    # Get current distribution config
    echo "📋 Getting current distribution configuration..."
    aws cloudfront get-distribution-config \
        --id $EXISTING_DISTRIBUTION \
        --query 'DistributionConfig' > /tmp/current-config.json

    # Get ETag for update
    ETAG=$(aws cloudfront get-distribution-config \
        --id $EXISTING_DISTRIBUTION \
        --query 'ETag' \
        --output text)

    echo "🔄 Updating distribution with new configuration..."
    aws cloudfront update-distribution \
        --id $EXISTING_DISTRIBUTION \
        --if-match $ETAG \
        --distribution-config file://$TEMP_CONFIG

    DISTRIBUTION_ID=$EXISTING_DISTRIBUTION
else
    echo "🆕 Creating new CloudFront distribution..."

    # Create CloudFront distribution
    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --distribution-config file://$TEMP_CONFIG \
        --query 'Distribution.Id' \
        --output text)

    echo "📋 Created distribution: $DISTRIBUTION_ID"
fi

# Tag the distribution
echo "🏷️  Tagging distribution..."
aws cloudfront tag-resource \
    --resource "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/$DISTRIBUTION_ID" \
    --tags "Items=[
        {Key=Environment,Value=$ENVIRONMENT},
        {Key=Project,Value=FitWithPari},
        {Key=Service,Value=VideoStreaming}
    ]"

# Wait for distribution to be deployed
echo "⏳ Waiting for distribution to be deployed..."
echo "This may take 10-15 minutes..."

# Check deployment status
while true; do
    STATUS=$(aws cloudfront get-distribution \
        --id $DISTRIBUTION_ID \
        --query 'Distribution.Status' \
        --output text)

    if [ "$STATUS" = "Deployed" ]; then
        echo "✅ Distribution deployed successfully!"
        break
    else
        echo "Status: $STATUS (waiting...)"
        sleep 60
    fi
done

# Get distribution details
DOMAIN_NAME=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' \
    --output text)

echo ""
echo "🎉 CloudFront setup complete!"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "Distribution Domain: $DOMAIN_NAME"
echo "Distribution URL: https://$DOMAIN_NAME"

echo ""
echo "📋 Next steps:"
echo "1. Update your DNS records to point to CloudFront:"
echo "   app.fitwithpari.com CNAME $DOMAIN_NAME"
echo "2. Request SSL certificate in ACM (if using custom domain)"
echo "3. Update Amplify environment variables:"
echo "   VITE_APP_URL=https://$DOMAIN_NAME"
echo "4. Test the application through CloudFront"

echo ""
echo "🧪 Test endpoints:"
echo "  App: https://$DOMAIN_NAME"
echo "  Health: https://$DOMAIN_NAME/health"
echo "  Token API: https://$DOMAIN_NAME/api/zoom/token"

echo ""
echo "🔧 Useful commands:"
echo "  View distribution: aws cloudfront get-distribution --id $DISTRIBUTION_ID"
echo "  Invalidate cache: aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*'"
echo "  Delete distribution: aws cloudfront delete-distribution --id $DISTRIBUTION_ID"

# Create invalidation to refresh cache
echo "🔄 Creating cache invalidation..."
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text

# Clean up
rm -f $TEMP_CONFIG

echo "✨ CloudFront distribution is ready for video streaming!"