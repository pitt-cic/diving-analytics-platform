import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import {Construct} from "constructs";
import {DivingAnalyticsBackendStack} from "./diving-analytics-backend-stack";

export interface FrontendStackProps extends cdk.StackProps {
    backendStack: DivingAnalyticsBackendStack;
}

export class FrontendStack extends cdk.Stack {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        // Create API Gateway
        this.api = new apigateway.RestApi(this, "DivingAnalyticsApi", {
            restApiName: "Diving Analytics API",
            description: "API for diving analytics platform",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token"
                ]
            }
        });

        // Create API resources and methods using backend Lambda functions
        const apiResource = this.api.root.addResource("api");
        const diversResource = apiResource.addResource("divers");

        // GET /api/divers - Get all divers
        diversResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getAllDiversFunction));

        // GET /api/divers/{diverId} - Get diver profile
        const diverResource = diversResource.addResource("{diverId}");
        diverResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getDiverProfileFunction));

        // GET /api/divers/{diverId}/training - Get diver training data
        const trainingResource = diverResource.addResource("training");
        trainingResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getDiverTrainingFunction));

        // GET /api/divers/{diverId}/training/{sessionDate}/photo - Get training photo
        const sessionResource = trainingResource.addResource("{sessionDate}");
        const photoResource = sessionResource.addResource("photo");
        photoResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getTrainingPhotoFunction));

        // Create an Amplify app for hosting the frontend
        const amplifyApp = new amplify.CfnApp(this, "DivingAnalyticsApp", {
            name: "diving-analytics-frontend",
            platform: "WEB",
            enableBranchAutoDeletion: true,
            buildSpec: `
        version: 1
        frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: build
            files:
              - '**/*'
          cache:
            paths:
              - 'node_modules/**/*'
      `,
            customRules: [
                {
                    source:
                        "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>",
                    target: "/index.html",
                    status: "200",
                },
            ],
            environmentVariables: [
                {
                    name: "NODE_OPTIONS",
                    value: "--max-old-space-size=4096",
                },
                {
                    name: "REACT_APP_API_URL",
                    value: this.api.url,
                },
            ],
        });

        // Create a main branch
        const mainBranch = new amplify.CfnBranch(this, "MainBranch", {
            appId: amplifyApp.attrAppId,
            branchName: "main",
            enableAutoBuild: false,
            stage: "PRODUCTION",
        });

        // Output the API Gateway URL
        new cdk.CfnOutput(this, "ApiGatewayUrl", {
            value: this.api.url,
            description: "URL of the API Gateway",
        });

        // Output the Amplify app URL
        new cdk.CfnOutput(this, "AmplifyAppURL", {
            value: `https://${mainBranch.attrBranchName}.${amplifyApp.attrAppId}.amplifyapp.com`,
            description: "URL of the Amplify App",
        });
    }
}
