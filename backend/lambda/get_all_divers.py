import json
import os
from decimal import Decimal
from typing import Dict, Any

import boto3

dynamodb = boto3.resource('dynamodb')


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        table_name = os.environ['DIVERS_TABLE_NAME']
        table = dynamodb.Table(table_name)

        # Scan the table to get all divers
        response = table.scan()
        items = response['Items']

        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])

        divers = []
        for item in items:
            diver = {
                "id": str(item.get('diver_id', '')),
                "name": item.get('name', ''),
                "gender": item.get('gender', ''),
                "age": item.get('age'),
                "city_state": item.get('city_state', ''),
                "country": item.get('country', ''),
                "hs_grad_year": item.get('hs_grad_year')
            }
            divers.append(diver)

        divers.sort(key=lambda x: x.get('name', ''))

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(divers, default=decimal_default)
        }

    except Exception as e:
        print(f"Error fetching divers from DynamoDB: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
