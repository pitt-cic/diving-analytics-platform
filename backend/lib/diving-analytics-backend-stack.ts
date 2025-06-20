import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {aws_bedrock as bedrock} from 'aws-cdk-lib';

export class DivingAnalyticsBackendStack extends cdk.Stack {
    public readonly inputBucket: s3.Bucket;
    public readonly outputBucket: s3.Bucket;
    public readonly dataAutomationProject: bedrock.CfnDataAutomationProject;
    public readonly invokeBdaFunction: lambda.Function;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this.inputBucket = new s3.Bucket(this, 'diving-bda-inputs', {
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });

        this.outputBucket = new s3.Bucket(this, 'diving-bda-outputs', {
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });

        this.dataAutomationProject = new bedrock.CfnDataAutomationProject(this, 'DivingAnalyticsDataAutomationProject', {
            projectName: 'DivingAnalyticsDataAutomationProject',
            overrideConfiguration: {
                document: {
                    modalityProcessing: {
                        state: 'ENABLED',
                    },
                    splitter: {
                        state: 'DISABLED',
                    },
                },
            },
            projectDescription: 'Bedrock Data Automation Project for extracting text from a picture',
            standardOutputConfiguration: {
                document: {
                    extraction: {
                        boundingBox: {
                            state: 'DISABLED',
                        },
                        granularity: {
                            types: ['PAGE', 'ELEMENT'],
                        },
                    },
                    generativeField: {
                        state: 'DISABLED',
                    },
                    outputFormat: {
                        additionalFileFormat: {
                            state: 'DISABLED',
                        },
                        textFormat: {
                            types: ['MARKDOWN', 'CSV'],
                        },
                    },
                },
                image: {
                    extraction: {
                        boundingBox: {
                            state: 'ENABLED',
                        },
                        category: {
                            state: 'ENABLED',
                            types: ['TEXT_DETECTION'],
                        },
                    },
                    generativeField: {
                        state: 'ENABLED',
                        types: ['IMAGE_SUMMARY'],
                    },
                },
            },
            tags: [],
        });

        this.invokeBdaFunction = new lambda.Function(this, 'InvokeBdaFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'invoke_bda.handler',
            code: lambda.Code.fromAsset('lambda'),
            environment: {
                DATA_AUTOMATION_PROJECT_ARN: this.dataAutomationProject.attrProjectArn,
                INPUT_BUCKET_NAME: this.inputBucket.bucketName,
                OUTPUT_BUCKET_NAME: this.outputBucket.bucketName
            }
        });
    }
}