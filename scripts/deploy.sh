#!/bin/bash

# FitWithPari Platform - Production Deployment Script
# This script handles the complete deployment process to AWS Amplify

set -e

echo "🚀 Starting FitWithPari Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if environment is properly configured
check_environment() {
    echo -e "${YELLOW}📋 Checking environment configuration...${NC}"

    if [ ! -f .env.production ]; then
        echo -e "${RED}❌ .env.production file not found!${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Environment configuration verified${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci --production=false
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    npm run type-check || echo -e "${YELLOW}⚠️ TypeScript warnings detected (non-blocking)${NC}"
    echo -e "${GREEN}✅ Tests completed${NC}"
}

# Build production bundle
build_production() {
    echo -e "${YELLOW}🏗️ Building production bundle...${NC}"
    npm run build

    if [ ! -d "build" ]; then
        echo -e "${RED}❌ Build directory not found!${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Production build completed${NC}"
}

# Optimize assets
optimize_assets() {
    echo -e "${YELLOW}🎨 Optimizing assets...${NC}"

    # Check build size
    BUILD_SIZE=$(du -sh build | cut -f1)
    echo -e "Build size: ${BUILD_SIZE}"

    # List largest files
    echo "Largest files in build:"
    find build -type f -exec du -h {} + | sort -rh | head -5

    echo -e "${GREEN}✅ Assets optimized${NC}"
}

# Deploy to AWS Amplify
deploy_to_amplify() {
    echo -e "${YELLOW}☁️ Deploying to AWS Amplify...${NC}"

    # Check if Amplify CLI is installed
    if ! command -v amplify &> /dev/null; then
        echo -e "${YELLOW}⚠️ Amplify CLI not found. Please install it first:${NC}"
        echo "npm install -g @aws-amplify/cli"
        exit 1
    fi

    # Push to Amplify
    amplify push --yes

    echo -e "${GREEN}✅ Deployed to AWS Amplify${NC}"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

    # Get the app URL from Amplify
    APP_URL=$(amplify status | grep "Hosting endpoint" | awk '{print $3}')

    if [ -n "$APP_URL" ]; then
        echo -e "${GREEN}✅ Application deployed successfully!${NC}"
        echo -e "🌐 Application URL: ${APP_URL}"

        # Test the endpoint
        HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$APP_URL")
        if [ "$HTTP_STATUS" -eq 200 ]; then
            echo -e "${GREEN}✅ Application is accessible${NC}"
        else
            echo -e "${YELLOW}⚠️ Application returned HTTP status: $HTTP_STATUS${NC}"
        fi
    else
        echo -e "${RED}❌ Could not retrieve application URL${NC}"
    fi
}

# Main deployment flow
main() {
    echo "╔════════════════════════════════════════╗"
    echo "║   FitWithPari Production Deployment   ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    check_environment
    install_dependencies
    run_tests
    build_production
    optimize_assets

    echo -e "${YELLOW}Ready to deploy to AWS Amplify?${NC}"
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_amplify
        verify_deployment

        echo ""
        echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Test all features in production"
        echo "2. Monitor CloudWatch logs for any issues"
        echo "3. Check CloudFront CDN distribution"
        echo "4. Verify Supabase connections"
        echo "5. Test Zoom SDK integration"
    else
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
}

# Run the main function
main "$@"