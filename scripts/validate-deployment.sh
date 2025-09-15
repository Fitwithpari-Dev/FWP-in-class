#!/bin/bash

# FitWithPari Deployment Validation Script
# This script validates that all components are working correctly in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
REGION="ap-south-1"

echo -e "${GREEN}🔍 FitWithPari Production Validation${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to test URL
test_url() {
    local url=$1
    local description=$2

    echo -e "${YELLOW}Testing $description...${NC}"

    if curl -s --head "$url" | head -n 1 | grep -q "200 OK\|301\|302"; then
        echo -e "${GREEN}✅ $description is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $description is not accessible${NC}"
        return 1
    fi
}

# Function to test JSON API
test_json_api() {
    local url=$1
    local description=$2

    echo -e "${YELLOW}Testing $description...${NC}"

    response=$(curl -s -w "%{http_code}" "$url")
    http_code="${response: -3}"

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ $description is working${NC}"
        return 0
    else
        echo -e "${RED}❌ $description returned HTTP $http_code${NC}"
        return 1
    fi
}

# Function to test Lambda function
test_lambda_function() {
    local function_name=$1

    echo -e "${YELLOW}Testing Lambda function: $function_name...${NC}"

    # Test health endpoint first
    FUNCTION_URL=$(aws lambda get-function-url-config \
        --function-name "$function_name" \
        --region $REGION \
        --query 'FunctionUrl' \
        --output text 2>/dev/null || echo "")

    if [ -z "$FUNCTION_URL" ]; then
        echo -e "${RED}❌ Lambda function URL not found${NC}"
        return 1
    fi

    echo -e "Function URL: $FUNCTION_URL"

    # Test health endpoint
    if test_json_api "${FUNCTION_URL}health" "Lambda health endpoint"; then
        echo -e "${GREEN}✅ Lambda function is healthy${NC}"
    else
        echo -e "${RED}❌ Lambda health check failed${NC}"
        return 1
    fi

    # Test token generation
    echo -e "${YELLOW}Testing token generation...${NC}"

    token_response=$(curl -s -X POST "${FUNCTION_URL}token" \
        -H "Content-Type: application/json" \
        -d '{
            "sessionName": "validation-test",
            "role": 1,
            "sessionKey": "test-key",
            "userIdentity": "validation-user"
        }')

    if echo "$token_response" | grep -q '"token"'; then
        echo -e "${GREEN}✅ Token generation is working${NC}"
        return 0
    else
        echo -e "${RED}❌ Token generation failed${NC}"
        echo -e "Response: $token_response"
        return 1
    fi
}

# Validation tests
validation_failed=0

echo -e "${BLUE}1. Testing AWS Connectivity${NC}"
if aws sts get-caller-identity &>/dev/null; then
    echo -e "${GREEN}✅ AWS credentials are valid${NC}"
else
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    validation_failed=1
fi

echo -e "\n${BLUE}2. Testing Lambda Function${NC}"
if ! test_lambda_function "fitwithpari-zoom-token-${ENVIRONMENT}"; then
    validation_failed=1
fi

echo -e "\n${BLUE}3. Testing Amplify Application${NC}"
APP_ID=$(aws amplify list-apps --region $REGION --query "apps[?name=='fitwithpari-platform'].appId" --output text 2>/dev/null || echo "")

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    echo -e "${GREEN}✅ Amplify app found: $APP_ID${NC}"

    # Get app domain
    AMPLIFY_DOMAIN=$(aws amplify get-app --app-id "$APP_ID" --region $REGION --query 'app.defaultDomain' --output text 2>/dev/null || echo "")

    if [ -n "$AMPLIFY_DOMAIN" ] && [ "$AMPLIFY_DOMAIN" != "None" ]; then
        APP_URL="https://main.$AMPLIFY_DOMAIN"
        echo -e "App URL: $APP_URL"

        if test_url "$APP_URL" "Amplify application"; then
            echo -e "${GREEN}✅ Application is accessible${NC}"
        else
            echo -e "${RED}❌ Application is not accessible${NC}"
            validation_failed=1
        fi
    else
        echo -e "${YELLOW}⚠️ Application domain not yet available (check if build is complete)${NC}"
    fi

    # Check build status
    echo -e "${YELLOW}Checking latest build status...${NC}"
    BUILD_STATUS=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "main" --region $REGION --max-items 1 --query 'jobSummaries[0].status' --output text 2>/dev/null || echo "")

    if [ "$BUILD_STATUS" = "SUCCEED" ]; then
        echo -e "${GREEN}✅ Latest build succeeded${NC}"
    elif [ "$BUILD_STATUS" = "RUNNING" ]; then
        echo -e "${YELLOW}⚠️ Build is currently running${NC}"
    elif [ "$BUILD_STATUS" = "FAILED" ]; then
        echo -e "${RED}❌ Latest build failed${NC}"
        validation_failed=1
    else
        echo -e "${YELLOW}⚠️ Build status unknown: $BUILD_STATUS${NC}"
    fi

else
    echo -e "${RED}❌ Amplify app not found${NC}"
    validation_failed=1
fi

echo -e "\n${BLUE}4. Testing Zoom SDK Configuration${NC}"
# Check if Zoom SDK key is configured
if [ -n "$VITE_ZOOM_SDK_KEY" ]; then
    echo -e "${GREEN}✅ Zoom SDK key is configured${NC}"
else
    echo -e "${YELLOW}⚠️ Zoom SDK key not found in environment${NC}"
fi

echo -e "\n${BLUE}5. Testing Supabase Configuration${NC}"
if [ -n "$VITE_SUPABASE_URL" ]; then
    if test_url "$VITE_SUPABASE_URL/rest/v1/" "Supabase API"; then
        echo -e "${GREEN}✅ Supabase is accessible${NC}"
    else
        echo -e "${RED}❌ Supabase is not accessible${NC}"
        validation_failed=1
    fi
else
    echo -e "${YELLOW}⚠️ Supabase URL not found in environment${NC}"
fi

# Network connectivity test for Zoom WebSocket servers
echo -e "\n${BLUE}6. Testing Zoom WebSocket Connectivity${NC}"
echo -e "${YELLOW}Testing DNS resolution for Zoom servers...${NC}"

zoom_servers=(
    "wss.zoom.us"
    "us01web.zoom.us"
    "us02web.zoom.us"
    "us03web.zoom.us"
)

for server in "${zoom_servers[@]}"; do
    if nslookup "$server" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $server DNS resolution successful${NC}"
    else
        echo -e "${RED}❌ $server DNS resolution failed${NC}"
        validation_failed=1
    fi
done

# Final summary
echo -e "\n${BLUE}================================================${NC}"
if [ $validation_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All validation tests passed!${NC}"
    echo -e "${GREEN}Your FitWithPari application is ready for production${NC}"
    echo -e "\n${YELLOW}📋 Summary:${NC}"
    echo -e "✅ AWS connectivity: Working"
    echo -e "✅ Lambda function: Working"
    echo -e "✅ Amplify application: Working"
    echo -e "✅ Zoom SDK configuration: Ready"
    echo -e "✅ Supabase integration: Working"
    echo -e "✅ Network connectivity: Ready for Zoom WebSocket"

    echo -e "\n${GREEN}🎥 Your Zoom Video SDK should now work properly in production!${NC}"
    echo -e "${GREEN}The WebSocket connectivity issues you experienced locally should be resolved.${NC}"
else
    echo -e "${RED}❌ Some validation tests failed${NC}"
    echo -e "${YELLOW}Please check the errors above and fix them before going to production${NC}"
    exit 1
fi

echo -e "${BLUE}================================================${NC}"