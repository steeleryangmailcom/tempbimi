# LinkedIn + RocketReach Enrichment Tool

CLI application that takes a list of names and company names, looks up their LinkedIn profiles via RocketReach, enriches the data, and optionally pushes the results to HubSpot.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

   You need:
   - **RocketReach API Key** — from [rocketreach.co/api](https://rocketreach.co/api)
   - **HubSpot Access Token** — from HubSpot Settings > Integrations > Private Apps

## Usage

### Interactive mode (prompted for each contact)

```bash
npm run dev
```

### CSV import mode

```bash
npm run dev -- --csv sample-contacts.csv
```

CSV format — two columns with headers:
```
name,company
John Smith,Microsoft
Jane Doe,Google
```

## How it works

1. **Input** — Enter contacts manually or load from CSV
2. **LinkedIn Lookup** — Each contact is searched on RocketReach by name + company
3. **Enrichment** — Found profiles are enriched with email, phone, title, location
4. **Results Table** — A formatted table shows which lookups succeeded, with all enriched data
5. **HubSpot Push** — Select which enriched contacts to create in HubSpot via the CRM API

## Project Structure

```
src/
  index.ts        — CLI entry point and main workflow
  config.ts       — Environment variable loading and validation
  types.ts        — TypeScript interfaces
  rocketreach.ts  — RocketReach API: search + enrichment
  hubspot.ts      — HubSpot CRM API: contact creation
  display.ts      — Terminal table and result formatting
  csv.ts          — CSV file parser
```

## Building

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled version
```
