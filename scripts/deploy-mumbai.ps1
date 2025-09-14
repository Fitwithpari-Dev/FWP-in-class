# PowerShell Deployment Script for FitWithPari to Mumbai region (ap-south-1)
# Usage: .\deploy-mumbai.ps1 [environment]

param(
    [string]$Environment = "staging"
)

$CUSTOM_DOMAIN = "classes.tribe.fit"
$HOSTED_ZONE_ID = "Z01103173822LFRI0DKH"
$REGION = "ap-south-1"
$FUNCTION_NAME = "fitwithpari-zoom-token-$Environment"

Write-Host "🚀 Deploying FitWithPari to custom domain: $CUSTOM_DOMAIN" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan

# Step 1: Create IAM role in ap-south-1 region if needed
Write-Host "🔧 Checking IAM role..." -ForegroundColor Blue

$roleExists = aws iam get-role --role-name lambda-execution-role 2>$null
if (-not $roleExists) {
    Write-Host "Creating IAM role..." -ForegroundColor Yellow
    aws iam create-role --role-name lambda-execution-role --assume-role-policy-document '{\"Version\": \"2012-10-17\",\"Statement\": [{\"Effect\": \"Allow\",\"Principal\": {\"Service\": \"lambda.amazonaws.com\"},\"Action\": \"sts:AssumeRole\"}]}'
    aws iam attach-role-policy --role-name lambda-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Start-Sleep -Seconds 10
}

# Step 2: Deploy Lambda function to ap-south-1
Write-Host "📦 Deploying Lambda function to $REGION..." -ForegroundColor Blue

# Navigate to lambda directory
Set-Location lambda

# Install dependencies
npm install --production

# Create deployment package using PowerShell
Remove-Item function.zip -ErrorAction SilentlyContinue
Compress-Archive -Path *.js,*.json,node_modules -DestinationPath function.zip -Force

# Get AWS account ID
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$ROLE_ARN = "arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role"

# Check if Lambda function exists
$functionExists = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>$null

if ($functionExists) {
    Write-Host "Updating existing Lambda function..." -ForegroundColor Yellow
    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://function.zip --region $REGION
} else {
    Write-Host "Creating new Lambda function..." -ForegroundColor Yellow
    aws lambda create-function --function-name $FUNCTION_NAME --runtime nodejs18.x --role $ROLE_ARN --handler zoom-token-handler.handler --zip-file fileb://function.zip --timeout 30 --memory-size 256 --region $REGION
}

# Create function URL
aws lambda create-function-url-config --function-name $FUNCTION_NAME --auth-type NONE --cors '{\"AllowCredentials\": false,\"AllowHeaders\": [\"Content-Type\", \"X-Amz-Date\", \"Authorization\", \"X-Api-Key\"],\"AllowMethods\": [\"GET\", \"POST\", \"OPTIONS\"],\"AllowOrigins\": [\"*\"],\"ExposeHeaders\": [],\"MaxAge\": 86400}' --region $REGION 2>$null

# Get function URL
$LAMBDA_URL = aws lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION --query 'FunctionUrl' --output text

Write-Host "✅ Lambda function deployed: $LAMBDA_URL" -ForegroundColor Green

# Clean up
Remove-Item function.zip -ErrorAction SilentlyContinue
Set-Location ..

# Step 3: Configure environment file
Write-Host "🔧 Configuring environment for custom domain..." -ForegroundColor Blue

Copy-Item ".env.$Environment.template" ".env.$Environment" -Force
(Get-Content ".env.$Environment") | Foreach-Object {
    $_ -replace "https://your-staging-lambda-function-url.lambda-url.ap-south-1.on.aws", $LAMBDA_URL -replace "VITE_DEFAULT_SESSION_NAME=fitwithpari-staging-session", "VITE_DEFAULT_SESSION_NAME=fitwithpari-$CUSTOM_DOMAIN-session"
} | Set-Content ".env.$Environment"

Write-Host "✅ Environment configured for $CUSTOM_DOMAIN" -ForegroundColor Green

# Step 4: Deploy to Amplify (requires AWS CLI and creates app if not exists)
Write-Host "🚀 Deploying to AWS Amplify..." -ForegroundColor Blue

$APP_NAME = "fitwithpari-platform"

# Check if Amplify app exists
$APP_ID = aws amplify list-apps --query "apps[?name=='$APP_NAME'].appId" --output text

if (-not $APP_ID -or $APP_ID -eq "") {
    Write-Host "Creating new Amplify app..." -ForegroundColor Yellow
    $APP_ID = aws amplify create-app --name $APP_NAME --description "FitWithPari fitness platform with Zoom Video SDK integration" --platform "WEB" --build-spec file://amplify.yml --enable-branch-auto-build --query 'app.appId' --output text
}

Write-Host "✅ Amplify App ID: $APP_ID" -ForegroundColor Green

# Create branch if not exists
$BRANCH_EXISTS = aws amplify list-branches --app-id $APP_ID --query "branches[?branchName=='main'].branchName" --output text

if (-not $BRANCH_EXISTS -or $BRANCH_EXISTS -eq "") {
    Write-Host "Creating main branch..." -ForegroundColor Yellow
    aws amplify create-branch --app-id $APP_ID --branch-name main --enable-auto-build
}

# Start deployment
Write-Host "🚀 Starting Amplify deployment..." -ForegroundColor Blue
$JOB_ID = aws amplify start-job --app-id $APP_ID --branch-name main --job-type RELEASE --query 'jobSummary.jobId' --output text

Write-Host "📋 Deployment Job ID: $JOB_ID" -ForegroundColor Cyan

# Monitor deployment (simplified - check manually)
Write-Host "⏳ Deployment started. Monitor at: https://console.aws.amazon.com/amplify/home#/$APP_ID" -ForegroundColor Yellow

# Get Amplify domain
$AMPLIFY_DOMAIN = aws amplify get-app --app-id $APP_ID --query 'app.defaultDomain' --output text
$AMPLIFY_URL = "https://main.$AMPLIFY_DOMAIN"

Write-Host "✅ Amplify URL: $AMPLIFY_URL" -ForegroundColor Green

# Step 5: Create Route 53 DNS record
Write-Host "🌐 Configuring Route 53 DNS..." -ForegroundColor Blue

# For now, we'll point directly to Amplify - CloudFront can be added later
$changeBatch = @"
{
    \"Changes\": [
        {
            \"Action\": \"UPSERT\",
            \"ResourceRecordSet\": {
                \"Name\": \"$CUSTOM_DOMAIN\",
                \"Type\": \"CNAME\",
                \"TTL\": 300,
                \"ResourceRecords\": [
                    {
                        \"Value\": \"$AMPLIFY_DOMAIN\"
                    }
                ]
            }
        }
    ]
}
"@

$changeBatch | Out-File -FilePath "dns-change.json" -Encoding utf8

$CHANGE_ID = aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch file://dns-change.json --query 'ChangeInfo.Id' --output text

Write-Host "✅ DNS change submitted: $CHANGE_ID" -ForegroundColor Green

# Clean up
Remove-Item dns-change.json -ErrorAction SilentlyContinue

# Final summary
Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your FitWithPari platform will be available at:" -ForegroundColor Cyan
Write-Host "   https://$CUSTOM_DOMAIN" -ForegroundColor White
Write-Host ""
Write-Host "📋 Resources Created:" -ForegroundColor Cyan
Write-Host "   Lambda Function: $FUNCTION_NAME (ap-south-1)" -ForegroundColor White
Write-Host "   Function URL: $LAMBDA_URL" -ForegroundColor White
Write-Host "   Amplify App: $APP_ID" -ForegroundColor White
Write-Host "   Amplify URL: $AMPLIFY_URL" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Wait for DNS propagation (5-10 minutes)" -ForegroundColor White
Write-Host "   2. Set environment variables in Amplify Console" -ForegroundColor White
Write-Host "   3. Test the application at https://$CUSTOM_DOMAIN" -ForegroundColor White
Write-Host "   4. Configure SSL certificate if needed" -ForegroundColor White