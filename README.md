# LinkedIn Profile Lookup Tool

A web app for your team to paste a list of contacts (First Name, Last Name, Company) and bulk-lookup their LinkedIn profile URLs using Google Custom Search.

## Setup

### 1. Get Google Custom Search credentials

You need two things:

**Google API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **Custom Search API**
3. Under **Credentials**, create an API key

**Custom Search Engine ID**
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Create a new search engine
3. Under **Setup → Basics**, enable **Search the entire web**
4. Copy the **Search engine ID**

> **Free tier:** 100 queries/day free. After that, $5 per 1,000 queries.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your GOOGLE_API_KEY and GOOGLE_CSE_ID
```

### 3. Install and run

```bash
pip install -r requirements.txt

# Load env vars (or export them manually)
export GOOGLE_API_KEY=your_key
export GOOGLE_CSE_ID=your_cx

python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## How to use

1. Paste your contact list into the text area — one person per line
2. Supported formats (comma, tab, or pipe-delimited):
   ```
   Jane, Doe, Acme Corp
   John	Smith	Globex
   Alice | Johnson | Initech
   ```
3. Click **Search LinkedIn**
4. Results appear live as each batch completes
5. Click **Export CSV** to download the results

## Deployment tips

- For team use, deploy to any Python host (Heroku, Render, Railway, Fly.io, etc.)
- Set `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` as environment variables on the host
- For high volume, consider enabling Google Cloud billing and monitoring usage
