import json
import logging
import os
import time
import uuid
from decimal import Decimal

import boto3

import get_json_from_bedrock

logger = logging.getLogger()
logger.setLevel("INFO")

bda_client = boto3.client(service_name="bedrock-data-automation-runtime")
s3_client = boto3.client(service_name="s3")
dynamodb = boto3.resource('dynamodb')

training_data_table = dynamodb.Table(os.environ.get('TRAINING_DATA_TABLE_NAME'))


def invoke_data_automation(image_input_s3_uri: str, output_s3_uri: str, data_automation_arn):
    aws_account_id = os.environ.get("AWS_ACCOUNT_ID")
    aws_region = os.environ["AWS_REGION"]
    params = {
        "inputConfiguration": {
            "s3Uri": image_input_s3_uri
        },
        "outputConfiguration": {
            "s3Uri": output_s3_uri
        },
        "dataAutomationConfiguration": {
            "dataAutomationProjectArn": data_automation_arn
        },
        "dataAutomationProfileArn": f"arn:aws:bedrock:{aws_region}:{aws_account_id}:data-automation-profile/us.data-automation-v1"

    }
    response = bda_client.invoke_data_automation_async(**params)
    return response


def wait_for_data_automation_to_complete(invocation_arn, loop_time_in_seconds=2):
    while True:
        response = bda_client.get_data_automation_status(
            invocationArn=invocation_arn
        )
        status = response['status']
        if status not in ['Created', 'InProgress']:
            logger.info(f"BDA processing completed with status: {status}")
            return response
        logger.info(f"BDA processing status: {status}")
        time.sleep(loop_time_in_seconds)


def save_to_dynamodb(diver_name, json_output, extracted_csv):
    try:
        item_id = str(uuid.uuid4())
        item = {
            'id': item_id,
            'diver_name': diver_name,
            'json_output': json_output,
            'extracted_csv': extracted_csv,
            'created_at': int(time.time() * 1000)
        }

        item = json.loads(json.dumps(item), parse_float=Decimal)

        training_data_table.put_item(Item=item)
        return True
    except Exception as e:
        logger.error(f"Error saving to DynamoDB: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def handler(event, context):
    logger.info(f"Received event: {event}")
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        image_input_s3_uri = "s3://" + bucket + "/" + key
        output_s3_uri = "s3://" + os.environ.get("OUTPUT_BUCKET_NAME") + "/" + os.path.splitext(key)[0]
        data_automation_arn = os.environ.get("DATA_AUTOMATION_PROJECT_ARN")
        bda_response = invoke_data_automation(image_input_s3_uri, output_s3_uri, data_automation_arn)
        invocation_arn = bda_response['invocationArn']
        data_automation_status = wait_for_data_automation_to_complete(invocation_arn=invocation_arn)
        if data_automation_status['status'] == 'Success':
            job_metadata_s3_uri = data_automation_status['outputConfiguration']['s3Uri']

            bucket_name = job_metadata_s3_uri.split('/')[2]
            key_name = '/'.join(job_metadata_s3_uri.split('/')[3:])

            response = s3_client.get_object(Bucket=bucket_name, Key=key_name)
            job_metadata = json.loads(response['Body'].read().decode('utf-8'))

            standard_output_path = job_metadata['output_metadata'][0]['segment_metadata'][0]['standard_output_path']

            result_bucket = standard_output_path.split('/')[2]
            result_key = '/'.join(standard_output_path.split('/')[3:])

            result_response = s3_client.get_object(Bucket=result_bucket, Key=result_key)
            result_data = json.loads(result_response['Body'].read().decode('utf-8'))

            diver_name, csv_data = extract_csv_from_result(result_data)
            elements = extract_elements_from_result(result_data)
            bedrock_json = get_json_from_bedrock.get_json_from_bedrock(elements)

            if diver_name:
                save_to_dynamodb(diver_name, bedrock_json, csv_data)
            else:
                logger.warning("Warning: Diver name not found, not saving to DynamoDB")


def extract_elements_from_result(result_data):
    if result_data["elements"] is not None:
        return result_data["elements"]
    else:
        return None


def extract_csv_from_result(result_data):
    diver_name = None
    csv_data = None
    for element in result_data['elements']:
        if element['type'] == 'TEXT' and 'Name:' in element['representation']['markdown']:
            markdown = element['representation']['markdown']
            diver_name = markdown.split('**')[1] if '**' in markdown else markdown.split('Name:')[1].strip()
        elif element['type'] == 'TABLE' and 'csv' in element['representation']:
            csv_data = element['representation']['csv']
    return diver_name, csv_data
