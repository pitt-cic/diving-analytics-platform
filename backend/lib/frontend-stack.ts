import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import {DivingAnalyticsBackendStack} from "./diving-analytics-backend-stack";

export interface FrontendStackProps extends cdk.StackProps {
    backendStack: DivingAnalyticsBackendStack;
}

export class FrontendStack extends cdk.Stack {
    public readonly api: apigateway.RestApi;
    public readonly adminGroup: cognito.CfnUserPoolGroup;
    public readonly adminRole: iam.Role;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, "DivingAnalyticsUserPool", {
            userPoolName: "diving-analytics-users",
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
                username: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
            },
            customAttributes: {
                role: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 50,
                    mutable: true,
                }),
                permissions: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 500,
                    mutable: true,
                }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            autoVerify: {
                email: true,
            },
            userInvitation: {
                emailSubject: "Welcome to Diving Analytics Platform",
                emailBody: "Hello {username}, you have been invited to join the Diving Analytics Platform. Your temporary password is {####}",
            },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Create User Pool Client for the web app
        const userPoolClient = new cognito.UserPoolClient(this, "DivingAnalyticsUserPoolClient", {
            userPool: userPool,
            userPoolClientName: "diving-analytics-web-client",
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            generateSecret: false,
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    "http://localhost:3000",
                ],
                logoutUrls: [
                    "http://localhost:3000",
                ],
            },
            // Token validity
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
        });

        const identityPool = new cognito.CfnIdentityPool(this, "DivingAnalyticsIdentityPool", {
            identityPoolName: "diving-analytics-identity-pool",
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                },
            ],
        });

        const adminGroup = new cognito.CfnUserPoolGroup(this, "DivingAnalyticsAdminGroup", {
            userPoolId: userPool.userPoolId,
            groupName: "DivingAnalyticsAdminGroup",
            description: "Admin group with permissions to upload files to S3 and access API Gateway resources",
            precedence: 1,
        });

        this.adminGroup = adminGroup;

        const adminRole = new iam.Role(this, "DivingAnalyticsAdminRole", {
            roleName: "DivingAnalyticsAdminRole",
            assumedBy: new iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                {
                    StringEquals: {
                        "cognito-identity.amazonaws.com:aud": identityPool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated",
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
            description: "IAM role for Diving Analytics Admin Group users",
        });

        this.adminRole = adminRole;

        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
            cognitoUserPools: [userPool],
            authorizerName: "DivingAnalyticsCognitoAuthorizer",
        });

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

        adminRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            resources: [
                props.backendStack.inputBucket.bucketArn,
                `${props.backendStack.inputBucket.bucketArn}/*`
            ],
        }));

        adminRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "execute-api:Invoke"
            ],
            resources: [
                `${this.api.arnForExecuteApi()}/*`
            ],
        }));

        const authenticatedRole = new iam.Role(this, "DivingAnalyticsAuthenticatedRole", {
            roleName: "DivingAnalyticsAuthenticatedRole",
            assumedBy: new iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                {
                    StringEquals: {
                        "cognito-identity.amazonaws.com:aud": identityPool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated",
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
            description: "IAM role for authenticated Diving Analytics users",
        });

        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            resources: [
                props.backendStack.inputBucket.bucketArn,
                `${props.backendStack.inputBucket.bucketArn}/*`
            ],
        }));

        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "execute-api:Invoke"
            ],
            resources: [
                `${this.api.arnForExecuteApi()}/*`
            ],
        }));

        new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
            },
        });

        const apiResource = this.api.root.addResource("api");
        const diversResource = apiResource.addResource("divers");

        diversResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getAllDiversFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const diverResource = diversResource.addResource("{diverId}");
        diverResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getDiverProfileFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const trainingResource = diverResource.addResource("training");
        trainingResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getDiverTrainingFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        const sessionResource = trainingResource.addResource("{sessionDate}");
        const photoResource = sessionResource.addResource("photo");
        photoResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getTrainingPhotoFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
        const trainingDataResource = apiResource.addResource("training-data");
        trainingDataResource.addMethod("GET", new apigateway.LambdaIntegration(props.backendStack.getTrainingDataByStatusFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            requestParameters: {
                'method.request.querystring.status': true
            }
        });

        // Add a PUT endpoint for updating training data
        trainingDataResource.addMethod("PUT", new apigateway.LambdaIntegration(props.backendStack.updateTrainingDataFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
        // Add DELETE endpoint for deleting training data by ID
        const trainingDataIdResource = trainingDataResource.addResource("{id}");
        trainingDataIdResource.addMethod("DELETE", new apigateway.LambdaIntegration(props.backendStack.deleteTrainingDataFunction), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
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
                {
                    name: "REACT_APP_USER_POOL_ID",
                    value: userPool.userPoolId,
                },
                {
                    name: "REACT_APP_USER_POOL_CLIENT_ID",
                    value: userPoolClient.userPoolClientId,
                },
                {
                    name: "REACT_APP_IDENTITY_POOL_ID",
                    value: identityPool.ref,
                },
                {
                    name: "REACT_APP_AWS_REGION",
                    value: this.region,
                },
                {
                    name: "REACT_APP_INPUT_BUCKET_NAME",
                    value: props.backendStack.inputBucket.bucketName,
                },],
        });

        // Create a main branch
        const mainBranch = new amplify.CfnBranch(this, "MainBranch", {
            appId: amplifyApp.attrAppId,
            branchName: "main",
            enableAutoBuild: false,
            stage: "PRODUCTION",
        });

        new cdk.CfnOutput(this, "ApiGatewayUrl", {
            value: this.api.url,
            description: "URL of the API Gateway",
        });

        new cdk.CfnOutput(this, "AmplifyAppURL", {
            value: `https://${mainBranch.attrBranchName}.${amplifyApp.attrAppId}.amplifyapp.com`,
            description: "URL of the Amplify App",
        });

        // Output Cognito User Pool information
        new cdk.CfnOutput(this, "UserPoolId", {
            value: userPool.userPoolId,
            description: "Cognito User Pool ID",
        });

        new cdk.CfnOutput(this, "UserPoolClientId", {
            value: userPoolClient.userPoolClientId,
            description: "Cognito User Pool Client ID",
        });

        new cdk.CfnOutput(this, "IdentityPoolId", {
            value: identityPool.ref,
            description: "Cognito Identity Pool ID",
        });

        new cdk.CfnOutput(this, "UserPoolDomain", {
            value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
            description: "Cognito User Pool Domain",
        });

        // Output Admin Group information
        new cdk.CfnOutput(this, "AdminGroupName", {
            value: adminGroup.groupName!,
            description: "Name of the Admin User Group",
        });

        new cdk.CfnOutput(this, "AdminRoleArn", {
            value: adminRole.roleArn,
            description: "ARN of the Admin IAM Role",
        });

        new cdk.CfnOutput(this, "InputBucketName", {
            value: props.backendStack.inputBucket.bucketName,
            description: "Name of the S3 Input Bucket (for admin uploads)",
        });
    }
}
