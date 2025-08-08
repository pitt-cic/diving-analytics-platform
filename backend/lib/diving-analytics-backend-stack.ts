import * as cdk from 'aws-cdk-lib';
import {aws_bedrock as bedrock} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class DivingAnalyticsBackendStack extends cdk.Stack {
    public readonly inputBucket: s3.Bucket;
    public readonly outputBucket: s3.Bucket;
    public readonly dataAutomationProject: bedrock.CfnDataAutomationProject;
    public readonly invokeBdaFunction: lambda.Function;

    public readonly diversTable: dynamodb.Table;
    public readonly competitionsTable: dynamodb.Table;
    public readonly resultsTable: dynamodb.Table;
    public readonly divesTable: dynamodb.Table;

    public readonly getAllDiversFunction: lambda.Function;
    public readonly getDiverProfileFunction: lambda.Function;
    public readonly getDiverTrainingFunction: lambda.Function;
    public readonly getTrainingPhotoFunction: lambda.Function;
    public readonly importCompetitionDataFunction: lambda.Function;
    public readonly getTrainingDataByStatusFunction: lambda.Function;
    public readonly updateTrainingDataFunction: lambda.Function;
    public readonly deleteTrainingDataFunction: lambda.Function;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this.inputBucket = new s3.Bucket(this, 'diving-bda-inputs', {
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                    maxAge: 3000,
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


        // Table 1: Divers - Store diver profile information
        this.diversTable = new dynamodb.Table(this, 'DiversTable', {
            tableName: 'Divers',
            partitionKey: {name: 'diver_id', type: dynamodb.AttributeType.NUMBER},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Table 2: Competitions - Store competition/meet information
        this.competitionsTable = new dynamodb.Table(this, 'CompetitionsTable', {
            tableName: 'Competitions',
            partitionKey: {name: 'competition_id', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Table 3: Results - Store competition results for each diver
        this.resultsTable = new dynamodb.Table(this, 'ResultsTable', {
            tableName: 'Results',
            partitionKey: {name: 'diver_id', type: dynamodb.AttributeType.NUMBER},
            sortKey: {name: 'competition_event_key', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Add GSI: CompetitionIndex to Results table
        this.resultsTable.addGlobalSecondaryIndex({
            indexName: 'CompetitionIndex',
            partitionKey: {name: 'competition_id', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'total_score', type: dynamodb.AttributeType.NUMBER},
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Table 4: Dives - Store individual dive details
        this.divesTable = new dynamodb.Table(this, 'DivesTable', {
            tableName: 'Dives',
            partitionKey: {name: 'result_key', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'dive_round', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Table 5: LLM Results - Store LLM JSON responses
        const trainingDataTable = new dynamodb.Table(this, 'trainingDataTable', {
            tableName: 'trainingData',
            partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // Add GSI for querying by extraction_status
        trainingDataTable.addGlobalSecondaryIndex({
            indexName: 'extraction-status-index',
            partitionKey: {name: 'extraction_status', type: dynamodb.AttributeType.STRING},
        });

        // Add GSI for querying by diver_id
        trainingDataTable.addGlobalSecondaryIndex({
            indexName: 'diver-id-index',
            partitionKey: {name: 'diver_id', type: dynamodb.AttributeType.STRING},
        });

        this.invokeBdaFunction = new lambda.Function(this, 'InvokeBdaFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'invoke_bda.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.minutes(5),
            environment: {
                DATA_AUTOMATION_PROJECT_ARN: this.dataAutomationProject.attrProjectArn,
                INPUT_BUCKET_NAME: this.inputBucket.bucketName,
                OUTPUT_BUCKET_NAME: this.outputBucket.bucketName,
                AWS_ACCOUNT_ID: cdk.Stack.of(this).account,
                DIVERS_TABLE_NAME: this.diversTable.tableName,
                COMPETITIONS_TABLE_NAME: this.competitionsTable.tableName,
                RESULTS_TABLE_NAME: this.resultsTable.tableName,
                DIVES_TABLE_NAME: this.divesTable.tableName,
                TRAINING_DATA_TABLE_NAME: trainingDataTable.tableName
            }
        });

        // Grant the Lambda function permissions to read from the input bucket and read/write to the output bucket
        this.inputBucket.grantRead(this.invokeBdaFunction);
        this.outputBucket.grantReadWrite(this.invokeBdaFunction);

        // Grant DynamoDB permissions to invoke_bda Lambda function
        trainingDataTable.grantReadWriteData(this.invokeBdaFunction);
        this.diversTable.grantReadData(this.invokeBdaFunction);

        // Grant the Lambda function permissions to invoke Bedrock Data Automation
        this.invokeBdaFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeDataAutomationAsync',
                'bedrock:GetDataAutomationStatus',
                'bedrock:ListDataAutomationProjects',
                'bedrock:GetDataAutomationProject'
            ],
            resources: ['*']
        }));

        // Grant the Lambda function permissions to invoke Bedrock Runtime (for LLM requests)
        // Allow access across all US regions
        this.invokeBdaFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream'
            ],
            resources: [
                // Foundation models - all US regions
                'arn:aws:bedrock:us-*::foundation-model/*',
                // Inference profiles - all US regions
                `arn:aws:bedrock:us-*:${this.account}:inference-profile/*`
            ]
        }));

        // Create API Lambda functions
        this.getAllDiversFunction = new lambda.Function(this, 'GetAllDiversFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'get_all_divers.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            environment: {
                DIVERS_TABLE_NAME: this.diversTable.tableName
            }
        });

        this.getDiverProfileFunction = new lambda.Function(this, 'GetDiverProfileFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'get_diver_profile.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.minutes(15),
            memorySize: 1024,
            environment: {
                DIVERS_TABLE_NAME: this.diversTable.tableName,
                COMPETITIONS_TABLE_NAME: this.competitionsTable.tableName,
                RESULTS_TABLE_NAME: this.resultsTable.tableName,
                DIVES_TABLE_NAME: this.divesTable.tableName
            }
        });

        this.getDiverTrainingFunction = new lambda.Function(this, 'GetDiverTrainingFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'get_diver_training.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            environment: {
                DIVERS_TABLE_NAME: this.diversTable.tableName,
                RESULTS_TABLE_NAME: this.resultsTable.tableName,
                TRAINING_DATA_TABLE_NAME: trainingDataTable.tableName
            }
        });

        this.getTrainingPhotoFunction = new lambda.Function(this, 'GetTrainingPhotoFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'get_training_photo.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            environment: {
                OUTPUT_BUCKET_NAME: this.outputBucket.bucketName
            }
        });
        // Import Competition Data Lambda Function
        this.importCompetitionDataFunction = new lambda.Function(this, 'ImportCompetitionDataFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'import_competition_data.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.minutes(15),
            memorySize: 1024,
            environment: {
                DIVERS_TABLE_NAME: this.diversTable.tableName,
                COMPETITIONS_TABLE_NAME: this.competitionsTable.tableName,
                RESULTS_TABLE_NAME: this.resultsTable.tableName,
                DIVES_TABLE_NAME: this.divesTable.tableName,
                TEAM_NUMBER: this.node.tryGetContext('teamNumber')
            }
        });
        // EventBridge rule to schedule importCompetitionDataFunction every Sunday
        const importCompetitionDataSchedule = new events.Rule(this, 'ImportCompetitionDataSchedule', {
            description: 'Schedule to run import competition data function every Sunday',
            schedule: events.Schedule.cron({
                minute: '0',
                hour: '9',
                weekDay: 'SUN'
            })
        });

        // Add the Lambda function as a target for the EventBridge rule
        importCompetitionDataSchedule.addTarget(new targets.LambdaFunction(this.importCompetitionDataFunction));
        this.getTrainingDataByStatusFunction = new lambda.Function(this, 'GetTrainingDataByStatusFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'get_training_data_by_status.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: {
                TRAINING_DATA_TABLE_NAME: trainingDataTable.tableName
            }
        });

        this.updateTrainingDataFunction = new lambda.Function(this, 'UpdateTrainingDataFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'upsert_training_data.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: {
                TRAINING_DATA_TABLE_NAME: trainingDataTable.tableName
            }
        });
        this.deleteTrainingDataFunction = new lambda.Function(this, 'DeleteTrainingDataFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'delete_training_data.handler',
            code: lambda.Code.fromAsset('lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ]
                }
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: {
                TRAINING_DATA_TABLE_NAME: trainingDataTable.tableName
            }
        });
        this.outputBucket.grantRead(this.getTrainingPhotoFunction);

        this.diversTable.grantReadData(this.getAllDiversFunction);
        this.diversTable.grantReadData(this.getDiverProfileFunction);
        this.competitionsTable.grantReadData(this.getDiverProfileFunction);
        this.resultsTable.grantReadData(this.getDiverProfileFunction);
        this.divesTable.grantReadData(this.getDiverProfileFunction);
        this.diversTable.grantReadData(this.getDiverTrainingFunction);
        this.resultsTable.grantReadData(this.getDiverTrainingFunction);
        trainingDataTable.grantReadData(this.getDiverTrainingFunction);
        this.diversTable.grantReadWriteData(this.importCompetitionDataFunction);
        this.competitionsTable.grantReadWriteData(this.importCompetitionDataFunction);
        this.resultsTable.grantReadWriteData(this.importCompetitionDataFunction);
        this.divesTable.grantReadWriteData(this.importCompetitionDataFunction);
        trainingDataTable.grantReadData(this.getTrainingDataByStatusFunction);
        trainingDataTable.grantReadWriteData(this.updateTrainingDataFunction);
        trainingDataTable.grantReadWriteData(this.deleteTrainingDataFunction);
        this.inputBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(this.invokeBdaFunction)
        );
    }
}
