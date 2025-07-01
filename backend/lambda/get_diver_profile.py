import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from functools import lru_cache
from typing import Dict, Any, List

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')

APPLICATION_JSON = 'application/json'

divers_table = dynamodb.Table(os.environ.get('DIVERS_TABLE_NAME'))
competitions_table = dynamodb.Table(os.environ.get('COMPETITIONS_TABLE_NAME'))
results_table = dynamodb.Table(os.environ.get('RESULTS_TABLE_NAME'))
dives_table = dynamodb.Table(os.environ.get('DIVES_TABLE_NAME'))


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


@lru_cache(maxsize=1000)
def generate_result_key(diver_id: int, competition_id: str, event_name: str, round_type: str = "") -> str:
    clean_event = re.sub(r'[^a-zA-Z0-9\s]', '', event_name)
    clean_event = re.sub(r'\s+', '_', clean_event.strip()).upper()

    if round_type:
        clean_round = re.sub(r'[^a-zA-Z0-9\s]', '', round_type)
        clean_round = re.sub(r'\s+', '_', clean_round.strip()).upper()
        return f"{diver_id}_{competition_id}_{clean_event}_{clean_round}"

    return f"{diver_id}_{competition_id}_{clean_event}"


def get_diver_profile(diver_id: int) -> dict[str, str | int | None | Any] | None:
    response = divers_table.get_item(Key={'diver_id': diver_id})

    if 'Item' not in response:
        return None

    diver = response['Item']
    return {
        "id": str(diver['diver_id']),
        "name": diver.get('name', ''),
        "gender": diver.get('gender', ''),
        "age": int(diver.get('age', 0)) if diver.get('age') else None,
        "fina_age": int(diver.get('fina_age', 0)) if diver.get('fina_age') else None,
        "city_state": diver.get('city_state', ''),
        "country": diver.get('country', ''),
        "hs_grad_year": int(diver.get('hs_grad_year', 0)) if diver.get('hs_grad_year') else None
    }


def fetch_dives_batch(result_keys: List[str]) -> Dict[str, List[Dict]]:
    def get_dives(result_key):
        try:
            response = dives_table.query(
                KeyConditionExpression=Key('result_key').eq(result_key)
            )

            dives = []
            for dive_item in response['Items']:
                dive = {
                    "code": dive_item.get('code', ''),
                    "description": dive_item.get('description', ''),
                    "difficulty": float(dive_item.get('difficulty', 0)) if dive_item.get('difficulty') else 0,
                    "award": float(dive_item.get('award', 0)) if dive_item.get('award') else 0,
                    "round_place": int(dive_item.get('round_place', 0)) if dive_item.get('round_place') else None,
                    "scores": [float(score) for score in dive_item.get('scores', []) if score is not None],
                    "dive_round": dive_item.get('dive_round', ''),
                    "height": dive_item.get('height', ''),
                    "net_total": float(dive_item.get('net_total', 0)) if dive_item.get('net_total') else 0
                }
                dives.append(dive)

            dives.sort(key=lambda x: x.get('dive_round', '0'))
            return result_key, dives

        except Exception as e:
            print(f"Error fetching dives for {result_key}: {e}")
            return result_key, []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(get_dives, result_keys)
        return dict(results)


def get_diver_results(diver_id: int) -> List[Dict[str, Any]]:
    response = results_table.query(
        KeyConditionExpression=Key('diver_id').eq(diver_id)
    )

    if not response['Items']:
        return []

    result_items = response['Items']

    # Generate all result keys
    result_keys = []
    for result_item in result_items:
        result_key = generate_result_key(
            diver_id,
            result_item.get('competition_id'),
            result_item.get('event_name', ''),
            result_item.get('round_type', '')
        )
        result_keys.append(result_key)

    all_dives = fetch_dives_batch(result_keys)

    # Build results
    results = []
    for i, result_item in enumerate(result_items):
        result_key = result_keys[i]
        dives = all_dives.get(result_key, [])

        result = {
            "meet_name": result_item.get('meet_name', ''),
            "event_name": result_item.get('event_name', ''),
            "round_type": result_item.get('round_type', ''),
            "start_date": result_item.get('start_date', ''),
            "end_date": result_item.get('end_date', ''),
            "total_score": float(result_item.get('total_score', 0)) if result_item.get('total_score') else 0,
            "detail_href": result_item.get('detail_href', ''),
            "dives": dives
        }
        results.append(result)

    # Sort results by start_date (the most recent first)
    results.sort(key=lambda x: x.get('start_date', ''), reverse=True)
    return results


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
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

        # Fetch profile and results in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            profile_future = executor.submit(get_diver_profile, diver_id)
            results_future = executor.submit(get_diver_results, diver_id)

            profile = profile_future.result()
            results = results_future.result()

        if not profile:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': APPLICATION_JSON,
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver not found'})
            }

        profile['results'] = results

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': APPLICATION_JSON,
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
                'Content-Type': APPLICATION_JSON,
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
