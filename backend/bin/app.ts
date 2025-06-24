#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DivingAnalyticsBackendStack } from "../lib/diving-analytics-backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const backendStack = new DivingAnalyticsBackendStack(
  app,
  "DivingAnalyticsBackendStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);

const frontendStack = new FrontendStack(app, "DivingAnalyticsFrontendStack", {
  backendStack: backendStack,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
