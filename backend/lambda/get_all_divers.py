import json
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function to get all divers with basic info
    GET /api/divers
    """
    try:
        # TODO: Replace with actual database query
        # For now, returning mock data
        mock_divers = [
            {
                "id": "diver-001",
                "name": "John Smith",
                "gender": "M",
                "age": 20,
                "city_state": "Austin, TX",
                "country": "USA",
                "hs_grad_year": 2024
            },
            {
                "id": "diver-002",
                "name": "Sarah Johnson",
                "gender": "F",
                "age": 19,
                "city_state": "Miami, FL",
                "country": "USA",
                "hs_grad_year": 2025
            }
        ]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(mock_divers)
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
