import json
import boto3
import os
from botocore.exceptions import ClientError

def handler(event, context):
    """
    Lambda function to get training photos from S3 bucket
    """
    
    # Initialize S3 client
    s3_client = boto3.client('s3')
    
    # Get bucket name from environment variable
    bucket_name = os.environ.get('OUTPUT_BUCKET_NAME')
    
    if not bucket_name:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'error': 'OUTPUT_BUCKET_NAME environment variable not set'
            })
        }
    
    try:
        # Get the photo key from the request
        photo_key = event.get('pathParameters', {}).get('photoKey')
        
        if not photo_key:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps({
                    'error': 'Photo key is required'
                })
            }
        
        # Generate a presigned URL for the photo
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': photo_key},
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'presigned_url': presigned_url,
                'photo_key': photo_key
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps({
                    'error': 'Photo not found'
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps({
                    'error': f'S3 error: {str(e)}'
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }
