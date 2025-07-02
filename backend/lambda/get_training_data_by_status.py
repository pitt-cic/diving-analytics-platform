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
        if 'body' not in event:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Request body is required'})
            }

        if isinstance(event['body'], str):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': APPLICATION_JSON,
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid JSON in request body'})
                }
        else:
            body = event['body']

        status = body.get('extraction_status')

        if not status:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'extraction_status parameter is required in request body'})
            }

        # Get table name from environment variable
        table_name = os.environ['TRAINING_DATA_TABLE_NAME']
        table = dynamodb.Table(table_name)

        # Query using GSI on status
        response = table.query(
            IndexName='extraction-status-index',
            KeyConditionExpression='#extraction_status = :extraction_status',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':extraction_status': status
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
                    ':extraction_status': status
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])

        # Format response
        result = {
            'data': items,
            'count': len(items),
            'extraction_status': status
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
