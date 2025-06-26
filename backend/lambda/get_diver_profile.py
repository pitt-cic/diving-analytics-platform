import json
import os
import re
from decimal import Decimal
from typing import Dict, Any, List

import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Get table names from environment variables
DIVERS_TABLE_NAME = os.environ.get('DIVERS_TABLE_NAME')
COMPETITIONS_TABLE_NAME = os.environ.get('COMPETITIONS_TABLE_NAME')
RESULTS_TABLE_NAME = os.environ.get('RESULTS_TABLE_NAME')
DIVES_TABLE_NAME = os.environ.get('DIVES_TABLE_NAME')


def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def get_diver_profile(diver_id: int) -> Dict[str, Any]:
    """Fetch diver profile from DynamoDB"""
    divers_table = dynamodb.Table(DIVERS_TABLE_NAME)

    # Get diver basic information
    response = divers_table.get_item(Key={'diver_id': diver_id})

    if 'Item' not in response:
        return None

    diver = response['Item']

    # Convert diver_id back to string for API response
    profile = {
        "id": str(diver['diver_id']),
        "name": diver.get('name', ''),
        "gender": diver.get('gender', ''),
        "age": int(diver.get('age', 0)) if diver.get('age') else None,
        "city_state": diver.get('city_state', ''),
        "country": diver.get('country', ''),
        "hs_grad_year": int(diver.get('hs_grad_year', 0)) if diver.get('hs_grad_year') else None
    }

    return profile


def generate_result_key(diver_id: int, competition_id: str, event_name: str, round_type: str = "") -> str:
    """Generate a unique result key for the dives table - matches import_competition_data.py"""
    import re
    clean_event = re.sub(r'[^a-zA-Z0-9\s]', '', event_name)
    clean_event = re.sub(r'\s+', '_', clean_event.strip()).upper()

    if round_type:
        clean_round = re.sub(r'[^a-zA-Z0-9\s]', '', round_type)
        clean_round = re.sub(r'\s+', '_', clean_round.strip()).upper()
        return f"{diver_id}_{competition_id}_{clean_event}_{clean_round}"

    return f"{diver_id}_{competition_id}_{clean_event}"


def get_diver_results(diver_id: int) -> List[Dict[str, Any]]:
    """Fetch diver competition results from DynamoDB"""
    results_table = dynamodb.Table(RESULTS_TABLE_NAME)
    competitions_table = dynamodb.Table(COMPETITIONS_TABLE_NAME)
    dives_table = dynamodb.Table(DIVES_TABLE_NAME)

    # Get all results for this diver
    response = results_table.query(
        KeyConditionExpression=Key('diver_id').eq(diver_id)
    )

    results = []

    for result_item in response['Items']:
        # Get competition details
        competition_id = result_item.get('competition_id')
        competition_response = competitions_table.get_item(
            Key={'competition_id': competition_id}
        )

        competition = competition_response.get('Item', {})

        # Create result key for fetching dives using the same format as import_competition_data.py
        result_key = generate_result_key(
            diver_id,
            competition_id,
            result_item.get('event_name', ''),
            result_item.get('round_type', '')
        )

        # Get dives for this result
        dives_response = dives_table.query(
            KeyConditionExpression=Key('result_key').eq(result_key)
        )

        dives = []
        for dive_item in dives_response['Items']:
            dive = {
                "code": dive_item.get('code', ''),
                "description": dive_item.get('description', ''),
                "difficulty": float(dive_item.get('difficulty', 0)) if dive_item.get('difficulty') else 0,
                "award": float(dive_item.get('award', 0)) if dive_item.get('award') else 0,
                "round_place": int(dive_item.get('round_place', 0)) if dive_item.get('round_place') else None,
                "scores": dive_item.get('scores', []),
                "dive_round": dive_item.get('dive_round', ''),
                "height": dive_item.get('height', ''),
                "net_total": float(dive_item.get('net_total', 0)) if dive_item.get('net_total') else 0
            }
            # Convert Decimal scores to float
            if dive['scores']:
                dive['scores'] = [float(score) for score in dive['scores'] if score is not None]
            dives.append(dive)

        # Sort dives by dive_round
        dives.sort(key=lambda x: x.get('dive_round', '0'))

        result = {
            "meet_name": result_item.get('meet_name', ''),
            "event_name": result_item.get('event_name', ''),
            "round_type": result_item.get('round_type', ''),
            "start_date": result_item.get('start_date', ''),
            "end_date": result_item.get('end_date', ''),
            "total_score": float(result_item.get('total_score', 0)) if result_item.get('total_score') else 0,
            "detail_href": None,  # This field is not stored in the database
            "dives": dives
        }

        results.append(result)

    # Sort results by start_date (most recent first)
    results.sort(key=lambda x: x.get('start_date', ''), reverse=True)

    return results


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function to get diver profile with competition data
    GET /api/divers/{diverId}
    """
    try:
        # Extract diver ID from path parameters
        diver_id_str = event.get('pathParameters', {}).get('diverId')

        if not diver_id_str:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver ID is required'})
            }

        try:
            diver_id = int(diver_id_str)
        except ValueError:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid diver ID format'})
            }

        # Get diver profile
        profile = get_diver_profile(diver_id)

        if not profile:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver not found'})
            }

        # Get diver results
        results = get_diver_results(diver_id)
        profile['results'] = results

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(profile, default=decimal_default)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
