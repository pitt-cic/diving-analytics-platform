import json
from venv import logger

import boto3

bedrock_client = boto3.client(service_name="bedrock-runtime")


def get_bedrock_prompt(elements):
    prompt = f"""You are an expert developer with 15 years of experience in data science. You are given a elements object from Bedrock Data Automation Results.
    Elements are enclosed in `<elements>`.
    Your task is to return a JSON object in meaningful JSON format. Do not include any other text or explanations outside of the JSON.
    
    <elements>
    {elements}
    </header_Object>
    
"""
    return prompt


def get_json_from_bedrock(elements):
    prompt = get_bedrock_prompt(elements=elements)
    request = build_bedrock_payload(prompt)
    bedrock_model = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
    sanitized_response = ""
    try:
        response = bedrock_client.invoke_model(modelId=bedrock_model, body=request)
        model_response = json.loads(response["body"].read())
        response_text = model_response["content"][0]["text"]
        sanitized_response = sanitize_response(response_text)
    except Exception as e:
        logger.error(f"ERROR: Can't invoke '{bedrock_model}'. Reason: {e}")
    return sanitized_response


def build_bedrock_payload(bedrock_prompt: str) -> str:
    native_request = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 10000,
        "temperature": 0.4,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": bedrock_prompt}],
            }
        ],
    }
    request = json.dumps(native_request)
    return request


def sanitize_response(response: str) -> str:
    sanitized_response = response.replace("```", "").replace("json", "").strip()
    return sanitized_response
