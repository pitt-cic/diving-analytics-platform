import json
import os
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

APPLICATION_JSON = 'application/json'
ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        path_params = event.get('pathParameters')

        if not path_params or 'id' not in path_params:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': ALLOWED_METHODS
                },
                'body': json.dumps({'error': 'Training data ID is required in path'})
            }

        training_data_id = path_params['id']

        if not training_data_id or not training_data_id.strip():
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': ALLOWED_METHODS
                },
                'body': json.dumps({'error': 'Training data ID cannot be empty'})
            }

        table_name = os.environ['TRAINING_DATA_TABLE_NAME']
        table = dynamodb.Table(table_name)

        try:
            get_response = table.get_item(
                Key={'id': training_data_id}
            )

            if 'Item' not in get_response:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': APPLICATION_JSON,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': ALLOWED_METHODS
                    },
                    'body': json.dumps({
                        'error': f'Training data with ID {training_data_id} not found'
                    })
                }

            deleted_item = get_response['Item']

        except ClientError as e:
            print(f"Error checking item existence: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': ALLOWED_METHODS
                },
                'body': json.dumps({'error': 'Database operation failed'})
            }

        try:
            table.delete_item(
                Key={'id': training_data_id}
            )

            print(f"Successfully deleted training data with ID: {training_data_id}")

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': ALLOWED_METHODS
                },
                'body': json.dumps({
                    'message': 'Training data deleted successfully',
                    'deleted_id': training_data_id
                })
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"DynamoDB ClientError during deletion: {str(e)}")

            if error_code == 'ResourceNotFoundException':
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': APPLICATION_JSON,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': ALLOWED_METHODS
                    },
                    'body': json.dumps({
                        'error': f'Training data with ID {training_data_id} not found'
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': APPLICATION_JSON,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': ALLOWED_METHODS
                    },
                    'body': json.dumps({'error': 'Database operation failed'})
                }

    except Exception as e:
        print(f"Error deleting training data: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': ALLOWED_METHODS
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
