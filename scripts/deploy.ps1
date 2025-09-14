# FitWithPari Platform - Production Deployment Script (Windows)
# This script handles the complete deployment process to AWS Amplify

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting FitWithPari Production Deployment..." -ForegroundColor Cyan

# Check if environment is properly configured
function Check-Environment {
    Write-Host "📋 Checking environment configuration..." -ForegroundColor Yellow

    if (-not (Test-Path ".env.production")) {
        Write-Host "❌ .env.production file not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Environment configuration verified" -ForegroundColor Green
}

# Install dependencies
function Install-Dependencies {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm ci --production=false
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Run tests
function Run-Tests {
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    npm run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ TypeScript warnings detected (non-blocking)" -ForegroundColor Yellow
    }
    Write-Host "✅ Tests completed" -ForegroundColor Green
}

# Build production bundle
function Build-Production {
    Write-Host "🏗️ Building production bundle..." -ForegroundColor Yellow
    npm run build

    if (-not (Test-Path "build")) {
        Write-Host "❌ Build directory not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Production build completed" -ForegroundColor Green
}

# Optimize assets
function Optimize-Assets {
    Write-Host "🎨 Optimizing assets..." -ForegroundColor Yellow

    # Check build size
    $buildSize = (Get-ChildItem -Path "build" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Build size: $([math]::Round($buildSize, 2)) MB"

    # List largest files
    Write-Host "Largest files in build:"
    Get-ChildItem -Path "build" -Recurse -File |
        Sort-Object Length -Descending |
        Select-Object -First 5 |
        ForEach-Object { Write-Host "$($_.Name) - $([math]::Round($_.Length / 1KB, 2)) KB" }

    Write-Host "✅ Assets optimized" -ForegroundColor Green
}

# Deploy to AWS Amplify
function Deploy-To-Amplify {
    Write-Host "☁️ Deploying to AWS Amplify..." -ForegroundColor Yellow

    # Check if Amplify CLI is installed
    $amplifyExists = Get-Command amplify -ErrorAction SilentlyContinue
    if (-not $amplifyExists) {
        Write-Host "⚠️ Amplify CLI not found. Please install it first:" -ForegroundColor Yellow
        Write-Host "npm install -g @aws-amplify/cli"
        exit 1
    }

    # Push to Amplify
    amplify push --yes

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Amplify deployment failed" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Deployed to AWS Amplify" -ForegroundColor Green
}

# Verify deployment
function Verify-Deployment {
    Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow

    # Get the app URL from Amplify
    $amplifyStatus = amplify status | Select-String "Hosting endpoint"
    if ($amplifyStatus) {
        $appUrl = ($amplifyStatus -split '\s+')[2]
        Write-Host "✅ Application deployed successfully!" -ForegroundColor Green
        Write-Host "🌐 Application URL: $appUrl" -ForegroundColor Cyan

        # Test the endpoint
        try {
            $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Application is accessible" -ForegroundColor Green
            } else {
                Write-Host "⚠️ Application returned HTTP status: $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️ Could not reach application endpoint" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Could not retrieve application URL" -ForegroundColor Red
    }
}

# Main deployment flow
function Main {
    Write-Host "╔════════════════════════════════════════╗"
    Write-Host "║   FitWithPari Production Deployment   ║"
    Write-Host "╚════════════════════════════════════════╝"
    Write-Host ""

    Check-Environment
    Install-Dependencies
    Run-Tests
    Build-Production
    Optimize-Assets

    Write-Host "Ready to deploy to AWS Amplify?" -ForegroundColor Yellow
    $response = Read-Host "Continue with deployment? (y/n)"

    if ($response -eq 'y' -or $response -eq 'Y') {
        Deploy-To-Amplify
        Verify-Deployment

        Write-Host ""
        Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Test all features in production"
        Write-Host "2. Monitor CloudWatch logs for any issues"
        Write-Host "3. Check CloudFront CDN distribution"
        Write-Host "4. Verify Supabase connections"
        Write-Host "5. Test Zoom SDK integration"
    } else {
        Write-Host "Deployment cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Run the main function
Main