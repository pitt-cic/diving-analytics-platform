#!/bin/bash

# Diving Analytics Platform - Team-Specific Deployment Script
# This script prompts for a team number and deploys the CDK stacks with that configuration

set -e  # Exit on any error

# Variable to store backend directory path
BACKEND_DIR=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate team number
validate_team_number() {
    local team_num=$1
    
    # Check if it's a number
    if ! [[ "$team_num" =~ ^[0-9]+$ ]]; then
        return 1
    fi
    
    # Check if it's not empty and has reasonable length (1-6 digits)
    if [[ ${#team_num} -lt 1 || ${#team_num} -gt 6 ]]; then
        return 1
    fi
    
    return 0
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if we're in the right directory (either backend or parent directory)
    if [[ -f "package.json" ]] && [[ -d "lib" ]] && [[ -d "lambda" ]]; then
        # We're in the backend directory
        BACKEND_DIR="."
        print_info "Running from backend directory"
    elif [[ -d "backend" ]] && [[ -f "backend/package.json" ]] && [[ -d "backend/lib" ]] && [[ -d "backend/lambda" ]]; then
        # We're in the parent directory
        BACKEND_DIR="backend"
        print_info "Running from parent directory, backend found at: $BACKEND_DIR"
    else
        print_error "This script must be run from either:"
        print_error "  1. The backend directory of the diving analytics platform, or"
        print_error "  2. The parent directory containing the backend folder"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js and try again."
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI and configure it."
        exit 1
    fi
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Please install it with: npm install -g aws-cdk"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "All prerequisites are met!"
}

# Function to get team number from user
get_team_number() {
    echo
    print_info "=== Diving Analytics Platform - Team Configuration ==="
    echo
    print_info "This script will deploy the Diving Analytics Platform for a specific team."
    print_info "You need to provide the team number from the MeetControl diving system."
    echo
    print_info "To find your team number:"
    print_info "1. Visit: https://secure.meetcontrol.com/divemeets/system/teamlist.php"
    print_info "2. Search your team and navigate to team's profile page"
    print_info "3. The team number appears in the URL: profilet.php?number=XXXX"
    echo
    
    while true; do
        echo -n "Enter your team number (required): "
        read -r team_number
        
        # Check if empty
        if [[ -z "$team_number" ]]; then
            print_error "Team number is required. Script cannot continue without a valid team number."
            exit 1
        fi
        
        # Validate the team number
        if validate_team_number "$team_number"; then
            print_success "Team number $team_number is valid!"
            break
        else
            print_error "Invalid team number. Please enter a numeric value (1-6 digits)."
            echo
        fi
    done
    
    echo
    print_info "Selected team number: $team_number"
    echo
}

# Function to confirm deployment
confirm_deployment() {
    local team_num=$1
    
    echo -e "${YELLOW}=== DEPLOYMENT CONFIRMATION ===${NC}"
    echo "Team Number: $team_num"
    echo "Stacks to deploy: DivingAnalyticsBackendStack, DivingAnalyticsFrontendStack"
    echo "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
    echo "AWS Region: $(aws configure get region)"
    echo
    
    while true; do
        echo -n "Do you want to proceed with the deployment? (y/N): "
        read -r confirm
        
        case $confirm in
            [Yy]* ) 
                print_info "Proceeding with deployment..."
                return 0
                ;;
            [Nn]* | "" ) 
                print_info "Deployment cancelled by user."
                exit 0
                ;;
            * ) 
                print_warning "Please answer yes (y) or no (n)."
                ;;
        esac
    done
}

# Function to install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    cd "$BACKEND_DIR"
    
    if [[ ! -d "node_modules" ]]; then
        print_info "Installing npm packages..."
        npm install
    else
        print_info "Dependencies already installed."
    fi
    
    cd - > /dev/null
}

# Function to build the project
build_project() {
    print_info "Building the project..."
    
    cd "$BACKEND_DIR"
    npm run build
    cd - > /dev/null
    
    print_success "Project built successfully!"
}

# Function to check if CDK is bootstrapped
check_bootstrap() {
    print_info "Checking CDK bootstrap status..."

    local region=$(aws configure get region)
    local account=$(aws sts get-caller-identity --query Account --output text)
    
    if aws cloudformation describe-stacks --stack-name CDKToolkit --region "$region" &> /dev/null; then
        print_success "CDK is already bootstrapped in region $region"
        return 0
    else
        print_warning "CDK is not bootstrapped in region $region"
        return 1
    fi
}

# Function to bootstrap CDK
bootstrap_cdk() {
    print_info "Bootstrapping CDK..."

    local region=$(aws configure get region)
    local account=$(aws sts get-caller-identity --query Account --output text)
    
    print_info "Bootstrapping CDK for account $account in region $region"
    print_info "Command: npx cdk bootstrap"
    print_info "Current directory: $(pwd)"
    echo
    
    if npx cdk bootstrap; then
        print_success "CDK bootstrap completed successfully!"
    else
        print_error "CDK bootstrap failed! Please check the error messages above."
        exit 1
    fi
}

# Function to deploy CDK stacks
deploy_stacks() {
    local team_num=$1
    
    print_info "Starting CDK deployment with team number: $team_num"
    echo

    cd "$BACKEND_DIR"

    if ! check_bootstrap; then
        echo
        print_info "CDK bootstrap is required for first-time deployment."
        
        while true; do
            echo -n "Do you want to bootstrap CDK now? (Y/n): "
            read -r bootstrap_confirm
            
            case $bootstrap_confirm in
                [Nn]* ) 
                    print_error "CDK bootstrap is required for deployment. Exiting."
                    cd - > /dev/null
                    exit 1
                    ;;
                [Yy]* | "" ) 
                    bootstrap_cdk
                    break
                    ;;
                * ) 
                    print_warning "Please answer yes (y) or no (n)."
                    ;;
            esac
        done
        echo
    fi
    
    # Deploy all stacks with the team number context
    print_info "Deploying all CDK stacks..."
    print_info "Command: npx cdk deploy --all --context teamNumber=$team_num"
    print_info "Current directory: $(pwd)"
    echo
    
    if npx cdk deploy --all --context teamNumber="$team_num" --require-approval never; then
        echo
        print_success "=== DEPLOYMENT COMPLETED SUCCESSFULLY! ==="
        print_success "Team number $team_num has been configured for the Diving Analytics Platform."
        echo
        print_info "Next steps:"
        print_info "1. Check the AWS CloudFormation console for deployment details"
        print_info "2. Note the API Gateway URL from the stack outputs"
        print_info "3. Configure the frontend environment variables if needed"
        print_info "4. The Lambda function will now import data for team $team_num"
        echo
        cd - > /dev/null
    else
        print_error "Deployment failed! Please check the error messages above."
        cd - > /dev/null
        exit 1
    fi
}

# Function to show deployment summary
show_summary() {
    local team_num=$1
    
    echo
    print_info "=== DEPLOYMENT SUMMARY ==="
    print_info "Team Number: $team_num"
    print_info "Deployment Status: SUCCESS"
    print_info "Timestamp: $(date)"
    echo
    print_info "The system is now configured to import diving data for team $team_num"
    print_info "Check CloudWatch logs for the import process confirmation."
    echo
}

# Main execution
main() {
    echo
    print_info "=== Diving Analytics Platform - Team Deployment Script ==="
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Get team number from user
    get_team_number
    
    # Confirm deployment
    confirm_deployment "$team_number"
    
    # Install dependencies
    install_dependencies
    
    # Build project
    build_project
    
    # Deploy stacks
    deploy_stacks "$team_number"
    
    # Show summary
    show_summary "$team_number"
    
    print_success "Script completed successfully!"
}

# Run main function
main "$@"
