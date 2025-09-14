# FitWithPari AWS Amplify Deployment Script for Windows PowerShell
# This script handles deployment and verification for the fitness platform

param(
    [Parameter(Mandatory=$true)]
    [string]$AppId,

    [Parameter(Mandatory=$false)]
    [string]$BranchName = "main",

    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",

    [Parameter(Mandatory=$false)]
    [switch]$WaitForCompletion = $false,

    [Parameter(Mandatory=$false)]
    [switch]$RunTests = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
}

function Write-Status {
    param([string]$Message, [string]$Color = "Green")
    Write-Host "[INFO] $Message" -ForegroundColor $Colors[$Color]
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors["Yellow"]
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors["Red"]
}

function Test-AwsCli {
    Write-Status "Checking AWS CLI configuration..." "Blue"

    try {
        $null = aws sts get-caller-identity --region $Region
        Write-Status "AWS CLI configured successfully"
    }
    catch {
        Write-Error "AWS CLI not configured properly. Please run 'aws configure' first."
        exit 1
    }
}

function Start-AmplifyDeployment {
    Write-Status "Starting Amplify deployment..." "Blue"

    try {
        # Start the deployment
        $deploymentResult = aws amplify start-job --app-id $AppId --branch-name $BranchName --job-type RELEASE --region $Region --output json | ConvertFrom-Json

        $jobId = $deploymentResult.jobSummary.jobId
        Write-Status "Deployment started with Job ID: $jobId"

        # Get the deployment URL
        $appInfo = aws amplify get-app --app-id $AppId --region $Region --output json | ConvertFrom-Json
        $deploymentUrl = "https://$BranchName.$($appInfo.app.defaultDomain)"

        Write-Status "Deployment URL: $deploymentUrl"

        return @{
            JobId = $jobId
            DeploymentUrl = $deploymentUrl
        }
    }
    catch {
        Write-Error "Failed to start deployment: $($_.Exception.Message)"
        exit 1
    }
}

function Wait-ForDeployment {
    param([string]$JobId)

    Write-Status "Waiting for deployment to complete..." "Blue"

    $maxWaitTime = 1800 # 30 minutes
    $waitTime = 0
    $checkInterval = 30 # seconds

    do {
        Start-Sleep -Seconds $checkInterval
        $waitTime += $checkInterval

        try {
            $jobStatus = aws amplify get-job --app-id $AppId --branch-name $BranchName --job-id $JobId --region $Region --output json | ConvertFrom-Json
            $status = $jobStatus.job.summary.status

            Write-Status "Deployment status: $status"

            switch ($status) {
                "SUCCEED" {
                    Write-Status "Deployment completed successfully!" "Green"
                    return $true
                }
                "FAILED" {
                    Write-Error "Deployment failed!"

                    # Get failure reason
                    if ($jobStatus.job.steps) {
                        $failedStep = $jobStatus.job.steps | Where-Object { $_.status -eq "FAILED" } | Select-Object -First 1
                        if ($failedStep) {
                            Write-Error "Failed step: $($failedStep.stepName)"
                            Write-Error "Failure reason: $($failedStep.logUrl)"
                        }
                    }
                    return $false
                }
                "CANCELLED" {
                    Write-Warning "Deployment was cancelled"
                    return $false
                }
            }
        }
        catch {
            Write-Warning "Error checking deployment status: $($_.Exception.Message)"
        }

        if ($waitTime -ge $maxWaitTime) {
            Write-Warning "Deployment timeout reached ($maxWaitTime seconds)"
            return $false
        }

    } while ($status -in @("PENDING", "PROVISIONING", "RUNNING"))

    return $false
}

function Test-Deployment {
    param([string]$DeploymentUrl)

    Write-Status "Running deployment tests..." "Blue"

    # Test 1: Basic connectivity
    try {
        $response = Invoke-WebRequest -Uri $DeploymentUrl -Method HEAD -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Status "✓ Basic connectivity test passed"
        } else {
            Write-Warning "Basic connectivity test failed with status: $($response.StatusCode)"
        }
    }
    catch {
        Write-Error "Basic connectivity test failed: $($_.Exception.Message)"
        return $false
    }

    # Test 2: Security headers
    try {
        $response = Invoke-WebRequest -Uri $DeploymentUrl -Method HEAD -TimeoutSec 30
        $headers = $response.Headers

        $securityHeaders = @(
            "Strict-Transport-Security",
            "X-Frame-Options",
            "X-Content-Type-Options"
        )

        foreach ($header in $securityHeaders) {
            if ($headers.ContainsKey($header)) {
                Write-Status "✓ Security header '$header' found"
            } else {
                Write-Warning "Security header '$header' missing"
            }
        }
    }
    catch {
        Write-Warning "Security headers test failed: $($_.Exception.Message)"
    }

    # Test 3: Static assets
    $assetUrls = @(
        "$DeploymentUrl/assets/index.css",
        "$DeploymentUrl/assets/index.js"
    )

    foreach ($assetUrl in $assetUrls) {
        try {
            $response = Invoke-WebRequest -Uri $assetUrl -Method HEAD -TimeoutSec 15
            if ($response.StatusCode -eq 200) {
                Write-Status "✓ Asset accessible: $(Split-Path $assetUrl -Leaf)"
            } else {
                Write-Warning "Asset test failed for: $(Split-Path $assetUrl -Leaf)"
            }
        }
        catch {
            Write-Warning "Asset not accessible: $(Split-Path $assetUrl -Leaf)"
        }
    }

    # Test 4: SPA routing (404 should redirect to index.html)
    try {
        $response = Invoke-WebRequest -Uri "$DeploymentUrl/non-existent-route" -TimeoutSec 15
        if ($response.StatusCode -eq 200 -and $response.Content -match "FitWithPari|index\.html") {
            Write-Status "✓ SPA routing test passed"
        } else {
            Write-Warning "SPA routing test may have failed"
        }
    }
    catch {
        Write-Warning "SPA routing test failed: $($_.Exception.Message)"
    }

    Write-Status "Deployment tests completed"
    return $true
}

function Get-DeploymentInfo {
    Write-Status "Getting deployment information..." "Blue"

    try {
        # Get app info
        $appInfo = aws amplify get-app --app-id $AppId --region $Region --output json | ConvertFrom-Json

        # Get branch info
        $branchInfo = aws amplify get-branch --app-id $AppId --branch-name $BranchName --region $Region --output json | ConvertFrom-Json

        Write-Host "`n=== Deployment Information ===" -ForegroundColor $Colors["Blue"]
        Write-Host "App Name: $($appInfo.app.name)" -ForegroundColor $Colors["Green"]
        Write-Host "App ID: $AppId" -ForegroundColor $Colors["Green"]
        Write-Host "Branch: $BranchName" -ForegroundColor $Colors["Green"]
        Write-Host "Region: $Region" -ForegroundColor $Colors["Green"]
        Write-Host "Default Domain: https://$BranchName.$($appInfo.app.defaultDomain)" -ForegroundColor $Colors["Green"]

        if ($appInfo.app.customDomains) {
            Write-Host "Custom Domains:" -ForegroundColor $Colors["Green"]
            foreach ($domain in $appInfo.app.customDomains) {
                Write-Host "  - https://$($domain.domainName)" -ForegroundColor $Colors["Green"]
            }
        }

        Write-Host "Last Deploy Time: $($branchInfo.branch.updateTime)" -ForegroundColor $Colors["Green"]
        Write-Host "`n================================`n" -ForegroundColor $Colors["Blue"]
    }
    catch {
        Write-Warning "Could not retrieve deployment information: $($_.Exception.Message)"
    }
}

# Main execution
function Main {
    Write-Host "=== FitWithPari AWS Amplify Deployment ===" -ForegroundColor $Colors["Blue"]

    # Validate parameters
    if (-not $AppId) {
        Write-Error "App ID is required"
        exit 1
    }

    # Set AWS region
    $env:AWS_DEFAULT_REGION = $Region

    # Check AWS CLI
    Test-AwsCli

    # Get current deployment info
    Get-DeploymentInfo

    # Start deployment
    $deploymentInfo = Start-AmplifyDeployment
    $jobId = $deploymentInfo.JobId
    $deploymentUrl = $deploymentInfo.DeploymentUrl

    # Wait for completion if requested
    if ($WaitForCompletion) {
        $deploymentSuccess = Wait-ForDeployment -JobId $jobId

        if (-not $deploymentSuccess) {
            Write-Error "Deployment failed or timed out"
            exit 1
        }

        # Run tests if requested
        if ($RunTests) {
            Test-Deployment -DeploymentUrl $deploymentUrl
        }
    } else {
        Write-Status "Deployment started. Use --WaitForCompletion to wait for completion."
        Write-Status "Monitor deployment at: https://$Region.console.aws.amazon.com/amplify/apps/$AppId"
    }

    Write-Status "Deployment process completed successfully!" "Green"
}

# Execute main function
Main