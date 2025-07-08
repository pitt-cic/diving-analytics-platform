import json
import os
from decimal import Decimal
from typing import Dict, Any

import boto3

dynamodb = boto3.resource('dynamodb')

APPLICATION_JSON = 'application/json'


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        # Extract status from query parameters
        query_params = event.get('queryStringParameters')

        if not query_params or 'status' not in query_params:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'status query parameter is required'})
            }

        extraction_status = query_params['status']

        if not extraction_status:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'status parameter cannot be empty'})
            }

        # Get table name from environment variable
        table_name = os.environ['TRAINING_DATA_TABLE_NAME']
        table = dynamodb.Table(table_name)

        # Query using GSI on status
        response = table.query(
            IndexName='extraction-status-index',
            KeyConditionExpression='#extraction_status = :extraction_status',
            ExpressionAttributeNames={
                '#extraction_status': 'extraction_status'
            },
            ExpressionAttributeValues={
                ':extraction_status': extraction_status
            }
        )

        items = response['Items']

        while 'LastEvaluatedKey' in response:
            response = table.query(
                IndexName='extraction-status-index',
                KeyConditionExpression='#extraction_status = :extraction_status',
                ExpressionAttributeNames={
                    '#extraction_status': 'extraction_status'
                },
                ExpressionAttributeValues={
                    ':extraction_status': extraction_status
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])

        # Format response
        result = {
            'data': items,
            'count': len(items),
            'extraction_status': extraction_status
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(result, default=decimal_default)
        }

    except Exception as e:
        print(f"Error querying training data by status: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
