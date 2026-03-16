#!/usr/bin/env python3
"""
Blueshift Customer Backup Script

Fetches customer records by UUID from the Blueshift API and saves them to a JSON file.

Usage:
    python backup_customers.py --api-key YOUR_API_KEY [--input uuids.txt] [--output backup.json]

Input file format: one UUID per line.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

BLUESHIFT_API_BASE = "https://api.getblueshift.com"
ENDPOINT_TEMPLATE = "/api/v1/customers/{uuid}"

DEFAULT_INPUT_FILE = "uuids.txt"
DEFAULT_OUTPUT_FILE = "customer_backup.json"

RETRY_ATTEMPTS = 3
RETRY_BACKOFF = [2, 4, 8]  # seconds


def fetch_customer(session: requests.Session, uuid: str) -> dict:
    """Fetch a single customer record by UUID. Retries on transient errors."""
    url = BLUESHIFT_API_BASE + ENDPOINT_TEMPLATE.format(uuid=uuid)

    for attempt, wait in enumerate(RETRY_BACKOFF, start=1):
        try:
            response = session.get(url, timeout=30)

            if response.status_code == 200:
                return {"uuid": uuid, "status": "ok", "data": response.json()}

            if response.status_code == 404:
                print(f"  [WARN] {uuid}: not found (404)", file=sys.stderr)
                return {"uuid": uuid, "status": "not_found", "data": None}

            if response.status_code == 429 or response.status_code >= 500:
                print(
                    f"  [WARN] {uuid}: HTTP {response.status_code}, "
                    f"retrying in {wait}s (attempt {attempt}/{RETRY_ATTEMPTS})",
                    file=sys.stderr,
                )
                time.sleep(wait)
                continue

            # Other 4xx errors are not retryable
            print(
                f"  [ERROR] {uuid}: HTTP {response.status_code} – {response.text[:200]}",
                file=sys.stderr,
            )
            return {
                "uuid": uuid,
                "status": "error",
                "http_status": response.status_code,
                "data": None,
            }

        except requests.RequestException as exc:
            print(
                f"  [ERROR] {uuid}: request failed ({exc}), "
                f"retrying in {wait}s (attempt {attempt}/{RETRY_ATTEMPTS})",
                file=sys.stderr,
            )
            time.sleep(wait)

    return {"uuid": uuid, "status": "failed_after_retries", "data": None}


def load_uuids(path: str) -> list[str]:
    """Read UUIDs from a file (one per line), stripping blanks and comments."""
    lines = Path(path).read_text().splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]


def main():
    parser = argparse.ArgumentParser(description="Backup Blueshift customer records to JSON.")
    parser.add_argument("--api-key", required=True, help="Blueshift API key")
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT_FILE,
        help=f"Path to file containing UUIDs (default: {DEFAULT_INPUT_FILE})",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_FILE,
        help=f"Output JSON file path (default: {DEFAULT_OUTPUT_FILE})",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="Seconds to wait between requests to avoid rate limiting (default: 0.1)",
    )
    args = parser.parse_args()

    uuids = load_uuids(args.input)
    if not uuids:
        print(f"No UUIDs found in '{args.input}'. Exiting.", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(uuids)} UUIDs from '{args.input}'")

    session = requests.Session()
    session.auth = (args.api_key, "")  # Blueshift uses HTTP Basic Auth: api_key as username

    results = []
    ok_count = 0
    err_count = 0

    for i, uuid in enumerate(uuids, start=1):
        print(f"[{i}/{len(uuids)}] Fetching {uuid} ...", end=" ")
        record = fetch_customer(session, uuid)
        results.append(record)

        if record["status"] == "ok":
            ok_count += 1
            print("OK")
        else:
            err_count += 1
            print(record["status"].upper())

        if i < len(uuids) and args.delay > 0:
            time.sleep(args.delay)

    backup = {
        "backup_created_at": datetime.now(timezone.utc).isoformat(),
        "total": len(uuids),
        "ok": ok_count,
        "errors": err_count,
        "records": results,
    }

    output_path = Path(args.output)
    output_path.write_text(json.dumps(backup, indent=2))
    print(f"\nBackup saved to '{output_path}' ({ok_count} records, {err_count} errors)")


if __name__ == "__main__":
    main()
