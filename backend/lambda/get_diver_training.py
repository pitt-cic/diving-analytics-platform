import json
import os
from decimal import Decimal
from typing import Dict, Any

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')

APPLICATION_JSON = 'application/json'


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        # Extract diver ID from path parameters
        diver_id_str = event.get('pathParameters', {}).get('diverId')

        if not diver_id_str:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver ID is required'})
            }

        # Validate diver ID format
        try:
            diver_id = int(diver_id_str)
        except ValueError:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid diver ID format'})
            }

        # Get table reference
        table_name = os.environ['TRAINING_DATA_TABLE_NAME']
        table = dynamodb.Table(table_name)

        # Query training data for the specific diver with CONFIRMED status
        training_data_list = []

        try:
            # Query using GSI on diver_id
            response = table.query(
                IndexName='diver-id-index',
                KeyConditionExpression=Key('diver_id').eq(str(diver_id)),
                FilterExpression=Key('extraction_status').eq('CONFIRMED')
            )

            items = response['Items']

            # Handle pagination if there are more items
            while 'LastEvaluatedKey' in response:
                response = table.query(
                    IndexName='diver-id-index',
                    KeyConditionExpression=Key('diver_id').eq(str(diver_id)),
                    FilterExpression=Key('extraction_status').eq('CONFIRMED'),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response['Items'])

            # Extract json_output from each item
            for item in items:
                json_output = item.get('json_output')
                if json_output:
                    # If json_output is a string, parse it
                    if isinstance(json_output, str):
                        try:
                            parsed_json = json.loads(json_output)
                            training_data_list.append(parsed_json)
                        except json.JSONDecodeError:
                            print(f"Warning: Invalid JSON in json_output for item {item.get('id', 'unknown')}")
                            continue
                    else:
                        # If it's already a dict/object, use it directly
                        training_data_list.append(json_output)

        except Exception as e:
            print(f"Error querying training data: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Failed to retrieve training data'})
            }

        # Return the list of training data JSON objects
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps({
                'diver_id': diver_id,
                'training_data': training_data_list,
                'count': len(training_data_list)
            }, default=decimal_default)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
