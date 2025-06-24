#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DivingAnalyticsBackendStack } from "../lib/diving-analytics-backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();
new DivingAnalyticsBackendStack(app, "DivingAnalyticsBackendStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
new FrontendStack(app, "DivingAnalyticsFrontendStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
