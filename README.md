# Diving Analytics Platform

This repository contains both the frontend and backend code for the Diving Analytics Platform.

## Project Structure

- `backend/` - Contains the AWS CDK infrastructure code
- `frontend/` - Contains the React web application

## Backend Deployment Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [AWS CLI](https://aws.amazon.com/cli/) installed and configured
- [AWS CDK](https://aws.amazon.com/cdk/) installed

### Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Bootstrap your AWS environment (first-time only):

```bash
npx cdk bootstrap
```

3. Deploy the stacks:

```bash
# Deploy both stacks
npx cdk deploy --all

# Or deploy individual stacks
npx cdk deploy DivingAnalyticsBackendStack
npx cdk deploy DivingAnalyticsFrontendStack
```

### Useful CDK Commands

- `npm run build` - Compile TypeScript code
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run unit tests
- `npx cdk deploy` - Deploy stack to your AWS account/region
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Emit the synthesized CloudFormation template

## Frontend

### Frontend Hosting with AWS Amplify

The React application is hosted using AWS Amplify. The FrontendStack creates:

1. An Amplify application for hosting the frontend
2. A main branch configuration for deployment

### Prerequisites for Frontend Deployment

Before deploying your frontend application, you need to:

1. Deploy the frontend infrastructure stack:

```bash
cd backend
npm install
npx cdk deploy FrontendStack
```

2. Build your React application:

```bash
cd frontend
npm install
npm run build
```

This will generate the build files in the `frontend/build` directory, which will be deployed using the deployment script.

### Deployment Process

The frontend deployment process has two parts:

1. Infrastructure deployment (one-time setup):

   - An Amplify application is created with AWS CDK
   - A main branch is configured for deployment

2. Application deployment (whenever you update your code):
   - The provided deployment script uploads your built frontend to Amplify

### Accessing Your Deployed Frontend

After deployment, you can access your application using the Amplify URL provided in the CDK output. The URL format will be:

```
https://main.[app-id].amplifyapp.com
```

### Updating Your Deployed Frontend

To update your deployed application, follow these steps:

1. Make changes to your React codebase in the frontend directory
2. Rebuild the application:
   ```bash
   cd frontend
   npm run build
   ```
3. Run the deployment script from the project root:
   ```bash
   ./deploy.sh
   ```

The deployment script will:

1. Automatically detect your Amplify App ID from CloudFormation outputs
2. Create a deployment in Amplify
3. Upload your build files
4. Start the deployment
5. Monitor the deployment status until completion

You don't need to redeploy the FrontendStack unless you want to change the infrastructure configuration.
