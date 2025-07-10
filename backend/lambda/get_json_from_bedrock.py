import json
from venv import logger

import boto3

bedrock_client = boto3.client(service_name="bedrock-runtime")


def get_bedrock_prompt(elements, names_of_divers):
    prompt = f"""You are an expert developer with 15 years of experience in data science. You are given a elements object from Bedrock Data Automation Results.
        Elements are enclosed in `<elements>`. Instructions are enclosed in `<instructions>`.
        Your task is to return a JSON object. The expected JSON format is enclosed in `<json_format>`. Do not include any other text or explanations outside of the JSON.

        <elements>
        {elements}
        </elements>

        <json_format>
        {{          
            "dives": [
                {{
                  "dive_skill": "dive_skill",
                  "board": "board",
                  "area_of_dive": "area_of_dive",
                  "attempts": ["X", "O", "O", "X", "X", "O", "O", "X", "X", "X", "0", "x"],
                  "success_rate": "success_rate"
                }}
            ]
        }}
        </json_format>
        
        <instructions>
        Ensure the following constraints are applied to the extracted data:

        ### 1. Attempts Array
        - Each entry must be a single uppercase character: either `X` or `O`.
        - If any other character appears, replace it with the closest valid character — either `X` or `O`.
        - If an entry contains multiple characters (e.g., `XX`, `XO`), split them so that each attempt consists of exactly one valid character.

        ### 2. Diver Name
        - The diver’s name must match one from the list: `{names_of_divers}`.
        - If the extracted name does not match any name in the list, replace it with the closest matching name from `{names_of_divers}`.
        
        ### 3. Area of Dive
        - The "area_of_dive" field MUST be one of the following codes ONLY:
          - "A": Approach  
          - "TO": Takeoff  
          - "CON": Connection  
          - "S": Shape  
          - "CO": Comeout  
          - "ADJ": Adjustment  
          - "RIP": Entry  
          - "UW": Underwater  
        - If you're uncertain which area of dive applies, use the one that best matches the context
        </instructions>"""

    return prompt


def get_json_from_bedrock(elements, names_of_divers):
    prompt = get_bedrock_prompt(elements=elements, names_of_divers=names_of_divers)
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
