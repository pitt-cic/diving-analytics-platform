import time
import json
import boto3
import os


def invoke_data_automation(image_input_s3_uri: str, bda_client, output_s3_uri: str, data_automation_arn):
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
    print(f"Params: {params}")
    response = bda_client.invoke_data_automation_async(**params)
    return response


def wait_for_data_automation_to_complete(invocation_arn, bda_client, loop_time_in_seconds=2):
    while True:
        response = bda_client.get_data_automation_status(
            invocationArn=invocation_arn
        )
        status = response['status']
        if status not in ['Created', 'InProgress']:
            print(f"BDA processing completed with status: {status}")
            return response
        print(".", end='', flush=True)
        time.sleep(loop_time_in_seconds)


def handler(event, context):
    print(event)
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        image_input_s3_uri = "s3://" + bucket + "/" + key
        bda_client = initialize_client("bedrock-data-automation-runtime")
        output_s3_uri = "s3://" + os.environ.get("OUTPUT_BUCKET_NAME") + "/" + os.path.splitext(key)[0]
        data_automation_arn = os.environ.get("DATA_AUTOMATION_PROJECT_ARN")
        bda_response = invoke_data_automation(image_input_s3_uri, bda_client, output_s3_uri, data_automation_arn)
        invocation_arn = bda_response['invocationArn']
        data_automation_status = wait_for_data_automation_to_complete(invocation_arn, bda_client)
        if data_automation_status['status'] == 'Success':
            job_metadata_s3_uri = data_automation_status['outputConfiguration']['s3Uri']
            s3_client = initialize_client('s3')

            # Parse S3 URI and read job metadata JSON
            bucket_name = job_metadata_s3_uri.split('/')[2]
            key_name = '/'.join(job_metadata_s3_uri.split('/')[3:])

            response = s3_client.get_object(Bucket=bucket_name, Key=key_name)
            job_metadata = json.loads(response['Body'].read().decode('utf-8'))

            # Extract standard_output_path
            standard_output_path = job_metadata['output_metadata'][0]['segment_metadata'][0]['standard_output_path']

            # Parse and read result.json
            result_bucket = standard_output_path.split('/')[2]
            result_key = '/'.join(standard_output_path.split('/')[3:])

            result_response = s3_client.get_object(Bucket=result_bucket, Key=result_key)
            result_data = json.loads(result_response['Body'].read().decode('utf-8'))

            # Extract diver name and CSV data
            extract_csv_from_result(result_data)


def extract_csv_from_result(result_data):
    diver_name = None
    csv_data = None
    for element in result_data['elements']:
        if element['type'] == 'TEXT' and 'Name:' in element['representation']['markdown']:
            # Extract name from markdown like "Name: **Varun**"
            markdown = element['representation']['markdown']
            diver_name = markdown.split('**')[1] if '**' in markdown else markdown.split('Name:')[1].strip()
        elif element['type'] == 'TABLE' and 'csv' in element['representation']:
            csv_data = element['representation']['csv']
    print(f"Diver Name: {diver_name}")
    print(f"CSV Data extracted: {len(csv_data) if csv_data else 0} characters")
    print(f"csv_data: {csv_data}")


def initialize_client(service_name: str):
    client = boto3.client(service_name=service_name)
    return client
