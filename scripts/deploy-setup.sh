#!/bin/bash

# FitWithPari AWS Amplify Deployment Setup Script
# This script automates the initial setup of AWS Amplify for the fitness platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="FitWithPari"
REGION="us-east-1"  # Change as needed
GITHUB_REPO_URL=""  # Will be set via parameter
DOMAIN_NAME=""      # Will be set via parameter

echo -e "${BLUE}=== FitWithPari AWS Amplify Deployment Setup ===${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed and configured
check_aws_cli() {
    print_status "Checking AWS CLI installation..."

    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_status "AWS CLI configured successfully"
}

# Create Amplify application
create_amplify_app() {
    print_status "Creating AWS Amplify application..."

    # Check if app already exists
    if aws amplify get-app --app-id $(aws amplify list-apps --query "apps[?name=='$APP_NAME'].appId" --output text 2>/dev/null) &> /dev/null; then
        print_warning "Amplify app '$APP_NAME' already exists"
        return 0
    fi

    # Create the app
    APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "FitWithPari - Online Fitness Platform with Video Streaming" \
        --repository "$GITHUB_REPO_URL" \
        --platform "WEB" \
        --iam-service-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/amplifyconsole-backend-role" \
        --build-spec file://amplify.yml \
        --custom-rules '[
            {
                "source": "/<*>",
                "target": "/index.html",
                "status": "200"
            },
            {
                "source": "/assets/<*>",
                "target": "/assets/<*>",
                "status": "200"
            }
        ]' \
        --environment-variables '{
            "NODE_ENV": "production",
            "VITE_APP_NAME": "FitWithPari",
            "VITE_APP_VERSION": "1.0.0",
            "VITE_APP_ENVIRONMENT": "production"
        }' \
        --query 'app.appId' \
        --output text)

    print_status "Created Amplify app with ID: $APP_ID"
    echo "$APP_ID" > .amplify-app-id
}

# Create branch for main production deployment
create_main_branch() {
    print_status "Setting up main branch for production deployment..."

    APP_ID=$(cat .amplify-app-id)

    # Create branch
    aws amplify create-branch \
        --app-id "$APP_ID" \
        --branch-name "main" \
        --description "Production branch for FitWithPari" \
        --enable-auto-build \
        --environment-variables '{
            "NODE_ENV": "production",
            "VITE_APP_ENVIRONMENT": "production",
            "VITE_ENABLE_LIVE_STREAMING": "true",
            "VITE_ENABLE_RECORDED_CLASSES": "true",
            "VITE_ENABLE_PAYMENT_INTEGRATION": "true",
            "VITE_PERFORMANCE_MONITORING": "true",
            "VITE_ERROR_REPORTING": "true"
        }' \
        --build-spec file://amplify.yml

    print_status "Main branch configured for production"
}

# Set up custom domain (if provided)
setup_custom_domain() {
    if [ -z "$DOMAIN_NAME" ]; then
        print_warning "No domain name provided, skipping domain setup"
        return 0
    fi

    print_status "Setting up custom domain: $DOMAIN_NAME"

    APP_ID=$(cat .amplify-app-id)

    # Add domain
    aws amplify create-domain-association \
        --app-id "$APP_ID" \
        --domain-name "$DOMAIN_NAME" \
        --sub-domain-settings '[
            {
                "prefix": "",
                "branchName": "main"
            },
            {
                "prefix": "www",
                "branchName": "main"
            }
        ]'

    print_status "Domain association created. DNS verification required."
    print_warning "Please add the CNAME records shown in the Amplify console to your DNS provider"
}

# Set up webhooks for automatic deployments
setup_webhooks() {
    print_status "Setting up webhook for automatic deployments..."

    APP_ID=$(cat .amplify-app-id)

    # Create webhook
    WEBHOOK_URL=$(aws amplify create-webhook \
        --app-id "$APP_ID" \
        --branch-name "main" \
        --description "GitHub webhook for automatic deployments" \
        --query 'webhookUrl' \
        --output text)

    print_status "Webhook created: $WEBHOOK_URL"
    print_warning "Add this webhook URL to your GitHub repository settings"
    echo "$WEBHOOK_URL" > .amplify-webhook-url
}

# Configure performance optimizations
configure_performance() {
    print_status "Configuring performance optimizations..."

    APP_ID=$(cat .amplify-app-id)

    # Update app with performance settings
    aws amplify update-app \
        --app-id "$APP_ID" \
        --custom-headers '[
            {
                "pattern": "**/*",
                "headers": {
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                }
            },
            {
                "pattern": "/assets/**",
                "headers": {
                    "Cache-Control": "public, max-age=31536000, immutable"
                }
            },
            {
                "pattern": "/**/*.mp4",
                "headers": {
                    "Cache-Control": "public, max-age=86400",
                    "Accept-Ranges": "bytes"
                }
            }
        ]'

    print_status "Performance optimizations configured"
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --repo-url)
                GITHUB_REPO_URL="$2"
                shift 2
                ;;
            --domain)
                DOMAIN_NAME="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Usage: $0 --repo-url <github-repo-url> [--domain <domain-name>] [--region <aws-region>]"
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [ -z "$GITHUB_REPO_URL" ]; then
        print_error "GitHub repository URL is required"
        echo "Usage: $0 --repo-url <github-repo-url> [--domain <domain-name>] [--region <aws-region>]"
        exit 1
    fi

    # Set AWS region
    export AWS_DEFAULT_REGION="$REGION"

    # Execute setup steps
    check_aws_cli
    create_amplify_app
    create_main_branch
    setup_custom_domain
    setup_webhooks
    configure_performance

    print_status "=== Deployment setup completed successfully! ==="
    print_status "Next steps:"
    echo "1. Add the webhook URL to your GitHub repository"
    echo "2. Configure DNS records for your custom domain (if applicable)"
    echo "3. Set sensitive environment variables in the Amplify console"
    echo "4. Trigger your first deployment by pushing to the main branch"

    if [ -f .amplify-app-id ]; then
        APP_ID=$(cat .amplify-app-id)
        echo ""
        print_status "Amplify Console URL: https://$REGION.console.aws.amazon.com/amplify/apps/$APP_ID"
    fi
}

# Run main function
main "$@"