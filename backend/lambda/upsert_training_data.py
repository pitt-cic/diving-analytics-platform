import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

APPLICATION_JSON = 'application/json'


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        # Validate request body exists
        if 'body' not in event:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Request body is required'})
            }

        # Parse request body
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

        # Validate required fields (training_data_id is now optional)
        required_fields = ['name', 'diver_id', 'updated_json']
        missing_fields = [field for field in required_fields if field not in body or body[field] is None]

        if missing_fields:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                })
            }

        # Extract input data
        name = body['name']
        diver_id = body['diver_id']
        updated_json = body['updated_json']
        session_date = body.get('session_date')

        # Check if training_data_id is provided to determine create vs update
        training_data_id = body.get('training_data_id')
        is_update = training_data_id and training_data_id.strip()

        # Get table reference
        table_name = os.environ['TRAINING_DATA_TABLE_NAME']
        table = dynamodb.Table(table_name)

        current_timestamp = datetime.now(timezone.utc).isoformat()

        if is_update:
            # UPDATE existing record
            # Prepare update expression and attribute values
            update_expression_parts = []
            expression_attribute_values = {}
            expression_attribute_names = {}

            # Update name
            update_expression_parts.append('#diver_name = :diver_name')
            expression_attribute_names['#diver_name'] = 'diver_name'
            expression_attribute_values[':diver_name'] = name

            # Update diver_id
            update_expression_parts.append('diver_id = :diver_id')
            expression_attribute_values[':diver_id'] = str(diver_id)

            update_expression_parts.append('json_output = :updated_json')
            expression_attribute_values[':updated_json'] = json.dumps(updated_json)

            # Add session date if provided
            if session_date is not None:
                update_expression_parts.append('#session_date = :session_date')
                expression_attribute_names['#session_date'] = 'session_date'
                expression_attribute_values[':session_date'] = session_date

            # Add updated timestamp
            update_expression_parts.append('updated_at = :updated_at')
            expression_attribute_values[':updated_at'] = current_timestamp

            update_expression_parts.append('extraction_status = :extraction_status')
            expression_attribute_values[':extraction_status'] = 'CONFIRMED'

            # Build final update expression
            update_expression = 'SET ' + ', '.join(update_expression_parts)

            # Convert to Decimal for DynamoDB
            expression_attribute_values = json.loads(
                json.dumps(expression_attribute_values),
                parse_float=Decimal
            )

            # Perform the update
            response = table.update_item(
                Key={'id': training_data_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues='ALL_NEW'
            )

            # Return updated item
            result_item = response['Attributes']
            message = 'Training data updated successfully'

        else:
            # CREATE new record
            training_data_id = str(uuid.uuid4())

            # Prepare item for creation
            item = {
                'id': training_data_id,
                'diver_name': name,
                'diver_id': str(diver_id),
                'json_output': json.dumps(updated_json),
                'extraction_status': 'CONFIRMED',
                'created_at': current_timestamp,
                'updated_at': current_timestamp
            }

            # Add session date if provided
            if session_date is not None:
                item['session_date'] = session_date

            # Convert to Decimal for DynamoDB
            item = json.loads(json.dumps(item), parse_float=Decimal)

            # Create the new record
            table.put_item(Item=item)

            result_item = item
            message = 'Training data created successfully'

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps({
                'message': message,
                'data': result_item
            }, default=decimal_default)
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']

        if error_code == 'ResourceNotFoundException':
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Training data with ID {training_data_id if "training_data_id" in locals() else "unknown"} not found'
                })
            }
        else:
            print(f"DynamoDB ClientError: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database operation failed'})
            }

    except Exception as e:
        print(f"Error processing training data: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
