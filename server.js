const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const https = require('https');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Field name mapping: CSV column → Blueshift API field ───────────────────
//
// CSV uses UPPERCASE_SNAKE. Blueshift top-level fields are lowercase_snake.
// Custom attributes live under customer_attributes{} and are also lowercase.
// Entries here override the default "lowercase the CSV key" rule.
//
const FIELD_MAP = {
  GENERAL_EMAIL:                    'email',
  GENERAL_PHONE:                    'phone_number',
  MARKETING_PHONE:                  'marketing_phone',
  REWARDS_MARKETING_PHONE:          'rewards_marketing_phone',
  FIRSTNAME:                        'firstname',
  LASTNAME:                         'lastname',
  GENDER:                           'gender',
  ADDRESS_LINE1:                    'address_line_1',
  ADDRESS_LINE2:                    'address_line_2',
  ADDRESS_CITY:                     'city',
  ADDRESS_STATE:                    'state',
  ADDRESS_POSTAL_CODE:              'zip_code',
  BIRTHDATE:                        'birthdate',
  JOINED_AT:                        'joined_at',
  CREATED_AT_GOLD:                  'created_at',
  UPDATED_AT_GOLD:                  'updated_at',
};

// Columns to skip in comparison (used only for lookup, not meaningful to compare)
const SKIP_COLS = new Set(['GENERAL_EMAIL']);

// ─── Detect email column ──────────────────────────────────────────────────────
// Prefer GENERAL_EMAIL, then any column whose name contains "email"
function detectEmailCol(headers) {
  return (
    headers.find(h => h === 'GENERAL_EMAIL') ||
    headers.find(h => h.toLowerCase() === 'email') ||
    headers.find(h => h.toLowerCase().includes('email'))
  );
}

// ─── Map a CSV column name to the Blueshift field name to look up ─────────────
function toBlueshiftKey(csvCol) {
  return FIELD_MAP[csvCol] || csvCol.toLowerCase();
}

// ─── Recursively find a key in a nested JSON object ──────────────────────────
// Searches: top-level, customer_attributes{}, then any other nested object.
function findValue(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;

  const lower = key.toLowerCase();

  // 1. Top-level exact (case-insensitive)
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lower) return v;
  }

  // 2. customer_attributes first (preferred for custom fields)
  if (obj.customer_attributes && typeof obj.customer_attributes === 'object') {
    for (const [k, v] of Object.entries(obj.customer_attributes)) {
      if (k.toLowerCase() === lower) return v;
    }
  }

  // 3. Any other nested object (max depth 3)
  function recurse(node, depth) {
    if (!node || typeof node !== 'object' || depth > 3) return undefined;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'customer_attributes') continue; // already checked
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [nk, nv] of Object.entries(v)) {
          if (nk.toLowerCase() === lower) return nv;
        }
        const deeper = recurse(v, depth + 1);
        if (deeper !== undefined) return deeper;
      }
    }
    return undefined;
  }

  return recurse(obj, 0);
}

// ─── Value normalization for comparison ──────────────────────────────────────
function normalizeValue(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str === '') return '';

  // Booleans (CSV may have TRUE/FALSE, API may have true/false or 1/0)
  const low = str.toLowerCase();
  if (low === 'true' || low === '1') return 'true';
  if (low === 'false' || low === '0') return 'false';

  return str;
}

// ─── Compare CSV row fields against Blueshift customer JSON ──────────────────
function compareFields(csvRow, customerData) {
  const results = [];

  for (const csvCol of Object.keys(csvRow)) {
    if (SKIP_COLS.has(csvCol)) continue;

    const csvRaw = csvRow[csvCol];
    const bsKey  = toBlueshiftKey(csvCol);
    const apiRaw = findValue(customerData, bsKey);

    const csvNorm = normalizeValue(csvRaw);
    const apiNorm = normalizeValue(apiRaw);
    const match   = csvNorm === apiNorm;

    results.push({
      field:    csvCol,
      bsKey,                                          // what we looked up in the API
      csvValue: csvRaw === '' || csvRaw == null ? '' : csvRaw,
      apiValue: apiRaw === undefined ? null : apiRaw, // null = not found, '' = empty
      match,
    });
  }

  return results;
}

// ─── Blueshift API helper ─────────────────────────────────────────────────────
function blueshiftRequest(apiKey, urlPath, hostname = 'api.getblueshift.com') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

// ─── POST /api/test ───────────────────────────────────────────────────────────
app.post('/api/test', upload.single('csv'), async (req, res) => {
  const apiKey = req.body.apiKey;
  const region = req.body.region || 'api.getblueshift.com';
  if (!apiKey)   return res.status(400).json({ error: 'API key is required' });
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

  let rows;
  try {
    rows = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse CSV: ' + e.message });
  }

  if (rows.length === 0) return res.status(400).json({ error: 'CSV file is empty' });

  const headers  = Object.keys(rows[0]);
  const emailCol = detectEmailCol(headers);
  if (!emailCol) {
    return res.status(400).json({
      error: 'Could not find an email column. Expected GENERAL_EMAIL or a column containing "email".',
    });
  }

  const results = [];

  for (const row of rows) {
    const email = row[emailCol];
    if (!email) {
      results.push({ email: '(missing)', error: 'No email value in row', fields: [] });
      continue;
    }

    try {
      // Step 1: search by email → get UUID
      const searchResult = await blueshiftRequest(
        apiKey,
        '/api/v1/customers?email=' + encodeURIComponent(email),
        region
      );

      const customers = searchResult.customers || (Array.isArray(searchResult) ? searchResult : null);
      if (!customers || customers.length === 0) {
        results.push({ email, error: 'Customer not found in Blueshift', fields: [] });
        continue;
      }

      const uuid = customers[0].uuid || customers[0].id;
      if (!uuid) {
        results.push({ email, error: 'No UUID in search response', fields: [] });
        continue;
      }

      // Step 2: fetch full customer record
      const customerData = await blueshiftRequest(apiKey, '/api/v1/customers/' + uuid, region);

      // Step 3: compare
      const fields     = compareFields(row, customerData);
      const matchCount = fields.filter(f => f.match).length;

      results.push({
        email,
        uuid,
        fields,
        matchCount,
        totalFields: fields.length,
        rawApiResponse: customerData,   // sent to client for the "View Raw" panel
      });

    } catch (err) {
      results.push({ email, error: err.message, fields: [] });
    }
  }

  res.json({ results, totalRows: rows.length, emailCol });
});

// ─── GET /api/field-map ───────────────────────────────────────────────────────
// Let the UI display the current mapping
app.get('/api/field-map', (_, res) => res.json(FIELD_MAP));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Blueshift Customer Tester running at http://localhost:${PORT}`);
});
