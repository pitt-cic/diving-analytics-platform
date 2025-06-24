import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      ],
    });

    // Create a main branch
    const mainBranch = new amplify.CfnBranch(this, "MainBranch", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      enableAutoBuild: false,
      stage: "PRODUCTION",
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      tableName: "Users",
    });

    // Output the Amplify app URL
    new cdk.CfnOutput(this, "AmplifyAppURL", {
      value: `https://${mainBranch.attrBranchName}.${amplifyApp.attrAppId}.amplifyapp.com`,
      description: "URL of the Amplify App",
    });
  }
}
