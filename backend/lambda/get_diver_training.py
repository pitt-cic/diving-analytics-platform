import json
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function to get diver training data
    GET /api/divers/{diverId}/training
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
        mock_training_data = {
            "sessions": [
                {
                    "date": "2024-06-20",
                    "dives": [
                        {
                            "code": "103B",
                            "drillType": "full",
                            "reps": ["O", "O", "X", "O"],
                            "success": 3
                        },
                        {
                            "code": "201B",
                            "drillType": "entry",
                            "reps": ["O", "O", "O"],
                            "success": 3
                        }
                    ],
                    "balks": 1
                },
                {
                    "date": "2024-06-18",
                    "dives": [
                        {
                            "code": "103B",
                            "drillType": "full",
                            "reps": ["O", "X", "O"],
                            "success": 2
                        }
                    ],
                    "balks": 0
                }
            ],
            "totalDives": 30,
            "successRate": 75,
            "diveCodeStats": {
                "103B": {
                    "totalReps": 20,
                    "successfulReps": 15,
                    "sessions": 5
                },
                "201B": {
                    "totalReps": 10,
                    "successfulReps": 8,
                    "sessions": 3
                }
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(mock_training_data)
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
