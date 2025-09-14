#!/bin/bash

# AWS Amplify Deployment Script for FitWithPari Frontend
# Usage: ./deploy-amplify.sh [environment] [branch]
# Example: ./deploy-amplify.sh production main

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
BRANCH=${2:-main}
APP_NAME="fitwithpari-platform"

echo "🚀 Deploying FitWithPari to AWS Amplify..."
echo "Environment: $ENVIRONMENT"
echo "Branch: $BRANCH"
echo "App Name: $APP_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "⚠️  Amplify CLI not found. Installing..."
    npm install -g @aws-amplify/cli
fi

echo "🔍 Checking for existing Amplify app..."

# Get Amplify app ID
APP_ID=$(aws amplify list-apps --query "apps[?name=='$APP_NAME'].appId" --output text 2>/dev/null || echo "")

if [ -z "$APP_ID" ]; then
    echo "🆕 Creating new Amplify app..."

    # Create Amplify app
    APP_ID=$(aws amplify create-app \
        --name $APP_NAME \
        --description "FitWithPari fitness platform with Zoom Video SDK integration" \
        --platform "WEB" \
        --build-spec file://amplify.yml \
        --enable-branch-auto-build \
        --query 'app.appId' \
        --output text)

    echo "Created Amplify app with ID: $APP_ID"
else
    echo "📱 Found existing Amplify app: $APP_ID"
fi

# Update build specification
echo "📝 Updating build specification..."
aws amplify update-app \
    --app-id $APP_ID \
    --build-spec file://amplify.yml

# Check if branch exists
BRANCH_EXISTS=$(aws amplify list-branches \
    --app-id $APP_ID \
    --query "branches[?branchName=='$BRANCH'].branchName" \
    --output text 2>/dev/null || echo "")

if [ -z "$BRANCH_EXISTS" ]; then
    echo "🌿 Creating branch: $BRANCH"
    aws amplify create-branch \
        --app-id $APP_ID \
        --branch-name $BRANCH \
        --enable-auto-build
else
    echo "🌿 Branch already exists: $BRANCH"
fi

# Set environment variables for the branch
echo "🔧 Setting environment variables..."

# Read environment variables from template
ENV_FILE=".env.${ENVIRONMENT}.template"
if [ -f "$ENV_FILE" ]; then
    echo "📋 Environment variables to be set (update with actual values):"

    # Environment variables that need to be set in Amplify
    ENV_VARS=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_PUBLISHABLE_KEY"
        "VITE_ZOOM_SDK_KEY"
        "VITE_API_ENDPOINT"
        "VITE_ZOOM_TOKEN_ENDPOINT"
        "VITE_APP_URL"
        "VITE_DEFAULT_SESSION_NAME"
        "VITE_ENABLE_ANALYTICS"
        "VITE_ENABLE_CHAT"
        "VITE_ENABLE_RECORDINGS"
        "VITE_ENABLE_HEALTH_TRACKING"
        "NODE_ENV"
        "VITE_NODE_ENV"
    )

    # Note: You'll need to set these manually in Amplify Console or via CLI
    echo "⚠️  Please set these environment variables in the Amplify Console:"
    for var in "${ENV_VARS[@]}"; do
        echo "  - $var"
    done

    echo ""
    echo "🌐 Or set them via CLI (example):"
    echo "aws amplify update-branch --app-id $APP_ID --branch-name $BRANCH --environment-variables VITE_SUPABASE_URL=your-value,VITE_ZOOM_SDK_KEY=your-value"
fi

# Connect repository (if not already connected)
echo "🔗 Connecting to repository..."
echo "⚠️  You may need to connect your GitHub repository manually in the Amplify Console"

# Trigger deployment
echo "🚀 Starting deployment..."
JOB_ID=$(aws amplify start-job \
    --app-id $APP_ID \
    --branch-name $BRANCH \
    --job-type RELEASE \
    --query 'jobSummary.jobId' \
    --output text)

echo "📋 Deployment started with Job ID: $JOB_ID"

# Monitor deployment
echo "⏳ Monitoring deployment progress..."
while true; do
    STATUS=$(aws amplify get-job \
        --app-id $APP_ID \
        --branch-name $BRANCH \
        --job-id $JOB_ID \
        --query 'job.summary.status' \
        --output text)

    echo "Status: $STATUS"

    if [ "$STATUS" = "SUCCEED" ]; then
        echo "✅ Deployment successful!"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ Deployment failed!"
        exit 1
    elif [ "$STATUS" = "CANCELLED" ]; then
        echo "⚠️  Deployment cancelled!"
        exit 1
    fi

    sleep 30
done

# Get app URLs
APP_URL=$(aws amplify get-app \
    --app-id $APP_ID \
    --query 'app.defaultDomain' \
    --output text)

BRANCH_URL="https://${BRANCH}.${APP_URL}"

echo ""
echo "🎉 Deployment complete!"
echo "App ID: $APP_ID"
echo "Branch: $BRANCH"
echo "App URL: $BRANCH_URL"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home#/${APP_ID}/settings/environment"
echo "2. Configure custom domain (if needed)"
echo "3. Set up CloudFront distribution"
echo "4. Test the application"

echo ""
echo "🔧 Useful commands:"
echo "  View logs: aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $JOB_ID"
echo "  List apps: aws amplify list-apps"
echo "  Delete app: aws amplify delete-app --app-id $APP_ID"