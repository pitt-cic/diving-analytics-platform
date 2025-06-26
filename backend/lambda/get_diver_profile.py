import json
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function to get diver profile with competition data
    GET /api/divers/{diverId}
    """
    try:
        # Extract diver ID from path parameters
        diver_id = event.get('pathParameters', {}).get('diverId')
        
        if not diver_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver ID is required'})
            }
        
        # TODO: Replace with actual database query
        # For now, returning mock data
        mock_profile = {
            "id": diver_id,
            "name": "John Smith",
            "gender": "M",
            "age": 20,
            "city_state": "Austin, TX",
            "country": "USA",
            "hs_grad_year": 2024,
            "results": [
                {
                    "meet_name": "State Championships",
                    "event_name": "1m Springboard",
                    "round_type": "Finals",
                    "start_date": "2024-03-15",
                    "end_date": "2024-03-17",
                    "total_score": 456.75,
                    "detail_href": "/meets/state-2024",
                    "dives": [
                        {
                            "code": "103B",
                            "description": "Forward 1½ Somersault Pike",
                            "difficulty": 2.3,
                            "award": 52.9,
                            "round_place": 1,
                            "scores": [7.5, 8.0, 7.5, 8.0, 7.5]
                        },
                        {
                            "code": "201B",
                            "description": "Back 1 Somersault Pike",
                            "difficulty": 2.0,
                            "award": 48.0,
                            "round_place": 2,
                            "scores": [8.0, 8.0, 7.5, 8.5, 8.0]
                        }
                    ]
                }
            ]
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(mock_profile)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
