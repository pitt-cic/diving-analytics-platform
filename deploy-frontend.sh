#!/bin/bash

# Deployment script for the Diving Analytics Platform frontend
# This script automatically deploys the frontend to AWS Amplify using CloudFormation outputs

# Exit on error
set -e

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI could not be found. Please install it first."
    exit 1
fi

echo "Retrieving CloudFormation stack information..."

# Get the Amplify App ID from CloudFormation outputs
STACK_NAME="DivingAnalyticsFrontendStack"
CF_OUTPUT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs" --output json 2>/dev/null || echo '[]')

# Extract Amplify App ID from the URL in outputs
APP_URL=$(echo $CF_OUTPUT | grep -o '"OutputValue": "[^"]*amplifyapp.com"' | cut -d'"' -f4)
if [ -z "$APP_URL" ]; then
    echo "Error: Could not find Amplify App URL in CloudFormation outputs"
    exit 1
fi

# Parse the App ID from the URL (format: https://main.d2nbu9v0j53q8o.amplifyapp.com)
APP_ID=$(echo $APP_URL | cut -d'.' -f2)
BRANCH_NAME=$(echo $APP_URL | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$APP_ID" ]; then
    echo "Error: Could not extract Amplify App ID from URL: $APP_URL"
    exit 1
fi

echo "Found Amplify App ID: $APP_ID"
echo "Using branch name: $BRANCH_NAME"

# Check if build directory exists
BUILD_DIR="./frontend/build"
if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build directory not found at $BUILD_DIR"
    echo "Building frontend..."
    
    # Navigate to frontend directory and build
    cd "$(dirname "$0")/frontend"
    npm run build
    cd -
    
    if [ ! -d "$BUILD_DIR" ]; then
        echo "Build failed or directory still not found."
        exit 1
    fi
fi

echo "Deploying to Amplify App: $APP_ID, Branch: $BRANCH_NAME"

# Create a temporary zip file from the build directory
echo "Creating deployment package..."
TMP_ZIP=$(mktemp -u).zip
cd "$BUILD_DIR" && zip -r "$TMP_ZIP" . && cd - > /dev/null

echo "Starting deployment process..."

# Cancel any pending deployments
echo "Checking for pending deployments..."
JOBS=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --query "jobSummaries[?status=='PENDING'].jobId" --output text)

if [ ! -z "$JOBS" ]; then
    echo "Cancelling pending deployments: $JOBS"
    for JOB_ID in $JOBS; do
        aws amplify stop-job --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$JOB_ID"
    done
fi

# Create a new deployment
echo "Creating deployment..."
DEPLOYMENT_RESULT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH_NAME")

# Extract job ID and upload URL
JOB_ID=$(echo "$DEPLOYMENT_RESULT" | grep -o '"jobId": "[^"]*"' | cut -d'"' -f4)
UPLOAD_URL=$(echo "$DEPLOYMENT_RESULT" | grep -o '"zipUploadUrl": "[^"]*"' | cut -d'"' -f4)

echo "Created deployment job ID: $JOB_ID"

# Upload the zip file to the provided URL
echo "Uploading build files..."
if curl -s -X PUT --upload-file "$TMP_ZIP" "$UPLOAD_URL"; then
    echo "Upload successful!"
else
    echo "Failed to upload build files."
    exit 1
fi

# Clean up the temporary zip file
rm "$TMP_ZIP"
echo "Removed temporary zip file."

# Start the deployment
echo "Starting deployment..."
START_RESULT=$(aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$JOB_ID")
DEPLOY_STATUS=$(echo "$START_RESULT" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)

echo "Deployment started with status: $DEPLOY_STATUS"
echo "Your app will be available at: $APP_URL"

# Poll for completion status
echo "Waiting for deployment to complete..."
while true; do
    CURRENT_STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$JOB_ID" --query "job.summary.status" --output text)
    
    if [ "$CURRENT_STATUS" == "SUCCEED" ]; then
        echo "Deployment succeeded!"
        break
    elif [ "$CURRENT_STATUS" == "FAILED" ]; then
        echo "Deployment failed."
        exit 1
    elif [ "$CURRENT_STATUS" == "CANCELLED" ]; then
        echo "Deployment was cancelled."
        exit 1
    fi
    
    echo "Deployment status: $CURRENT_STATUS. Checking again in 5 seconds..."
    sleep 5
done

echo "Your application is now live at: $APP_URL"