# PowerShell Deployment Script for FitWithPari to Mumbai region
param([string]$Environment = "staging")

$CUSTOM_DOMAIN = "classes.tribe.fit"
$HOSTED_ZONE_ID = "Z01103173822LFRI0DKH"
$REGION = "ap-south-1"
$FUNCTION_NAME = "fitwithpari-zoom-token-$Environment"

Write-Host "Deploying FitWithPari to Mumbai region..." -ForegroundColor Green
Write-Host "Environment: $Environment, Region: $REGION" -ForegroundColor Cyan

# Step 1: Create IAM role if needed
Write-Host "Checking IAM role..." -ForegroundColor Blue
$roleCheck = aws iam get-role --role-name lambda-execution-role 2>$null
if (-not $roleCheck) {
    Write-Host "Creating IAM role..." -ForegroundColor Yellow
    aws iam create-role --role-name lambda-execution-role --assume-role-policy-document '{\"Version\": \"2012-10-17\",\"Statement\": [{\"Effect\": \"Allow\",\"Principal\": {\"Service\": \"lambda.amazonaws.com\"},\"Action\": \"sts:AssumeRole\"}]}'
    aws iam attach-role-policy --role-name lambda-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Start-Sleep -Seconds 10
}

# Step 2: Deploy Lambda function
Write-Host "Deploying Lambda function..." -ForegroundColor Blue
Set-Location lambda

npm install --production
Remove-Item function.zip -ErrorAction SilentlyContinue
Compress-Archive -Path *.js,*.json,node_modules -DestinationPath function.zip -Force

$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$ROLE_ARN = "arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role"

$functionExists = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>$null
if ($functionExists) {
    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://function.zip --region $REGION
} else {
    aws lambda create-function --function-name $FUNCTION_NAME --runtime nodejs18.x --role $ROLE_ARN --handler zoom-token-handler.handler --zip-file fileb://function.zip --timeout 30 --memory-size 256 --region $REGION
}

aws lambda create-function-url-config --function-name $FUNCTION_NAME --auth-type NONE --cors '{\"AllowCredentials\": false,\"AllowHeaders\": [\"Content-Type\", \"X-Amz-Date\", \"Authorization\", \"X-Api-Key\"],\"AllowMethods\": [\"GET\", \"POST\", \"OPTIONS\"],\"AllowOrigins\": [\"*\"],\"ExposeHeaders\": [],\"MaxAge\": 86400}' --region $REGION 2>$null

$LAMBDA_URL = aws lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION --query 'FunctionUrl' --output text
Write-Host "Lambda deployed at: $LAMBDA_URL" -ForegroundColor Green

Remove-Item function.zip -ErrorAction SilentlyContinue
Set-Location ..

# Step 3: Configure environment
Write-Host "Configuring environment..." -ForegroundColor Blue
Copy-Item ".env.$Environment.template" ".env.$Environment" -Force
(Get-Content ".env.$Environment") | Foreach-Object {
    $_ -replace "https://your-staging-lambda-function-url.lambda-url.ap-south-1.on.aws", $LAMBDA_URL
} | Set-Content ".env.$Environment"

# Step 4: Deploy to Amplify
Write-Host "Deploying to Amplify..." -ForegroundColor Blue
$APP_NAME = "fitwithpari-platform"

$APP_ID = aws amplify list-apps --query "apps[?name=='$APP_NAME'].appId" --output text
if (-not $APP_ID -or $APP_ID -eq "") {
    $APP_ID = aws amplify create-app --name $APP_NAME --description "FitWithPari fitness platform" --platform "WEB" --build-spec file://amplify.yml --enable-branch-auto-build --query 'app.appId' --output text
}

$BRANCH_EXISTS = aws amplify list-branches --app-id $APP_ID --query "branches[?branchName=='main'].branchName" --output text
if (-not $BRANCH_EXISTS -or $BRANCH_EXISTS -eq "") {
    aws amplify create-branch --app-id $APP_ID --branch-name main --enable-auto-build
}

$JOB_ID = aws amplify start-job --app-id $APP_ID --branch-name main --job-type RELEASE --query 'jobSummary.jobId' --output text
$AMPLIFY_DOMAIN = aws amplify get-app --app-id $APP_ID --query 'app.defaultDomain' --output text
$AMPLIFY_URL = "https://main.$AMPLIFY_DOMAIN"

Write-Host "Amplify deployment started. Job ID: $JOB_ID" -ForegroundColor Green
Write-Host "Amplify URL: $AMPLIFY_URL" -ForegroundColor Green

# Step 5: Configure DNS
Write-Host "Configuring DNS..." -ForegroundColor Blue
$changeBatch = @"
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
                        "Value": "$AMPLIFY_DOMAIN"
                    }
                ]
            }
        }
    ]
}
"@

$changeBatch | Out-File -FilePath "dns-change.json" -Encoding utf8
$CHANGE_ID = aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch file://dns-change.json --query 'ChangeInfo.Id' --output text
Remove-Item dns-change.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Custom Domain: https://$CUSTOM_DOMAIN" -ForegroundColor Cyan
Write-Host "Lambda URL: $LAMBDA_URL" -ForegroundColor Cyan
Write-Host "Amplify URL: $AMPLIFY_URL" -ForegroundColor Cyan
Write-Host "DNS Change ID: $CHANGE_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Set environment variables in Amplify Console" -ForegroundColor Yellow
Write-Host "Monitor: https://console.aws.amazon.com/amplify/home#/$APP_ID" -ForegroundColor Yellow