import os
import re
import time
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GOOGLE_CSE_ID = os.environ.get("GOOGLE_CSE_ID", "")


def search_linkedin(first_name, last_name, company):
    """Search Google for a LinkedIn profile URL."""
    query = f"{first_name} {last_name} {company} site:linkedin.com/in"

    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return None, "Missing GOOGLE_API_KEY or GOOGLE_CSE_ID environment variables"

    try:
        resp = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "key": GOOGLE_API_KEY,
                "cx": GOOGLE_CSE_ID,
                "q": query,
                "num": 5,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        items = data.get("items", [])
        for item in items:
            link = item.get("link", "")
            # Accept linkedin.com/in/ profile links
            if re.search(r"linkedin\.com/in/[^/?]+", link):
                return link, None

        return None, "No LinkedIn profile found"

    except requests.exceptions.RequestException as e:
        return None, f"Search error: {str(e)}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/lookup", methods=["POST"])
def lookup():
    data = request.get_json()
    people = data.get("people", [])

    results = []
    for i, person in enumerate(people):
        first_name = person.get("first_name", "").strip()
        last_name = person.get("last_name", "").strip()
        company = person.get("company", "").strip()

        if not first_name and not last_name:
            results.append({
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
                "url": None,
                "error": "Missing name",
                "status": "error",
            })
            continue

        url, error = search_linkedin(first_name, last_name, company)

        results.append({
            "first_name": first_name,
            "last_name": last_name,
            "company": company,
            "url": url,
            "error": error,
            "status": "found" if url else "not_found",
        })

        # Respect rate limits: ~10 QPS for Google CSE free tier
        if i < len(people) - 1:
            time.sleep(0.15)

    return jsonify({"results": results})


@app.route("/api/config-status")
def config_status():
    configured = bool(GOOGLE_API_KEY and GOOGLE_CSE_ID)
    return jsonify({"configured": configured})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
