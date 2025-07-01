import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function to get training photo for a session
    GET /api/divers/{diverId}/training/{sessionDate}/photo
    """
    try:
        # Extract parameters from path
        path_params = event.get('pathParameters', {})
        diver_id = path_params.get('diverId')
        session_date = path_params.get('sessionDate')
        
        if not diver_id or not session_date:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Diver ID and session date are required'})
            }
        
        # TODO: Replace with actual S3 query to get photo
        # For now, simulate that some photos exist and some don't
        if session_date == "2024-06-20":
            # Return a mock response indicating photo exists
            # In real implementation, you would fetch from S3 and return the image
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'image/jpeg',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': 'Mock photo data - implement S3 retrieval',
                'isBase64Encoded': False
            }
        else:
            # Photo not found
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Photo not found for this session'})
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
