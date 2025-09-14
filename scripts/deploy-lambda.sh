#!/bin/bash

# AWS Lambda Deployment Script for FitWithPari Zoom Token Service
# Usage: ./deploy-lambda.sh [environment] [region]
# Example: ./deploy-lambda.sh production us-east-1

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
REGION=${2:-us-east-1}
FUNCTION_NAME="fitwithpari-zoom-token-${ENVIRONMENT}"
LAMBDA_DIR="lambda"
ZIP_FILE="function.zip"

echo "🚀 Deploying Lambda function for FitWithPari..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Function Name: $FUNCTION_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -d "$LAMBDA_DIR" ]; then
    echo "❌ Lambda directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to lambda directory
cd $LAMBDA_DIR

echo "📦 Installing Lambda dependencies..."
npm install --production

echo "📦 Creating deployment package..."
# Remove existing zip file
rm -f $ZIP_FILE

# Create zip file with Lambda function and dependencies
# Use PowerShell Compress-Archive on Windows
if command -v zip &> /dev/null; then
    zip -r $ZIP_FILE . -x "*.git*" "*.zip" "node_modules/.cache/*"
else
    # Windows PowerShell alternative
    powershell -Command "Compress-Archive -Path *.js,*.json,node_modules -DestinationPath $ZIP_FILE -Force"
fi

echo "📤 Uploading Lambda function..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1; then
    echo "🔄 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$ZIP_FILE \
        --region $REGION

    echo "⚙️ Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \
        --handler zoom-token-handler.handler \
        --zip-file fileb://$ZIP_FILE \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION
fi

# Update environment variables
echo "🔧 Setting environment variables..."
ENV_CONFIG="../aws/lambda-environment-config.json"
if [ -f "$ENV_CONFIG" ]; then
    ENV_VARS=$(jq -r ".${ENVIRONMENT} | @json" "$ENV_CONFIG")
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "$ENV_VARS" \
        --region $REGION
fi

# Create function URL (for direct HTTP access)
echo "🔗 Creating/updating function URL..."
aws lambda create-function-url-config \
    --function-name $FUNCTION_NAME \
    --auth-type NONE \
    --cors '{
        "AllowCredentials": false,
        "AllowHeaders": ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
        "AllowMethods": ["GET", "POST", "OPTIONS"],
        "AllowOrigins": ["*"],
        "ExposeHeaders": [],
        "MaxAge": 86400
    }' \
    --region $REGION 2>/dev/null || \
aws lambda update-function-url-config \
    --function-name $FUNCTION_NAME \
    --auth-type NONE \
    --cors '{
        "AllowCredentials": false,
        "AllowHeaders": ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
        "AllowMethods": ["GET", "POST", "OPTIONS"],
        "AllowOrigins": ["*"],
        "ExposeHeaders": [],
        "MaxAge": 86400
    }' \
    --region $REGION

# Get function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'FunctionUrl' \
    --output text)

echo "✅ Lambda function deployed successfully!"
echo "Function Name: $FUNCTION_NAME"
echo "Function URL: $FUNCTION_URL"
echo ""
echo "🧪 Testing deployment..."

# Test the health endpoint
curl -s "${FUNCTION_URL}health" | jq . || echo "Health check failed"

echo ""
echo "📋 Next steps:"
echo "1. Update your frontend environment variables with the Function URL:"
echo "   VITE_ZOOM_TOKEN_ENDPOINT=$FUNCTION_URL"
echo "2. Update CloudFront distribution origin to point to: ${FUNCTION_URL%/}"
echo "3. Test token generation from your frontend application"

# Clean up
rm -f $ZIP_FILE
cd ..

echo "🎉 Deployment complete!"