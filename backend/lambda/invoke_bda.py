import json
import logging
import os
import time
import uuid
from decimal import Decimal
from typing import Any

import boto3

import get_json_from_bedrock

logger = logging.getLogger()
logger.setLevel("INFO")

bda_client = boto3.client(service_name="bedrock-data-automation-runtime")
s3_client = boto3.client(service_name="s3")
dynamodb = boto3.resource('dynamodb')

training_data_table = dynamodb.Table(os.environ.get('TRAINING_DATA_TABLE_NAME'))
divers_table = dynamodb.Table(os.environ.get('DIVERS_TABLE_NAME'))

# Status constants
STATUS_PROCESSING = "PROCESSING"
STATUS_PENDING_REVIEW = "PENDING_REVIEW"
STATUS_FAILED = "FAILED"


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


def create_initial_record(record_id, s3_url, diver_name=None):
    try:
        item = {
            'id': record_id,
            'extraction_status': STATUS_PROCESSING,
            'created_at': int(time.time() * 1000),
            's3_url': s3_url
        }

        if diver_name:
            item['diver_name'] = diver_name

        item = json.loads(json.dumps(item), parse_float=Decimal)
        training_data_table.put_item(Item=item)
        logger.info(f"Created initial record with ID: {record_id}, status: {STATUS_PROCESSING}, s3_url: {s3_url}")
        return True
    except Exception as e:
        logger.error(f"Error creating initial record: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def get_diver_id_by_name(diver_name) -> Any | None:
    if not diver_name:
        return None

    try:
        response = divers_table.scan()
        items = response['Items']

        while 'LastEvaluatedKey' in response:
            response = divers_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])

        diver_name_lower = diver_name.lower().strip()
        for item in items:
            stored_name = item.get('name', '').lower().strip()
            if diver_name_lower in stored_name or stored_name in diver_name_lower:
                diver_id = item.get('diver_id')
                logger.info(f"Found diver ID {diver_id} for name '{diver_name}' (matched with '{item.get('name')}')")
                return diver_id

        logger.warning(f"No diver found for name: '{diver_name}'")
        return None

    except Exception as e:
        logger.error(f"Error looking up diver by name '{diver_name}': {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def update_record_with_results(record_id, diver_name, json_output, extracted_csv):
    try:
        update_expression = "SET extraction_status = :status, json_output = :json_output, extracted_csv = :csv, updated_at = :updated_at"
        expression_attribute_values = {
            ':status': STATUS_PENDING_REVIEW,
            ':json_output': json_output,
            ':csv': extracted_csv,
            ':updated_at': int(time.time() * 1000)
        }

        # Add diver_name if not already present
        if diver_name:
            update_expression += ", diver_name = :diver_name"
            expression_attribute_values[':diver_name'] = diver_name

        diver_id = get_diver_id_by_name(diver_name)

        if diver_id:
            update_expression += ", diver_id = :diver_id"
            expression_attribute_values[':diver_id'] = str(diver_id)

        # Convert to handle Decimal types
        expression_attribute_values = json.loads(json.dumps(expression_attribute_values), parse_float=Decimal)

        training_data_table.update_item(
            Key={'id': record_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values
        )
        logger.info(f"Updated record {record_id} with results, status: {STATUS_PENDING_REVIEW}")
        return True
    except Exception as e:
        logger.error(f"Error updating record with results: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def update_record_status(record_id, status, error_message=None):
    """
    Update record status (used for error handling)
    """
    try:
        update_expression = "SET extraction_status = :status, updated_at = :updated_at"
        expression_attribute_values = {
            ':status': status,
            ':updated_at': int(time.time() * 1000)
        }

        if error_message:
            update_expression += ", error_message = :error_message"
            expression_attribute_values[':error_message'] = error_message

        training_data_table.update_item(
            Key={'id': record_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values
        )
        logger.info(f"Updated record {record_id} status to: {status}")
        return True
    except Exception as e:
        logger.error(f"Error updating record status: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def get_names_of_divers():
    try:
        response = divers_table.scan()
        items = response['Items']

        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = divers_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])

        # Extract names from the items
        diver_names = []
        for item in items:
            name = item.get('name')
            if name:  # Only add non-empty names
                diver_names.append(name)

        logger.info(f"Retrieved {len(diver_names)} diver names from DynamoDB")
        return diver_names

    except Exception as e:
        logger.error(f"Error fetching diver names: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


def handler(event, context):
    logger.info(f"Received event: {event}")
    for record in event["Records"]:
        record_id = str(uuid.uuid4())

        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        image_input_s3_uri = "s3://" + bucket + "/" + key
        image_input_s3_url = "https://" + bucket + ".s3." + os.environ["AWS_REGION"] + ".amazonaws.com/" + key
        output_s3_uri = "s3://" + os.environ.get("OUTPUT_BUCKET_NAME") + "/" + os.path.splitext(key)[0]
        data_automation_arn = os.environ.get("DATA_AUTOMATION_PROJECT_ARN")

        create_initial_record(record_id, image_input_s3_url)

        try:
            # Invoke BDA
            bda_response = invoke_data_automation(image_input_s3_uri, output_s3_uri, data_automation_arn)
            invocation_arn = bda_response['invocationArn']

            # Wait for completion
            data_automation_status = wait_for_data_automation_to_complete(invocation_arn=invocation_arn)

            if data_automation_status['status'] == 'Success':
                # Process successful results
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
                bedrock_json = get_json_from_bedrock.get_json_from_bedrock(elements, names_of_divers=get_names_of_divers())

                # Update record with results and PENDING_REVIEW status
                if diver_name or csv_data or bedrock_json:
                    update_record_with_results(record_id, diver_name, bedrock_json, csv_data)
                else:
                    logger.warning("Warning: No extractable data found")
                    update_record_status(record_id, STATUS_FAILED, "No extractable data found")
            else:
                # BDA job failed
                error_message = f"BDA job failed with status: {data_automation_status['status']}"
                logger.error(error_message)
                update_record_status(record_id, STATUS_FAILED, error_message)

        except Exception as e:
            # Handle any unexpected errors
            error_message = f"Unexpected error during processing: {str(e)}"
            logger.error(error_message)
            import traceback
            traceback.print_exc()
            update_record_status(record_id, STATUS_FAILED, error_message)


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
