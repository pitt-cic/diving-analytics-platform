#!/usr/bin/env python3
"""
AWS Lambda Function: Import Competition Data

This Lambda function parses HTML files from divemeets.com to extract comprehensive diving team data.
It processes the team page, individual diver profiles, and competition results to create
a structured JSON dataset using parallel processing for improved performance.

The function is designed to be triggered by AWS events and will store the processed data
in an S3 bucket or database as configured.

Requirements:
    - requests
    - beautifulsoup4

Author: Lambda version adapted from parallel processing script
"""
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from threading import Lock
from typing import List, Dict, Any

import requests
from bs4 import BeautifulSoup

# Configure logging for Lambda
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Thread-safe counter for progress tracking
progress_lock = Lock()
progress_counter = {'processed': 0, 'total': 0}
HTML_PARSER = 'html.parser'


def update_progress(increment=1):
    """Thread-safe progress counter update"""
    with progress_lock:
        progress_counter['processed'] += increment
        logger.info(f"Progress: {progress_counter['processed']}/{progress_counter['total']} divers processed")


def parse_team_page(html: str) -> List[Dict[str, Any]]:
    """
    Parse the team page HTML to extract diver profile URLs and IDs.

    Args:
        html: Raw HTML content of the team page

    Returns:
        List of dictionaries containing diver ID and profile URL information
    """
    soup = BeautifulSoup(html, HTML_PARSER)
    divers = []

    # Find all profile links for individual divers (not team entries)
    profile_links = soup.find_all('a', href=re.compile(r'profile\.php\?number=\d+'))

    for link in profile_links:
        href = link.get('href')
        name = link.get_text().strip()

        # Extract diver ID from URL
        match = re.search(r'number=(\d+)', href)
        if match:
            diver_id = int(match.group(1))

            # Skip team entries (they contain "TEAM" in the name)
            if "TEAM" not in name.upper():
                divers.append({
                    'id': diver_id,
                    'name': name,
                    'profile_url': href
                })
                logger.debug(f"Found diver: {name} (ID: {diver_id})")

    logger.info(f"Total individual divers found: {len(divers)}")
    return divers


def parse_diver_profile(html: str) -> Dict[str, Any]:
    """
    Parse an individual diver's profile page to extract personal information.

    Args:
        html: Raw HTML content of the diver's profile page

    Returns:
        Dictionary containing diver's personal information
    """
    soup = BeautifulSoup(html, HTML_PARSER)
    profile_data = {}

    try:
        # Extract basic information from the profile
        text_content = soup.get_text(separator='\n')

        # Extract name
        name_match = re.search(r'Name:\s*([^\n]+)', text_content)
        profile_data['name'] = name_match.group(1).strip() if name_match else ""

        # Extract city/state
        city_match = re.search(r'City/State:\s*([^\n]+)', text_content)
        profile_data['city_state'] = city_match.group(1).strip() if city_match else ""

        # Extract country
        country_match = re.search(r'Country:\s*([^\n]+)', text_content)
        profile_data['country'] = country_match.group(1).strip() if country_match else ""

        # Extract gender
        gender_match = re.search(r'Gender:\s*([^\n]+)', text_content)
        profile_data['gender'] = gender_match.group(1).strip() if gender_match else ""

        # Extract age
        age_match = re.search(r'Age:\s*(\d+)', text_content)
        profile_data['age'] = int(age_match.group(1)) if age_match else None

        # Extract FINA age
        fina_age_match = re.search(r'FINA Age:\s*(\d+)', text_content)
        profile_data['fina_age'] = int(fina_age_match.group(1)) if fina_age_match else None

        # Extract high school graduation year
        hs_grad_match = re.search(r'High School Graduation:\s*(\d{4})', text_content)
        profile_data['hs_grad_year'] = int(hs_grad_match.group(1)) if hs_grad_match else None

        logger.debug(f"Parsed profile for: {profile_data.get('name', 'Unknown')}")

    except Exception as e:
        logger.error(f"Error parsing diver profile: {e}")

    return profile_data


def parse_diver_results(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []

    try:
        # Find the results table
        history_table = soup.find('table', {'width': '100%'})
        if not history_table:
            logger.warning("No results table found")
            return results

        # Parse table rows
        rows = history_table.find_all('tr')
        current_meet = None

        for row in rows:
            cells = row.find_all('td')
            if not cells:
                continue

            # Check if this row contains a meet name (bold text, spans all columns)
            if len(cells) == 1 or (len(cells) >= 3 and cells[0].find('strong')):
                meet_name_elem = cells[0].find('strong')
                if meet_name_elem:
                    current_meet = meet_name_elem.get_text().strip()
                    continue

            # Parse event results
            if len(cells) >= 3 and current_meet:
                try:
                    event_cell = cells[0]
                    place_cell = cells[1] if len(cells) > 1 else None
                    score_cell = cells[2] if len(cells) > 2 else None

                    event_text = event_cell.get_text().strip()

                    # Skip empty rows or header rows
                    if not event_text or 'History' in event_text:
                        continue

                    # Extract event name and round type
                    event_name = ""
                    round_type = ""
                    dive_count = 6  # Default assumption

                    # Parse event details
                    if ' - ' in event_text:
                        event_part, round_part = event_text.split(' - ', 1)
                        event_name = event_part.strip()
                        round_type = round_part.strip().replace('(', '').replace(')', '')
                    else:
                        event_name = event_text

                    # Extract dive count from the event name
                    dive_match = re.search(r'\((\d+)\s*Dives?\)', event_name)
                    if dive_match:
                        dive_count = int(dive_match.group(1))

                    # Clean up event name
                    event_name = re.sub(r'\s*\(\d+\s*Dives?\)', '', event_name).strip()

                    # Extract score
                    total_score = None
                    detail_href = None
                    if score_cell:
                        link = score_cell.find('a')
                        if link and link.has_attr('href'):
                            detail_href = link['href']
                        score_text = link.get_text() if link else score_cell.get_text()
                        score_match = re.search(r'([\d.]+)', score_text.strip())
                        if score_match:
                            total_score = float(score_match.group(1))

                    if event_name and current_meet:
                        result = {
                            'meet_name': current_meet,
                            'event_name': event_name,
                            'round_type': round_type,
                            'dive_count': dive_count,
                            'total_score': total_score,
                            'detail_href': detail_href,
                        }
                        results.append(result)
                        logger.debug(f"Added result: {current_meet} - {event_name}")

                except Exception as e:
                    logger.warning(f"Error parsing result row: {e}")
                    continue

    except Exception as e:
        logger.error(f"Error parsing diver results: {e}")

    logger.debug(f"Parsed {len(results)} competition results")
    return results


def parse_dive_sheet(html: str) -> Dict[str, Any]:
    """
    Given a divesheetfinal.php page, return a dict with:
      - start_date: parsed start date of the meet
      - end_date: parsed end date of the meet
      - dives: list of dicts, one per dive with dive details
    """
    soup = BeautifulSoup(html, HTML_PARSER)
    result = {
        'start_date': None,
        'end_date': None,
        'dives': []
    }

    # Extract date information from the page text
    page_text = soup.get_text()

    # Look for date pattern like "Mar 27, 2025 to Mar 29, 2025"
    date_match = re.search(r'Date:\s*\*\*([^*]+)\*\*', page_text)
    if not date_match:
        # Alternative pattern without asterisks
        date_match = re.search(r'Date:\s*([A-Za-z]+ \d{1,2}, \d{4}(?: to [A-Za-z]+ \d{1,2}, \d{4})?)', page_text)

    if date_match:
        date_str = date_match.group(1).strip()

        if ' to ' in date_str:
            # Range of dates
            start_str, end_str = date_str.split(' to ', 1)
            try:
                result['start_date'] = datetime.strptime(start_str.strip(), '%b %d, %Y').strftime('%Y-%m-%d')
                result['end_date'] = datetime.strptime(end_str.strip(), '%b %d, %Y').strftime('%Y-%m-%d')
            except ValueError as e:
                logger.warning(f"Could not parse date range '{date_str}': {e}")
        else:
            # Single date
            try:
                parsed_date = datetime.strptime(date_str.strip(), '%b %d, %Y').strftime('%Y-%m-%d')
                result['start_date'] = parsed_date
                result['end_date'] = parsed_date
            except ValueError as e:
                logger.warning(f"Could not parse single date '{date_str}': {e}")

    # target the inner table with border="1" width="650"
    table = soup.find('table', {'border': '1', 'width': '650'})
    if not table:
        logger.warning("No dive-sheet table found")
        return result

    # skip header row (0) and Totals row (last)
    rows = table.find_all('tr')[1:-1]
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 7:
            continue
        # core fields
        dive_round = cells[0].get_text(strip=True)
        code = cells[1].get_text(strip=True)
        desc = cells[2].get_text(strip=True)
        height = cells[3].get_text(strip=True)
        # DD
        try:
            # only the first text node in this cell is the DD
            raw_dd = cells[4].find(string=True, recursive=False)
            dd = float(raw_dd.strip()) if raw_dd else None
        except Exception:
            dd = None
            # next 9 cells = judge scores
        raw_scores = [c.get_text(strip=True) for c in cells[5:14]]
        scores = []
        for s in raw_scores:
            m = re.match(r"([\d.]+)", s)
            scores.append(float(m.group(1)) if m else None)
        # net total, award, round place
        try:
            net_total = float(cells[14].get_text(strip=True))
        except:
            net_total = None
        try:
            award = float(cells[15].get_text(strip=True))
        except Exception:
            award = None
        try:
            round_place = int(cells[16].get_text(strip=True))
        except Exception:
            round_place = None

        result['dives'].append({
            'dive_round': dive_round,
            'code': code,
            'description': desc,
            'height': height,
            'difficulty': dd,
            'scores': scores,
            'net_total': net_total,
            'award': award,
            'round_place': round_place,
        })
    return result


def fetch_dive_sheet(session: requests.Session, base_url: str, event: Dict[str, Any], headers: Dict[str, str]) -> Dict[
    str, Any]:
    if not event.get('detail_href'):
        return event

    try:
        referer_url = base_url + event['detail_href']
        final_href = event['detail_href'].replace(
            'divesheetresultsext.php',
            'divesheetfinal.php'
        )

        request_headers = headers.copy()
        request_headers["Referer"] = referer_url

        url = base_url + final_href.lstrip('/')
        response = session.get(url, headers=request_headers, timeout=30)
        response.raise_for_status()

        dive_sheet_data = parse_dive_sheet(response.text)
        event['dives'] = dive_sheet_data['dives']
        event['start_date'] = dive_sheet_data['start_date']
        event['end_date'] = dive_sheet_data['end_date']

        logger.debug(f"Fetched dive sheet for: {event['meet_name']} - {event['event_name']}")

    except Exception as e:
        logger.error(f"Error fetching dive sheet for {event.get('meet_name', 'Unknown')}: {e}")

    return event


def process_diver_dive_sheets_parallel(session: requests.Session, base_url: str, results_data: List[Dict[str, Any]],
                                       headers: Dict[str, str], max_workers: int = 5) -> List[Dict[str, Any]]:
    events_with_sheets = [event for event in results_data if event.get('detail_href')]

    if not events_with_sheets:
        return results_data

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all dive sheet fetch tasks
        future_to_event = {
            executor.submit(fetch_dive_sheet, session, base_url, event, headers): event
            for event in events_with_sheets
        }

        for future in as_completed(future_to_event):
            try:
                updated_event = future.result()
                # Find and update the original event in results_data
                for i, event in enumerate(results_data):
                    if (event.get('meet_name') == updated_event.get('meet_name') and
                            event.get('event_name') == updated_event.get('event_name')):
                        results_data[i] = updated_event
                        break
            except Exception as e:
                event = future_to_event[future]
                logger.error(f"Error processing dive sheet for {event.get('meet_name', 'Unknown')}: {e}")

    return results_data


def process_single_diver(diver: Dict[str, Any], base_url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    diver_id = diver['id']

    # Create a session for this diver to reuse connections
    with requests.Session() as session:
        session.headers.update(headers)

        try:
            # Fetch and parse the profile page
            profile_full_url = base_url + diver['profile_url']
            profile_response = session.get(profile_full_url, timeout=30)
            profile_response.raise_for_status()
            profile_html = profile_response.text

            profile_data = parse_diver_profile(profile_html)
            results_data = parse_diver_results(profile_html)

            # Process dive sheets in parallel for this diver
            results_data = process_diver_dive_sheets_parallel(
                session, base_url, results_data, headers, max_workers=5
            )

            # Update progress
            update_progress()

            return {
                'id': diver_id,
                **profile_data,
                'results': results_data
            }

        except Exception as e:
            logger.error(f"Error processing diver ID {diver_id}: {e}")
            update_progress()
            return {
                'id': diver_id,
                'name': diver.get('name', 'Unknown'),
                'error': str(e),
                'results': []
            }


def extract_diving_data(max_diver_workers: int = 8) -> List[Dict[str, Any]]:
    """
    Main function to orchestrate the parallel data extraction process.
    
    Args:
        max_diver_workers: Maximum number of divers to process simultaneously
    
    Returns:
        List of processed diver data
    """
    start_time = time.time()
    logger.info("Starting University of Pittsburgh diving data extraction")

    # Configuration
    base_url = 'https://secure.meetcontrol.com/divemeets/system/'
    team_link = "profilet.php?number=2303"

    # Headers to mimic a real browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

    # Load the team page
    team_url = base_url + team_link
    with requests.Session() as session:
        session.headers.update(headers)
        response = session.get(team_url, timeout=30)
        response.raise_for_status()
        team_html = response.text

    if not team_html:
        logger.error("Could not load team page")
        raise Exception("Could not load team page")

    # Parse team page to get diver IDs
    divers = parse_team_page(team_html)
    if not divers:
        logger.error("No divers found in team page")
        raise Exception("No divers found in team page")

    # Initialize progress counter
    progress_counter['total'] = len(divers)
    progress_counter['processed'] = 0

    logger.info(f"Processing {len(divers)} divers with {max_diver_workers} parallel workers")

    # Process divers in parallel
    all_diver_data = []
    with ThreadPoolExecutor(max_workers=max_diver_workers) as executor:
        # Submit all diver processing tasks
        future_to_diver = {
            executor.submit(process_single_diver, diver, base_url, headers): diver
            for diver in divers
        }

        # Collect results as they complete
        for future in as_completed(future_to_diver):
            try:
                diver_data = future.result()
                all_diver_data.append(diver_data)
            except Exception as e:
                diver = future_to_diver[future]
                logger.error(f"Failed to process diver {diver.get('name', 'Unknown')}: {e}")
                # Add error entry
                all_diver_data.append({
                    'id': diver['id'],
                    'name': diver.get('name', 'Unknown'),
                    'error': str(e),
                    'results': []
                })

    # Sort results by diver ID for consistent output
    all_diver_data.sort(key=lambda x: x['id'])

    # Log summary
    successful_divers = [d for d in all_diver_data if 'error' not in d]
    error_divers = [d for d in all_diver_data if 'error' in d]

    logger.info(
        f"Extraction completed - Total: {len(all_diver_data)}, Successful: {len(successful_divers)}, Errors: {len(error_divers)}")

    execution_time = time.time() - start_time
    logger.info(f"Total execution time: {execution_time:.2f} seconds")

    return all_diver_data


def convert_to_decimal(value):
    """Convert numeric values to Decimal for DynamoDB compatibility"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        from decimal import Decimal
        return Decimal(str(value))
    return value


def generate_competition_id(meet_name: str, start_date: str = None) -> str:
    """Generate a unique competition ID from meet name and dates"""
    # Clean the meet name for use as an ID
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', meet_name)
    clean_name = re.sub(r'\s+', '_', clean_name.strip()).upper()

    # Add date suffix if available
    if start_date:
        date_suffix = start_date.replace('-', '')
        return f"{clean_name}_{date_suffix}"

    return clean_name


def generate_result_key(diver_id: int, competition_id: str, event_name: str, round_type: str = "") -> str:
    """Generate a unique result key for the dives table"""
    clean_event = re.sub(r'[^a-zA-Z0-9\s]', '', event_name)
    clean_event = re.sub(r'\s+', '_', clean_event.strip()).upper()

    if round_type:
        clean_round = re.sub(r'[^a-zA-Z0-9\s]', '', round_type)
        clean_round = re.sub(r'\s+', '_', clean_round.strip()).upper()
        return f"{diver_id}_{competition_id}_{clean_event}_{clean_round}"

    return f"{diver_id}_{competition_id}_{clean_event}"


def insert_diver_data(dynamodb, table_name: str, diver_data: Dict[str, Any]) -> bool:
    """Insert or update diver profile data in DynamoDB"""
    try:
        table = dynamodb.Table(table_name)

        # Prepare diver item
        diver_item = {
            'diver_id': diver_data['id'],
            'name': diver_data.get('name', ''),
            'city_state': diver_data.get('city_state', ''),
            'country': diver_data.get('country', ''),
            'gender': diver_data.get('gender', ''),
            'age': convert_to_decimal(diver_data.get('age')),
            'fina_age': convert_to_decimal(diver_data.get('fina_age')),
            'hs_grad_year': convert_to_decimal(diver_data.get('hs_grad_year')),
            'last_updated': datetime.utcnow().isoformat()
        }

        # Remove None values
        diver_item = {k: v for k, v in diver_item.items() if v is not None}

        # Use put_item to insert or update
        table.put_item(Item=diver_item)
        logger.debug(f"Inserted/updated diver: {diver_data.get('name', 'Unknown')} (ID: {diver_data['id']})")
        return True

    except Exception as e:
        logger.error(f"Error inserting diver data for ID {diver_data['id']}: {e}")
        return False


def insert_competition_data(dynamodb, table_name: str, competition_id: str, meet_name: str,
                            start_date: str = None, end_date: str = None) -> bool:
    """Insert or update competition data in DynamoDB"""
    try:
        table = dynamodb.Table(table_name)

        # Prepare competition item
        competition_item = {
            'competition_id': competition_id,
            'meet_name': meet_name,
            'start_date': start_date,
            'end_date': end_date,
            'last_updated': datetime.utcnow().isoformat()
        }

        # Remove None values
        competition_item = {k: v for k, v in competition_item.items() if v is not None}

        # Use put_item to insert or update
        table.put_item(Item=competition_item)
        logger.debug(f"Inserted/updated competition: {meet_name}")
        return True

    except Exception as e:
        logger.error(f"Error inserting competition data for {meet_name}: {e}")
        return False


def insert_result_data(dynamodb, results_table_name: str, diver_id: int, result_data: Dict[str, Any],
                       competition_id: str) -> bool:
    try:
        table = dynamodb.Table(results_table_name)

        event_key = f"{competition_id}#{result_data['event_name']}"
        if result_data.get('round_type'):
            event_key += f"#{result_data['round_type']}"

        result_item = {
            'diver_id': diver_id,
            'competition_event_key': event_key,
            'competition_id': competition_id,
            'meet_name': result_data['meet_name'],
            'event_name': result_data['event_name'],
            'round_type': result_data.get('round_type', ''),
            'total_score': convert_to_decimal(result_data.get('total_score')),
            'detail_href': result_data.get('detail_href'),
            'start_date': result_data.get('start_date'),
            'end_date': result_data.get('end_date'),
            'last_updated': datetime.utcnow().isoformat()
        }

        # Remove None values
        result_item = {k: v for k, v in result_item.items() if v is not None}

        # Use put_item to insert or update
        table.put_item(Item=result_item)
        logger.debug(f"Inserted/updated result: {result_data['meet_name']} - {result_data['event_name']}")
        return True

    except Exception as e:
        logger.error(f"Error inserting result data: {e}")
        return False


def insert_dive_data(dynamodb, dives_table_name: str, result_key: str, dive_data: Dict[str, Any]) -> bool:
    try:
        table = dynamodb.Table(dives_table_name)

        # Prepare dive item
        dive_item = {
            'result_key': result_key,
            'dive_round': dive_data['dive_round'],
            'code': dive_data.get('code', ''),
            'description': dive_data.get('description', ''),
            'height': dive_data.get('height', ''),
            'difficulty': convert_to_decimal(dive_data.get('difficulty')),
            'scores': [convert_to_decimal(score) for score in dive_data.get('scores', [])],
            'net_total': convert_to_decimal(dive_data.get('net_total')),
            'award': convert_to_decimal(dive_data.get('award')),
            'round_place': convert_to_decimal(dive_data.get('round_place')),
            'last_updated': datetime.utcnow().isoformat()
        }

        # Remove None values (but keep empty lists)
        dive_item = {k: v for k, v in dive_item.items() if v is not None}

        # Use put_item to insert or update
        table.put_item(Item=dive_item)
        logger.debug(f"Inserted/updated dive: {result_key} - Round {dive_data['dive_round']}")
        return True

    except Exception as e:
        logger.error(f"Error inserting dive data: {e}")
        return False


def store_data_in_dynamodb(diving_data: List[Dict[str, Any]]) -> Dict[str, int]:
    import boto3
    import os

    # Initialize DynamoDB resource
    dynamodb = boto3.resource('dynamodb')

    # Get table names from environment variables
    divers_table_name = os.environ.get('DIVERS_TABLE_NAME')
    competitions_table_name = os.environ.get('COMPETITIONS_TABLE_NAME')
    results_table_name = os.environ.get('RESULTS_TABLE_NAME')
    dives_table_name = os.environ.get('DIVES_TABLE_NAME')

    if not all([divers_table_name, competitions_table_name, results_table_name, dives_table_name]):
        raise ValueError("Missing required environment variables for DynamoDB table names")

    # Counters for tracking insertions
    counts = {
        'divers': 0,
        'competitions': 0,
        'results': 0,
        'dives': 0,
        'errors': 0
    }

    # Keep track of competitions we've already processed
    processed_competitions = set()

    logger.info(f"Starting to store data for {len(diving_data)} divers in DynamoDB")

    for diver_data in diving_data:
        try:
            # Skip divers with errors
            if 'error' in diver_data:
                logger.warning(
                    f"Skipping diver {diver_data.get('name', 'Unknown')} due to error: {diver_data['error']}")
                counts['errors'] += 1
                continue

            # Insert diver profile data
            if insert_diver_data(dynamodb, divers_table_name, diver_data):
                counts['divers'] += 1

            # Process each competition result
            for result in diver_data.get('results', []):
                try:
                    # Generate competition ID
                    competition_id = generate_competition_id(
                        result['meet_name'],
                        result.get('start_date')
                    )

                    # Insert competition data (if not already processed)
                    if competition_id not in processed_competitions:
                        if insert_competition_data(
                                dynamodb, competitions_table_name, competition_id,
                                result['meet_name'], result.get('start_date'), result.get('end_date')
                        ):
                            counts['competitions'] += 1
                            processed_competitions.add(competition_id)

                    # Insert result data
                    if insert_result_data(dynamodb, results_table_name, diver_data['id'], result, competition_id):
                        counts['results'] += 1

                    # Insert individual dive data
                    if result.get('dives'):
                        result_key = generate_result_key(
                            diver_data['id'], competition_id,
                            result['event_name'], result.get('round_type', '')
                        )

                        for dive in result['dives']:
                            if insert_dive_data(dynamodb, dives_table_name, result_key, dive):
                                counts['dives'] += 1

                except Exception as e:
                    logger.error(f"Error processing result for diver {diver_data['id']}: {e}")
                    counts['errors'] += 1

        except Exception as e:
            logger.error(f"Error processing diver {diver_data.get('id', 'Unknown')}: {e}")
            counts['errors'] += 1

    logger.info(f"Data storage completed. Counts: {counts}")
    return counts


def handler(event, context):
    """
    AWS Lambda handler function for importing competition data.
    
    Args:
        event: Lambda event object
        context: Lambda context object
    
    Returns:
        Dictionary containing status and results
    """
    try:
        logger.info("Lambda function started - Import Competition Data")

        # Extract configuration from the event if provided
        max_workers = event.get('max_workers', 8) if event else 8

        # Extract the diving data
        diving_data = extract_diving_data(max_diver_workers=max_workers)

        # Store data in DynamoDB
        storage_counts = store_data_in_dynamodb(diving_data)
        # Prepare response
        response = {
            'statusCode': 200,
            'body': {
                'message': 'Competition data imported and stored successfully',
                'total_divers': len(diving_data),
                'successful_divers': len([d for d in diving_data if 'error' not in d]),
                'error_divers': len([d for d in diving_data if 'error' in d]),
                'storage_counts': storage_counts,
                'data': diving_data
            }
        }

        logger.info(f"Lambda function completed successfully - Processed {len(diving_data)} divers")
        logger.info(f"Storage summary: {storage_counts}")
        return response

    except Exception as e:
        logger.error(f"Lambda function failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'message': 'Failed to import competition data',
                'error': str(e)
            }
        }
